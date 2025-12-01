# Multi-Table-View V2

多维表格视图管理系统 - 使用 Vue 3 + Express + SQLite 重构版本。

## 快速开始

```bash
# 安装所有依赖
npm run install:all

# 开发模式（同时启动前后端）
npm run dev
```

## 技术栈

- **前端**: Vue 3 + Vite + TailwindCSS + Pinia + TypeScript
- **后端**: Express + better-sqlite3 + TypeScript
- **数据库**: SQLite

## 目录结构

```
├── server/          # 后端代码
│   ├── src/
│   │   ├── index.ts       # 入口
│   │   ├── app.ts         # Express应用
│   │   ├── database.ts    # 数据库
│   │   ├── routes/        # 路由
│   │   ├── services/      # 服务
│   │   └── types/         # 类型
│   └── data/              # 数据文件
│
├── client/          # 前端代码
│   ├── src/
│   │   ├── main.ts        # 入口
│   │   ├── App.vue        # 主组件
│   │   ├── api/           # API调用
│   │   ├── stores/        # Pinia状态
│   │   ├── components/    # 组件
│   │   └── types/         # 类型
│   └── index.html
│
├── claude.md        # 项目规范
└── plan.md          # 实施计划
```

## 开发命令

```bash
# 只启动后端
npm run dev:server

# 只启动前端
npm run dev:client

# 构建
npm run build
```

## 端口

- 前端开发服务器: http://localhost:3000
- 后端API服务器: http://localhost:4567
