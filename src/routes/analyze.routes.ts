import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AIService } from '../services/ai.service';
import { AnalyticsService } from '../services/analytics.service';
import { prisma } from '../db/prisma';
import { logger } from '../config/logger';

const router = Router();
const aiService = new AIService();
const analyticsService = new AnalyticsService();

const analyzeBodySchema = z.object({
  question: z.string().min(1).max(500),
  period: z
    .object({
      year: z.number().int().min(2020).max(2099),
      month: z.number().int().min(1).max(12),
    })
    .optional(),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, period } = analyzeBodySchema.parse(req.body);

    const now = new Date();
    const year = period?.year ?? now.getFullYear();
    const month = period?.month ?? (now.getMonth() + 1);

    const monthlySummary = await analyticsService.getMonthlySummary(year, month);
    const periodKey = `${year}-${String(month).padStart(2, '0')}`;

    const prevDate = new Date(year, month - 2, 1);
    let previousMonthSpend: number | undefined;
    try {
      const prev = await analyticsService.getMonthlySummary(
        prevDate.getFullYear(),
        prevDate.getMonth() + 1
      );
      previousMonthSpend = prev.totalSpend;
    } catch {
      // no prev month data
    }

    const trends = await analyticsService.getTrends(90);

    const cached = await prisma.analyticsCache.findUnique({ where: { period: periodKey } });
    const cacheAge = cached?.aiInsightAt
      ? (Date.now() - cached.aiInsightAt.getTime()) / 1000 / 60
      : Infinity;

    let insight: string;

    if (cached?.aiInsight && cacheAge < 60 && question === '¿Cómo me fue este mes?') {
      logger.debug({ period: periodKey }, 'AI insight cache hit');
      insight = cached.aiInsight;
    } else {
      insight = await aiService.analyze(question, {
        totalSpend: monthlySummary.totalSpend,
        previousMonthSpend,
        topCategories: monthlySummary.categories.slice(0, 5),
        transactionCount: monthlySummary.transactionCount,
        period: `${new Date(year, month - 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' })}`,
        currency: 'ARS',
        recentTransactions: monthlySummary.transactions.slice(0, 5).map((t) => ({
          merchant: t.merchantName ?? t.description ?? 'Desconocido',
          amount: t.amount,
          date: new Date(t.date).toLocaleDateString('es-AR'),
        })),
        anomalies: trends.outliers.slice(0, 3).map((o) => ({
          merchant: o.merchant,
          amount: o.amount,
          reason: 'Gasto inusualmente alto',
        })),
      });

      await prisma.analyticsCache.upsert({
        where: { period: periodKey },
        create: {
          period: periodKey,
          totalSpend: monthlySummary.totalSpend,
          dailyAverage: monthlySummary.dailyAverage,
          topCategory: monthlySummary.topCategory,
          transactionCount: monthlySummary.transactionCount,
          aiInsight: insight,
          aiInsightAt: new Date(),
        },
        update: {
          aiInsight: insight,
          aiInsightAt: new Date(),
        },
      });
    }

    res.json({
      question,
      insight,
      period: periodKey,
      context: {
        totalSpend: monthlySummary.totalSpend,
        transactionCount: monthlySummary.transactionCount,
        topCategory: monthlySummary.topCategory,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
