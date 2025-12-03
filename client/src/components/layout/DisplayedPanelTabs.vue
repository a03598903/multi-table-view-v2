<script setup lang="ts">
import { computed, inject } from 'vue';
import { usePanelsStore } from '../../stores/panels';
import { useEditorGridStore } from '../../stores/editorGrid';
import type { ISelectedView } from '../../types';

const panelsStore = usePanelsStore();
const editorGridStore = useEditorGridStore();
const showToast = inject<(msg: string) => void>('showToast');

// 已显示的视图（来自 displayedViews）
const displayedViews = computed(() => panelsStore.displayedViews);

// 打开位置选择器
function openPositionSelector(view: ISelectedView, event: MouseEvent) {
  const button = event.currentTarget as HTMLElement;
  const rect = button.getBoundingClientRect();
  editorGridStore.openPositionSelector(view, rect);
}

// 关闭展示视图
function closeView(viewId: string) {
  panelsStore.removeDisplayedView(viewId);
  showToast?.('已移除视图');
}

// 视图类型图标
function getViewTypeIcon(viewType: string): string {
  const icons: Record<string, string> = {
    grid: '📊',
    kanban: '📋',
    calendar: '📅',
    gantt: '📈'
  };
  return icons[viewType] || '📊';
}
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- 已显示视图标签 -->
    <div
      v-for="view in displayedViews"
      :key="view.id"
      class="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-lg text-white text-sm hover:bg-white/30 transition group flex-shrink-0"
    >
      <!-- 打开编辑器图标 -->
      <button
        class="w-5 h-5 flex items-center justify-center rounded hover:bg-white/20 transition"
        @click="openPositionSelector(view, $event)"
        title="添加到编辑区域"
      >
        <span class="text-xs font-bold">+</span>
      </button>

      <!-- 视图类型图标 -->
      <span class="text-sm">{{ getViewTypeIcon(view.view_type) }}</span>

      <!-- 视图名称 -->
      <span class="truncate max-w-[120px]">{{ view.view_name }}</span>

      <!-- 表格名称 -->
      <span class="text-white/60 text-xs truncate max-w-[80px]">
        {{ view.table_name }}
      </span>

      <!-- 关闭按钮 -->
      <button
        class="w-4 h-4 flex items-center justify-center rounded hover:bg-red-500 opacity-0 group-hover:opacity-100 transition ml-1"
        @click="closeView(view.id)"
        title="移除"
      >
        <span class="text-xs">×</span>
      </button>
    </div>

    <!-- 空状态 -->
    <div
      v-if="displayedViews.length === 0"
      class="text-white/60 text-sm"
    >
      点击面板控制选择视图
    </div>
  </div>
</template>
