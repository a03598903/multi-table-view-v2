<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEditorGridStore, COLUMN_LABELS } from '../../stores/editorGrid';
import EditorPanelCard from './EditorPanelCard.vue';
import type { ColumnPosition } from '../../types';

const props = defineProps<{
  rowIndex: number;
  column: ColumnPosition;
}>();

const editorGridStore = useEditorGridStore();

// 获取该位置的面板
const panel = computed(() =>
  editorGridStore.getPanelAtPosition(props.rowIndex, props.column)
);

// 是否为中心列
const isCenter = computed(() => props.column === 'center');

// 是否正在拖拽经过
const isDragOver = ref(false);

// 获取列标签
const columnLabel = computed(() => COLUMN_LABELS[props.column]);

// 处理拖放
function handleDragOver(e: DragEvent) {
  if (!panel.value) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    isDragOver.value = true;
  }
}

function handleDragLeave() {
  isDragOver.value = false;
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = false;
  const panelId = e.dataTransfer?.getData('panelId');
  if (panelId && !panel.value) {
    editorGridStore.moveEditorPanel(panelId, {
      row: props.rowIndex,
      column: props.column
    });
  }
}
</script>

<template>
  <div
    class="editor-grid-cell rounded-lg border-2 transition-all overflow-hidden"
    :class="[
      panel
        ? 'border-transparent'
        : isDragOver
          ? 'border-blue-400 bg-blue-50'
          : 'border-dashed border-gray-300 bg-gray-50 hover:border-gray-400',
      isCenter ? 'min-w-[200px]' : 'min-w-[150px]'
    ]"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- 有面板时显示面板 -->
    <EditorPanelCard
      v-if="panel"
      :panel="panel"
    />

    <!-- 空单元格提示 -->
    <div
      v-else
      class="h-full flex flex-col items-center justify-center text-gray-300 p-4"
    >
      <div class="text-xs text-gray-400 mb-1">{{ columnLabel }}</div>
      <div class="text-sm">拖拽或选择位置添加</div>
    </div>
  </div>
</template>
