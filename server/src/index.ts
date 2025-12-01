import app from './app';
import { initDatabase } from './database';

const PORT = process.env.PORT || 4568;

async function start() {
  // 初始化数据库
  await initDatabase();

  // 启动服务器
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}

start().catch(console.error);
