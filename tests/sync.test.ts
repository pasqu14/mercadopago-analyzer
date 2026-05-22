import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env before importing anything
vi.mock('../src/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'postgresql://test',
    MP_ACCESS_TOKEN: 'TEST_TOKEN',
  },
}));

vi.mock('../src/config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../src/db/prisma', () => ({
  prisma: {
    syncLog: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    category: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../src/services/mercadopago.service', () => ({
  MercadoPagoService: vi.fn().mockImplementation(() => ({
    getRecentPayments: vi.fn().mockResolvedValue([
      {
        id: 123456,
        date_created: '2024-07-01T10:00:00.000-03:00',
        status: 'approved',
        transaction_amount: 1500,
        net_received_amount: 1500,
        currency_id: 'ARS',
        description: 'Carrefour',
        payment_method_id: 'debit_card',
        payment_type_id: 'regular_payment',
        installments: 1,
      },
    ]),
  })),
}));

import { SyncService } from '../src/services/sync.service';
import { prisma } from '../src/db/prisma';

describe('SyncService', () => {
  let syncService: SyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    syncService = new SyncService();

    vi.mocked(prisma.syncLog.create).mockResolvedValue({
      id: 'log-1',
      startedAt: new Date(),
      finishedAt: null,
      status: 'running',
      newPayments: 0,
      error: null,
      createdAt: new Date(),
    });

    vi.mocked(prisma.syncLog.update).mockResolvedValue({
      id: 'log-1',
      startedAt: new Date(),
      finishedAt: new Date(),
      status: 'completed',
      newPayments: 1,
      error: null,
      createdAt: new Date(),
    });

    vi.mocked(prisma.payment.findUnique).mockResolvedValue(null);

    vi.mocked(prisma.payment.create).mockResolvedValue({
      id: 'pay-1',
      mpId: '123456',
      amount: 1500,
      netAmount: 1500,
      currency: 'ARS',
      date: new Date(),
      merchantName: 'Carrefour',
      description: 'Carrefour',
      status: 'approved',
      paymentMethod: 'debit_card',
      paymentType: 'regular_payment',
      installments: 1,
      rawData: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.category.create).mockResolvedValue({
      id: 'cat-1',
      paymentId: 'pay-1',
      name: 'Alimentación',
      isManual: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should sync new payments and return correct counts', async () => {
    const result = await syncService.sync({ days: 7 });

    expect(result.synced).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toBe(0);
    expect(prisma.payment.create).toHaveBeenCalledTimes(1);
    expect(prisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Alimentación' }) })
    );
  });

  it('should skip duplicate payments', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'existing',
      mpId: '123456',
      amount: 1500,
      netAmount: null,
      currency: 'ARS',
      date: new Date(),
      merchantName: 'Carrefour',
      description: null,
      status: 'approved',
      paymentMethod: null,
      paymentType: null,
      installments: 1,
      rawData: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await syncService.sync({ days: 7 });

    expect(result.synced).toBe(0);
    expect(result.skipped).toBe(1);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('should create sync log on start and update on finish', async () => {
    await syncService.sync({ days: 7 });

    expect(prisma.syncLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'running' }),
      })
    );
    expect(prisma.syncLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed' }),
      })
    );
  });
});
