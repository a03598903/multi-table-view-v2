import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  IEditorPanelData,
  IEditorPosition,
  IGridLayoutConfig,
  IPositionSelectorState,
  ISelectedView,
  ColumnPosition
} from '../types';
import * as api from '../api';

// 列位置顺序（从左到右）
export const COLUMN_ORDER: ColumnPosition[] = [
  'left-3', 'left-2', 'left-1',
  'center',
  'right-1', 'right-2', 'right-3'
];

// 列位置标签
export const COLUMN_LABELS: Record<ColumnPosition, string> = {
  'left-3': '左3',
  'left-2': '左2',
  'left-1': '左1',
  'center': '中心',
  'right-1': '右1',
  'right-2': '右2',
  'right-3': '右3'
};

export const useEditorGridStore = defineStore('editorGrid', () => {
  // 网格布局配置
  const gridConfig = ref<IGridLayoutConfig>({
    rowCount: 1,
    leftColumnCount: 3,
    rightColumnCount: 3
  });

  // 编辑面板列表
  const editorPanels = ref<IEditorPanelData[]>([]);

  // 位置选择器状态
  const positionSelector = ref<IPositionSelectorState>({
    visible: false,
    view: null,
    anchorRect: null
  });

  // 计算可见列
  const visibleColumns = computed(() => {
    const left = COLUMN_ORDER.slice(3 - gridConfig.value.leftColumnCount, 3);
    const center: ColumnPosition[] = ['center'];
    const right = COLUMN_ORDER.slice(4, 4 + gridConfig.value.rightColumnCount);
    return [...left, ...center, ...right];
  });

  // 计算占用的位置
  const occupiedPositions = computed(() => {
    const map = new Map<string, IEditorPanelData>();
    editorPanels.value.forEach(panel => {
      const key = `${panel.position.row}-${panel.position.column}`;
      map.set(key, panel);
    });
    return map;
  });

  // 检查位置是否被占用
  function isPositionOccupied(row: number, column: ColumnPosition): boolean {
    return occupiedPositions.value.has(`${row}-${column}`);
  }

  // 获取指定位置的面板
  function getPanelAtPosition(row: number, column: ColumnPosition): IEditorPanelData | undefined {
    return occupiedPositions.value.get(`${row}-${column}`);
  }

  // 打开位置选择器
  function openPositionSelector(view: ISelectedView, anchorRect: DOMRect) {
    positionSelector.value = {
      visible: true,
      view,
      anchorRect
    };
  }

  // 关闭位置选择器
  function closePositionSelector() {
    positionSelector.value = {
      visible: false,
      view: null,
      anchorRect: null
    };
  }

  // 添加编辑面板到指定位置
  function addEditorPanel(view: ISelectedView, position: IEditorPosition): boolean {
    // 检查位置是否已占用
    if (isPositionOccupied(position.row, position.column)) {
      return false;
    }

    // 如果需要新行，自动增加行数
    if (position.row >= gridConfig.value.rowCount) {
      gridConfig.value.rowCount = position.row + 1;
    }

    const panel: IEditorPanelData = {
      id: `editor-${view.view_id}-${Date.now()}`,
      viewId: view.view_id,
      view,
      position
    };

    editorPanels.value.push(panel);
    scheduleSave();
    return true;
  }

  // 移除编辑面板
  function removeEditorPanel(panelId: string) {
    const index = editorPanels.value.findIndex(p => p.id === panelId);
    if (index !== -1) {
      editorPanels.value.splice(index, 1);
      // 清理空行
      cleanupEmptyRows();
      scheduleSave();
    }
  }

  // 移动编辑面板
  function moveEditorPanel(panelId: string, newPosition: IEditorPosition): boolean {
    if (isPositionOccupied(newPosition.row, newPosition.column)) {
      return false;
    }

    const panel = editorPanels.value.find(p => p.id === panelId);
    if (panel) {
      panel.position = newPosition;

      // 如果需要新行，自动增加行数
      if (newPosition.row >= gridConfig.value.rowCount) {
        gridConfig.value.rowCount = newPosition.row + 1;
      }

      scheduleSave();
      return true;
    }
    return false;
  }

  // 清理空行
  function cleanupEmptyRows() {
    if (editorPanels.value.length === 0) {
      gridConfig.value.rowCount = 1;
      return;
    }

    // 找出所有使用的行
    const usedRows = new Set(editorPanels.value.map(p => p.position.row));
    const maxUsedRow = Math.max(...usedRows);
    gridConfig.value.rowCount = Math.max(1, maxUsedRow + 1);
  }

  // 增加一行
  function addRow() {
    gridConfig.value.rowCount++;
    scheduleSave();
  }

  // 设置列数
  function setColumnCount(left: number, right: number) {
    gridConfig.value.leftColumnCount = Math.min(3, Math.max(0, left));
    gridConfig.value.rightColumnCount = Math.min(3, Math.max(0, right));
    scheduleSave();
  }

  // 保存防抖
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  function scheduleSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        await api.saveSettings({
          gridLayout: gridConfig.value,
          editorPanels: editorPanels.value
        });
      } catch (e) {
        console.error('保存编辑网格设置失败', e);
      }
    }, 500);
  }

  // 加载设置
  async function loadSettings(): Promise<void> {
    try {
      const settings = await api.fetchSettings();
      if (settings.gridLayout) {
        gridConfig.value = settings.gridLayout;
      }
      if (settings.editorPanels) {
        editorPanels.value = settings.editorPanels;
      }
    } catch (e) {
      console.log('使用默认编辑网格设置');
    }
  }

  return {
    gridConfig,
    editorPanels,
    positionSelector,
    visibleColumns,
    occupiedPositions,
    isPositionOccupied,
    getPanelAtPosition,
    openPositionSelector,
    closePositionSelector,
    addEditorPanel,
    removeEditorPanel,
    moveEditorPanel,
    cleanupEmptyRows,
    addRow,
    setColumnCount,
    loadSettings
  };
});
