import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { PanelKey, ISettings } from '../types';
import * as api from '../api';

const DEFAULT_PANEL_WIDTH = 30;
const DEFAULT_EDITOR_WIDTH = 70;

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

  // 展开所有面板
  function expandAllPanels(): void {
    collapsedPanels.value.clear();
    scheduleSave();
  }

  // 折叠所有面板
  function collapseAllPanels(keys: PanelKey[]): void {
    keys.forEach(key => collapsedPanels.value.add(key));
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
          collapsedPanels: Array.from(collapsedPanels.value) as PanelKey[]
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
    } catch (e) {
      console.log('使用默认设置');
    }
  }

  return {
    panelWidths,
    editorWidth,
    collapsedPanels,
    getPanelWidth,
    setPanelWidth,
    resetPanelWidth,
    setEditorWidth,
    resetEditorWidth,
    togglePanel,
    isPanelCollapsed,
    expandAllPanels,
    collapseAllPanels,
    loadSettings
  };
});
