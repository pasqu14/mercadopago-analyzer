import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgresql://test',
    MP_ACCESS_TOKEN: 'TEST_TOKEN',
  },
}));

vi.mock('../src/config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../src/cron/sync.cron', () => ({ startCronJobs: vi.fn() }));

vi.mock('../src/db/prisma', () => ({
  prisma: {
    payment: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    analyticsCache: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
    },
    syncLog: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'log-1', status: 'running', startedAt: new Date(), newPayments: 0, error: null, createdAt: new Date(), finishedAt: null }),
      update: vi.fn().mockResolvedValue({}),
    },
    category: { upsert: vi.fn() },
  },
}));

vi.mock('../src/services/mercadopago.service', () => ({
  MercadoPagoService: vi.fn().mockImplementation(() => ({
    getRecentPayments: vi.fn().mockResolvedValue([]),
  })),
}));

let app: Express.Application;

beforeAll(async () => {
  const mod = await import('../src/app');
  app = mod.default;
});

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/expenses/summary', () => {
  it('returns summary object', async () => {
    const res = await request(app).get('/api/expenses/summary');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('currentMonth');
    expect(res.body).toHaveProperty('recentTransactions');
  });
});

describe('POST /api/sync', () => {
  it('triggers sync and returns result', async () => {
    const res = await request(app).post('/api/sync').send({});
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('synced');
    expect(res.body).toHaveProperty('skipped');
  });
});

describe('POST /api/analyze', () => {
  it('returns 400 if question is missing', async () => {
    const res = await request(app).post('/api/analyze').send({});
    expect(res.status).toBe(400);
  });

  it('returns insight for valid question', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ question: '¿Cómo me fue este mes?' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('insight');
    expect(res.body).toHaveProperty('period');
  });
});
