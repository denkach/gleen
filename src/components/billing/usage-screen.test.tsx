import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type {
  SubscriptionPresentation,
  UsagePresentation,
} from '@/lib/billing/presentation';
import { billingMessages } from '@/lib/i18n/messages/billing';

import { UsageScreen as ProductionUsageScreen } from './usage-screen';

type UsageScreenProps = ComponentProps<typeof ProductionUsageScreen>;
function UsageScreen({
  locale = 'en',
  copy = billingMessages.en,
  ...props
}: Omit<UsageScreenProps, 'locale' | 'copy'> &
  Partial<Pick<UsageScreenProps, 'locale' | 'copy'>>) {
  return <ProductionUsageScreen {...props} locale={locale} copy={copy} />;
}

const subscription: Pick<
  SubscriptionPresentation,
  'usage' | 'resetAt' | 'resetAtLabel'
> = {
  usage: {
    used: 17,
    reserved: 1,
    remaining: 7,
    limit: 25,
    extraCredits: 4,
  },
  resetAt: '2026-08-01T00:00:00.000Z',
  resetAtLabel: 'Aug 1, 2026',
};

const usage: UsagePresentation = {
  items: [
    {
      id: 'ledger-1',
      planSlug: 'prism-pro',
      quantity: -1,
      remainingBalance: 7,
      occurredAt: '2026-07-29T10:24:00.000Z',
      occurredAtLabel: 'Jul 29, 2026, 10:24 AM',
      event: {
        key: 'settlement',
        label: 'Used',
        title: 'Used — Systems thinking',
        variant: 'neutral',
      },
      source: {
        key: 'analysis_pipeline',
        label: 'Analysis pipeline',
        detail: 'Knowledge Channel',
      },
      status: {
        key: 'settled',
        label: 'Settled',
        variant: 'neutral',
      },
      jobId: 'job-1',
      analysisId: 'analysis-1',
    },
    {
      id: 'ledger-2',
      planSlug: 'prism-pro',
      quantity: 0,
      remainingBalance: 8,
      occurredAt: '2026-07-29T10:20:00.000Z',
      occurredAtLabel: 'Jul 29, 2026, 10:20 AM',
      event: {
        key: 'technical_retry',
        label: 'Technical retry',
        title: 'Technical retry — Systems thinking',
        variant: 'neutral',
      },
      source: {
        key: 'analysis_pipeline',
        label: 'Analysis pipeline',
        detail: 'Knowledge Channel',
      },
      status: {
        key: 'informational',
        label: 'Informational',
        variant: 'neutral',
      },
      jobId: 'job-1',
      analysisId: null,
    },
  ],
  nextCursor: '25',
  totalCount: 27,
};

describe('UsageScreen', () => {
  it('renders Russian usage headings, filters, event status, export, and mobile navigation', () => {
    render(
      <UsageScreen
        subscription={subscription}
        usage={{
          ...usage,
          items: [
            {
              ...usage.items[0]!,
              event: {
                ...usage.items[0]!.event,
                label: 'Использовано',
                title: 'Использовано — Systems thinking',
              },
              status: { ...usage.items[0]!.status, label: 'Учтено' },
            },
          ],
        }}
        query={{ search: '', eventType: null, cursor: null, range: 'current' }}
        periodBounds={{ periodStart: null, periodEnd: null }}
        pageSize={25}
        exportAction={vi.fn()}
        locale="ru"
        copy={billingMessages.ru}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Журнал использования' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: 'Поиск событий использования' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Учтено')).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: /Экспорт CSV/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Мобильная навигация платежей' }),
    ).toBeInTheDocument();
  });
  it('renders metrics, searchable and filterable desktop/mobile ledgers, chart summary, and pagination', () => {
    render(
      <UsageScreen
        subscription={subscription}
        usage={usage}
        query={{
          search: 'prism',
          eventType: null,
          cursor: null,
          range: 'current',
        }}
        periodBounds={{
          periodStart: '2026-07-01T00:00:00.000Z',
          periodEnd: '2026-08-01T00:00:00.000Z',
        }}
        pageSize={25}
        exportAction={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Usage ledger' }),
    ).toBeInTheDocument();
    expect(screen.getByText('18 of 25')).toBeInTheDocument();
    expect(screen.getByText('7 analyses')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Aug 1, 2026')).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: 'Search usage events' }),
    ).toHaveValue('prism');
    expect(screen.getByRole('combobox', { name: 'Event type' })).toHaveValue(
      'all',
    );

    const table = screen.getByRole('table', { name: 'Usage activity' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(
      screen.getByRole('list', { name: 'Usage activity on mobile' }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('list', { name: 'Usage activity on mobile' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(screen.getByRole('combobox', { name: 'Date range' })).toHaveValue(
      'current',
    );
    expect(
      screen.getByRole('img', { name: /usage breakdown:/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute(
      'href',
      expect.stringContaining('cursor=25'),
    );
  });

  it('uses the authenticated CSV action with the visible filters', async () => {
    const exportAction = vi.fn().mockResolvedValue({
      ok: false,
      code: 'billing_unavailable',
    });
    render(
      <UsageScreen
        subscription={subscription}
        usage={usage}
        query={{
          search: 'retry',
          eventType: 'technical_retry',
          cursor: null,
          range: 'last90',
        }}
        periodBounds={{
          periodStart: '2026-05-01T12:00:00.000Z',
          periodEnd: '2026-07-30T12:00:00.000Z',
        }}
        pageSize={25}
        exportAction={exportAction}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    await waitFor(() =>
      expect(exportAction).toHaveBeenCalledWith({
        search: 'retry',
        eventType: 'technical_retry',
        periodStart: '2026-05-01T12:00:00.000Z',
        periodEnd: '2026-07-30T12:00:00.000Z',
      }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The CSV export could not be prepared.',
    );
  });

  it('renders empty and error states without losing page controls', () => {
    const { rerender } = render(
      <UsageScreen
        subscription={subscription}
        usage={{ items: [], nextCursor: null, totalCount: 0 }}
        query={{ search: '', eventType: null, cursor: null, range: 'current' }}
        periodBounds={{
          periodStart: '2026-07-01T00:00:00.000Z',
          periodEnd: '2026-08-01T00:00:00.000Z',
        }}
        pageSize={25}
        exportAction={vi.fn()}
      />,
    );
    expect(screen.getByText('No usage events found.')).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: 'Search usage events' }),
    ).toBeInTheDocument();

    rerender(
      <UsageScreen
        subscription={null}
        usage={null}
        query={{ search: '', eventType: null, cursor: null, range: 'current' }}
        periodBounds={{
          periodStart: '2026-07-01T00:00:00.000Z',
          periodEnd: '2026-08-01T00:00:00.000Z',
        }}
        pageSize={25}
        exportAction={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Usage details are temporarily unavailable.',
    );
  });

  it('renders offset-aware previous and next links without losing filters', () => {
    render(
      <UsageScreen
        subscription={subscription}
        usage={{ ...usage, nextCursor: '50', totalCount: 80 }}
        query={{
          search: 'retry',
          eventType: 'technical_retry',
          cursor: '25',
          range: 'last90',
        }}
        periodBounds={{
          periodStart: '2026-05-01T00:00:00.000Z',
          periodEnd: '2026-07-30T00:00:00.000Z',
        }}
        pageSize={25}
        exportAction={vi.fn()}
      />,
    );

    expect(screen.getByText('Showing 26–27 of 80')).toBeInTheDocument();
    const previous = screen.getByRole('link', { name: 'Previous page' });
    const next = screen.getByRole('link', { name: 'Next page' });
    for (const link of [previous, next]) {
      expect(link).toHaveAttribute('href', expect.stringContaining('retry'));
      expect(link).toHaveAttribute(
        'href',
        expect.stringContaining('eventType=technical_retry'),
      );
      expect(link).toHaveAttribute(
        'href',
        expect.stringContaining('range=last90'),
      );
    }
    expect(previous).toHaveAttribute(
      'href',
      expect.stringContaining('cursor=0'),
    );
    expect(next).toHaveAttribute('href', expect.stringContaining('cursor=50'));
  });
});
