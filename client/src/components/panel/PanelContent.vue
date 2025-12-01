<script setup lang="ts">
import { computed, inject, provide, ref, onMounted, onUnmounted, type Ref } from 'vue';
import draggable from 'vuedraggable';
import { usePanelsStore } from '../../stores/panels';
import type { IPanelConfig, TreeItem, IReorderItem, IFolder } from '../../types';
import { getPanelConfig } from '../../types';
import TreeItemComponent from '../tree/TreeItem.vue';
import * as api from '../../api';

const props = defineProps<{
  config: IPanelConfig;
  items: TreeItem[];
  highlightedItemId?: string | null;
  searchQuery?: string;
}>();

const panelsStore = usePanelsStore();
const showToast = inject<(msg: string) => void>('showToast');
const mainContentRef = inject<Ref<HTMLElement | null>>('mainContentRef');

// 提供高亮 ID 给子组件
provide('highlightedItemId', computed(() => props.highlightedItemId));
provide('searchQuery', computed(() => props.searchQuery));

// 容器引用
const containerRef = ref<HTMLElement | null>(null);

// Alt+拖拽滚动状态
const isAltDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const scrollStartX = ref(0);
const scrollStartY = ref(0);

// Alt+拖拽滚动处理（上下拖动=面板内垂直滚动，左右拖动=网页水平滚动）
function handleMouseDown(e: MouseEvent) {
  if (e.altKey && e.button === 0 && containerRef.value) {
    e.preventDefault();
    e.stopPropagation();
    isAltDragging.value = true;
    dragStartX.value = e.clientX;
    dragStartY.value = e.clientY;
    scrollStartY.value = containerRef.value.scrollTop;
    scrollStartX.value = mainContentRef?.value?.scrollLeft || 0;
    document.body.classList.add('grabbing');
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!isAltDragging.value || !containerRef.value) return;
  e.preventDefault();

  const deltaX = e.clientX - dragStartX.value;
  const deltaY = e.clientY - dragStartY.value;

  // 垂直滚动 - 面板内部
  containerRef.value.scrollTop = scrollStartY.value - deltaY;

  // 水平滚动 - 主内容区域
  if (mainContentRef?.value) {
    mainContentRef.value.scrollLeft = scrollStartX.value - deltaX;
  }
}

function handleMouseUp() {
  if (isAltDragging.value) {
    isAltDragging.value = false;
    document.body.classList.remove('grabbing');
  }
}

// 全局监听鼠标移动和松开
onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
});

// 是否需要父级
const needsParent = computed(() => {
  if (!props.config.parentKey) return false;
  return !panelsStore.selected[props.config.parentKey];
});

// 父级标题
const parentTitle = computed(() => {
  if (!props.config.parentKey) return '';
  const parentConfig = getPanelConfig(props.config.parentKey);
  return parentConfig?.title || '';
});

// 获取面板项目的类型标识（用于 reorder API）
function getItemTypeForApi(item: TreeItem): string {
  if (item.type === 'folder') return 'folder';
  if (item.type === 'selected') return 'selected';
  return props.config.key;
}

// 拖拽结束处理
async function handleDragEnd(evt: { oldIndex: number; newIndex: number; item?: HTMLElement }) {
  if (evt.oldIndex === evt.newIndex) return;

  const items = props.items;
  const reorderItems: IReorderItem[] = [];

  // 收集所有顶层项目的新排序
  items.forEach((item, index) => {
    reorderItems.push({
      id: item.id,
      sort_order: index,
      folder_id: item.folder_id
    });
  });

  // 分别更新文件夹和实体
  const folderItems = reorderItems.filter((_, i) => items[i].type === 'folder');
  const entityItems = reorderItems.filter((_, i) => items[i].type !== 'folder');

  try {
    if (folderItems.length > 0) {
      await api.reorderItems('folder', folderItems);
    }
    if (entityItems.length > 0) {
      const entityType = props.config.key === 'selected' ? 'selected' : props.config.key;
      await api.reorderItems(entityType, entityItems);
    }
    await panelsStore.loadPanel(props.config.key);
  } catch (e) {
    showToast?.('排序失败');
  }
}

// 拖拽移动到文件夹处理
async function handleDragMove(item: TreeItem, targetFolderId: string | null) {
  if (item.folder_id === targetFolderId) return;

  try {
    await api.moveItem(item.type, item.id, targetFolderId);
    await panelsStore.loadPanel(props.config.key);
    showToast?.('已移动');
  } catch (e) {
    showToast?.('移动失败');
  }
}
</script>

<template>
  <div
    ref="containerRef"
    class="panel-scroll-area flex-1 overflow-y-auto overflow-x-hidden p-2"
    @mousedown="handleMouseDown"
  >
    <!-- 空状态 -->
    <div
      v-if="items.length === 0"
      class="text-center text-gray-400 py-8"
    >
      <div class="text-4xl mb-2">{{ needsParent ? '👈' : '📭' }}</div>
      <div>{{ needsParent ? `请先选择${parentTitle}` : '暂无内容' }}</div>
    </div>

    <!-- 树形列表（可拖拽） -->
    <draggable
      v-else
      :list="items"
      item-key="id"
      group="items"
      :animation="200"
      ghost-class="opacity-50"
      drag-class="bg-blue-100"
      handle=".drag-handle"
      @end="handleDragEnd"
    >
      <template #item="{ element }">
        <TreeItemComponent
          :item="element"
          :panel-key="config.key"
          @move-to-folder="handleDragMove"
        />
      </template>
    </draggable>
  </div>
</template>
