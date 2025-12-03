<script setup lang="ts">
import { computed } from 'vue';
import { useEditorGridStore } from '../../stores/editorGrid';
import EditorGridCell from './EditorGridCell.vue';

const props = defineProps<{
  rowIndex: number;
}>();

const editorGridStore = useEditorGridStore();

const columns = computed(() => editorGridStore.visibleColumns);
</script>

<template>
  <div class="editor-grid-row flex gap-2 min-h-[250px]">
    <!-- 行号指示器 -->
    <div class="w-8 flex-shrink-0 flex items-center justify-center text-gray-400 text-sm font-medium bg-gray-200 rounded-lg">
      {{ rowIndex + 1 }}
    </div>

    <!-- 各列单元格 -->
    <EditorGridCell
      v-for="col in columns"
      :key="col"
      :row-index="rowIndex"
      :column="col"
      class="flex-1"
    />
  </div>
</template>
