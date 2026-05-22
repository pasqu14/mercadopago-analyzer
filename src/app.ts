import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorMiddleware } from './middleware/error.middleware';
import { startCronJobs } from './cron/sync.cron';
import syncRoutes from './routes/sync.routes';
import expensesRoutes from './routes/expenses.routes';
import paymentsRoutes from './routes/payments.routes';
import analyzeRoutes from './routes/analyze.routes';
import trendsRoutes from './routes/trends.routes';

const app = express();

// Security & parsing
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Static frontend
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), env: env.NODE_ENV });
});

// API routes
app.use('/api/sync', syncRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/trends', trendsRoutes);

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler (must be last)
app.use(errorMiddleware);

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');

  if (env.NODE_ENV !== 'test') {
    startCronJobs();
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
