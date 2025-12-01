<script setup lang="ts">
import { inject, computed, ref, onMounted, nextTick } from 'vue';
import { usePanelsStore } from '../../stores/panels';
import type { IContextTarget, IFolder, TreeItem } from '../../types';
import { getPanelConfig } from '../../types';
import * as api from '../../api';

const props = defineProps<{
  x: number;
  y: number;
  target: IContextTarget | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const panelsStore = usePanelsStore();
const showToast = inject<(msg: string) => void>('showToast');

// 菜单元素引用
const menuRef = ref<HTMLElement | null>(null);

// 调整后的位置
const adjustedX = ref(props.x);
const adjustedY = ref(props.y);

// 显示文件夹选择子菜单
const showFolderSubmenu = ref(false);

// 是否为文件夹
const isFolder = computed(() => props.target?.type === 'folder');

// 获取面板配置
const panelConfig = computed(() => {
  if (!props.target) return null;
  return getPanelConfig(props.target.panelKey);
});

// 获取实体名称
const entityName = computed(() => {
  return panelConfig.value?.title || '对象';
});

// 递归获取所有文件夹（包括嵌套的子文件夹）
const availableFolders = computed(() => {
  if (!props.target) return [];
  const folders: { folder: IFolder; depth: number }[] = [];

  const collectFolders = (items: TreeItem[], excludeId: string, depth: number = 0) => {
    items.forEach(item => {
      if (item.type === 'folder' && item.id !== excludeId) {
        folders.push({ folder: item as IFolder, depth });
        if ('children' in item && item.children) {
          collectFolders(item.children, excludeId, depth + 1);
        }
      }
    });
  };

  collectFolders(panelsStore.data[props.target.panelKey], props.target.id);
  return folders;
});

// 调整菜单位置，确保不超出屏幕
onMounted(async () => {
  await nextTick();
  if (menuRef.value) {
    const rect = menuRef.value.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 调整水平位置
    if (props.x + rect.width > viewportWidth) {
      adjustedX.value = Math.max(0, viewportWidth - rect.width - 10);
    }

    // 调整垂直位置
    if (props.y + rect.height > viewportHeight) {
      adjustedY.value = Math.max(0, viewportHeight - rect.height - 10);
    }
  }
});

// 复制编码
async function copyCode() {
  if (!props.target) return;

  const item = panelsStore.findItemById(
    panelsStore.data[props.target.panelKey],
    props.target.id
  );

  if (item) {
    await navigator.clipboard.writeText(item.code);
    showToast?.('已复制: ' + item.code);
  }

  emit('close');
}

// 创建子项
async function createChildItem() {
  if (!props.target) return;

  const config = getPanelConfig(props.target.panelKey);
  if (!config) return;

  try {
    const payload: Record<string, unknown> = {
      name: '默认名称',
      folder_id: props.target.id
    };

    if (config.parentField && config.parentKey) {
      payload[config.parentField] = panelsStore.selected[config.parentKey]?.id;
    }

    const newItem = await api.createEntity(props.target.panelKey, payload);
    await panelsStore.loadPanel(props.target.panelKey);
    // 触发编辑新项目
    panelsStore.setEditingItemId(newItem.id);
    showToast?.('已创建');
  } catch (e) {
    showToast?.('创建失败');
  }

  emit('close');
}

// 创建子文件夹
async function createChildFolder() {
  if (!props.target) return;

  const config = getPanelConfig(props.target.panelKey);
  if (!config) return;

  try {
    const payload = {
      name: '默认名称',
      type: config.folderType,
      parent_id: props.target.id,
      owner_id: config.parentKey ? panelsStore.selected[config.parentKey]?.id : undefined
    };

    const newFolder = await api.createFolder(payload);
    await panelsStore.loadPanel(props.target.panelKey);
    // 触发编辑新文件夹
    panelsStore.setEditingItemId(newFolder.id);
    showToast?.('已创建文件夹');
  } catch (e) {
    showToast?.('创建失败');
  }

  emit('close');
}

// 移动到指定文件夹
async function moveToFolder(folderId: string | null) {
  if (!props.target) return;

  try {
    if (props.target.type === 'folder') {
      // 文件夹移动使用 parent_id
      await api.updateFolder(props.target.id, { parent_id: folderId });
    } else {
      await api.moveItem(props.target.type, props.target.id, folderId);
    }
    await panelsStore.loadPanel(props.target.panelKey);
    showToast?.(folderId ? '已移入文件夹' : '已移到顶层');
  } catch (e) {
    showToast?.('移动失败');
  }

  emit('close');
}

// 删除
async function deleteItem() {
  if (!props.target) return;

  if (!confirm('确定删除吗？')) {
    emit('close');
    return;
  }

  try {
    if (props.target.type === 'folder') {
      await api.deleteFolder(props.target.id);
    } else {
      await api.deleteEntity(props.target.panelKey, props.target.id);
    }
    await panelsStore.loadPanel(props.target.panelKey);
    showToast?.('已删除');
  } catch (e) {
    showToast?.('删除失败');
  }

  emit('close');
}

// 点击外部关闭
function handleClickOutside() {
  emit('close');
}

// 鼠标进入显示子菜单
function showSubmenu() {
  showFolderSubmenu.value = true;
}

// 鼠标离开隐藏子菜单
function hideSubmenu() {
  showFolderSubmenu.value = false;
}
</script>

<template>
  <div
    class="fixed inset-0 z-50"
    @click="handleClickOutside"
  >
    <div
      ref="menuRef"
      class="fixed bg-white rounded-lg shadow-xl py-1.5 min-w-[160px] z-50"
      :style="{ left: adjustedX + 'px', top: adjustedY + 'px' }"
      @click.stop
    >
      <div
        class="flex items-center gap-2 px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
        @click="copyCode"
      >
        📋 复制编码
      </div>

      <template v-if="isFolder">
        <div class="h-px bg-gray-200 my-1"></div>

        <div
          class="flex items-center gap-2 px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
          @click="createChildItem"
        >
          ➕ 新建{{ entityName }}
        </div>

        <div
          class="flex items-center gap-2 px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
          @click="createChildFolder"
        >
          📁 新建文件夹
        </div>
      </template>

      <!-- 移到文件夹选项 -->
      <div class="h-px bg-gray-200 my-1"></div>

      <div
        class="relative"
        @mouseenter="showSubmenu"
        @mouseleave="hideSubmenu"
      >
        <div
          class="flex items-center justify-between gap-2 px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
        >
          <span class="flex items-center gap-2">
            📂 移到文件夹...
          </span>
          <span class="text-xs">▶</span>
        </div>

        <!-- 文件夹子菜单 -->
        <div
          v-if="showFolderSubmenu"
          class="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl py-1.5 min-w-[160px] max-h-[300px] overflow-y-auto"
        >
          <!-- 移到顶层 -->
          <div
            class="flex items-center gap-2 px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
            @click="moveToFolder(null)"
          >
            📤 顶层（根目录）
          </div>

          <template v-if="availableFolders.length > 0">
            <div class="h-px bg-gray-200 my-1"></div>

            <div
              v-for="{ folder, depth } in availableFolders"
              :key="folder.id"
              class="flex items-center gap-2 px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
              :style="{ paddingLeft: `${14 + depth * 12}px` }"
              @click="moveToFolder(folder.id)"
            >
              📁 {{ folder.name }}
            </div>
          </template>
        </div>
      </div>

      <div class="h-px bg-gray-200 my-1"></div>

      <div
        class="flex items-center gap-2 px-3.5 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
        @click="deleteItem"
      >
        🗑️ 删除
      </div>
    </div>
  </div>
</template>
