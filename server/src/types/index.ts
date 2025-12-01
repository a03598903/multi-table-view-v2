// 实体类型
export type EntityType = 'shareholder' | 'company' | 'project' | 'table' | 'view' | 'selected';

// 文件夹类型
export type FolderType =
  | 'shareholder_folder'
  | 'company_folder'
  | 'project_folder'
  | 'table_folder'
  | 'view_folder'
  | 'selected_folder';

// 基础实体接口
export interface IBaseEntity {
  id: string;
  code: string;
  name: string;
  folder_id: string | null;
  sort_order: number;
  created_at: string;
}

// 股东
export interface IShareholder extends IBaseEntity {
  type: 'shareholder';
}

// 企业
export interface ICompany extends IBaseEntity {
  type: 'company';
  shareholder_id: string;
}

// 项目
export interface IProject extends IBaseEntity {
  type: 'project';
  company_id: string;
}

// 表格
export interface ITable extends IBaseEntity {
  type: 'table';
  color: string;
  project_id: string;
}

// 视图
export interface IView extends IBaseEntity {
  type: 'view';
  view_type: string;
  table_id: string;
}

// 已选视图
export interface ISelectedView {
  id: string;
  code: string;
  view_id: string;
  folder_id: string | null;
  sort_order: number;
  created_at: string;
  type: 'selected';
  // 关联字段
  view_name?: string;
  view_type?: string;
  table_name?: string;
  table_color?: string;
}

// 文件夹
export interface IFolder {
  id: string;
  code: string;
  name: string;
  type: FolderType;
  parent_id: string | null;
  owner_id: string | null;
  expanded: number;
  sort_order: number;
  created_at: string;
  children?: TreeItem[];
}

// 树形项（联合类型）
export type TreeItem =
  | (IShareholder & { children?: TreeItem[] })
  | (ICompany & { children?: TreeItem[] })
  | (IProject & { children?: TreeItem[] })
  | (ITable & { children?: TreeItem[] })
  | (IView & { children?: TreeItem[] })
  | (ISelectedView & { children?: TreeItem[] })
  | IFolder;

// 面板配置
export interface IPanelConfig {
  key: EntityType | 'selected';
  title: string;
  icon: string;
  api: string;
  folderType: FolderType;
  parentKey: EntityType | null;
  parentField: string | null;
}

// 设置
export interface ISettings {
  panelWidths: Record<string, number>;
  editorWidth: number;
  collapsedPanels: string[];
}

// API响应
export interface IApiResponse<T> {
  data?: T;
  error?: string;
}

// 重排序请求项
export interface IReorderItem {
  id: string;
  sort_order: number;
  folder_id?: string | null;
  parent_id?: string | null;
}
