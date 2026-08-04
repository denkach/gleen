import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getRequestLocale, getUser, repository } = vi.hoisted(() => ({
  getRequestLocale: vi.fn(),
  getUser: vi.fn(),
  repository: {
    getOwnedInvoiceSummary: vi.fn(),
    getOwnedSnapshot: vi.fn(),
    listOwnedInvoices: vi.fn(),
    listOwnedUsage: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('@/lib/i18n/request-locale', () => ({ getRequestLocale }));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser } }),
}));

vi.mock('@/lib/billing/supabase-repository', () => ({
  createSupabaseBillingRepository: () => repository,
}));

vi.mock('@/lib/billing/actions', () => ({
  cancelScheduledDowngrade: vi.fn(),
  changePlan: vi.fn(),
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
  exportInvoicesCsv: vi.fn(),
  exportUsageCsv: vi.fn(),
  getCheckoutConfirmation: vi.fn(),
  getPaymentMethodSummary: vi.fn(async () => ({
    ok: false,
    code: 'fixture-unavailable',
  })),
}));

const subscriptionPresentation = {
  currentPlan: { slug: 'starter', displayName: 'Starter' },
  currentPrice: null,
  entitlement: { key: 'active', label: 'Active', variant: 'positive' },
  resetAt: '2026-08-31T00:00:00.000Z',
  resetAtLabel: '31 Aug 2026',
  paymentMethod: { status: 'unavailable' },
  scheduledChange: null,
  usage: { used: 10, reserved: 0, remaining: 0, limit: 10 },
  availablePlans: [
    {
      plan: { slug: 'starter', displayName: 'Starter' },
      prices: [],
    },
  ],
};

vi.mock('@/lib/billing/presentation', () => ({
  formatMoney: () => '$0.00',
  toCheckoutPresentation: (
    plan: Readonly<{ slug: string; displayName: string }>,
    price: Readonly<{ interval: string }>,
  ) => ({ plan, price }),
  toInvoicePresentation: () => ({ items: [], nextCursor: null, totalCount: 0 }),
  toInvoiceSummaryPresentation: () => ({ availableYears: [] }),
  toLimitReachedPresentation: () => ({
    usage: { used: 10, reserved: 0, remaining: 0, limit: 10 },
  }),
  toSubscriptionPresentation: () => subscriptionPresentation,
  toUsagePresentation: () => ({ items: [], nextCursor: null, totalCount: 0 }),
}));

vi.mock('@/env', () => ({
  validateStripePublicEnv: () => ({
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_boundary',
  }),
}));

vi.mock('@/components/billing/subscription-screen', () => ({
  SubscriptionScreen: () => null,
}));
vi.mock('@/components/billing/usage-screen', () => ({
  UsageScreen: () => null,
}));
vi.mock('@/components/billing/checkout-experience', () => ({
  CheckoutExperience: () => null,
}));
vi.mock('@/components/billing/portal-screen', () => ({
  PortalScreen: () => null,
}));
vi.mock('@/components/billing/invoices-screen', () => ({
  InvoicesScreen: () => null,
}));
vi.mock('@/components/billing/limit-reached-screen', () => ({
  LimitReachedScreen: () => null,
}));

import CheckoutPage from './checkout/page';
import InvoicesPage from './invoices/page';
import LimitReachedPage from './limit-reached/page';
import SubscriptionPage from './page';
import PortalPage from './portal/page';
import UsagePage from './usage/page';

function expectCatalogCopyBoundary(element: ReactElement) {
  const props = element.props as Readonly<Record<string, unknown>>;

  expect(props).not.toHaveProperty('copy');
  expect(props).not.toHaveProperty('locale');
  expect(props.copySource).toEqual({ kind: 'catalog', locale: 'de' });
  expect(JSON.stringify(props.copySource)).toBe(
    '{"kind":"catalog","locale":"de"}',
  );
  expect(() => structuredClone(props.copySource)).not.toThrow();
}

describe('production billing copy boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRequestLocale.mockResolvedValue('de');
    getUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } });
    repository.getOwnedSnapshot.mockResolvedValue({
      availablePlans: [
        {
          plan: {
            slug: 'starter',
            displayName: 'Starter',
            purchasable: true,
          },
          prices: [{ interval: 'month' }],
        },
      ],
      paymentSummary: { outstandingAmountMinor: 0, currency: 'usd' },
      period: null,
    });
    repository.listOwnedUsage.mockResolvedValue({
      items: [],
      nextCursor: null,
      totalCount: 0,
    });
    repository.listOwnedInvoices.mockResolvedValue({
      items: [],
      nextCursor: null,
      totalCount: 0,
    });
    repository.getOwnedInvoiceSummary.mockResolvedValue({});
  });

  it('keeps subscription catalog functions behind the client boundary', async () => {
    expectCatalogCopyBoundary(
      await SubscriptionPage({ searchParams: Promise.resolve({}) }),
    );
  });

  it('keeps usage catalog functions behind the client boundary', async () => {
    expectCatalogCopyBoundary(
      await UsagePage({ searchParams: Promise.resolve({}) }),
    );
  });

  it('keeps checkout catalog functions behind the client boundary', async () => {
    expectCatalogCopyBoundary(
      await CheckoutPage({ searchParams: Promise.resolve({}) }),
    );
  });

  it('keeps portal catalog functions behind the client boundary', async () => {
    expectCatalogCopyBoundary(
      await PortalPage({ searchParams: Promise.resolve({}) }),
    );
  });

  it('keeps invoice catalog functions behind the client boundary', async () => {
    expectCatalogCopyBoundary(
      await InvoicesPage({ searchParams: Promise.resolve({}) }),
    );
  });

  it('keeps limit-reached catalog functions behind the client boundary', async () => {
    expectCatalogCopyBoundary(await LimitReachedPage());
  });
});
