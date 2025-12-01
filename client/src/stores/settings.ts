import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { PanelKey, ISettings } from '../types';
import * as api from '../api';

const DEFAULT_PANEL_WIDTH = 30;
const DEFAULT_EDITOR_WIDTH = 70;
const DEFAULT_DISPLAY_VIEW_WIDTH = 70;

export const useSettingsStore = defineStore('settings', () => {
  // 状态
  const panelWidths = ref<Record<PanelKey, number>>({
    shareholder: DEFAULT_PANEL_WIDTH,
    company: DEFAULT_PANEL_WIDTH,
    project: DEFAULT_PANEL_WIDTH,
    table: DEFAULT_PANEL_WIDTH,
    view: DEFAULT_PANEL_WIDTH,
    selected: DEFAULT_PANEL_WIDTH
  });

  const editorWidth = ref(DEFAULT_EDITOR_WIDTH);
  const collapsedPanels = ref<Set<PanelKey>>(new Set());

  // 第7栏（编辑器面板）折叠状态，默认收缩
  const editorCollapsed = ref(true);

  // 展示视图的宽度 (viewId -> width)
  const displayViewWidths = ref<Record<string, number>>({});

  // 保存防抖
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  // 获取面板宽度
  function getPanelWidth(key: PanelKey): number {
    return panelWidths.value[key] || DEFAULT_PANEL_WIDTH;
  }

  // 设置面板宽度
  function setPanelWidth(key: PanelKey, width: number): void {
    panelWidths.value[key] = width;
    scheduleSave();
  }

  // 重置面板宽度
  function resetPanelWidth(key: PanelKey): void {
    panelWidths.value[key] = DEFAULT_PANEL_WIDTH;
    scheduleSave();
  }

  // 设置编辑器宽度
  function setEditorWidth(width: number): void {
    editorWidth.value = width;
    scheduleSave();
  }

  // 重置编辑器宽度
  function resetEditorWidth(): void {
    editorWidth.value = DEFAULT_EDITOR_WIDTH;
    scheduleSave();
  }

  // 切换面板折叠
  function togglePanel(key: PanelKey): void {
    if (collapsedPanels.value.has(key)) {
      collapsedPanels.value.delete(key);
    } else {
      collapsedPanels.value.add(key);
    }
    scheduleSave();
  }

  // 面板是否折叠
  function isPanelCollapsed(key: PanelKey): boolean {
    return collapsedPanels.value.has(key);
  }

  // 切换编辑器折叠
  function toggleEditorCollapsed(): void {
    editorCollapsed.value = !editorCollapsed.value;
    scheduleSave();
  }

  // 编辑器是否折叠
  function isEditorCollapsed(): boolean {
    return editorCollapsed.value;
  }

  // 设置编辑器折叠状态
  function setEditorCollapsed(collapsed: boolean): void {
    editorCollapsed.value = collapsed;
    scheduleSave();
  }

  // 获取展示视图宽度
  function getDisplayViewWidth(viewId: string): number {
    return displayViewWidths.value[viewId] || DEFAULT_DISPLAY_VIEW_WIDTH;
  }

  // 设置展示视图宽度
  function setDisplayViewWidth(viewId: string, width: number): void {
    displayViewWidths.value[viewId] = width;
    scheduleSave();
  }

  // 重置展示视图宽度
  function resetDisplayViewWidth(viewId: string): void {
    displayViewWidths.value[viewId] = DEFAULT_DISPLAY_VIEW_WIDTH;
    scheduleSave();
  }

  // 展开所有面板（包括第7栏和展示视图）
  function expandAllPanels(): void {
    collapsedPanels.value.clear();
    editorCollapsed.value = false;
    scheduleSave();
  }

  // 折叠所有面板（包括第7栏和展示视图）
  function collapseAllPanels(keys: PanelKey[]): void {
    keys.forEach(key => collapsedPanels.value.add(key));
    editorCollapsed.value = true;
    scheduleSave();
  }

  // 调度保存（防抖）
  function scheduleSave(): void {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(async () => {
      try {
        await api.saveSettings({
          panelWidths: panelWidths.value,
          editorWidth: editorWidth.value,
          collapsedPanels: Array.from(collapsedPanels.value) as PanelKey[],
          editorCollapsed: editorCollapsed.value,
          displayViewWidths: displayViewWidths.value
        });
      } catch (e) {
        console.error('保存设置失败', e);
      }
    }, 500);
  }

  // 加载设置
  async function loadSettings(): Promise<void> {
    try {
      const settings = await api.fetchSettings();
      if (settings.panelWidths) {
        Object.assign(panelWidths.value, settings.panelWidths);
      }
      if (settings.editorWidth) {
        editorWidth.value = settings.editorWidth;
      }
      if (settings.collapsedPanels) {
        collapsedPanels.value = new Set(settings.collapsedPanels);
      }
      if (settings.editorCollapsed !== undefined) {
        editorCollapsed.value = settings.editorCollapsed;
      }
      if (settings.displayViewWidths) {
        displayViewWidths.value = settings.displayViewWidths;
      }
    } catch (e) {
      console.log('使用默认设置');
    }
  }

  return {
    panelWidths,
    editorWidth,
    collapsedPanels,
    editorCollapsed,
    displayViewWidths,
    getPanelWidth,
    setPanelWidth,
    resetPanelWidth,
    setEditorWidth,
    resetEditorWidth,
    togglePanel,
    isPanelCollapsed,
    toggleEditorCollapsed,
    isEditorCollapsed,
    setEditorCollapsed,
    getDisplayViewWidth,
    setDisplayViewWidth,
    resetDisplayViewWidth,
    expandAllPanels,
    collapseAllPanels,
    loadSettings
  };
});
