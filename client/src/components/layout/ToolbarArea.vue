<script setup lang="ts">
import PanelControlDropdown from './PanelControlDropdown.vue';
import DisplayedPanelTabs from './DisplayedPanelTabs.vue';
</script>

<template>
  <div class="toolbar-area flex items-center gap-4 px-4 py-3" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
    <!-- 左侧: 面板控制下拉框 -->
    <div class="flex-shrink-0">
      <PanelControlDropdown />
    </div>

    <!-- 分隔线 -->
    <div class="w-px h-8 bg-white/30"></div>

    <!-- 中间: 标题 -->
    <h1 class="text-white text-xl font-semibold drop-shadow-md flex-shrink-0">
      多维表格视图管理
    </h1>

    <!-- 分隔线 -->
    <div class="w-px h-8 bg-white/30"></div>

    <!-- 右侧: 已显示面板标签（水平滚动） -->
    <div class="flex-1 overflow-x-auto">
      <DisplayedPanelTabs />
    </div>
  </div>
</template>
