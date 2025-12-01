import { query, run, generateId, generateCode, saveDatabase } from '../database';
import type { IBaseEntity, IFolder, TreeItem, IReorderItem } from '../types';

// 通用服务基类
export class BaseService {
  protected tableName: string;
  protected folderType: string;
  protected parentField: string | null;

  constructor(tableName: string, folderType: string, parentField: string | null = null) {
    this.tableName = tableName;
    this.folderType = folderType;
    this.parentField = parentField;
  }

  // 获取列表（树形结构）
  getAll(ownerId?: string): TreeItem[] {
    // 获取文件夹
    let folderSql = `SELECT * FROM folders WHERE type = ?`;
    const folderParams: (string | null)[] = [this.folderType];

    if (ownerId) {
      folderSql += ` AND owner_id = ?`;
      folderParams.push(ownerId);
    } else if (this.parentField) {
      folderSql += ` AND owner_id IS NULL`;
    }

    folderSql += ` ORDER BY sort_order`;
    const folders = query<IFolder>(folderSql, folderParams);

    // 获取实体
    let itemSql = `SELECT *, '${this.getEntityType()}' as type FROM ${this.tableName}`;
    const itemParams: string[] = [];

    if (this.parentField && ownerId) {
      itemSql += ` WHERE ${this.parentField} = ?`;
      itemParams.push(ownerId);
    }

    itemSql += ` ORDER BY sort_order`;
    const items = query<IBaseEntity>(itemSql, itemParams);

    return this.buildTree(folders, items);
  }

  // 获取单个
  getById(id: string): IBaseEntity | null {
    const results = query<IBaseEntity>(`SELECT *, '${this.getEntityType()}' as type FROM ${this.tableName} WHERE id = ?`, [id]);
    return results[0] || null;
  }

  // 创建
  create(data: Partial<IBaseEntity> & Record<string, unknown>, cascade = true): IBaseEntity {
    const id = generateId();
    const code = generateCode();
    const name = (data.name as string) || '默认名称';
    const folderId = (data.folder_id as string) || null;
    const sortOrder = Date.now();

    // 构建动态SQL
    const fields = ['id', 'code', 'name', 'folder_id', 'sort_order'];
    const values: unknown[] = [id, code, name, folderId, sortOrder];

    // 添加特定字段
    if (this.parentField && data[this.parentField]) {
      fields.push(this.parentField);
      values.push(data[this.parentField] as string);
    }

    // 表格特有的color字段
    if (this.tableName === 'tables') {
      fields.push('color');
      values.push((data.color as string) || '#3b82f6');
    }

    // 视图特有的view_type字段
    if (this.tableName === 'views') {
      fields.push('view_type');
      values.push((data.view_type as string) || 'grid');
    }

    const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`;
    run(sql, values);

    // 级联创建子对象
    if (cascade) {
      this.cascadeCreate(id);
    }

    return this.getById(id)!;
  }

  // 更新
  update(id: string, data: Partial<IBaseEntity> & Record<string, unknown>): IBaseEntity | null {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }

    if ('folder_id' in data) {
      updates.push('folder_id = ?');
      values.push(data.folder_id);
    }

    if (data.sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(data.sort_order);
    }

    // 表格特有的color字段
    if (this.tableName === 'tables' && data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }

    // 视图特有的view_type字段
    if (this.tableName === 'views' && data.view_type !== undefined) {
      updates.push('view_type = ?');
      values.push(data.view_type);
    }

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    run(`UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`, values);

    return this.getById(id);
  }

  // 删除
  delete(id: string): boolean {
    const result = run(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    return result.changes > 0;
  }

  // 移动到文件夹
  move(id: string, folderId: string | null): boolean {
    const result = run(`UPDATE ${this.tableName} SET folder_id = ? WHERE id = ?`, [folderId, id]);
    return result.changes > 0;
  }

  // 批量重排序
  reorder(items: IReorderItem[]): boolean {
    for (const item of items) {
      run(`UPDATE ${this.tableName} SET sort_order = ?, folder_id = ? WHERE id = ?`, [item.sort_order, item.folder_id || null, item.id]);
    }
    saveDatabase();
    return true;
  }

  // 构建树形结构
  protected buildTree(folders: IFolder[], items: IBaseEntity[]): TreeItem[] {
    const buildLevel = (parentId: string | null = null): TreeItem[] => {
      const result: TreeItem[] = [];

      // 添加文件夹（处理 null、undefined、空字符串的情况）
      folders.filter(f => {
        const fParentId = f.parent_id || null;
        return fParentId === parentId;
      }).forEach(folder => {
        result.push({
          ...folder,
          type: 'folder',
          children: buildLevel(folder.id)
        } as IFolder);
      });

      // 添加实体（处理 null、undefined、空字符串的情况）
      items.filter(i => {
        const iFolderId = i.folder_id || null;
        return iFolderId === parentId;
      }).forEach(item => {
        result.push(item as TreeItem);
      });

      return result.sort((a, b) => a.sort_order - b.sort_order);
    };

    return buildLevel(null);
  }

  // 获取实体类型
  protected getEntityType(): string {
    const typeMap: Record<string, string> = {
      shareholders: 'shareholder',
      companies: 'company',
      projects: 'project',
      tables: 'table',
      views: 'view',
      selected_views: 'selected'
    };
    return typeMap[this.tableName] || this.tableName;
  }

  // 级联创建子对象
  protected cascadeCreate(parentId: string): void {
    const cascade: Record<string, { service: () => BaseService; next: string | null }> = {
      shareholders: {
        service: () => new BaseService('companies', 'company_folder', 'shareholder_id'),
        next: 'companies'
      },
      companies: {
        service: () => new BaseService('projects', 'project_folder', 'company_id'),
        next: 'projects'
      },
      projects: {
        service: () => new BaseService('tables', 'table_folder', 'project_id'),
        next: 'tables'
      },
      tables: {
        service: () => new BaseService('views', 'view_folder', 'table_id'),
        next: null
      }
    };

    const config = cascade[this.tableName];
    if (!config) return;

    const childService = config.service();
    const parentFieldName = {
      shareholders: 'shareholder_id',
      companies: 'company_id',
      projects: 'project_id',
      tables: 'table_id'
    }[this.tableName];

    if (parentFieldName) {
      childService.create({ [parentFieldName]: parentId }, config.next !== null);
    }
  }
}

// 文件夹服务
export class FolderService {
  // 获取文件夹列表
  getByType(type: string, ownerId?: string): IFolder[] {
    let sql = 'SELECT * FROM folders WHERE type = ?';
    const params: (string | null)[] = [type];

    if (ownerId) {
      sql += ' AND owner_id = ?';
      params.push(ownerId);
    }

    sql += ' ORDER BY sort_order';
    return query<IFolder>(sql, params);
  }

  // 创建文件夹
  create(data: { name?: string; type: string; parent_id?: string | null; owner_id?: string | null }): IFolder {
    const id = generateId();
    const code = generateCode();
    const name = data.name || '默认名称';
    const parentId = data.parent_id || null;
    const ownerId = data.owner_id || null;
    const sortOrder = Date.now();

    run(
      'INSERT INTO folders (id, code, name, type, parent_id, owner_id, expanded, sort_order) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
      [id, code, name, data.type, parentId, ownerId, sortOrder]
    );

    return query<IFolder>('SELECT * FROM folders WHERE id = ?', [id])[0];
  }

  // 更新文件夹
  update(id: string, data: { name?: string; expanded?: number; parent_id?: string | null; sort_order?: number }): IFolder | null {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }

    if (data.expanded !== undefined) {
      updates.push('expanded = ?');
      values.push(data.expanded);
    }

    if ('parent_id' in data) {
      updates.push('parent_id = ?');
      values.push(data.parent_id);
    }

    if (data.sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(data.sort_order);
    }

    if (updates.length === 0) {
      return query<IFolder>('SELECT * FROM folders WHERE id = ?', [id])[0];
    }

    values.push(id);
    run(`UPDATE folders SET ${updates.join(', ')} WHERE id = ?`, values);

    return query<IFolder>('SELECT * FROM folders WHERE id = ?', [id])[0];
  }

  // 删除文件夹
  delete(id: string): boolean {
    const result = run('DELETE FROM folders WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // 移动文件夹
  move(id: string, parentId: string | null): boolean {
    const result = run('UPDATE folders SET parent_id = ? WHERE id = ?', [parentId, id]);
    return result.changes > 0;
  }

  // 批量重排序
  reorder(items: IReorderItem[]): boolean {
    for (const item of items) {
      run('UPDATE folders SET sort_order = ?, parent_id = ? WHERE id = ?', [item.sort_order, item.parent_id || null, item.id]);
    }
    saveDatabase();
    return true;
  }
}

// 已选视图服务
export class SelectedViewService {
  private folderType = 'selected_folder';

  // 获取列表
  getAll(): TreeItem[] {
    const folders = query<IFolder>(`SELECT * FROM folders WHERE type = ? ORDER BY sort_order`, [this.folderType]);

    const items = query<TreeItem>(`
      SELECT s.*, v.name as view_name, v.view_type, t.name as table_name, t.color as table_color, 'selected' as type
      FROM selected_views s
      JOIN views v ON s.view_id = v.id
      JOIN tables t ON v.table_id = t.id
      ORDER BY s.sort_order
    `);

    return this.buildTree(folders, items);
  }

  // 创建
  create(viewId: string, folderId?: string | null): TreeItem {
    // 检查是否已存在
    const exists = query<{ id: string }>('SELECT id FROM selected_views WHERE view_id = ?', [viewId]);
    if (exists.length > 0) {
      throw new Error('视图已被选择');
    }

    const id = generateId();
    const code = generateCode();
    const sortOrder = Date.now();

    run(
      'INSERT INTO selected_views (id, code, view_id, folder_id, sort_order) VALUES (?, ?, ?, ?, ?)',
      [id, code, viewId, folderId || null, sortOrder]
    );

    return query<TreeItem>(`
      SELECT s.*, v.name as view_name, v.view_type, t.name as table_name, t.color as table_color, 'selected' as type
      FROM selected_views s
      JOIN views v ON s.view_id = v.id
      JOIN tables t ON v.table_id = t.id
      WHERE s.id = ?
    `, [id])[0];
  }

  // 删除
  delete(id: string): boolean {
    const result = run('DELETE FROM selected_views WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // 检查视图是否已选
  checkSelected(viewId: string): { selected: boolean; id?: string } {
    const row = query<{ id: string }>('SELECT id FROM selected_views WHERE view_id = ?', [viewId]);
    return { selected: row.length > 0, id: row[0]?.id };
  }

  // 移动
  move(id: string, folderId: string | null): boolean {
    const result = run('UPDATE selected_views SET folder_id = ? WHERE id = ?', [folderId, id]);
    return result.changes > 0;
  }

  // 批量重排序
  reorder(items: IReorderItem[]): boolean {
    for (const item of items) {
      run('UPDATE selected_views SET sort_order = ?, folder_id = ? WHERE id = ?', [item.sort_order, item.folder_id || null, item.id]);
    }
    saveDatabase();
    return true;
  }

  // 获取视图定位信息（完整的层级路径）
  getViewLocation(viewId: string): {
    shareholder?: { id: string; name: string };
    company?: { id: string; name: string };
    project?: { id: string; name: string };
    table?: { id: string; name: string };
    view?: { id: string; name: string };
  } | null {
    // 查询视图及其完整层级路径
    const result = query<{
      view_id: string; view_name: string;
      table_id: string; table_name: string;
      project_id: string; project_name: string;
      company_id: string; company_name: string;
      shareholder_id: string; shareholder_name: string;
    }>(`
      SELECT
        v.id as view_id, v.name as view_name,
        t.id as table_id, t.name as table_name,
        p.id as project_id, p.name as project_name,
        c.id as company_id, c.name as company_name,
        s.id as shareholder_id, s.name as shareholder_name
      FROM views v
      JOIN tables t ON v.table_id = t.id
      JOIN projects p ON t.project_id = p.id
      JOIN companies c ON p.company_id = c.id
      JOIN shareholders s ON c.shareholder_id = s.id
      WHERE v.id = ?
    `, [viewId]);

    if (result.length === 0) return null;

    const row = result[0];
    return {
      shareholder: { id: row.shareholder_id, name: row.shareholder_name },
      company: { id: row.company_id, name: row.company_name },
      project: { id: row.project_id, name: row.project_name },
      table: { id: row.table_id, name: row.table_name },
      view: { id: row.view_id, name: row.view_name }
    };
  }

  // 构建树形结构
  private buildTree(folders: IFolder[], items: TreeItem[]): TreeItem[] {
    const buildLevel = (parentId: string | null = null): TreeItem[] => {
      const result: TreeItem[] = [];

      // 添加文件夹（处理 null、undefined、空字符串的情况）
      folders.filter(f => {
        const fParentId = f.parent_id || null;
        return fParentId === parentId;
      }).forEach(folder => {
        result.push({
          ...folder,
          type: 'folder',
          children: buildLevel(folder.id)
        } as IFolder);
      });

      // 添加实体（处理 null、undefined、空字符串的情况）
      items.filter((i: TreeItem) => {
        const item = i as { folder_id?: string | null };
        const iFolderId = item.folder_id || null;
        return iFolderId === parentId;
      }).forEach(item => {
        result.push(item);
      });

      return result.sort((a, b) => a.sort_order - b.sort_order);
    };

    return buildLevel(null);
  }
}

// 设置服务
export class SettingsService {
  // 获取所有设置
  getAll(): Record<string, unknown> {
    const rows = query<{ key: string; value: string }>('SELECT * FROM settings');

    const result: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch {
        result[row.key] = row.value;
      }
    }

    return result;
  }

  // 更新设置
  update(settings: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(settings)) {
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const exists = query<{ key: string }>('SELECT key FROM settings WHERE key = ?', [key]);

      if (exists.length > 0) {
        run('UPDATE settings SET value = ? WHERE key = ?', [valueStr, key]);
      } else {
        run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, valueStr]);
      }
    }
    saveDatabase();
    return true;
  }
}
