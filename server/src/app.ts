import express from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes';

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务（生产环境）
app.use(express.static(path.join(__dirname, '..', '..', 'client', 'dist')));

// API路由
app.use('/api', routes);

// SPA回退（生产环境）
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'dist', 'index.html'));
});

export default app;
