<script setup lang="ts">
import { useSettingsStore } from '../../stores/settings';
import { usePanelsStore } from '../../stores/panels';
import { PANEL_CONFIGS } from '../../types';

const settingsStore = useSettingsStore();
const panelsStore = usePanelsStore();

function expandAll() {
  // 展开前6栏
  settingsStore.expandAllPanels();
  // 展开所有展示视图
  panelsStore.expandAllDisplayViews();
}

function collapseAll() {
  // 折叠前6栏
  settingsStore.collapseAllPanels(PANEL_CONFIGS.map(p => p.key));
  // 折叠所有展示视图
  panelsStore.collapseAllDisplayViews();
}
</script>

<template>
  <div class="flex items-center justify-center gap-8 py-2">
    <h1 class="text-white text-2xl font-semibold drop-shadow-md">
      多维表格视图管理
    </h1>
    <div class="flex gap-2">
      <button
        class="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition text-sm"
        @click="expandAll"
      >
        📂 面板全部展开
      </button>
      <button
        class="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition text-sm"
        @click="collapseAll"
      >
        📁 面板全部收缩
      </button>
    </div>
  </div>
</template>
