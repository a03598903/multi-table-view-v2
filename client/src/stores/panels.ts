import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PanelKey, TreeItem, ISelectedView } from '../types';
import { PANEL_CONFIGS, getPanelConfig } from '../types';
import * as api from '../api';

export const usePanelsStore = defineStore('panels', () => {
  // 状态
  const data = ref<Record<PanelKey, TreeItem[]>>({
    shareholder: [],
    company: [],
    project: [],
    table: [],
    view: [],
    selected: []
  });

  const selected = ref<Record<PanelKey, TreeItem | null>>({
    shareholder: null,
    company: null,
    project: null,
    table: null,
    view: null,
    selected: null
  });

  const loading = ref<Record<PanelKey, boolean>>({
    shareholder: false,
    company: false,
    project: false,
    table: false,
    view: false,
    selected: false
  });

  const currentEditView = ref<ISelectedView | null>(null);

  // 已选视图映射 (view_id -> selected_id)
  const selectedViewsMap = ref<Map<string, string>>(new Map());

  // 正在编辑的项目 ID
  const editingItemId = ref<string | null>(null);

  // 计算属性
  const getPanelData = computed(() => (key: PanelKey) => data.value[key]);
  const getSelectedItem = computed(() => (key: PanelKey) => selected.value[key]);
  const isLoading = computed(() => (key: PanelKey) => loading.value[key]);

  // 更新已选视图映射
  function updateSelectedMap(items: TreeItem[]) {
    selectedViewsMap.value.clear();
    const traverse = (list: TreeItem[]) => {
      list.forEach(item => {
        if (item.type === 'selected') {
          const sv = item as ISelectedView;
          selectedViewsMap.value.set(sv.view_id, sv.id);
        }
        if ('children' in item && item.children) {
          traverse(item.children);
        }
      });
    };
    traverse(items);
  }

  // 检查视图是否已选
  function isViewSelected(viewId: string): boolean {
    return selectedViewsMap.value.has(viewId);
  }

  // 获取已选视图ID
  function getSelectedViewId(viewId: string): string | undefined {
    return selectedViewsMap.value.get(viewId);
  }

  // 获取第一个非文件夹项目
  function getFirstItem(items: TreeItem[]): TreeItem | null {
    for (const item of items) {
      if (item.type !== 'folder') return item;
      if ('children' in item && item.children) {
        const found = getFirstItem(item.children);
        if (found) return found;
      }
    }
    return null;
  }

  // 加载面板数据并级联选择
  async function loadPanelAndSelect(panelKey: PanelKey, autoSelect = true): Promise<void> {
    const config = getPanelConfig(panelKey);
    if (!config) return;

    loading.value[panelKey] = true;

    try {
      // 获取父级ID
      let parentId: string | undefined;
      if (config.parentKey) {
        parentId = selected.value[config.parentKey]?.id;
        if (!parentId) {
          // 没有选中父级，清空当前和后续面板
          data.value[panelKey] = [];
          selected.value[panelKey] = null;
          clearSubsequentPanels(panelKey);
          return;
        }
      }

      // 加载数据
      if (panelKey === 'selected') {
        data.value[panelKey] = await api.fetchSelectedViews();
        updateSelectedMap(data.value[panelKey]);
      } else {
        data.value[panelKey] = await api.fetchPanelData(panelKey, parentId);
      }

      // 自动选择第一项
      if (autoSelect && data.value[panelKey].length > 0) {
        const firstItem = getFirstItem(data.value[panelKey]);
        if (firstItem) {
          selected.value[panelKey] = firstItem;
          if (panelKey === 'selected') {
            currentEditView.value = firstItem as ISelectedView;
          }
        }
      } else if (data.value[panelKey].length === 0) {
        selected.value[panelKey] = null;
        if (panelKey === 'selected') {
          currentEditView.value = null;
        }
      }

      // 级联加载下一个面板
      const panelIndex = PANEL_CONFIGS.findIndex(p => p.key === panelKey);
      if (panelIndex < PANEL_CONFIGS.length - 1) {
        const nextPanel = PANEL_CONFIGS[panelIndex + 1];
        if (nextPanel.parentKey === panelKey) {
          await loadPanelAndSelect(nextPanel.key, autoSelect);
        }
      }
    } finally {
      loading.value[panelKey] = false;
    }
  }

  // 加载面板数据（不自动选择）
  async function loadPanel(panelKey: PanelKey): Promise<void> {
    return loadPanelAndSelect(panelKey, false);
  }

  // 清空后续面板
  function clearSubsequentPanels(panelKey: PanelKey): void {
    const panelIndex = PANEL_CONFIGS.findIndex(p => p.key === panelKey);
    for (let i = panelIndex + 1; i < PANEL_CONFIGS.length; i++) {
      const nextPanel = PANEL_CONFIGS[i];
      if (nextPanel.parentKey) {
        data.value[nextPanel.key] = [];
        selected.value[nextPanel.key] = null;
      }
    }
  }

  // 选择项目
  async function selectItem(panelKey: PanelKey, item: TreeItem): Promise<void> {
    selected.value[panelKey] = item;

    if (panelKey === 'selected') {
      currentEditView.value = item as ISelectedView;
    }

    // 级联加载下一个面板
    const panelIndex = PANEL_CONFIGS.findIndex(p => p.key === panelKey);
    if (panelIndex < PANEL_CONFIGS.length - 1) {
      const nextPanel = PANEL_CONFIGS[panelIndex + 1];
      if (nextPanel.parentKey === panelKey) {
        await loadPanelAndSelect(nextPanel.key, true);
      }
    }
  }

  // 切换视图选择
  async function toggleViewSelection(viewId: string): Promise<void> {
    if (selectedViewsMap.value.has(viewId)) {
      const selectedId = selectedViewsMap.value.get(viewId)!;
      await api.removeSelectedView(selectedId);
      selectedViewsMap.value.delete(viewId);
    } else {
      const result = await api.addSelectedView(viewId);
      if (result.type === 'selected') {
        const sv = result as ISelectedView;
        selectedViewsMap.value.set(sv.view_id, sv.id);
      }
    }
    await loadPanel('selected');
  }

  // 移除已选视图
  async function removeSelectedView(id: string, viewId: string): Promise<void> {
    await api.removeSelectedView(id);
    selectedViewsMap.value.delete(viewId);
    await loadPanel('selected');
    if (currentEditView.value?.id === id) {
      currentEditView.value = null;
    }
  }

  // 查找项目
  function findItemById(items: TreeItem[], id: string): TreeItem | null {
    for (const item of items) {
      if (item.id === id) return item;
      if ('children' in item && item.children) {
        const found = findItemById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  // 设置正在编辑的项目 ID
  function setEditingItemId(id: string | null) {
    editingItemId.value = id;
  }

  // 初始化
  async function init(): Promise<void> {
    await loadPanelAndSelect('shareholder', true);
    await loadPanelAndSelect('selected', true);
  }

  return {
    data,
    selected,
    loading,
    currentEditView,
    selectedViewsMap,
    editingItemId,
    getPanelData,
    getSelectedItem,
    isLoading,
    isViewSelected,
    getSelectedViewId,
    loadPanelAndSelect,
    loadPanel,
    selectItem,
    toggleViewSelection,
    removeSelectedView,
    findItemById,
    setEditingItemId,
    init
  };
});
