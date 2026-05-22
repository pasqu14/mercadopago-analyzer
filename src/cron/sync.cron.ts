import cron from 'node-cron';
import { SyncService } from '../services/sync.service';
import { logger } from '../config/logger';

const syncService = new SyncService();

export function startCronJobs(): void {
  // Sync every 6 hours: 00:00, 06:00, 12:00, 18:00 UTC
  cron.schedule('0 0,6,12,18 * * *', async () => {
    logger.info('Cron: iniciando sync automático');
    try {
      const result = await syncService.sync({ days: 7 });
      logger.info({ result }, 'Cron: sync completado');
    } catch (err) {
      logger.error({ err }, 'Cron: sync falló');
    }
  });

  logger.info('Cron jobs iniciados (sync cada 6h: 00:00, 06:00, 12:00, 18:00 UTC)');
}
