<script setup lang="ts">
import type { IPanelConfig } from '../../types';

const props = defineProps<{
  config: IPanelConfig;
  count: number;
  collapsed: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
}>();
</script>

<template>
  <!-- 展开状态 -->
  <div
    v-if="!collapsed"
    class="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-200 font-semibold text-gray-600"
  >
    <!-- 收缩按钮 - 左侧第1个，更显眼 -->
    <button
      class="w-7 h-7 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 transition shadow-sm"
      @click.stop="emit('toggle')"
      title="收缩面板"
    >
      <span class="text-sm font-bold">《</span>
    </button>

    <!-- 数量徽章 - 左侧第2个 -->
    <span class="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-medium min-w-[24px] text-center">
      {{ count }}
    </span>

    <!-- 图标和标题 -->
    <span class="flex items-center gap-2 flex-1">
      {{ config.icon }} {{ config.title }}
    </span>
  </div>

  <!-- 收缩状态 -->
  <div
    v-else
    class="flex flex-col items-center py-3 bg-gray-50 border-b border-gray-200 cursor-pointer flex-1 hover:bg-blue-50 transition group"
    @click.stop="emit('toggle')"
  >
    <!-- 展开按钮图标 - 显眼的展开提示 -->
    <div class="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white group-hover:bg-blue-600 transition shadow-md mb-2">
      <span class="text-sm font-bold">》</span>
    </div>

    <!-- 数量徽章 -->
    <span class="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-xs font-medium mb-3">
      {{ count }}
    </span>

    <!-- 垂直文字 - 面板名称字体放大 -->
    <span
      class="flex items-center gap-1 text-gray-700 font-bold text-base"
      style="writing-mode: vertical-rl; text-orientation: mixed;"
    >
      {{ config.icon }} {{ config.title }}
    </span>

    <!-- 展开提示区域 - 竖直方向显示 -->
    <div
      class="mt-auto pt-3 text-gray-400 group-hover:text-blue-500 transition text-xs font-medium"
      style="writing-mode: vertical-rl; text-orientation: mixed;"
    >
      点击展开
    </div>
  </div>
</template>
