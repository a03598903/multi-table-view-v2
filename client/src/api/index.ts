import axios from 'axios';
import type { TreeItem, PanelKey, ISettings, IReorderItem, IFolder } from '../types';
import { getPanelConfig } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// ==================== 实体API ====================

// 获取实体列表
export async function fetchPanelData(panelKey: PanelKey, parentId?: string): Promise<TreeItem[]> {
  const config = getPanelConfig(panelKey);
  if (!config) return [];

  let url = config.api;
  if (config.parentField && parentId) {
    url += `?${config.parentField}=${parentId}`;
  }

  const { data } = await api.get<TreeItem[]>(url);
  return data;
}

// 创建实体
export async function createEntity(panelKey: PanelKey, payload: Record<string, unknown>): Promise<TreeItem> {
  const config = getPanelConfig(panelKey);
  if (!config) throw new Error('Invalid panel key');

  const { data } = await api.post<TreeItem>(config.api, payload);
  return data;
}

// 更新实体
export async function updateEntity(panelKey: PanelKey, id: string, payload: Record<string, unknown>): Promise<TreeItem> {
  const config = getPanelConfig(panelKey);
  if (!config) throw new Error('Invalid panel key');

  const { data } = await api.put<TreeItem>(`${config.api}/${id}`, payload);
  return data;
}

// 删除实体
export async function deleteEntity(panelKey: PanelKey, id: string): Promise<void> {
  const config = getPanelConfig(panelKey);
  if (!config) throw new Error('Invalid panel key');

  await api.delete(`${config.api}/${id}`);
}

// ==================== 已选视图API ====================

// 获取已选视图
export async function fetchSelectedViews(): Promise<TreeItem[]> {
  const { data } = await api.get<TreeItem[]>('/selected');
  return data;
}

// 添加已选视图
export async function addSelectedView(viewId: string, folderId?: string): Promise<TreeItem> {
  const { data } = await api.post<TreeItem>('/selected', { view_id: viewId, folder_id: folderId });
  return data;
}

// 移除已选视图
export async function removeSelectedView(id: string): Promise<void> {
  await api.delete(`/selected/${id}`);
}

// 检查视图是否已选
export async function checkViewSelected(viewId: string): Promise<{ selected: boolean; id?: string }> {
  const { data } = await api.get<{ selected: boolean; id?: string }>(`/selected/check/${viewId}`);
  return data;
}

// ==================== 文件夹API ====================

// 获取文件夹列表
export async function fetchFolders(type: string, ownerId?: string): Promise<IFolder[]> {
  let url = `/folders?type=${type}`;
  if (ownerId) url += `&owner_id=${ownerId}`;
  const { data } = await api.get<IFolder[]>(url);
  return data;
}

// 创建文件夹
export async function createFolder(payload: { name?: string; type: string; parent_id?: string; owner_id?: string }): Promise<IFolder> {
  const { data } = await api.post<IFolder>('/folders', payload);
  return data;
}

// 更新文件夹
export async function updateFolder(id: string, payload: { name?: string; expanded?: number; parent_id?: string }): Promise<IFolder> {
  const { data } = await api.put<IFolder>(`/folders/${id}`, payload);
  return data;
}

// 删除文件夹
export async function deleteFolder(id: string): Promise<void> {
  await api.delete(`/folders/${id}`);
}

// ==================== 移动和排序API ====================

// 移动对象
export async function moveItem(type: string, id: string, folderId: string | null): Promise<void> {
  await api.put(`/move/${type}/${id}`, { folder_id: folderId });
}

// 批量重排序
export async function reorderItems(type: string, items: IReorderItem[]): Promise<void> {
  await api.put('/reorder', { type, items });
}

// ==================== 定位API ====================

// 视图定位信息接口
export interface IViewLocation {
  shareholder?: { id: string; name: string };
  company?: { id: string; name: string };
  project?: { id: string; name: string };
  table?: { id: string; name: string };
  view?: { id: string; name: string };
}

// 获取视图定位信息
export async function getViewLocation(viewId: string): Promise<IViewLocation | null> {
  try {
    const { data } = await api.get<IViewLocation>(`/views/${viewId}/location`);
    return data;
  } catch (e) {
    console.error('获取视图定位信息失败:', e);
    return null;
  }
}

// ==================== 设置API ====================

// 获取设置
export async function fetchSettings(): Promise<ISettings> {
  const { data } = await api.get<ISettings>('/settings');
  return data;
}

// 保存设置
export async function saveSettings(settings: Partial<ISettings>): Promise<void> {
  await api.put('/settings', settings);
}

export default api;
