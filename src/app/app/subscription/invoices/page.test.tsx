import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getOwnedInvoiceSummary,
  getOwnedSnapshot,
  getRequestLocale,
  getUser,
  listOwnedInvoices,
} = vi.hoisted(() => ({
  getOwnedInvoiceSummary: vi.fn(),
  getOwnedSnapshot: vi.fn(),
  getRequestLocale: vi.fn(),
  getUser: vi.fn(),
  listOwnedInvoices: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/lib/i18n/request-locale', () => ({ getRequestLocale }));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser } }),
}));

vi.mock('@/lib/billing/supabase-repository', () => ({
  createSupabaseBillingRepository: () => ({
    getOwnedInvoiceSummary,
    getOwnedSnapshot,
    listOwnedInvoices,
  }),
}));

vi.mock('@/lib/billing/presentation', () => ({
  toSubscriptionPresentation: () => ({
    resetAt: '2026-08-01T00:00:00.000Z',
    resetAtLabel: 'Aug 1, 2026',
    entitlement: { key: 'active', label: 'Active', variant: 'positive' },
  }),
  toInvoicePresentation: (page: unknown) => page,
  toInvoiceSummaryPresentation: (summary: { selectedYear: number }) => ({
    totalCount: 2,
    lastInvoiceAt: null,
    lastInvoiceAtLabel: 'No invoices',
    yearToDateSpendLabel: `YTD ${summary.selectedYear}`,
    availableYears: [2026, 2024],
  }),
}));

vi.mock('@/components/billing/invoices-screen', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/components/billing/invoices-screen')
    >();
  return {
    ...actual,
    InvoicesScreen: (props: {
      summary: { yearToDateSpendLabel: string };
      invoices: { items: readonly unknown[] };
    }) => (
      <div>
        <span>{props.summary.yearToDateSpendLabel}</span>
        <span>{props.invoices.items.length} filtered rows</span>
      </div>
    ),
  };
});

import InvoicesPage from './page';

describe('InvoicesPage year ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-31T23:30:00.000Z'));
    getUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } });
    getRequestLocale.mockResolvedValue('en');
    getOwnedSnapshot.mockResolvedValue({});
    getOwnedInvoiceSummary.mockImplementation(
      async (_userId: string, year: number) => ({
        selectedYear: year,
      }),
    );
    listOwnedInvoices.mockResolvedValue({
      items: [{ id: 'invoice-from-2024' }],
      nextCursor: null,
      totalCount: 1,
    });
  });

  it('keeps current UTC YTD independent of the selected invoice year filter', async () => {
    const getUtcYear = vi
      .spyOn(Date.prototype, 'getUTCFullYear')
      .mockReturnValue(2026);
    const getLocalYear = vi
      .spyOn(Date.prototype, 'getFullYear')
      .mockReturnValue(2027);

    render(
      await InvoicesPage({
        searchParams: Promise.resolve({ year: '2024' }),
      }),
    );

    expect(getOwnedInvoiceSummary).toHaveBeenCalledWith('owner-1', 2026);
    expect(getUtcYear).toHaveBeenCalled();
    expect(getLocalYear).not.toHaveBeenCalled();
    expect(listOwnedInvoices).toHaveBeenCalledWith(
      'owner-1',
      expect.objectContaining({ year: 2024 }),
    );
    expect(screen.getByText('YTD 2026')).toBeInTheDocument();
    expect(screen.getByText('1 filtered rows')).toBeInTheDocument();
    getUtcYear.mockRestore();
    getLocalYear.mockRestore();
    vi.useRealTimers();
  });
});
