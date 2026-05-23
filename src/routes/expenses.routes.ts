import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AnalyticsService } from '../services/analytics.service';

const router = Router();
const analyticsService = new AnalyticsService();

const monthParamsSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2099),
  month: z.coerce.number().int().min(1).max(12),
});

router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await analyticsService.getExpensesSummary();
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

router.get('/monthly/:year/:month', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, month } = monthParamsSchema.parse(req.params);
    const summary = await analyticsService.getMonthlySummary(year, month);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const querySchema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      category: z.string().optional(),
      status: z.string().optional(),
      month: z.coerce.number().int().min(1).max(12).optional(),
      year: z.coerce.number().int().min(2020).max(2099).optional(),
      sortBy: z.enum(['date', 'amount']).default('date'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      type: z.enum(['all', 'expense', 'income']).default('all'),
    });

    const { page, limit, category, status, month, year, sortBy, sortOrder, type } = querySchema.parse(req.query);

    const where: Record<string, unknown> = {};
    if (status) where['status'] = status;
    if (type === 'expense') where['isIncome'] = false;
    if (type === 'income') where['isIncome'] = true;

    if (year && month) {
      where['date'] = {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0, 23, 59, 59),
      };
    }

    if (category) {
      where['category'] = { name: category };
    }

    const { prisma } = await import('../db/prisma');
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { category: true },
        orderBy: sortBy === 'amount' ? { amount: sortOrder } : { date: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      data: payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
