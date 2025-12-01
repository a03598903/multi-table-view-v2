import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data', 'data.db');

let db: SqlJsDatabase;
let codeCounter = 1000;

// 初始化数据库
export async function initDatabase(): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs();

  // 尝试加载现有数据库
  try {
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  } catch {
    db = new SQL.Database();
  }

  // 创建表结构
  createTables();

  // 初始化编码计数器
  initCodeCounter();

  // 初始化示例数据（如果数据库为空）
  initSampleDataIfEmpty();

  // 保存数据库
  saveDatabase();

  return db;
}

// 保存数据库到文件
export function saveDatabase(): void {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, buffer);
  } catch (e) {
    console.error('保存数据库失败', e);
  }
}

// 创建表结构
function createTables(): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS shareholders (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '默认名称',
      folder_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '默认名称',
      shareholder_id TEXT,
      folder_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '默认名称',
      company_id TEXT,
      folder_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '默认名称',
      color TEXT DEFAULT '#3b82f6',
      project_id TEXT,
      folder_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS views (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '默认名称',
      view_type TEXT DEFAULT 'grid',
      table_id TEXT,
      folder_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS selected_views (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      view_id TEXT NOT NULL,
      folder_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '默认名称',
      type TEXT NOT NULL,
      parent_id TEXT,
      owner_id TEXT,
      expanded INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS code_counter (
      id INTEGER PRIMARY KEY,
      current_value INTEGER DEFAULT 1000
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // 创建索引
  db.run('CREATE INDEX IF NOT EXISTS idx_companies_shareholder ON companies(shareholder_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_tables_project ON tables(project_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_views_table ON views(table_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_folders_owner ON folders(owner_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_folders_type ON folders(type)');
}

// 初始化编码计数器
function initCodeCounter(): void {
  const result = db.exec('SELECT current_value FROM code_counter WHERE id = 1');
  if (result.length === 0 || result[0].values.length === 0) {
    db.run('INSERT INTO code_counter (id, current_value) VALUES (1, 1000)');
    codeCounter = 1000;
  } else {
    codeCounter = result[0].values[0][0] as number;
  }
}

// 生成唯一ID
export function generateId(): string {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}

// 生成唯一编码（4位数字）
export function generateCode(): string {
  codeCounter++;
  db.run('UPDATE code_counter SET current_value = ? WHERE id = 1', [codeCounter]);
  saveDatabase();
  return String(codeCounter).padStart(4, '0');
}

// 获取数据库实例
export function getDb(): SqlJsDatabase {
  return db;
}

// 执行查询并返回结果数组
export function query<T>(sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }

  const results: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row as T);
  }
  stmt.free();

  return results;
}

// 执行更新并返回变更数量
export function run(sql: string, params: unknown[] = []): { changes: number } {
  db.run(sql, params);
  saveDatabase();
  return { changes: db.getRowsModified() };
}

// 初始化示例数据（如果数据库为空）
function initSampleDataIfEmpty(): void {
  const result = db.exec('SELECT COUNT(*) as count FROM shareholders');
  const count = result.length > 0 && result[0].values.length > 0 ? result[0].values[0][0] as number : 0;

  if (count > 0) return;

  console.log('初始化示例数据...');

  // 创建示例股东
  const sh1Id = generateId();
  const sh1Code = generateCode();
  run('INSERT INTO shareholders (id, code, name, sort_order) VALUES (?, ?, ?, ?)', [sh1Id, sh1Code, '张三', 0]);

  const sh2Id = generateId();
  const sh2Code = generateCode();
  run('INSERT INTO shareholders (id, code, name, sort_order) VALUES (?, ?, ?, ?)', [sh2Id, sh2Code, '李四', 1]);

  // 创建示例企业
  const comp1Id = generateId();
  const comp1Code = generateCode();
  run('INSERT INTO companies (id, code, name, shareholder_id, sort_order) VALUES (?, ?, ?, ?, ?)', [comp1Id, comp1Code, '科技公司A', sh1Id, 0]);

  const comp2Id = generateId();
  const comp2Code = generateCode();
  run('INSERT INTO companies (id, code, name, shareholder_id, sort_order) VALUES (?, ?, ?, ?, ?)', [comp2Id, comp2Code, '贸易公司B', sh1Id, 1]);

  // 创建示例项目
  const proj1Id = generateId();
  const proj1Code = generateCode();
  run('INSERT INTO projects (id, code, name, company_id, sort_order) VALUES (?, ?, ?, ?, ?)', [proj1Id, proj1Code, '项目Alpha', comp1Id, 0]);

  const proj2Id = generateId();
  const proj2Code = generateCode();
  run('INSERT INTO projects (id, code, name, company_id, sort_order) VALUES (?, ?, ?, ?, ?)', [proj2Id, proj2Code, '项目Beta', comp1Id, 1]);

  // 创建示例表格
  const table1Id = generateId();
  const table1Code = generateCode();
  run('INSERT INTO tables (id, code, name, color, project_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)', [table1Id, table1Code, '进度表', '#22c55e', proj1Id, 0]);

  const table2Id = generateId();
  const table2Code = generateCode();
  run('INSERT INTO tables (id, code, name, color, project_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)', [table2Id, table2Code, '预算表', '#ef4444', proj1Id, 1]);

  // 创建示例视图
  const view1Id = generateId();
  const view1Code = generateCode();
  run('INSERT INTO views (id, code, name, view_type, table_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)', [view1Id, view1Code, '甘特图', 'gantt', table1Id, 0]);

  const view2Id = generateId();
  const view2Code = generateCode();
  run('INSERT INTO views (id, code, name, view_type, table_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)', [view2Id, view2Code, '看板', 'kanban', table1Id, 1]);

  saveDatabase();
  console.log('示例数据初始化完成');
}
