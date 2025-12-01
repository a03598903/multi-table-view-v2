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
  editorCollapsed?: boolean;
  displayViewWidths?: Record<string, number>;
  collapsedDisplayViews?: string[];
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
