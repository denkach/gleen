import { z } from 'zod';

import type { InvoiceStatus } from './domain';

export type InvoiceScreenStatus = InvoiceStatus | 'refunded';
export type InvoiceRouteQuery = Readonly<{
  search: string;
  status: InvoiceScreenStatus | null;
  year: number | null;
  cursor: string | null;
}>;

const invoiceRouteQuerySchema = z
  .object({
    search: z.string().trim().max(200).default(''),
    status: z
      .enum([
        'draft',
        'open',
        'paid',
        'uncollectible',
        'void',
        'failed',
        'refunded',
      ])
      .nullable()
      .default(null),
    year: z.number().int().min(2000).max(9999).nullable().default(null),
    cursor: z.string().trim().min(1).nullable().default(null),
  })
  .strict();

export function parseInvoiceRouteQuery(
  raw: Record<string, string | string[] | undefined>,
): InvoiceRouteQuery {
  const parsed = invoiceRouteQuerySchema.safeParse({
    search: typeof raw.search === 'string' ? raw.search : undefined,
    status:
      typeof raw.status === 'string' && raw.status !== 'all'
        ? raw.status
        : null,
    year:
      typeof raw.year === 'string' && /^\d{4}$/.test(raw.year)
        ? Number(raw.year)
        : null,
    cursor:
      typeof raw.cursor === 'string' && raw.cursor !== '' ? raw.cursor : null,
  });
  return parsed.success
    ? parsed.data
    : { search: '', status: null, year: null, cursor: null };
}
