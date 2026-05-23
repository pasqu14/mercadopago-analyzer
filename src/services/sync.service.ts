import { prisma } from '../db/prisma';
import { MercadoPagoService } from './mercadopago.service';
import { categorize } from '../utils/categorizer';
import { withRetry } from '../utils/retry';
import { logger } from '../config/logger';

export class SyncService {
  private mpService: MercadoPagoService;

  constructor() {
    this.mpService = new MercadoPagoService();
  }

  async sync(options: { days?: number; full?: boolean } = {}): Promise<{
    synced: number;
    skipped: number;
    errors: number;
    logId: string;
  }> {
    const syncLog = await prisma.syncLog.create({
      data: {
        startedAt: new Date(),
        status: 'running',
      },
    });

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    try {
      const days = options.full ? 365 : (options.days ?? 30);
      logger.info({ days }, 'Starting MP sync');

      const [payments, currentUserId] = await Promise.all([
        withRetry(() => this.mpService.getRecentPayments(days), { maxAttempts: 3, label: 'MP fetch' }),
        this.mpService.getCurrentUserId(),
      ]);

      logger.info({ count: payments.length, currentUserId }, 'Payments fetched from MP');

      for (const mpPayment of payments) {
        try {
          const mpId = String(mpPayment.id);
          const existing = await prisma.payment.findUnique({ where: { mpId } });

          if (existing) {
            skipped++;
            continue;
          }

          const description =
            mpPayment.description ??
            mpPayment.additional_info?.items?.[0]?.title ??
            mpPayment.additional_info?.items?.[0]?.description ??
            null;

          const merchantName = description ?? mpPayment.payment_method_id;
          const categoryName = categorize(merchantName ?? '');

          // income = someone paid us (we are the collector, not the payer)
          const isIncome = currentUserId !== null
            ? mpPayment.payer.id !== currentUserId
            : false;

          const payment = await prisma.payment.create({
            data: {
              mpId,
              amount: mpPayment.transaction_amount,
              netAmount: mpPayment.net_received_amount,
              currency: mpPayment.currency_id,
              date: new Date(mpPayment.date_created),
              merchantName,
              description,
              status: mpPayment.status,
              paymentMethod: mpPayment.payment_method_id,
              paymentType: mpPayment.payment_type_id,
              installments: mpPayment.installments,
              isIncome,
              rawData: mpPayment as object,
            },
          });

          await prisma.category.create({
            data: {
              paymentId: payment.id,
              name: categoryName,
              isManual: false,
            },
          });

          synced++;
        } catch (err) {
          errors++;
          logger.error({ err, mpId: mpPayment.id }, 'Error saving payment');
        }
      }

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          finishedAt: new Date(),
          status: 'completed',
          newPayments: synced,
        },
      });

      logger.info({ synced, skipped, errors }, 'Sync completed');
    } catch (err) {
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          finishedAt: new Date(),
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    }

    return { synced, skipped, errors, logId: syncLog.id };
  }

  async getLastSync() {
    return prisma.syncLog.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }
}
