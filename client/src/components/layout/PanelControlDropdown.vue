<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useSettingsStore } from '../../stores/settings';
import { usePanelsStore } from '../../stores/panels';
import { PANEL_CONFIGS, type PanelKey } from '../../types';
import PanelSelectorModal from './PanelSelectorModal.vue';

const settingsStore = useSettingsStore();
const panelsStore = usePanelsStore();

// 面板选择弹出层是否显示
const showPanelSelector = ref(false);

// 下拉框是否展开
const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

// 前5个面板的配置（排除 selected）
const first5Panels = computed(() => PANEL_CONFIGS.filter(p => p.key !== 'selected').slice(0, 5));

// 面板显示状态（勾选 = 显示，未勾选 = 隐藏）
const panelVisibility = computed(() => {
  const visibility: Record<string, boolean> = {};
  first5Panels.value.forEach(p => {
    visibility[p.key] = !settingsStore.isPanelHidden(p.key);
  });
  return visibility;
});

// 统一宽度值
const uniformWidth = ref(30);

// 切换下拉框
function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

// 点击外部关闭下拉框
function handleClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

// 挂载/卸载事件监听
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// 切换单个面板显示/隐藏
function togglePanelVisibility(key: PanelKey) {
  settingsStore.togglePanelHidden(key);
}

// 全部显示
function showAll() {
  first5Panels.value.forEach(p => {
    settingsStore.setPanelHidden(p.key, false);
    // 同时展开
    if (settingsStore.isPanelCollapsed(p.key)) {
      settingsStore.togglePanel(p.key);
    }
  });
}

// 全部收缩面板
function collapseAllPanels() {
  first5Panels.value.forEach(p => {
    settingsStore.setPanelHidden(p.key, false);
    if (!settingsStore.isPanelCollapsed(p.key)) {
      settingsStore.togglePanel(p.key);
    }
  });
}

// 全部展开面板
function expandAllPanels() {
  first5Panels.value.forEach(p => {
    settingsStore.setPanelHidden(p.key, false);
    if (settingsStore.isPanelCollapsed(p.key)) {
      settingsStore.togglePanel(p.key);
    }
  });
}

// 全部展开表格（展开所有文件夹）
async function expandAllTables() {
  // 先展开所有面板
  expandAllPanels();
  // 然后展开所有展示视图
  panelsStore.expandAllDisplayViews();
}

// 统一宽度
function applyUniformWidth() {
  first5Panels.value.forEach(p => {
    settingsStore.setPanelWidth(p.key, uniformWidth.value);
  });
}

// 宽度变化
function onWidthChange(value: number) {
  uniformWidth.value = value;
}
</script>

<template>
  <div ref="dropdownRef" class="relative">
    <!-- 触发按钮 -->
    <button
      class="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition text-sm flex items-center gap-2"
      @click.stop="toggleDropdown"
    >
      <span>⚙️ 面板控制</span>
      <span class="text-xs transition-transform" :class="{ 'rotate-180': isOpen }">▼</span>
    </button>

    <!-- 下拉框内容 -->
    <div
      v-show="isOpen"
      class="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[280px] z-50"
      @click.stop
    >
      <!-- 第1行：快捷操作 -->
      <div class="flex flex-wrap gap-2 mb-4 pb-3 border-b border-gray-200">
        <button
          class="px-3 py-1.5 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600 transition"
          @click="showPanelSelector = true; isOpen = false"
        >
          📋 选择视图
        </button>
        <button
          class="px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition"
          @click="showAll"
        >
          全部显示
        </button>
        <button
          class="px-3 py-1.5 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition"
          @click="collapseAllPanels"
        >
          全部收缩面板
        </button>
        <button
          class="px-3 py-1.5 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition"
          @click="expandAllPanels"
        >
          全部展开面板
        </button>
        <button
          class="px-3 py-1.5 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 transition"
          @click="expandAllTables"
        >
          全部展开表格
        </button>
      </div>

      <!-- 统一宽度控制 -->
      <div class="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
        <span class="text-sm text-gray-600">统一宽度</span>
        <input
          type="range"
          class="flex-1 h-1 accent-blue-500"
          min="15"
          max="50"
          :value="uniformWidth"
          @input="onWidthChange(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="text-sm text-gray-600 w-10 text-center">{{ uniformWidth }}%</span>
        <button
          class="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition"
          @click="applyUniformWidth"
        >
          应用
        </button>
      </div>

      <!-- 面板选择列表 -->
      <div class="space-y-2">
        <div class="text-xs text-gray-500 mb-2">选择显示的面板：</div>
        <div
          v-for="panel in first5Panels"
          :key="panel.key"
          class="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
          @click="togglePanelVisibility(panel.key)"
        >
          <!-- 勾选框 -->
          <div
            class="w-5 h-5 border-2 rounded flex items-center justify-center transition"
            :class="panelVisibility[panel.key]
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'border-gray-300 hover:border-blue-400'"
          >
            <span v-if="panelVisibility[panel.key]" class="text-xs">✓</span>
          </div>
          <!-- 面板图标和名称 -->
          <span class="text-lg">{{ panel.icon }}</span>
          <span class="text-sm text-gray-700">{{ panel.title }}</span>
          <!-- 显示状态标签 -->
          <span
            class="ml-auto text-xs px-2 py-0.5 rounded"
            :class="panelVisibility[panel.key]
              ? 'bg-green-100 text-green-600'
              : 'bg-gray-100 text-gray-500'"
          >
            {{ panelVisibility[panel.key] ? '显示' : '隐藏' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 面板选择弹出层 -->
    <PanelSelectorModal
      :visible="showPanelSelector"
      @close="showPanelSelector = false"
    />
  </div>
</template>
