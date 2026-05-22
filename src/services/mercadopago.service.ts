import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { sleep } from '../utils/retry';

export interface MPPayment {
  id: number;
  date_created: string;
  date_approved: string | null;
  date_last_updated: string;
  money_release_date: string | null;
  payment_method_id: string;
  payment_type_id: string;
  status: string;
  status_detail: string;
  currency_id: string;
  description: string | null;
  transaction_amount: number;
  net_received_amount: number;
  total_paid_amount: number;
  installments: number;
  payer: {
    id: number;
    email: string;
  };
  metadata: Record<string, unknown>;
  additional_info?: {
    items?: Array<{
      title?: string;
      description?: string;
    }>;
  };
}

interface MPResponse {
  results: MPPayment[];
  paging: {
    total: number;
    limit: number;
    offset: number;
  };
}

export class MercadoPagoService {
  private client: AxiosInstance;
  private readonly PAGE_SIZE = 100;
  private readonly RATE_LIMIT_DELAY = 1000;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.mercadopago.com',
      headers: {
        Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async getPayments(options: {
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  } = {}): Promise<MPPayment[]> {
    const { dateFrom, dateTo } = options;
    const allPayments: MPPayment[] = [];
    let offset = 0;
    let hasMore = true;

    const params: Record<string, string | number> = {
      sort: 'date_created',
      criteria: 'desc',
      limit: this.PAGE_SIZE,
    };

    if (dateFrom) params['range'] = 'date_created';
    if (dateFrom) params['begin_date'] = dateFrom.toISOString();
    if (dateTo) params['end_date'] = dateTo.toISOString();

    while (hasMore) {
      try {
        logger.debug({ offset, params }, 'Fetching MP payments page');

        const idempotencyKey = `sync-${Date.now()}-${offset}`;
        const response = await this.client.get<MPResponse>('/v1/payments/search', {
          params: { ...params, offset },
          headers: { 'X-Idempotency-Key': idempotencyKey },
        });

        const { results, paging } = response.data;
        allPayments.push(...results);

        logger.info({ fetched: results.length, total: paging.total, offset }, 'MP page fetched');

        offset += this.PAGE_SIZE;
        hasMore = offset < paging.total && results.length === this.PAGE_SIZE;

        if (hasMore) await sleep(this.RATE_LIMIT_DELAY);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          logger.error(
            { status: error.response?.status, data: error.response?.data },
            'MP API error'
          );
          if (error.response?.status === 429) {
            logger.warn('Rate limited by MP, waiting 10s');
            await sleep(10000);
            continue;
          }
        }
        throw error;
      }
    }

    return allPayments;
  }

  async getRecentPayments(days = 30): Promise<MPPayment[]> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    return this.getPayments({ dateFrom });
  }
}
