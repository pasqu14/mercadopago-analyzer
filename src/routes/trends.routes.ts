import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AnalyticsService } from '../services/analytics.service';

const router = Router();
const analyticsService = new AnalyticsService();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const querySchema = z.object({
      days: z.coerce.number().int().min(7).max(365).default(90),
    });
    const { days } = querySchema.parse(req.query);
    const trends = await analyticsService.getTrends(days);
    res.json(trends);
  } catch (err) {
    next(err);
  }
});

export default router;
