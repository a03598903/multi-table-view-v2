<script setup lang="ts">
import Panel from '../panel/Panel.vue';
import { PANEL_CONFIGS } from '../../types';
</script>

<template>
  <div class="flex gap-2 flex-shrink-0 h-full">
    <Panel
      v-for="config in PANEL_CONFIGS"
      :key="config.key"
      :config="config"
    />
  </div>
</template>
