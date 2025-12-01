<script setup lang="ts">
import { computed, ref, inject, watch, nextTick, type ComputedRef, type Ref } from 'vue';
import draggable from 'vuedraggable';
import { usePanelsStore } from '../../stores/panels';
import type { TreeItem, PanelKey, ISelectedView, IContextTarget, IFolder, IReorderItem } from '../../types';
import { getPanelConfig } from '../../types';
import * as api from '../../api';

const props = defineProps<{
  item: TreeItem;
  panelKey: PanelKey;
  depth?: number;
}>();

const emit = defineEmits<{
  moveToFolder: [item: TreeItem, folderId: string | null];
}>();

const panelsStore = usePanelsStore();
const showToast = inject<(msg: string) => void>('showToast');
const showContextMenu = inject<(e: MouseEvent, target: IContextTarget) => void>('showContextMenu');
const highlightedItemId = inject<ComputedRef<string | null>>('highlightedItemId', computed(() => null));
const searchQuery = inject<ComputedRef<string>>('searchQuery', computed(() => ''));

// 全局拖放状态
const globalDragItem = inject<Ref<{ id: string; type: string; panelKey: PanelKey } | null>>('globalDragItem');
const setGlobalDragItem = inject<(item: { id: string; type: string; panelKey: PanelKey } | null) => void>('setGlobalDragItem');

const config = getPanelConfig(props.panelKey);
const currentDepth = props.depth || 0;

// 是否高亮（搜索结果）
const isHighlighted = computed(() => {
  return highlightedItemId.value === props.item.id;
});

// 是否选中
const isActive = computed(() => {
  return panelsStore.selected[props.panelKey]?.id === props.item.id;
});

// 是否为文件夹
const isFolder = computed(() => props.item.type === 'folder');

// 是否展开（文件夹）
const isExpanded = computed(() => {
  if (!isFolder.value) return false;
  return (props.item as IFolder).expanded === 1;
});

// 子项
const children = computed(() => {
  if ('children' in props.item) {
    return props.item.children || [];
  }
  return [];
});

// 是否为视图面板（显示复选框）
const showCheckbox = computed(() => props.panelKey === 'view');

// 是否已选（视图）
const isChecked = computed(() => {
  if (!showCheckbox.value) return false;
  return panelsStore.isViewSelected(props.item.id);
});

// 是否为已选视图面板
const isSelectedPanel = computed(() => props.panelKey === 'selected');

// 获取颜色
const itemColor = computed(() => {
  if ('color' in props.item) return props.item.color;
  return '#3b82f6';
});

// 编辑状态
const isEditing = ref(false);
const editName = ref('');

// 本地拖放高亮状态
const isDropTarget = ref(false);

// 节点引用
const nodeRef = ref<HTMLElement | null>(null);

// 是否正在被拖拽
const isDragging = computed(() => {
  return globalDragItem?.value?.id === props.item.id;
});

// 是否可以作为拖放目标
const canBeDropTarget = computed(() => {
  if (!isFolder.value) return false;
  if (!globalDragItem?.value) return false;
  if (globalDragItem.value.id === props.item.id) return false;
  // 不能拖到自己的子文件夹
  if (globalDragItem.value.type === 'folder') {
    return !isDescendantOf(props.item.id, globalDragItem.value.id);
  }
  return true;
});

// 检查 targetId 是否是 sourceId 的后代
function isDescendantOf(targetId: string, sourceId: string): boolean {
  const findInTree = (items: TreeItem[], searchId: string): TreeItem | null => {
    for (const item of items) {
      if (item.id === searchId) return item;
      if ('children' in item && item.children) {
        const found = findInTree(item.children, searchId);
        if (found) return found;
      }
    }
    return null;
  };

  const checkDescendant = (item: TreeItem, targetId: string): boolean => {
    if (item.id === targetId) return true;
    if ('children' in item && item.children) {
      for (const child of item.children) {
        if (checkDescendant(child, targetId)) return true;
      }
    }
    return false;
  };

  // 从面板数据中找到源文件夹
  const panelData = panelsStore.getPanelData(props.panelKey);
  const sourceFolder = findInTree(panelData, sourceId);
  if (!sourceFolder) return false;

  return checkDescendant(sourceFolder, targetId);
}

// 监听 editingItemId，自动进入编辑状态
watch(() => panelsStore.editingItemId, async (newId) => {
  if (newId === props.item.id) {
    await nextTick();
    const element = document.querySelector(`[data-item-id="${props.item.id}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    startEdit();
    panelsStore.setEditingItemId(null);
  }
});

// 点击项目
function handleClick() {
  if (isFolder.value) return;
  panelsStore.selectItem(props.panelKey, props.item);
}

// 双击编辑
function handleDoubleClick() {
  startEdit();
}

// 右键菜单
function handleContextMenu(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  showContextMenu?.(e, {
    id: props.item.id,
    type: props.item.type,
    panelKey: props.panelKey
  });
}

// 更多操作按钮点击
function handleMoreClick(e: MouseEvent) {
  e.stopPropagation();
  showContextMenu?.(e, {
    id: props.item.id,
    type: props.item.type,
    panelKey: props.panelKey
  });
}

// 切换文件夹展开
async function toggleFolder(e: MouseEvent) {
  e.stopPropagation();
  if (!isFolder.value) return;
  const folder = props.item as IFolder;
  await api.updateFolder(folder.id, { expanded: folder.expanded ? 0 : 1 });
  await panelsStore.loadPanel(props.panelKey);
}

// 切换视图选择
function toggleViewSelection() {
  panelsStore.toggleViewSelection(props.item.id);
}

// 移除已选
function removeSelected() {
  const sv = props.item as ISelectedView;
  panelsStore.removeSelectedView(sv.id, sv.view_id);
  showToast?.('已移除');
}

// 定位到视图相关对象
async function locateToView() {
  const sv = props.item as ISelectedView;
  await panelsStore.locateToView(sv);
  showToast?.('已定位');
}

// 添加到展示视图
function addToDisplay() {
  const sv = props.item as ISelectedView;
  const success = panelsStore.addDisplayedView(sv);
  if (success) {
    showToast?.('已添加展示');
  } else {
    showToast?.('已存在或已达上限');
  }
}

// 开始编辑
function startEdit() {
  const name = isSelectedPanel.value
    ? (props.item as ISelectedView).view_name
    : props.item.name;
  editName.value = name;
  isEditing.value = true;
  nextTick(() => {
    const input = document.querySelector(`[data-item-id="${props.item.id}"] input`) as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  });
}

// 保存编辑
async function saveEdit() {
  const newName = editName.value.trim() || '默认名称';
  const originalName = isSelectedPanel.value
    ? (props.item as ISelectedView).view_name
    : props.item.name;

  if (newName !== originalName) {
    if (isFolder.value) {
      await api.updateFolder(props.item.id, { name: newName });
    } else {
      await api.updateEntity(props.panelKey, props.item.id, { name: newName });
    }
    showToast?.('已保存');
  }

  isEditing.value = false;
  await panelsStore.loadPanel(props.panelKey);
}

// 取消编辑
function cancelEdit() {
  isEditing.value = false;
}

// 处理键盘事件
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    saveEdit();
  } else if (e.key === 'Escape') {
    cancelEdit();
  }
}

// ==================== 拖放逻辑 ====================

// 拖拽开始 - 从拖拽手柄开始
function handleDragStart(e: DragEvent) {
  e.stopPropagation();

  const dragData = {
    id: props.item.id,
    type: props.item.type,
    panelKey: props.panelKey
  };

  e.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  e.dataTransfer!.effectAllowed = 'move';

  // 设置全局拖拽状态
  setGlobalDragItem?.(dragData);
}

// 拖拽结束
function handleDragEnd(e: DragEvent) {
  e.stopPropagation();
  // 清除全局拖拽状态
  setGlobalDragItem?.(null);
  isDropTarget.value = false;
}

// 拖放进入（文件夹接收拖放）
function handleDragEnter(e: DragEvent) {
  if (!canBeDropTarget.value) return;
  e.preventDefault();
  e.stopPropagation();
  isDropTarget.value = true;
}

// 拖放悬停
function handleDragOver(e: DragEvent) {
  if (!canBeDropTarget.value) return;
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer!.dropEffect = 'move';
}

// 拖放离开
function handleDragLeave(e: DragEvent) {
  if (!isFolder.value) return;
  e.stopPropagation();

  // 检查是否真的离开了（不是进入子元素）
  const relatedTarget = e.relatedTarget as HTMLElement | null;
  const currentTarget = e.currentTarget as HTMLElement;

  if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
    isDropTarget.value = false;
  }
}

// 放下
async function handleDrop(e: DragEvent) {
  if (!canBeDropTarget.value) return;

  e.preventDefault();
  e.stopPropagation();
  isDropTarget.value = false;

  const dragData = e.dataTransfer?.getData('text/plain');
  if (!dragData) return;

  try {
    const dragItem = JSON.parse(dragData);

    // 执行移动操作
    if (dragItem.type === 'folder') {
      await api.updateFolder(dragItem.id, { parent_id: props.item.id });
    } else {
      await api.moveItem(dragItem.type, dragItem.id, props.item.id);
    }

    await panelsStore.loadPanel(props.panelKey);
    showToast?.('已移入文件夹');
  } catch (err) {
    console.error('移动失败:', err);
    showToast?.('移动失败');
  }
}

// 文件夹内子项排序结束
async function handleChildrenDragEnd(evt: { oldIndex: number; newIndex: number }) {
  if (evt.oldIndex === evt.newIndex) return;
  if (!isFolder.value) return;

  const folder = props.item as IFolder;
  const childItems = folder.children || [];
  const reorderItems: IReorderItem[] = [];

  childItems.forEach((child, index) => {
    reorderItems.push({
      id: child.id,
      sort_order: index,
      folder_id: folder.id
    });
  });

  const folderItems = reorderItems.filter((_, i) => childItems[i].type === 'folder');
  const entityItems = reorderItems.filter((_, i) => childItems[i].type !== 'folder');

  try {
    if (folderItems.length > 0) {
      await api.reorderItems('folder', folderItems);
    }
    if (entityItems.length > 0) {
      const entityType = props.panelKey === 'selected' ? 'selected' : props.panelKey;
      await api.reorderItems(entityType, entityItems);
    }
    await panelsStore.loadPanel(props.panelKey);
  } catch (e) {
    showToast?.('排序失败');
  }
}

// 子项移动到其他文件夹
function handleChildMoveToFolder(item: TreeItem, folderId: string | null) {
  emit('moveToFolder', item, folderId);
}
</script>

<template>
  <div
    ref="nodeRef"
    class="tree-item select-none"
    :class="{ 'opacity-50': isDragging }"
    :data-item-id="item.id"
    :data-depth="currentDepth"
  >
    <!-- 节点内容 - 整个节点都可以接收拖放 -->
    <div
      class="tree-node group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-all border-2 mb-0.5 text-sm"
      :class="{
        'bg-blue-50 border-blue-500': isActive && !isFolder && !isHighlighted,
        'bg-orange-100 border-orange-500': isHighlighted,
        'hover:bg-gray-100 border-transparent': !isActive && !isDropTarget && !isHighlighted,
        'font-medium': isFolder,
        'bg-yellow-100 border-yellow-500 border-dashed shadow-lg': isDropTarget && isFolder
      }"
      @click="handleClick"
      @dblclick="handleDoubleClick"
      @contextmenu="handleContextMenu"
      @dragenter="handleDragEnter"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <!-- 拖拽手柄 - 只有这里可以发起拖拽 -->
      <span
        class="drag-handle w-4 h-4 flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
        draggable="true"
        @dragstart="handleDragStart"
        @dragend="handleDragEnd"
        @click.stop
      >
        ⋮⋮
      </span>

      <!-- 展开图标 -->
      <span
        class="w-4 h-4 flex items-center justify-center text-xs text-gray-400 transition-transform cursor-pointer"
        :class="{ 'rotate-90': isExpanded, 'invisible': !isFolder }"
        @click="toggleFolder"
      >
        ▶
      </span>

      <!-- 编辑按钮 -->
      <button
        class="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition text-xs"
        @click.stop="startEdit"
      >
        ✏️
      </button>

      <!-- 编码 -->
      <span class="font-mono text-xs text-gray-400 bg-gray-100 px-1 rounded min-w-[36px] text-center">
        {{ item.code }}
      </span>

      <!-- 图标 -->
      <span
        class="w-6 h-6 flex items-center justify-center rounded text-xs"
        :class="isFolder ? 'bg-yellow-100 text-yellow-600' : ''"
        :style="!isFolder ? { background: itemColor, color: 'white' } : {}"
      >
        {{ isFolder ? '📁' : config?.icon }}
      </span>

      <!-- 名称 -->
      <template v-if="isSelectedPanel">
        <div class="flex-1 flex flex-col min-w-0">
          <input
            v-if="isEditing"
            v-model="editName"
            class="bg-white border border-blue-500 rounded px-1 py-0.5 text-sm outline-none"
            @blur="saveEdit"
            @keydown="handleKeydown"
            @click.stop
            autofocus
          />
          <template v-else>
            <span class="font-medium text-gray-800 truncate">
              {{ (item as ISelectedView).view_name }}
            </span>
            <span class="text-xs text-gray-400 flex items-center gap-1">
              <span
                class="w-2 h-2 rounded-full inline-block"
                :style="{ background: (item as ISelectedView).table_color }"
              ></span>
              {{ (item as ISelectedView).table_name }}
            </span>
          </template>
        </div>
        <!-- 定位按钮 -->
        <button
          class="w-5 h-5 flex items-center justify-center rounded bg-blue-100 text-blue-600 hover:bg-blue-200 transition text-xs"
          @click.stop="locateToView"
          title="定位到相关对象"
        >
          📍
        </button>
        <!-- 展示按钮 -->
        <button
          class="w-5 h-5 flex items-center justify-center rounded bg-green-100 text-green-600 hover:bg-green-200 transition text-xs"
          @click.stop="addToDisplay"
          title="添加到展示视图"
        >
          👁
        </button>
        <!-- 移除按钮 -->
        <button
          class="w-5 h-5 flex items-center justify-center rounded bg-red-100 text-red-600 hover:bg-red-200 transition text-sm"
          @click.stop="removeSelected"
        >
          ×
        </button>
      </template>
      <template v-else>
        <input
          v-if="isEditing"
          v-model="editName"
          class="flex-1 bg-white border border-blue-500 rounded px-1 py-0.5 text-sm outline-none min-w-0"
          @blur="saveEdit"
          @keydown="handleKeydown"
          @click.stop
          autofocus
        />
        <span v-else class="flex-1 truncate">{{ item.name }}</span>
      </template>

      <!-- 复选框（视图面板） -->
      <div
        v-if="showCheckbox"
        class="w-4 h-4 border-2 border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-500 transition text-xs"
        :class="{ 'bg-blue-500 border-blue-500 text-white': isChecked }"
        @click.stop="toggleViewSelection"
      >
        {{ isChecked ? '✓' : '' }}
      </div>

      <!-- 更多操作按钮 -->
      <button
        class="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
        @click.stop="handleMoreClick"
        title="更多操作"
      >
        <span class="text-sm font-bold leading-none tracking-tighter">⋮</span>
      </button>
    </div>

    <!-- 子项（文件夹展开时显示） -->
    <div
      v-if="isFolder && isExpanded && children.length > 0"
      class="ml-4 pl-2 border-l border-dashed border-gray-300"
    >
      <draggable
        :list="children"
        item-key="id"
        group="items"
        :animation="200"
        ghost-class="opacity-50"
        drag-class="bg-blue-100"
        handle=".drag-handle"
        @end="handleChildrenDragEnd"
      >
        <template #item="{ element }">
          <TreeItemComponent
            :item="element"
            :panel-key="panelKey"
            :depth="currentDepth + 1"
            @move-to-folder="handleChildMoveToFolder"
          />
        </template>
      </draggable>
    </div>

    <!-- 空文件夹展开时的占位符 -->
    <div
      v-if="isFolder && isExpanded && children.length === 0"
      class="ml-4 pl-2 border-l border-dashed border-gray-300 py-2 text-gray-400 text-xs italic"
    >
      空文件夹
    </div>
  </div>
</template>

<script lang="ts">
// 解决递归组件名称问题
export default {
  name: 'TreeItemComponent'
};
</script>
