import { logger } from '../config/logger';

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelay?: number; label?: string } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelay = 1000, label = 'operation' } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLast = attempt === maxAttempts;
      if (isLast) throw error;

      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn({ attempt, delay, label }, `Reintentando ${label} en ${delay}ms`);
      await sleep(delay);
    }
  }

  throw new Error('Unreachable');
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
