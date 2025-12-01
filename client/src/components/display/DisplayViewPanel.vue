<script setup lang="ts">
import { computed, inject } from 'vue';
import { usePanelsStore } from '../../stores/panels';
import { useSettingsStore } from '../../stores/settings';
import type { ISelectedView } from '../../types';

const props = defineProps<{
  view: ISelectedView;
  index: number;
}>();

const panelsStore = usePanelsStore();
const settingsStore = useSettingsStore();
const showToast = inject<(msg: string) => void>('showToast');

// 是否折叠
const isCollapsed = computed(() => panelsStore.isDisplayViewCollapsed(props.view.id));

// 面板宽度（从 settings store 获取）
const panelWidth = computed(() => settingsStore.getDisplayViewWidth(props.view.id));

// 切换折叠状态
function toggleCollapse() {
  panelsStore.toggleDisplayViewCollapse(props.view.id);
}

// 关闭面板
function closePanel() {
  panelsStore.removeDisplayedView(props.view.id);
  showToast?.('已关闭展示视图');
}

// 定位到视图
async function locateToView() {
  await panelsStore.locateToView(props.view);
  showToast?.('已定位');
}

// 宽度变化
function onWidthChange(value: number) {
  settingsStore.setDisplayViewWidth(props.view.id, value);
}

// 重置宽度
function resetWidth() {
  settingsStore.resetDisplayViewWidth(props.view.id);
}

// 面板样式
const panelStyle = computed(() => {
  if (isCollapsed.value) {
    return { width: '48px', minWidth: '48px' };
  }
  return { width: `${panelWidth.value}vw` };
});

// 将视图名称拆分为单个字符数组
const viewNameChars = computed(() => props.view.view_name.split(''));
</script>

<template>
  <div
    class="panel-wrapper bg-white rounded-xl shadow-xl flex flex-col overflow-hidden transition-all duration-200 flex-shrink-0"
    :class="{
      'cursor-pointer hover:shadow-2xl': isCollapsed
    }"
    :style="panelStyle"
    @click="isCollapsed && toggleCollapse()"
  >
    <!-- 收缩状态 -->
    <template v-if="isCollapsed">
      <div
        class="flex flex-col items-center py-3 border-b cursor-pointer flex-1 hover:bg-blue-50 transition group"
        :style="{ background: (view.table_color || '#3b82f6') + '15' }"
      >
        <!-- 展开按钮图标 - 显眼的展开提示 -->
        <div
          class="w-8 h-8 flex items-center justify-center rounded-full text-white group-hover:opacity-90 transition shadow-md mb-2"
          :style="{ background: view.table_color || '#3b82f6' }"
        >
          <span class="text-sm font-bold">▶</span>
        </div>

        <!-- 关闭按钮 -->
        <button
          class="w-6 h-6 flex items-center justify-center rounded bg-gray-200 text-gray-600 hover:bg-red-500 hover:text-white transition mb-2"
          @click.stop="closePanel"
          title="关闭"
        >
          ×
        </button>

        <!-- 竖向标题 - 每行1字，正常朝上 -->
        <div class="flex-1 flex flex-col items-center justify-center gap-0.5 overflow-hidden">
          <span class="text-lg">📊</span>
          <template v-for="(char, idx) in viewNameChars" :key="idx">
            <span class="text-gray-700 font-bold text-sm">{{ char }}</span>
          </template>
        </div>

        <!-- 展开提示区域 -->
        <div class="mt-auto pt-3 flex flex-col items-center gap-0.5 text-gray-400 group-hover:text-blue-500 transition text-xs font-medium">
          <span>点</span>
          <span>击</span>
          <span>展</span>
          <span>开</span>
        </div>
      </div>
    </template>

    <!-- 展开状态 -->
    <template v-else>
      <!-- 宽度控制条 -->
      <div
        class="flex items-center gap-2 px-2 py-1 border-b border-gray-200 text-xs text-gray-600"
        :style="{ background: (view.table_color || '#3b82f6') + '20' }"
      >
        <span>宽度</span>
        <input
          type="range"
          class="flex-1 h-1 accent-blue-500"
          min="30"
          max="90"
          :value="panelWidth"
          @input="onWidthChange(Number(($event.target as HTMLInputElement).value))"
          @click.stop
        />
        <span class="w-8 text-center font-medium">{{ panelWidth }}%</span>
        <button
          class="px-1.5 py-0.5 bg-gray-200 rounded text-xs hover:bg-gray-300"
          @click.stop="resetWidth"
        >
          重置
        </button>
      </div>

      <!-- 面板头部 -->
      <div
        class="flex items-center gap-2 px-3 py-2.5 border-b select-none"
        :style="{ background: view.table_color || '#3b82f6' }"
      >
        <!-- 收缩按钮 - 左侧第1个，更显眼 -->
        <button
          class="w-7 h-7 flex items-center justify-center rounded-md bg-white/30 text-white hover:bg-white/50 transition shadow-sm"
          @click.stop="toggleCollapse"
          title="收缩面板"
        >
          <span class="text-sm font-bold">◀</span>
        </button>

        <!-- 拖拽手柄 -->
        <span class="drag-handle w-4 h-4 flex items-center justify-center text-white/70 hover:text-white cursor-grab active:cursor-grabbing">
          ⋮⋮
        </span>

        <!-- 标题 -->
        <span class="flex-1 text-white font-medium truncate">
          📊 {{ view.view_name }}
        </span>
        <span class="text-white/70 text-xs">
          {{ view.table_name }}
        </span>

        <!-- 定位按钮 -->
        <button
          class="w-6 h-6 flex items-center justify-center rounded bg-white/20 text-white hover:bg-white/30 transition text-xs"
          @click.stop="locateToView"
          title="定位到相关对象"
        >
          📍
        </button>

        <!-- 关闭按钮 -->
        <button
          class="w-6 h-6 flex items-center justify-center rounded bg-white/20 text-white hover:bg-red-500 transition"
          @click.stop="closePanel"
          title="关闭"
        >
          ×
        </button>
      </div>

      <!-- 面板内容 -->
      <div class="flex-1 p-5 overflow-y-auto">
        <!-- 视图详情 -->
        <div class="flex items-center gap-3 pb-4 border-b border-gray-200 mb-5">
          <span class="text-xl font-semibold text-gray-800">{{ view.view_name }}</span>
          <span class="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
            {{ view.view_type || 'grid' }}
          </span>
        </div>

        <div class="grid grid-cols-[100px_1fr] gap-3 text-sm">
          <span class="text-gray-500 font-medium">编码</span>
          <span class="text-gray-800">{{ view.code }}</span>

          <span class="text-gray-500 font-medium">所属表格</span>
          <span class="text-gray-800 flex items-center gap-1.5">
            <span
              class="w-3 h-3 rounded-full inline-block"
              :style="{ background: view.table_color }"
            ></span>
            {{ view.table_name }}
          </span>

          <span class="text-gray-500 font-medium">视图类型</span>
          <span class="text-gray-800">{{ view.view_type || 'grid' }}</span>

          <span class="text-gray-500 font-medium">创建时间</span>
          <span class="text-gray-800">{{ view.created_at || '-' }}</span>
        </div>

        <div class="mt-8 p-5 bg-gray-50 rounded-lg text-center text-gray-400">
          <div class="text-3xl mb-3">📊</div>
          <div>视图编辑区域</div>
          <div class="text-xs mt-1">此区域将用于编辑视图的具体内容</div>
        </div>
      </div>
    </template>
  </div>
</template>
