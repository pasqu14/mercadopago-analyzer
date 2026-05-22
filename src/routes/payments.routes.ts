import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { VALID_CATEGORIES } from '../utils/categorizer';
import { AppError } from '../middleware/error.middleware';

const router = Router();

const updateCategorySchema = z.object({
  category: z.enum(VALID_CATEGORIES as [string, ...string[]]),
});

router.patch('/:id/category', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { category } = updateCategorySchema.parse(req.body);

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new AppError('Payment not found', 404);

    const updated = await prisma.category.upsert({
      where: { paymentId: id },
      create: { paymentId: id, name: category, isManual: true },
      update: { name: category, isManual: true },
    });

    res.json({ success: true, category: updated });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });
    if (!payment) throw new AppError('Payment not found', 404);
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

export default router;
