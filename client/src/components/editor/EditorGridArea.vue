<script setup lang="ts">
import { computed } from 'vue';
import { useEditorGridStore } from '../../stores/editorGrid';
import EditorGridRow from './EditorGridRow.vue';

const editorGridStore = useEditorGridStore();

const gridConfig = computed(() => editorGridStore.gridConfig);
const rows = computed(() => Array.from({ length: gridConfig.value.rowCount }, (_, i) => i));
const hasEditorPanels = computed(() => editorGridStore.editorPanels.length > 0);

// 添加新行
function addRow() {
  editorGridStore.addRow();
}
</script>

<template>
  <div class="editor-grid-area flex-1 flex flex-col overflow-hidden p-4 bg-gray-100">
    <!-- 空状态 -->
    <div
      v-if="!hasEditorPanels && rows.length <= 1"
      class="flex-1 flex flex-col items-center justify-center text-gray-400"
    >
      <div class="text-6xl mb-4">📝</div>
      <div class="text-xl font-medium">编辑区域</div>
      <div class="text-sm mt-2 text-center max-w-md">
        点击上方工具栏的"面板控制"选择视图，<br/>
        然后点击视图标签的 + 图标添加到此区域
      </div>
    </div>

    <!-- 网格行列表 -->
    <div v-else class="flex-1 flex flex-col gap-3 overflow-auto">
      <EditorGridRow
        v-for="row in rows"
        :key="row"
        :row-index="row"
      />

      <!-- 添加行按钮 -->
      <button
        class="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-blue-400 hover:text-blue-500 transition flex-shrink-0"
        @click="addRow"
      >
        <span class="text-2xl">+</span>
        <span class="text-sm">添加新行</span>
      </button>
    </div>
  </div>
</template>
