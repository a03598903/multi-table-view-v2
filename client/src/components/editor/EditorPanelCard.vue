<script setup lang="ts">
import { computed, inject } from 'vue';
import { useEditorGridStore } from '../../stores/editorGrid';
import type { IEditorPanelData } from '../../types';

const props = defineProps<{
  panel: IEditorPanelData;
}>();

const editorGridStore = useEditorGridStore();
const showToast = inject<(msg: string) => void>('showToast');

// 视图类型图标
const viewTypeIcons: Record<string, string> = {
  grid: '📊',
  kanban: '📋',
  calendar: '📅',
  gantt: '📈'
};

const viewIcon = computed(() => viewTypeIcons[props.panel.view.view_type] || '📊');

// 关闭面板
function closePanel() {
  editorGridStore.removeEditorPanel(props.panel.id);
  showToast?.('已关闭编辑面板');
}

// 拖拽开始
function handleDragStart(e: DragEvent) {
  e.dataTransfer?.setData('panelId', props.panel.id);
  e.dataTransfer!.effectAllowed = 'move';
}
</script>

<template>
  <div
    class="editor-panel-card h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden"
    draggable="true"
    @dragstart="handleDragStart"
  >
    <!-- 标题栏 -->
    <div
      class="flex items-center gap-2 px-3 py-2 border-b select-none cursor-grab active:cursor-grabbing"
      :style="{ backgroundColor: panel.view.table_color || '#3b82f6' }"
    >
      <!-- 拖拽手柄 -->
      <span class="w-4 h-4 flex items-center justify-center text-white/70 hover:text-white">
        ⋮⋮
      </span>

      <!-- 图标和标题 -->
      <span class="text-white text-lg">{{ viewIcon }}</span>
      <span class="flex-1 text-white font-medium truncate">
        {{ panel.view.view_name }}
      </span>

      <!-- 所属表格 -->
      <span class="text-white/70 text-xs truncate max-w-[80px]">
        {{ panel.view.table_name }}
      </span>

      <!-- 关闭按钮 -->
      <button
        class="w-6 h-6 flex items-center justify-center rounded bg-white/20 text-white hover:bg-red-500 transition"
        @click.stop="closePanel"
        title="关闭"
      >
        ×
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-auto p-4">
      <!-- 视图信息 -->
      <div class="flex items-center gap-3 pb-3 border-b border-gray-200 mb-4">
        <span class="text-lg font-semibold text-gray-800">{{ panel.view.view_name }}</span>
        <span class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
          {{ panel.view.view_type || 'grid' }}
        </span>
      </div>

      <div class="grid grid-cols-[80px_1fr] gap-2 text-sm">
        <span class="text-gray-500">编码</span>
        <span class="text-gray-800">{{ panel.view.code }}</span>

        <span class="text-gray-500">所属表格</span>
        <span class="text-gray-800 flex items-center gap-1">
          <span
            class="w-3 h-3 rounded-full inline-block"
            :style="{ background: panel.view.table_color }"
          ></span>
          {{ panel.view.table_name }}
        </span>

        <span class="text-gray-500">视图类型</span>
        <span class="text-gray-800">{{ panel.view.view_type || 'grid' }}</span>
      </div>

      <!-- 编辑区域占位符 -->
      <div class="mt-6 p-4 bg-gray-50 rounded-lg text-center text-gray-400">
        <div class="text-3xl mb-2">{{ viewIcon }}</div>
        <div class="text-sm">视图编辑内容区域</div>
        <div class="text-xs mt-1">此区域将用于编辑视图的具体配置</div>
      </div>
    </div>
  </div>
</template>
