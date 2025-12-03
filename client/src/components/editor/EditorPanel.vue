<script setup lang="ts">
import { computed } from 'vue';
import { usePanelsStore } from '../../stores/panels';
import { useSettingsStore } from '../../stores/settings';
import { PANEL_CONFIGS } from '../../types';

const panelsStore = usePanelsStore();
const settingsStore = useSettingsStore();

const currentView = computed(() => panelsStore.currentEditView);
const editorWidth = computed(() => settingsStore.editorWidth);

// 编辑器面板的索引（在所有面板之后）
const editorPanelIndex = PANEL_CONFIGS.length;
const isActivePanel = computed(() => panelsStore.activePanelIndex === editorPanelIndex);

// 使用 settings store 管理折叠状态
const isCollapsed = computed(() => settingsStore.isEditorCollapsed());

function toggleCollapse() {
  settingsStore.toggleEditorCollapsed();
}

function onWidthChange(value: number) {
  settingsStore.setEditorWidth(value);
}

function resetWidth() {
  settingsStore.resetEditorWidth();
}

// 面板样式
const panelStyle = computed(() => {
  if (isCollapsed.value) {
    return { width: '48px', minWidth: '48px' };
  }
  return { width: `${editorWidth.value}vw` };
});
</script>

<template>
  <div
    class="panel-wrapper bg-white rounded-xl shadow-xl flex flex-col overflow-hidden flex-shrink-0 transition-all duration-200"
    :class="{
      'ring-4 ring-blue-400 ring-opacity-75': isActivePanel,
      'cursor-pointer hover:shadow-2xl': isCollapsed
    }"
    :style="panelStyle"
    @click="isCollapsed && toggleCollapse()"
  >
    <!-- 收缩状态 -->
    <template v-if="isCollapsed">
      <div class="flex flex-col items-center py-3 bg-gray-50 border-b border-gray-200 cursor-pointer flex-1 hover:bg-blue-50 transition group">
        <!-- 展开按钮图标 - 显眼的展开提示 -->
        <div class="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white group-hover:bg-blue-600 transition shadow-md mb-2">
          <span class="text-sm font-bold">》</span>
        </div>

        <!-- 竖向标题 - 每行1字，正常朝上 -->
        <div class="flex-1 flex flex-col items-center justify-center gap-0.5">
          <span class="text-lg">📝</span>
          <span class="text-gray-700 font-bold text-base">视</span>
          <span class="text-gray-700 font-bold text-base">图</span>
          <span class="text-gray-700 font-bold text-base">编</span>
          <span class="text-gray-700 font-bold text-base">辑</span>
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
      <!-- 宽度控制 -->
      <div class="flex items-center gap-2 px-2 py-1 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
        <span>宽度</span>
        <input
          type="range"
          class="flex-1 h-1 accent-blue-500"
          min="30"
          max="80"
          :value="editorWidth"
          @input="onWidthChange(Number(($event.target as HTMLInputElement).value))"
          @click.stop
        />
        <span class="w-8 text-center font-medium">{{ editorWidth }}%</span>
        <button
          class="px-1.5 py-0.5 bg-blue-100 rounded text-xs hover:bg-blue-200"
          @click.stop="resetWidth"
        >
          重置
        </button>
      </div>

      <!-- 头部 -->
      <div class="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-200 font-semibold text-gray-600">
        <!-- 收缩按钮 - 左侧第1个，更显眼 -->
        <button
          class="w-7 h-7 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 transition shadow-sm"
          @click.stop="toggleCollapse"
          title="收缩面板"
        >
          <span class="text-sm font-bold">《</span>
        </button>

        <!-- 图标和标题 -->
        <span class="flex items-center gap-2 flex-1">
          📝 视图编辑
        </span>
      </div>

      <!-- 内容 -->
      <div class="flex-1 p-5 overflow-y-auto">
        <!-- 空状态 -->
        <div v-if="!currentView" class="h-full flex flex-col items-center justify-center text-gray-400">
          <div class="text-5xl mb-4">📝</div>
          <div>请从"已选视图"中选择一个视图进行编辑</div>
        </div>

        <!-- 视图详情 -->
        <template v-else>
          <div class="flex items-center gap-3 pb-4 border-b border-gray-200 mb-5">
            <span class="text-xl font-semibold text-gray-800">{{ currentView.view_name }}</span>
            <span class="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
              {{ currentView.view_type }}
            </span>
          </div>

          <div class="grid grid-cols-[100px_1fr] gap-3 text-sm">
            <span class="text-gray-500 font-medium">编码</span>
            <span class="text-gray-800">{{ currentView.code }}</span>

            <span class="text-gray-500 font-medium">所属表格</span>
            <span class="text-gray-800 flex items-center gap-1.5">
              <span
                class="w-3 h-3 rounded-full inline-block"
                :style="{ background: currentView.table_color }"
              ></span>
              {{ currentView.table_name }}
            </span>

            <span class="text-gray-500 font-medium">视图类型</span>
            <span class="text-gray-800">{{ currentView.view_type }}</span>

            <span class="text-gray-500 font-medium">创建时间</span>
            <span class="text-gray-800">{{ currentView.created_at || '-' }}</span>
          </div>

          <div class="mt-8 p-5 bg-gray-50 rounded-lg text-center text-gray-400">
            <div class="text-3xl mb-3">🚧</div>
            <div>视图编辑功能开发中...</div>
            <div class="text-xs mt-1">此区域将用于编辑视图的具体内容</div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
