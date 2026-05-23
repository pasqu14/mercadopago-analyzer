import { prisma } from '../db/prisma';
import { logger } from '../config/logger';

export interface CategoryBreakdown {
  name: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface MonthlySummary {
  period: string;
  year: number;
  month: number;
  totalSpend: number;
  totalIncome: number;
  balance: number;
  dailyAverage: number;
  transactionCount: number;
  categories: CategoryBreakdown[];
  topCategory: string | null;
  transactions: Array<{
    id: string;
    mpId: string;
    amount: number;
    merchantName: string | null;
    description: string | null;
    date: Date;
    status: string;
    paymentMethod: string | null;
    installments: number;
    category: string | null;
    isIncome: boolean;
  }>;
}

export class AnalyticsService {
  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const daysInMonth = endDate.getDate();
    const period = `${year}-${String(month).padStart(2, '0')}`;

    const cached = await prisma.analyticsCache.findUnique({ where: { period } });
    const cacheAge = cached
      ? (Date.now() - cached.updatedAt.getTime()) / 1000 / 60
      : Infinity;

    if (cached && cacheAge < 30) {
      logger.debug({ period, cacheAge }, 'Analytics cache hit');
    }

    const payments = await prisma.payment.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: { in: ['approved', 'authorized'] },
      },
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    const expenses = payments.filter((p) => !p.isIncome);
    const income = payments.filter((p) => p.isIncome);

    const totalSpend = expenses.reduce((sum, p) => sum + p.amount, 0);
    const totalIncome = income.reduce((sum, p) => sum + p.amount, 0);
    const balance = totalIncome - totalSpend;
    const dailyAverage = totalSpend / daysInMonth;

    const categoryMap = new Map<string, { amount: number; count: number }>();
    for (const payment of expenses) {
      const name = payment.category?.name ?? 'Otros';
      const current = categoryMap.get(name) ?? { amount: 0, count: 0 };
      categoryMap.set(name, {
        amount: current.amount + payment.amount,
        count: current.count + 1,
      });
    }

    const categories: CategoryBreakdown[] = Array.from(categoryMap.entries())
      .map(([name, { amount, count }]) => ({
        name,
        amount,
        count,
        percentage: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const topCategory = categories[0]?.name ?? null;

    await prisma.analyticsCache.upsert({
      where: { period },
      create: {
        period,
        totalSpend,
        dailyAverage,
        topCategory,
        transactionCount: payments.length,
        metadata: JSON.parse(JSON.stringify({ categories, totalIncome, balance })),
      },
      update: {
        totalSpend,
        dailyAverage,
        topCategory,
        transactionCount: payments.length,
        metadata: JSON.parse(JSON.stringify({ categories, totalIncome, balance })),
      },
    });

    return {
      period,
      year,
      month,
      totalSpend,
      totalIncome,
      balance,
      dailyAverage,
      transactionCount: payments.length,
      categories,
      topCategory,
      transactions: payments.map((p) => ({
        id: p.id,
        mpId: p.mpId,
        amount: p.amount,
        merchantName: p.merchantName,
        description: p.description,
        date: p.date,
        status: p.status,
        paymentMethod: p.paymentMethod,
        installments: p.installments,
        category: p.category?.name ?? null,
        isIncome: p.isIncome,
      })),
    };
  }

  async getCurrentMonthSummary(): Promise<MonthlySummary> {
    const now = new Date();
    return this.getMonthlySummary(now.getFullYear(), now.getMonth() + 1);
  }

  async getTrends(days = 90): Promise<{
    daily: Array<{ date: string; amount: number; count: number }>;
    projection: number;
    average: number;
    outliers: Array<{ date: string; amount: number; merchant: string }>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const payments = await prisma.payment.findMany({
      where: {
        date: { gte: since },
        status: { in: ['approved', 'authorized'] },
      },
      orderBy: { date: 'asc' },
    });

    const dailyMap = new Map<string, { amount: number; count: number }>();
    for (const p of payments) {
      const key = p.date.toISOString().split('T')[0];
      const current = dailyMap.get(key) ?? { amount: 0, count: 0 };
      dailyMap.set(key, { amount: current.amount + p.amount, count: current.count + 1 });
    }

    const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    const amounts = daily.map((d) => d.amount);
    const average = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
    const stdDev = this.stdDev(amounts);

    const outliers = daily
      .filter((d) => d.amount > average + 2 * stdDev)
      .flatMap((d) => {
        const topPayment = payments
          .filter((p) => p.date.toISOString().split('T')[0] === d.date)
          .sort((a, b) => b.amount - a.amount)[0];
        return topPayment
          ? [{ date: d.date, amount: d.amount, merchant: topPayment.merchantName ?? 'Desconocido' }]
          : [];
      });

    const daysElapsed = new Date().getDate();
    const monthTotal = payments
      .filter((p) => p.date.getMonth() === new Date().getMonth())
      .reduce((s, p) => s + p.amount, 0);
    const projection = daysElapsed > 0 ? (monthTotal / daysElapsed) * 30 : 0;

    return { daily, projection, average, outliers };
  }

  async getExpensesSummary() {
    const now = new Date();
    const currentMonth = await this.getMonthlySummary(now.getFullYear(), now.getMonth() + 1);

    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = await this.getMonthlySummary(
      prevMonth.getFullYear(),
      prevMonth.getMonth() + 1
    );

    const lastSync = await prisma.syncLog.findFirst({
      where: { status: 'completed' },
      orderBy: { createdAt: 'desc' },
    });

    return {
      currentMonth,
      previousMonth,
      lastSync,
      recentTransactions: currentMonth.transactions.slice(0, 10),
    };
  }

  private stdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}
