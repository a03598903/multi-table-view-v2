// 面板键类型
export type PanelKey = 'shareholder' | 'company' | 'project' | 'table' | 'view' | 'selected';

// 文件夹类型
export type FolderType =
  | 'shareholder_folder'
  | 'company_folder'
  | 'project_folder'
  | 'table_folder'
  | 'view_folder'
  | 'selected_folder';

// 树形项基础接口
export interface ITreeItemBase {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  folder_id?: string | null;
  created_at?: string;
}

// 文件夹
export interface IFolder extends ITreeItemBase {
  type: 'folder';
  parent_id: string | null;
  owner_id: string | null;
  expanded: number;
  children?: TreeItem[];
}

// 股东
export interface IShareholder extends ITreeItemBase {
  type: 'shareholder';
}

// 企业
export interface ICompany extends ITreeItemBase {
  type: 'company';
  shareholder_id: string;
}

// 项目
export interface IProject extends ITreeItemBase {
  type: 'project';
  company_id: string;
}

// 表格
export interface ITable extends ITreeItemBase {
  type: 'table';
  color: string;
  project_id: string;
}

// 视图
export interface IView extends ITreeItemBase {
  type: 'view';
  view_type: string;
  table_id: string;
}

// 已选视图
export interface ISelectedView extends ITreeItemBase {
  type: 'selected';
  view_id: string;
  view_name: string;
  view_type: string;
  table_name: string;
  table_color: string;
}

// 树形项联合类型
export type TreeItem = IFolder | IShareholder | ICompany | IProject | ITable | IView | ISelectedView;

// 面板配置
export interface IPanelConfig {
  key: PanelKey;
  title: string;
  icon: string;
  api: string;
  folderType: FolderType;
  parentKey: PanelKey | null;
  parentField: string | null;
}

// 面板配置列表
export const PANEL_CONFIGS: IPanelConfig[] = [
  { key: 'shareholder', title: '股东', icon: '👤', api: '/shareholders', folderType: 'shareholder_folder', parentKey: null, parentField: null },
  { key: 'company', title: '企业', icon: '🏢', api: '/companies', folderType: 'company_folder', parentKey: 'shareholder', parentField: 'shareholder_id' },
  { key: 'project', title: '项目', icon: '📋', api: '/projects', folderType: 'project_folder', parentKey: 'company', parentField: 'company_id' },
  { key: 'table', title: '表格', icon: '📊', api: '/tables', folderType: 'table_folder', parentKey: 'project', parentField: 'project_id' },
  { key: 'view', title: '视图', icon: '👁️', api: '/views', folderType: 'view_folder', parentKey: 'table', parentField: 'table_id' },
  { key: 'selected', title: '已选视图', icon: '⭐', api: '/selected', folderType: 'selected_folder', parentKey: null, parentField: null }
];

// 获取面板配置
export function getPanelConfig(key: PanelKey): IPanelConfig | undefined {
  return PANEL_CONFIGS.find(p => p.key === key);
}

// 设置接口
export interface ISettings {
  panelWidths: Record<PanelKey, number>;
  editorWidth: number;
  collapsedPanels: PanelKey[];
  hiddenPanels?: PanelKey[];
  editorCollapsed?: boolean;
  displayViewWidths?: Record<string, number>;
  collapsedDisplayViews?: string[];
  // 临时面板数据
  tempPanels?: ITempPanelSettings[];
  // 编辑网格布局
  gridLayout?: IGridLayoutConfig;
  editorPanels?: IEditorPanelData[];
}

// 临时面板保存设置
export interface ITempPanelSettings {
  id: string;
  type: 'table' | 'view';
  tableId: string;
  viewId?: string;
  columns: { key: string; label: string; visible: boolean }[];
  filters: { column: string; operator: string; value: string }[];
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';
  tableData: Record<string, any>[];
  collapsed: boolean;
  width: number;
}

// 右键菜单目标
export interface IContextTarget {
  id: string;
  type: string;
  panelKey: PanelKey;
}

// 重排序项
export interface IReorderItem {
  id: string;
  sort_order: number;
  folder_id?: string | null;
  parent_id?: string | null;
}

// ==================== 视图配置类型 ====================

// 视图类型
export type ViewType = 'grid' | 'kanban' | 'calendar' | 'gantt';

// 列配置
export interface IColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'url' | 'email';
  visible: boolean;
  width?: number;
  options?: string[];  // select 类型的选项
}

// 筛选条件
export interface IFilterConfig {
  column: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte' | 'isEmpty' | 'isNotEmpty';
  value: string;
}

// 排序规则
export interface ISortRule {
  column: string;
  order: 'asc' | 'desc';
}

// 视图配置基础接口
export interface IViewConfigBase {
  id: string;
  view_id: string;
  config_type: ViewType;
  filters?: IFilterConfig[];
  sort_rules?: ISortRule[];
  created_at?: string;
  updated_at?: string;
}

// 表格视图配置
export interface ITableViewConfig extends IViewConfigBase {
  config_type: 'grid';
  columns: IColumnConfig[];
  row_height?: 'compact' | 'normal' | 'expanded';
  frozen_columns?: number;
}

// 看板视图配置
export interface IKanbanViewConfig extends IViewConfigBase {
  config_type: 'kanban';
  group_field: string;
  card_title_field: string;
  card_fields?: string[];
  card_cover_field?: string;
  group_colors?: Record<string, string>;
}

// 日历视图配置
export interface ICalendarViewConfig extends IViewConfigBase {
  config_type: 'calendar';
  date_field: string;
  end_date_field?: string;
  title_field: string;
  color_field?: string;
  default_view?: 'month' | 'week' | 'day';
}

// 甘特图视图配置
export interface IGanttViewConfig extends IViewConfigBase {
  config_type: 'gantt';
  start_date_field: string;
  end_date_field: string;
  title_field: string;
  progress_field?: string;
  dependency_field?: string;
  time_scale?: 'day' | 'week' | 'month';
}

// 视图配置联合类型
export type IViewConfig = ITableViewConfig | IKanbanViewConfig | ICalendarViewConfig | IGanttViewConfig;

// ==================== 编辑网格布局类型 ====================

// 列位置类型
export type ColumnPosition = 'left-3' | 'left-2' | 'left-1' | 'center' | 'right-1' | 'right-2' | 'right-3';

// 编辑面板位置
export interface IEditorPosition {
  row: number;
  column: ColumnPosition;
}

// 编辑面板数据
export interface IEditorPanelData {
  id: string;
  viewId: string;
  view: ISelectedView;
  position: IEditorPosition;
}

// 网格布局配置
export interface IGridLayoutConfig {
  rowCount: number;        // 默认1
  leftColumnCount: number; // 默认3
  rightColumnCount: number;// 默认3
}

// 位置选择器状态
export interface IPositionSelectorState {
  visible: boolean;
  view: ISelectedView | null;
  anchorRect: DOMRect | null;
}
