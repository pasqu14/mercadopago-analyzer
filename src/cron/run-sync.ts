// Entry point for Render Cron Job (standalone)
import '../config/env';
import { SyncService } from '../services/sync.service';
import { logger } from '../config/logger';
import { prisma } from '../db/prisma';

async function main() {
  logger.info('Standalone sync job starting');
  const syncService = new SyncService();

  try {
    const result = await syncService.sync({ days: 7 });
    logger.info({ result }, 'Standalone sync completed');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Standalone sync failed');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
