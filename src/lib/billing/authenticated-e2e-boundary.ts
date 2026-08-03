import 'server-only';

import { billingFixtureCatalogRows } from './fixtures';

export const billingE2eOwnerId = '22222222-2222-4222-8222-222222222222';
const foreignOwnerId = '99999999-9999-4999-8999-999999999999';

type BoundaryEnvironment = Partial<
  Pick<
    NodeJS.ProcessEnv,
    | 'NODE_ENV'
    | 'VERCEL_ENV'
    | 'PLAYWRIGHT_AUTH_FIXTURE_MODE'
    | 'PLAYWRIGHT_AUTH_FIXTURE_TOKEN'
  >
>;

export function isAuthenticatedBillingE2eBoundaryEnabled(
  environment: BoundaryEnvironment,
  cookieValue: string | undefined,
) {
  const token = environment.PLAYWRIGHT_AUTH_FIXTURE_TOKEN;
  return (
    environment.NODE_ENV === 'development' &&
    environment.VERCEL_ENV === undefined &&
    environment.PLAYWRIGHT_AUTH_FIXTURE_MODE === '1' &&
    typeof token === 'string' &&
    token.length >= 24 &&
    cookieValue === token
  );
}

const ownerRows = {
  billing_plan_catalog: billingFixtureCatalogRows,
  billing_subscription_overview: [
    {
      user_id: billingE2eOwnerId,
      plan_slug: 'starter',
      plan_name: 'Starter',
      plan_description: 'For individuals getting started with AI analysis.',
      analysis_limit: 10,
      used_analyses: 10,
      remaining_analyses: 0,
      period_start: '2026-07-01T00:00:00.000Z',
      resets_at: '2026-08-01T00:00:00.000Z',
      subscription_status: 'active',
      billing_interval: 'month',
      cancel_at_period_end: false,
      cancellation_effective_at: null,
      scheduled_plan_slug: null,
      scheduled_change_at: null,
      scheduled_change_revision: null,
      paid_through: '2026-08-01T00:00:00.000Z',
    },
  ],
  billing_usage_summary: [
    {
      user_id: billingE2eOwnerId,
      settled_analyses: 9,
      reserved_analyses: 1,
      extra_credits: 0,
    },
  ],
  billing_usage_activity: [
    {
      id: 'owner-usage-event',
      user_id: billingE2eOwnerId,
      plan_slug: 'starter',
      event_type: 'settlement',
      quantity: -1,
      status: 'settled',
      remaining_balance: 0,
      occurred_at: '2026-07-29T10:00:00.000Z',
      job_id: 'owner-job',
      analysis_id: 'owner-analysis',
      source: 'analysis_pipeline',
      analysis_title: 'Owner-only billing analysis',
      channel_title: 'Owner channel',
      search_text: 'owner-only billing analysis owner channel',
    },
    {
      id: 'foreign-usage-event',
      user_id: foreignOwnerId,
      plan_slug: 'team',
      event_type: 'settlement',
      quantity: -1,
      status: 'settled',
      remaining_balance: 99,
      occurred_at: '2026-07-29T11:00:00.000Z',
      job_id: 'foreign-job',
      analysis_id: 'foreign-analysis',
      source: 'analysis_pipeline',
      analysis_title: 'foreign-owner@example.test',
      channel_title: 'Foreign channel',
      search_text: 'foreign-owner@example.test foreign channel',
    },
  ],
  billing_payment_summary: [
    {
      user_id: billingE2eOwnerId,
      currency: 'usd',
      outstanding_amount_minor: 0,
    },
  ],
  billing_invoice_history: [
    {
      id: 'owner-invoice',
      user_id: billingE2eOwnerId,
      invoice_number: 'OWNER-2026-001',
      plan_slug: 'starter',
      plan_name: 'Starter',
      billing_interval: 'month',
      amount_due_minor: 1900,
      amount_paid_minor: 1900,
      currency: 'usd',
      status: 'paid',
      invoice_created_at: '2026-07-01T00:00:00.000Z',
      due_at: null,
      paid_at: '2026-07-01T00:01:00.000Z',
      hosted_invoice_url: 'https://example.invalid/owner-invoice',
      invoice_pdf_url: 'https://example.invalid/owner-invoice.pdf',
      refund_status: 'none',
      refunded_amount_minor: 0,
    },
    {
      id: 'foreign-invoice',
      user_id: foreignOwnerId,
      invoice_number: 'foreign-owner@example.test',
      plan_slug: 'team',
      plan_name: 'Team',
      billing_interval: 'month',
      amount_due_minor: 12900,
      amount_paid_minor: 12900,
      currency: 'usd',
      status: 'paid',
      invoice_created_at: '2026-07-02T00:00:00.000Z',
      due_at: null,
      paid_at: '2026-07-02T00:01:00.000Z',
      hosted_invoice_url: null,
      invoice_pdf_url: null,
      refund_status: 'none',
      refunded_amount_minor: 0,
    },
  ],
  billing_invoice_summary: [
    {
      user_id: billingE2eOwnerId,
      total_count: 1,
      last_invoice_at: '2026-07-01T00:00:00.000Z',
      year_summaries: [
        {
          year: 2026,
          currency: 'usd',
          net_paid_minor: 1900,
          invoice_count: 1,
        },
      ],
    },
  ],
  billing_customer_overview: [],
} as const;

type Table = keyof typeof ownerRows;
type Filter = (row: Record<string, unknown>) => boolean;

class BoundaryQuery implements PromiseLike<{
  data: unknown;
  error: null;
  count: number;
}> {
  private filters: Filter[] = [];
  private from = 0;
  private to: number | null = null;
  private singleRow = false;

  constructor(private readonly table: Table) {}

  select() {
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }
  gte(column: string, value: unknown) {
    this.filters.push((row) => String(row[column]) >= String(value));
    return this;
  }
  lt(column: string, value: unknown) {
    this.filters.push((row) => String(row[column]) < String(value));
    return this;
  }
  lte(column: string, value: unknown) {
    this.filters.push((row) => String(row[column]) <= String(value));
    return this;
  }
  ilike(column: string, value: unknown) {
    const needle = String(value).replaceAll('%', '').toLowerCase();
    this.filters.push((row) =>
      String(row[column]).toLowerCase().includes(needle),
    );
    return this;
  }
  order() {
    return this;
  }
  limit(count: number) {
    this.to = this.from + count - 1;
    return this;
  }
  range(from: number, to: number) {
    this.from = from;
    this.to = to;
    return this;
  }
  maybeSingle() {
    this.singleRow = true;
    return Promise.resolve(this.result());
  }
  single() {
    this.singleRow = true;
    return Promise.resolve(this.result());
  }
  then<TResult1 = { data: unknown; error: null; count: number }>(
    onfulfilled?:
      | ((value: {
          data: unknown;
          error: null;
          count: number;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
  ): PromiseLike<TResult1> {
    return Promise.resolve(this.result()).then(onfulfilled);
  }

  private result() {
    const filtered = (
      ownerRows[this.table] as readonly Record<string, unknown>[]
    ).filter((row) => this.filters.every((filter) => filter(row)));
    const rows =
      this.to === null
        ? filtered.slice(this.from)
        : filtered.slice(this.from, this.to + 1);
    return {
      data: this.singleRow ? (rows[0] ?? null) : rows,
      error: null,
      count: filtered.length,
    } as const;
  }
}

export function createAuthenticatedBillingE2eClient() {
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: billingE2eOwnerId,
            email: 'billing-owner@example.test',
            user_metadata: { full_name: 'Billing Owner' },
          },
        },
        error: null,
      }),
    },
    from(table: string) {
      if (!(table in ownerRows)) {
        throw new Error('Authenticated billing fixture rejected unknown table');
      }
      return new BoundaryQuery(table as Table);
    },
    async rpc(functionName: string, parameters: Record<string, unknown>) {
      if (
        functionName !== 'get_or_create_free_entitlement' ||
        parameters.target_user_id !== billingE2eOwnerId
      ) {
        throw new Error('Authenticated billing fixture rejected unknown RPC');
      }
      return { data: null, error: null };
    },
  };
}
