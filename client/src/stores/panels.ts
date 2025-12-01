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

  // 展示的视图列表（最多20个）
  const displayedViews = ref<ISelectedView[]>([]);
  const MAX_DISPLAYED_VIEWS = 20;

  // 展示视图的折叠状态
  const collapsedDisplayViews = ref<Set<string>>(new Set());

  // 当前选中的面板索引（用于键盘导航）
  const activePanelIndex = ref<number>(0);

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
    // 从展示列表中移除
    removeDisplayedView(id);
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

  // ==================== 展示视图管理 ====================

  // 添加展示视图
  function addDisplayedView(view: ISelectedView): boolean {
    // 检查是否已存在
    if (displayedViews.value.some(v => v.id === view.id)) {
      return false;
    }
    // 检查数量限制
    if (displayedViews.value.length >= MAX_DISPLAYED_VIEWS) {
      return false;
    }
    displayedViews.value.push(view);
    // 默认收缩状态
    collapsedDisplayViews.value.add(view.id);
    return true;
  }

  // 移除展示视图
  function removeDisplayedView(viewId: string) {
    const index = displayedViews.value.findIndex(v => v.id === viewId);
    if (index !== -1) {
      displayedViews.value.splice(index, 1);
      collapsedDisplayViews.value.delete(viewId);
    }
  }

  // 切换展示视图折叠状态
  function toggleDisplayViewCollapse(viewId: string) {
    if (collapsedDisplayViews.value.has(viewId)) {
      collapsedDisplayViews.value.delete(viewId);
    } else {
      collapsedDisplayViews.value.add(viewId);
    }
  }

  // 检查展示视图是否折叠
  function isDisplayViewCollapsed(viewId: string): boolean {
    return collapsedDisplayViews.value.has(viewId);
  }

  // 重新排序展示视图
  function expandAllDisplayViews() {
    collapsedDisplayViews.value.clear();
  }

  // 折叠所有展示视图
  function collapseAllDisplayViews() {
    displayedViews.value.forEach(v => collapsedDisplayViews.value.add(v.id));
  }

  // 重新排序展示视图
  function reorderDisplayedViews(newOrder: ISelectedView[]) {
    displayedViews.value = newOrder;
  }

  // ==================== 定位功能 ====================

  // 定位到视图的相关对象（根据已选视图的信息定位左侧面板）
  async function locateToView(selectedView: ISelectedView): Promise<void> {
    // 获取视图的完整路径信息
    try {
      // 1. 获取视图信息
      const viewData = await api.fetchPanelData('view', selectedView.view_id);

      // 需要从服务端获取完整的层级信息
      // 调用专门的定位 API
      const locationInfo = await api.getViewLocation(selectedView.view_id);

      if (locationInfo) {
        // 依次选择各级对象
        if (locationInfo.shareholder) {
          const shareholderItem = findItemById(data.value.shareholder, locationInfo.shareholder.id);
          if (shareholderItem) {
            await selectItem('shareholder', shareholderItem);
          }
        }

        // 等待面板加载完成后继续选择
        await new Promise(resolve => setTimeout(resolve, 100));

        if (locationInfo.company) {
          const companyItem = findItemById(data.value.company, locationInfo.company.id);
          if (companyItem) {
            await selectItem('company', companyItem);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        if (locationInfo.project) {
          const projectItem = findItemById(data.value.project, locationInfo.project.id);
          if (projectItem) {
            await selectItem('project', projectItem);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        if (locationInfo.table) {
          const tableItem = findItemById(data.value.table, locationInfo.table.id);
          if (tableItem) {
            await selectItem('table', tableItem);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        if (locationInfo.view) {
          const viewItem = findItemById(data.value.view, locationInfo.view.id);
          if (viewItem) {
            selected.value.view = viewItem;
          }
        }
      }
    } catch (e) {
      console.error('定位失败:', e);
    }
  }

  // ==================== 面板导航 ====================

  // 设置活动面板索引
  function setActivePanelIndex(index: number) {
    const maxIndex = PANEL_CONFIGS.length; // 包括编辑器面板
    activePanelIndex.value = Math.max(0, Math.min(index, maxIndex));
  }

  // 切换到上一个面板
  function prevPanel() {
    setActivePanelIndex(activePanelIndex.value - 1);
  }

  // 切换到下一个面板
  function nextPanel() {
    setActivePanelIndex(activePanelIndex.value + 1);
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
    displayedViews,
    collapsedDisplayViews,
    activePanelIndex,
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
    addDisplayedView,
    removeDisplayedView,
    toggleDisplayViewCollapse,
    isDisplayViewCollapsed,
    expandAllDisplayViews,
    collapseAllDisplayViews,
    reorderDisplayedViews,
    locateToView,
    setActivePanelIndex,
    prevPanel,
    nextPanel,
    init
  };
});
