<script setup lang="ts">
import { computed } from 'vue';
import Panel from '../panel/Panel.vue';
import { PANEL_CONFIGS } from '../../types';
import { useSettingsStore } from '../../stores/settings';

const settingsStore = useSettingsStore();

// 过滤出未隐藏的面板（排除 selected 面板）
const visiblePanels = computed(() => {
  return PANEL_CONFIGS.filter(config => {
    // 排除已选视图面板
    if (config.key === 'selected') return false;
    // 排除隐藏的面板
    return !settingsStore.isPanelHidden(config.key);
  });
});
</script>

<template>
  <div class="flex gap-2 flex-shrink-0 h-full">
    <Panel
      v-for="config in visiblePanels"
      :key="config.key"
      :config="config"
    />
  </div>
</template>
