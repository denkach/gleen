import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  InvoicePresentation,
  SubscriptionPresentation,
} from '@/lib/billing/presentation';

import { InvoicesScreen, parseInvoiceRouteQuery } from './invoices-screen';

const invoices: InvoicePresentation = {
  items: [
    {
      id: 'paid',
      number: 'INV-1004',
      planSlug: 'prism-pro',
      planName: 'Prism Pro',
      interval: 'month',
      amountDue: {
        amountMinor: 4900,
        currency: 'usd',
        formattedAmount: '$49.00',
      },
      amountPaid: {
        amountMinor: 4900,
        currency: 'usd',
        formattedAmount: '$49.00',
      },
      refundedAmount: {
        amountMinor: 0,
        currency: 'usd',
        formattedAmount: '$0.00',
      },
      status: { key: 'paid', label: 'Paid', variant: 'positive' },
      createdAt: '2026-07-01T00:00:00.000Z',
      createdAtLabel: 'Jul 1, 2026',
      dueAt: null,
      dueAtLabel: null,
      paidAt: '2026-07-01T00:00:00.000Z',
      paidAtLabel: 'Jul 1, 2026',
      hostedUrl: 'https://invoice.stripe.com/i/acct_test/inv_paid',
      pdfUrl: 'https://pay.stripe.com/invoice/acct_test/inv_paid/pdf',
    },
    {
      id: 'open',
      number: 'INV-1003',
      planSlug: 'prism-pro',
      planName: 'Prism Pro',
      interval: 'month',
      amountDue: {
        amountMinor: 4900,
        currency: 'usd',
        formattedAmount: '$49.00',
      },
      amountPaid: { amountMinor: 0, currency: 'usd', formattedAmount: '$0.00' },
      refundedAmount: {
        amountMinor: 0,
        currency: 'usd',
        formattedAmount: '$0.00',
      },
      status: { key: 'open', label: 'Open', variant: 'warning' },
      createdAt: '2026-06-01T00:00:00.000Z',
      createdAtLabel: 'Jun 1, 2026',
      dueAt: '2026-06-08T00:00:00.000Z',
      dueAtLabel: 'Jun 8, 2026',
      paidAt: null,
      paidAtLabel: null,
      hostedUrl: 'http://unsafe.example/invoice',
      pdfUrl: null,
    },
    {
      id: 'refund',
      number: 'INV-1002',
      planSlug: 'starter',
      planName: 'Starter',
      interval: 'month',
      amountDue: {
        amountMinor: 1900,
        currency: 'usd',
        formattedAmount: '$19.00',
      },
      amountPaid: {
        amountMinor: 1900,
        currency: 'usd',
        formattedAmount: '$19.00',
      },
      refundedAmount: {
        amountMinor: 1900,
        currency: 'usd',
        formattedAmount: '$19.00',
      },
      status: { key: 'refunded', label: 'Refunded', variant: 'warning' },
      createdAt: '2026-05-01T00:00:00.000Z',
      createdAtLabel: 'May 1, 2026',
      dueAt: null,
      dueAtLabel: null,
      paidAt: '2026-05-01T00:00:00.000Z',
      paidAtLabel: 'May 1, 2026',
      hostedUrl: null,
      pdfUrl: null,
    },
    {
      id: 'failed',
      number: null,
      planSlug: 'starter',
      planName: 'Starter',
      interval: 'month',
      amountDue: {
        amountMinor: 1900,
        currency: 'usd',
        formattedAmount: '$19.00',
      },
      amountPaid: { amountMinor: 0, currency: 'usd', formattedAmount: '$0.00' },
      refundedAmount: {
        amountMinor: 0,
        currency: 'usd',
        formattedAmount: '$0.00',
      },
      status: { key: 'failed', label: 'Failed', variant: 'negative' },
      createdAt: '2026-04-01T00:00:00.000Z',
      createdAtLabel: 'Apr 1, 2026',
      dueAt: null,
      dueAtLabel: null,
      paidAt: null,
      paidAtLabel: null,
      hostedUrl: null,
      pdfUrl: null,
    },
  ],
  nextCursor: null,
  totalCount: 4,
};

const subscription = {
  resetAt: '2026-08-01T00:00:00.000Z',
  resetAtLabel: 'Aug 1, 2026',
  entitlement: { key: 'active', label: 'Active', variant: 'positive' },
} as const satisfies Pick<
  SubscriptionPresentation,
  'resetAt' | 'resetAtLabel' | 'entitlement'
>;

describe('InvoicesScreen', () => {
  it('renders summary, closed filters, desktop table, mobile cards, and all status variants', () => {
    render(
      <InvoicesScreen
        subscription={subscription}
        invoices={invoices}
        query={{ search: '', status: null, year: 2026, cursor: null }}
        exportAction={vi.fn()}
      />,
    );
    expect(screen.getAllByText('$49.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Jul 1, 2026').length).toBeGreaterThan(0);
    expect(screen.getByText('Aug 1, 2026')).toBeInTheDocument();
    expect(screen.getByText('In good standing')).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('table', { name: 'Invoice history' }),
      ).getAllByRole('row'),
    ).toHaveLength(5);
    expect(
      within(
        screen.getByRole('list', { name: 'Invoice history on mobile' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(4);
    for (const label of ['Paid', 'Open', 'Refunded', 'Failed']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('only renders projected HTTPS invoice actions with noreferrer', () => {
    render(
      <InvoicesScreen
        subscription={subscription}
        invoices={invoices}
        query={{ search: '', status: null, year: 2026, cursor: null }}
        exportAction={vi.fn()}
      />,
    );
    for (const link of screen.getAllByRole('link', {
      name: /view invoice|download pdf/i,
    })) {
      expect(link.getAttribute('href')).toMatch(/^https:\/\//);
      expect(link).toHaveAttribute('rel', 'noreferrer');
    }
    expect(
      screen.queryByRole('link', { name: /INV-1003/i }),
    ).not.toBeInTheDocument();
  });

  it('exports through the authenticated server action with visible closed filters', async () => {
    const exportAction = vi.fn().mockResolvedValue({
      ok: false,
      code: 'billing_unavailable',
    });
    render(
      <InvoicesScreen
        subscription={subscription}
        invoices={invoices}
        query={{ search: 'INV-10', status: 'paid', year: 2026, cursor: null }}
        exportAction={exportAction}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    await waitFor(() =>
      expect(exportAction).toHaveBeenCalledWith({
        search: 'INV-10',
        status: 'paid',
        year: 2026,
      }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The invoice export could not be prepared.',
    );
  });

  it('distinguishes empty, filtered-empty, and recoverable error states', () => {
    const { rerender } = render(
      <InvoicesScreen
        subscription={subscription}
        invoices={{ items: [], nextCursor: null, totalCount: 0 }}
        query={{ search: '', status: null, year: null, cursor: null }}
        exportAction={vi.fn()}
      />,
    );
    expect(screen.getByText('No invoices yet.')).toBeInTheDocument();

    rerender(
      <InvoicesScreen
        subscription={subscription}
        invoices={{ items: [], nextCursor: null, totalCount: 4 }}
        query={{ search: 'missing', status: null, year: null, cursor: null }}
        exportAction={vi.fn()}
      />,
    );
    expect(
      screen.getByText('No invoices match these filters.'),
    ).toBeInTheDocument();

    rerender(
      <InvoicesScreen
        subscription={null}
        invoices={null}
        query={{ search: '', status: null, year: null, cursor: null }}
        exportAction={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Invoice history is temporarily unavailable.',
    );
  });
});

describe('parseInvoiceRouteQuery', () => {
  it('falls back safely for invalid or repeated closed query values', () => {
    expect(
      parseInvoiceRouteQuery({
        search: ['attacker', 'second'],
        status: 'unknown',
        year: 'not-a-year',
        cursor: '',
      }),
    ).toEqual({ search: '', status: null, year: null, cursor: null });
  });

  it('accepts only the supported normalized invoice filters', () => {
    expect(
      parseInvoiceRouteQuery({
        search: '  INV-10 ',
        status: 'refunded',
        year: '2026',
        cursor: 'cursor-2',
      }),
    ).toEqual({
      search: 'INV-10',
      status: 'refunded',
      year: 2026,
      cursor: 'cursor-2',
    });
  });
});
