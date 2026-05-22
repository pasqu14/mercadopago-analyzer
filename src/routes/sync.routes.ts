import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SyncService } from '../services/sync.service';
import { logger } from '../config/logger';

const router = Router();
const syncService = new SyncService();

let isSyncing = false;

const syncBodySchema = z.object({
  days: z.number().int().min(1).max(365).optional(),
  full: z.boolean().optional(),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  if (isSyncing) {
    res.status(409).json({ error: 'Sync already in progress' });
    return;
  }

  try {
    const body = syncBodySchema.parse(req.body ?? {});
    isSyncing = true;
    logger.info({ body }, 'Manual sync triggered');

    const result = await syncService.sync(body);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  } finally {
    isSyncing = false;
  }
});

router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const lastSync = await syncService.getLastSync();
    res.json({ isSyncing, lastSync });
  } catch (err) {
    next(err);
  }
});

export default router;
