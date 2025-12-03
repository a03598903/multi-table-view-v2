<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useEditorGridStore, COLUMN_LABELS } from '../../stores/editorGrid';
import type { ColumnPosition, IEditorPosition } from '../../types';

const editorGridStore = useEditorGridStore();

// 位置选择器状态
const selectorState = computed(() => editorGridStore.positionSelector);
const gridConfig = computed(() => editorGridStore.gridConfig);

// 浮动位置
const floatStyle = computed(() => {
  if (!selectorState.value.anchorRect) {
    return { display: 'none' };
  }

  const rect = selectorState.value.anchorRect;
  const top = rect.bottom + 8;
  const left = rect.left;

  // 确保不超出屏幕右边界
  const maxLeft = window.innerWidth - 400;

  return {
    position: 'fixed' as const,
    top: `${top}px`,
    left: `${Math.min(left, maxLeft)}px`,
    zIndex: 9999
  };
});

// 计算表格尺寸
// 行数 = 当前横栏数 + 1（新行）
const rows = computed(() => {
  const count = gridConfig.value.rowCount + 1;
  return Array.from({ length: count }, (_, i) => i);
});

// 可见列
const columns = computed(() => editorGridStore.visibleColumns);

// 获取列显示名称
function getColumnLabel(col: ColumnPosition): string {
  return COLUMN_LABELS[col];
}

// 获取行标签
function getRowLabel(row: number): string {
  if (row === gridConfig.value.rowCount) {
    return '新';
  }
  return String(row + 1);
}

// 选择位置
function selectPosition(row: number, column: ColumnPosition) {
  if (editorGridStore.isPositionOccupied(row, column)) {
    return; // 位置已占用
  }

  const view = selectorState.value.view;
  if (!view) return;

  const position: IEditorPosition = { row, column };
  editorGridStore.addEditorPanel(view, position);
  editorGridStore.closePositionSelector();
}

// 点击外部关闭
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.position-selector')) {
    editorGridStore.closePositionSelector();
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="selectorState.visible"
      class="position-selector bg-white rounded-lg shadow-2xl border border-gray-200 p-4"
      :style="floatStyle"
      @click.stop
    >
      <!-- 标题 -->
      <div class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
        <span>选择编辑位置:</span>
        <span class="text-blue-600">{{ selectorState.view?.view_name }}</span>
      </div>

      <!-- 位置表格 -->
      <table class="border-collapse">
        <thead>
          <tr>
            <th class="w-10 p-1.5 text-xs text-gray-500 font-normal">行</th>
            <th
              v-for="col in columns"
              :key="col"
              class="w-14 p-1.5 text-xs text-gray-500 text-center font-normal"
            >
              {{ getColumnLabel(col) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row">
            <td class="p-1.5 text-xs text-gray-500 text-center font-medium">
              {{ getRowLabel(row) }}
            </td>
            <td
              v-for="col in columns"
              :key="col"
              class="p-1"
            >
              <button
                class="w-12 h-9 rounded border-2 flex items-center justify-center text-xs transition"
                :class="
                  editorGridStore.isPositionOccupied(row, col)
                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-400 cursor-pointer text-blue-600'
                "
                :disabled="editorGridStore.isPositionOccupied(row, col)"
                @click="selectPosition(row, col)"
              >
                {{ editorGridStore.isPositionOccupied(row, col) ? '占用' : '选择' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 提示 -->
      <div class="mt-3 text-xs text-gray-400 flex items-center gap-1">
        <span class="inline-block w-3 h-3 rounded border-2 border-blue-200 bg-white"></span>
        <span>可选位置</span>
        <span class="inline-block w-3 h-3 rounded border-2 border-gray-200 bg-gray-100 ml-2"></span>
        <span>已占用</span>
      </div>
    </div>
  </Teleport>
</template>
