<script setup lang="ts">
import { computed } from 'vue';
import draggable from 'vuedraggable';
import { usePanelsStore } from '../../stores/panels';
import DisplayViewPanel from './DisplayViewPanel.vue';
import type { ISelectedView } from '../../types';

const panelsStore = usePanelsStore();

// 展示视图列表
const displayedViews = computed(() => panelsStore.displayedViews);

// 是否有展示视图
const hasDisplayedViews = computed(() => displayedViews.value.length > 0);

// 处理拖拽排序
function handleDragEnd() {
  // 排序已经由 vuedraggable 自动处理
  panelsStore.reorderDisplayedViews([...displayedViews.value]);
}
</script>

<template>
  <div v-if="hasDisplayedViews" class="display-views-container flex gap-3 flex-shrink-0">
    <draggable
      :list="displayedViews"
      item-key="id"
      class="flex gap-3"
      :animation="200"
      ghost-class="opacity-50"
      handle=".drag-handle"
      @end="handleDragEnd"
    >
      <template #item="{ element, index }">
        <DisplayViewPanel
          :view="element"
          :index="index"
        />
      </template>
    </draggable>
  </div>
</template>
