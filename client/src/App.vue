<script setup lang="ts">
import { ref, onMounted, onUnmounted, provide } from 'vue';
import { usePanelsStore } from './stores/panels';
import { useSettingsStore } from './stores/settings';
import { useEditorGridStore } from './stores/editorGrid';
import ToolbarArea from './components/layout/ToolbarArea.vue';
import EditorGridArea from './components/editor/EditorGridArea.vue';
import PositionSelector from './components/editor/PositionSelector.vue';
import ContextMenu from './components/common/ContextMenu.vue';
import Toast from './components/common/Toast.vue';
import type { IContextTarget } from './types';

const panelsStore = usePanelsStore();
const settingsStore = useSettingsStore();
const editorGridStore = useEditorGridStore();

// Toast 状态
const toastMessage = ref('');
const toastVisible = ref(false);

function showToast(message: string) {
  toastMessage.value = message;
  toastVisible.value = true;
  setTimeout(() => {
    toastVisible.value = false;
  }, 1500);
}

// 右键菜单状态
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextTarget = ref<IContextTarget | null>(null);

function showContextMenu(e: MouseEvent, target: IContextTarget) {
  contextMenuPosition.value = { x: e.clientX, y: e.clientY };
  contextTarget.value = target;
  contextMenuVisible.value = true;
}

function hideContextMenu() {
  contextMenuVisible.value = false;
  contextTarget.value = null;
}

// 主内容区域引用
const mainContentRef = ref<HTMLElement | null>(null);

// 提供给子组件
provide('showToast', showToast);
provide('showContextMenu', showContextMenu);
provide('hideContextMenu', hideContextMenu);
provide('mainContentRef', mainContentRef);

// Alt+拖拽滚动 - 全局水平滚动（非面板内容区域）
const isAltDragging = ref(false);
const dragStartX = ref(0);
const scrollStartX = ref(0);

function handleGlobalMouseDown(e: MouseEvent) {
  // 面板内容区域有自己的滚动处理，这里不处理
  const target = e.target as HTMLElement;
  if (target.closest('.panel-scroll-area')) {
    return;
  }

  if (e.altKey && e.button === 0 && mainContentRef.value) {
    e.preventDefault();
    isAltDragging.value = true;
    dragStartX.value = e.clientX;
    scrollStartX.value = mainContentRef.value.scrollLeft;
    document.body.classList.add('grabbing');
  }
}

function handleGlobalMouseMove(e: MouseEvent) {
  if (!isAltDragging.value || !mainContentRef.value) return;
  e.preventDefault();
  const deltaX = e.clientX - dragStartX.value;
  mainContentRef.value.scrollLeft = scrollStartX.value - deltaX;
}

function handleGlobalMouseUp() {
  if (isAltDragging.value) {
    isAltDragging.value = false;
    document.body.classList.remove('grabbing');
  }
}

// Alt+箭头键面板导航
function handleKeyDown(e: KeyboardEvent) {
  if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault();

    if (e.key === 'ArrowLeft') {
      panelsStore.prevPanel();
    } else {
      panelsStore.nextPanel();
    }

    // 滚动到活动面板
    scrollToActivePanel();
  }
}

// 滚动到活动面板并居中显示
function scrollToActivePanel() {
  if (!mainContentRef.value) return;

  const panelIndex = panelsStore.activePanelIndex;
  const panels = mainContentRef.value.querySelectorAll('.panel-wrapper');

  if (panelIndex >= 0 && panelIndex < panels.length) {
    const panel = panels[panelIndex] as HTMLElement;
    const containerWidth = mainContentRef.value.clientWidth;
    const panelLeft = panel.offsetLeft;
    const panelWidth = panel.offsetWidth;

    // 计算居中位置
    const scrollTo = panelLeft - (containerWidth - panelWidth) / 2;
    mainContentRef.value.scrollTo({
      left: Math.max(0, scrollTo),
      behavior: 'smooth'
    });
  }
}

// 初始化
onMounted(async () => {
  const settings = await settingsStore.loadSettings();
  await panelsStore.init();
  await editorGridStore.loadSettings();

  // 加载保存的临时面板
  if (settings?.tempPanels && settings.tempPanels.length > 0) {
    await panelsStore.loadTempPanels(settings.tempPanels);
  }

  document.addEventListener('mousedown', handleGlobalMouseDown);
  document.addEventListener('mousemove', handleGlobalMouseMove);
  document.addEventListener('mouseup', handleGlobalMouseUp);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleGlobalMouseDown);
  document.removeEventListener('mousemove', handleGlobalMouseMove);
  document.removeEventListener('mouseup', handleGlobalMouseUp);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="h-screen overflow-hidden flex flex-col">
    <!-- 上方区域：工具栏 -->
    <ToolbarArea class="flex-shrink-0" />

    <!-- 下方区域：编辑网格 -->
    <EditorGridArea class="flex-1" />

    <!-- 悬浮位置选择器 -->
    <PositionSelector />

    <!-- 右键菜单 -->
    <ContextMenu
      v-if="contextMenuVisible"
      :x="contextMenuPosition.x"
      :y="contextMenuPosition.y"
      :target="contextTarget"
      @close="hideContextMenu"
    />

    <!-- Toast 提示 -->
    <Toast :message="toastMessage" :visible="toastVisible" />
  </div>
</template>
