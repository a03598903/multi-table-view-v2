import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { PanelKey, TreeItem, ISelectedView, ITable, IView, ITempPanelSettings } from '../types';
import { PANEL_CONFIGS, getPanelConfig } from '../types';
import * as api from '../api';

// 临时面板数据接口
export interface ITempPanelData {
  id: string;
  type: 'table' | 'view';
  table: ITable;
  view?: IView;
  tableData: Record<string, any>[];
  columns: { key: string; label: string; visible: boolean }[];
  filters: { column: string; operator: string; value: string }[];
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';
  collapsed: boolean;
  width: number;
}

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

  // 临时面板列表
  const tempPanels = ref<ITempPanelData[]>([]);

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

  // ==================== 临时面板管理 ====================

  // 保存防抖
  let tempPanelSaveTimeout: ReturnType<typeof setTimeout> | null = null;

  // 调度保存临时面板数据
  function scheduleTempPanelSave(): void {
    if (tempPanelSaveTimeout) {
      clearTimeout(tempPanelSaveTimeout);
    }
    tempPanelSaveTimeout = setTimeout(async () => {
      try {
        const tempPanelSettings: ITempPanelSettings[] = tempPanels.value.map(p => ({
          id: p.id,
          type: p.type,
          tableId: p.table.id,
          viewId: p.view?.id,
          columns: p.columns,
          filters: p.filters,
          sortBy: p.sortBy,
          sortOrder: p.sortOrder,
          tableData: p.tableData,
          collapsed: p.collapsed,
          width: p.width
        }));
        await api.saveSettings({ tempPanels: tempPanelSettings });
      } catch (e) {
        console.error('保存临时面板设置失败', e);
      }
    }, 500);
  }

  // 生成示范表格数据
  function generateSampleData(table: ITable): Record<string, any>[] {
    const sampleData: Record<string, any>[] = [];
    for (let i = 1; i <= 10; i++) {
      sampleData.push({
        id: `${table.id}-row-${i}`,
        序号: i,
        名称: `${table.name}-项目${i}`,
        状态: ['进行中', '已完成', '待处理'][i % 3],
        创建日期: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        金额: Math.floor(Math.random() * 100000),
        负责人: ['张三', '李四', '王五', '赵六'][i % 4],
        备注: `这是${table.name}的第${i}条记录`
      });
    }
    return sampleData;
  }

  // 生成默认列配置
  function generateDefaultColumns(): { key: string; label: string; visible: boolean }[] {
    return [
      { key: '序号', label: '序号', visible: true },
      { key: '名称', label: '名称', visible: true },
      { key: '状态', label: '状态', visible: true },
      { key: '创建日期', label: '创建日期', visible: true },
      { key: '金额', label: '金额', visible: true },
      { key: '负责人', label: '负责人', visible: true },
      { key: '备注', label: '备注', visible: true }
    ];
  }

  // 打开表格临时面板（显示默认视图）
  function openTableTempPanel(table: ITable) {
    // 检查是否已存在
    const existing = tempPanels.value.find(p => p.type === 'table' && p.table.id === table.id);
    if (existing) {
      // 如果已存在但是折叠状态，展开它
      existing.collapsed = false;
      scheduleTempPanelSave();
      return;
    }

    const panelData: ITempPanelData = {
      id: `temp-table-${table.id}`,
      type: 'table',
      table,
      tableData: generateSampleData(table),
      columns: generateDefaultColumns(),
      filters: [],
      sortBy: null,
      sortOrder: 'asc',
      collapsed: true, // 默认以收缩形式出现
      width: 50
    };

    tempPanels.value.push(panelData);
    scheduleTempPanelSave();
  }

  // 打开视图临时面板
  function openViewTempPanel(view: IView, table: ITable) {
    // 检查是否已存在
    const existing = tempPanels.value.find(p => p.type === 'view' && p.view?.id === view.id);
    if (existing) {
      // 如果已存在但是折叠状态，展开它
      existing.collapsed = false;
      scheduleTempPanelSave();
      return;
    }

    // 根据视图类型设置不同的列可见性和筛选条件
    const columns = generateDefaultColumns();

    // 根据视图类型调整列可见性
    if (view.view_type === 'kanban') {
      columns.find(c => c.key === '备注')!.visible = false;
      columns.find(c => c.key === '创建日期')!.visible = false;
    } else if (view.view_type === 'calendar') {
      columns.find(c => c.key === '金额')!.visible = false;
      columns.find(c => c.key === '备注')!.visible = false;
    }

    const panelData: ITempPanelData = {
      id: `temp-view-${view.id}`,
      type: 'view',
      table,
      view,
      tableData: generateSampleData(table),
      columns,
      filters: [],
      sortBy: '序号',
      sortOrder: 'asc',
      collapsed: true, // 默认以收缩形式出现
      width: 50
    };

    tempPanels.value.push(panelData);
    scheduleTempPanelSave();
  }

  // 关闭临时面板
  function closeTempPanel(panelId: string) {
    const index = tempPanels.value.findIndex(p => p.id === panelId);
    if (index !== -1) {
      tempPanels.value.splice(index, 1);
      scheduleTempPanelSave();
    }
  }

  // 切换临时面板折叠状态
  function toggleTempPanelCollapsed(panelId: string) {
    const panel = tempPanels.value.find(p => p.id === panelId);
    if (panel) {
      panel.collapsed = !panel.collapsed;
      scheduleTempPanelSave();
    }
  }

  // 设置临时面板宽度
  function setTempPanelWidth(panelId: string, width: number) {
    const panel = tempPanels.value.find(p => p.id === panelId);
    if (panel) {
      panel.width = width;
      scheduleTempPanelSave();
    }
  }

  // 更新临时面板的列可见性
  function updateTempPanelColumn(panelId: string, columnKey: string, visible: boolean) {
    const panel = tempPanels.value.find(p => p.id === panelId);
    if (panel) {
      const column = panel.columns.find(c => c.key === columnKey);
      if (column) {
        column.visible = visible;
        scheduleTempPanelSave();
      }
    }
  }

  // 更新临时面板的筛选条件
  function updateTempPanelFilters(panelId: string, filters: { column: string; operator: string; value: string }[]) {
    const panel = tempPanels.value.find(p => p.id === panelId);
    if (panel) {
      panel.filters = filters;
      scheduleTempPanelSave();
    }
  }

  // 更新临时面板的排序
  function updateTempPanelSort(panelId: string, sortBy: string | null, sortOrder: 'asc' | 'desc') {
    const panel = tempPanels.value.find(p => p.id === panelId);
    if (panel) {
      panel.sortBy = sortBy;
      panel.sortOrder = sortOrder;
      scheduleTempPanelSave();
    }
  }

  // 更新临时面板的表格数据（单元格编辑）
  function updateTempPanelCellData(panelId: string, rowId: string, columnKey: string, value: any) {
    const panel = tempPanels.value.find(p => p.id === panelId);
    if (panel) {
      const row = panel.tableData.find(r => r.id === rowId);
      if (row) {
        row[columnKey] = value;
        scheduleTempPanelSave();
      }
    }
  }

  // 加载保存的临时面板
  async function loadTempPanels(settings: ITempPanelSettings[]): Promise<void> {
    tempPanels.value = [];

    for (const s of settings) {
      // 从服务器获取真实的表格信息
      const tableData = await api.fetchTable(s.tableId);
      const table: ITable = tableData ? (tableData as ITable) : {
        id: s.tableId,
        code: '',
        name: `表格-${s.tableId}`,
        type: 'table',
        color: '#3b82f6',
        project_id: '',
        sort_order: 0
      };

      // 从服务器获取真实的视图信息
      let view: IView | undefined;
      if (s.viewId) {
        const viewData = await api.fetchView(s.viewId);
        view = viewData ? (viewData as IView) : {
          id: s.viewId,
          code: '',
          name: `视图-${s.viewId}`,
          type: 'view',
          view_type: 'grid',
          table_id: s.tableId,
          sort_order: 0
        };
      }

      const panelData: ITempPanelData = {
        id: s.id,
        type: s.type,
        table,
        view,
        tableData: s.tableData || [],
        columns: s.columns || generateDefaultColumns(),
        filters: s.filters || [],
        sortBy: s.sortBy,
        sortOrder: s.sortOrder || 'asc',
        collapsed: s.collapsed ?? true,
        width: s.width || 50
      };

      tempPanels.value.push(panelData);
    }
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
    tempPanels,
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
    openTableTempPanel,
    openViewTempPanel,
    closeTempPanel,
    toggleTempPanelCollapsed,
    setTempPanelWidth,
    updateTempPanelColumn,
    updateTempPanelFilters,
    updateTempPanelSort,
    updateTempPanelCellData,
    loadTempPanels,
    init
  };
});
