import { Router, Request, Response } from 'express';
import { BaseService, FolderService, SelectedViewService, SettingsService } from '../services/base.service';
import type { IReorderItem } from '../types';

const router = Router();

// ==================== 创建实体路由工厂 ====================

function createEntityRouter(
  tableName: string,
  folderType: string,
  parentField: string | null = null
): Router {
  const entityRouter = Router();
  const service = new BaseService(tableName, folderType, parentField);

  // 获取列表
  entityRouter.get('/', (req: Request, res: Response) => {
    try {
      const parentId = parentField ? (req.query[parentField] as string) : undefined;
      const data = service.getAll(parentId);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 创建
  entityRouter.post('/', (req: Request, res: Response) => {
    try {
      const cascade = req.body.cascade !== false;
      const item = service.create(req.body, cascade);
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 更新
  entityRouter.put('/:id', (req: Request, res: Response) => {
    try {
      const item = service.update(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: '未找到' });
      }
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 删除
  entityRouter.delete('/:id', (req: Request, res: Response) => {
    try {
      const success = service.delete(req.params.id);
      res.json({ success });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return entityRouter;
}

// ==================== 注册实体路由 ====================

router.use('/shareholders', createEntityRouter('shareholders', 'shareholder_folder', null));
router.use('/companies', createEntityRouter('companies', 'company_folder', 'shareholder_id'));
router.use('/projects', createEntityRouter('projects', 'project_folder', 'company_id'));
router.use('/tables', createEntityRouter('tables', 'table_folder', 'project_id'));
router.use('/views', createEntityRouter('views', 'view_folder', 'table_id'));

// ==================== 已选视图路由 ====================

const selectedService = new SelectedViewService();

router.get('/selected', (_req: Request, res: Response) => {
  try {
    const data = selectedService.getAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/selected', (req: Request, res: Response) => {
  try {
    const { view_id, folder_id } = req.body;
    if (!view_id) {
      return res.status(400).json({ error: '缺少 view_id' });
    }
    const item = selectedService.create(view_id, folder_id);
    res.json(item);
  } catch (err) {
    const message = (err as Error).message;
    if (message === '视图已被选择') {
      return res.status(400).json({ error: message });
    }
    res.status(500).json({ error: message });
  }
});

router.delete('/selected/:id', (req: Request, res: Response) => {
  try {
    const success = selectedService.delete(req.params.id);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/selected/check/:viewId', (req: Request, res: Response) => {
  try {
    const result = selectedService.checkSelected(req.params.viewId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ==================== 视图定位路由 ====================

router.get('/views/:id/location', (req: Request, res: Response) => {
  try {
    const location = selectedService.getViewLocation(req.params.id);
    if (!location) {
      return res.status(404).json({ error: '未找到视图' });
    }
    res.json(location);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ==================== 文件夹路由 ====================

const folderService = new FolderService();

router.get('/folders', (req: Request, res: Response) => {
  try {
    const { type, owner_id } = req.query;
    if (!type) {
      return res.status(400).json({ error: '缺少 type 参数' });
    }
    const folders = folderService.getByType(type as string, owner_id as string | undefined);
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/folders', (req: Request, res: Response) => {
  try {
    const { name, type, parent_id, owner_id } = req.body;
    if (!type) {
      return res.status(400).json({ error: '缺少 type 参数' });
    }
    const folder = folderService.create({ name, type, parent_id, owner_id });
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/folders/:id', (req: Request, res: Response) => {
  try {
    const folder = folderService.update(req.params.id, req.body);
    if (!folder) {
      return res.status(404).json({ error: '未找到' });
    }
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/folders/:id', (req: Request, res: Response) => {
  try {
    const success = folderService.delete(req.params.id);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ==================== 移动对象路由 ====================

router.put('/move/:type/:id', (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    const { folder_id } = req.body;

    const serviceMap: Record<string, BaseService | null> = {
      shareholder: new BaseService('shareholders', 'shareholder_folder'),
      company: new BaseService('companies', 'company_folder', 'shareholder_id'),
      project: new BaseService('projects', 'project_folder', 'company_id'),
      table: new BaseService('tables', 'table_folder', 'project_id'),
      view: new BaseService('views', 'view_folder', 'table_id'),
    };

    if (type === 'folder') {
      const success = folderService.move(id, folder_id || null);
      return res.json({ success });
    }

    if (type === 'selected') {
      const success = selectedService.move(id, folder_id || null);
      return res.json({ success });
    }

    const service = serviceMap[type];
    if (!service) {
      return res.status(400).json({ error: '无效的类型' });
    }

    const success = service.move(id, folder_id || null);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ==================== 批量重排序路由 ====================

router.put('/reorder', (req: Request, res: Response) => {
  try {
    const { type, items } = req.body as { type: string; items: IReorderItem[] };

    if (!type || !items) {
      return res.status(400).json({ error: '缺少 type 或 items 参数' });
    }

    const serviceMap: Record<string, BaseService | { reorder: (items: IReorderItem[]) => boolean } | null> = {
      shareholder: new BaseService('shareholders', 'shareholder_folder'),
      company: new BaseService('companies', 'company_folder', 'shareholder_id'),
      project: new BaseService('projects', 'project_folder', 'company_id'),
      table: new BaseService('tables', 'table_folder', 'project_id'),
      view: new BaseService('views', 'view_folder', 'table_id'),
      selected: selectedService,
      folder: folderService,
    };

    const service = serviceMap[type];
    if (!service) {
      return res.status(400).json({ error: '无效的类型' });
    }

    const success = service.reorder(items);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ==================== 设置路由 ====================

const settingsService = new SettingsService();

router.get('/settings', (_req: Request, res: Response) => {
  try {
    const settings = settingsService.getAll();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/settings', (req: Request, res: Response) => {
  try {
    const success = settingsService.update(req.body);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
