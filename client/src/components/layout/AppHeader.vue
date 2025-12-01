<script setup lang="ts">
import { useSettingsStore } from '../../stores/settings';
import { PANEL_CONFIGS } from '../../types';

const settingsStore = useSettingsStore();

function expandAll() {
  settingsStore.expandAllPanels();
}

function collapseAll() {
  settingsStore.collapseAllPanels(PANEL_CONFIGS.map(p => p.key));
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
