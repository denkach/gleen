'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { UsageEventType } from '@/lib/billing/domain';
import type {
  SubscriptionPresentation,
  UsagePresentation,
} from '@/lib/billing/presentation';
import type {
  UsagePeriodBounds,
  UsageRouteQuery,
} from '@/lib/billing/usage-query';

import { BillingIcon } from './billing-icons';
import { BillingCard, BillingPage, BillingStatus } from './billing-page';

export type UsageScreenQuery = UsageRouteQuery;

type CsvActionResult =
  | Readonly<{
      ok: true;
      filename: string;
      contentType: 'text/csv;charset=utf-8';
      content: string;
    }>
  | Readonly<{ ok: false; code: string }>;

export type UsageScreenExportAction = (
  filters: Readonly<{
    search: string;
    eventType: UsageEventType | null;
    periodStart: string | null;
    periodEnd: string | null;
  }>,
) => Promise<CsvActionResult>;

const eventOptions: readonly Readonly<{
  value: UsageEventType;
  label: string;
}>[] = [
  { value: 'reservation', label: 'Reserved' },
  { value: 'settlement', label: 'Used' },
  { value: 'release', label: 'Released' },
  { value: 'period_renewal', label: 'Period renewed' },
  { value: 'manual_adjustment', label: 'Adjusted' },
  { value: 'refund', label: 'Refunded' },
  { value: 'technical_retry', label: 'Technical retry' },
];

function quantityLabel(quantity: number) {
  if (quantity === 0) return '—';
  return quantity > 0 ? `+${quantity}` : String(quantity);
}

function usageHref(query: UsageScreenQuery, cursor: string) {
  const parameters = new URLSearchParams();
  if (query.search !== '') parameters.set('search', query.search);
  if (query.eventType !== null) parameters.set('eventType', query.eventType);
  parameters.set('range', query.range);
  parameters.set('cursor', cursor);
  return `/app/subscription/usage?${parameters.toString()}`;
}

export function UsageScreen({
  subscription,
  usage,
  query,
  periodBounds,
  pageSize,
  exportAction,
}: Readonly<{
  subscription: Pick<
    SubscriptionPresentation,
    'usage' | 'resetAt' | 'resetAtLabel'
  > | null;
  usage: UsagePresentation | null;
  query: UsageScreenQuery;
  periodBounds: UsagePeriodBounds;
  pageSize: number;
  exportAction: UsageScreenExportAction;
}>) {
  const [exportError, setExportError] = useState(false);
  const [exporting, setExporting] = useState(false);

  if (subscription === null || usage === null) {
    return (
      <BillingPage
        eyebrow="Your usage"
        title="Usage ledger"
        description="Track every analysis, retry, credit, refund, and billing event over time."
      >
        <BillingCard className="billing-state-card">
          <div className="billing-state-icon">
            <BillingIcon name="alert" />
          </div>
          <div role="alert">
            <h2>Usage details are temporarily unavailable.</h2>
            <p>Please try again. No usage data has been changed.</p>
          </div>
          <Link className="billing-button" href="/app/subscription/usage">
            Try usage again
          </Link>
        </BillingCard>
      </BillingPage>
    );
  }

  const consumed = subscription.usage.used + subscription.usage.reserved;
  const usagePercent =
    subscription.usage.limit === 0
      ? 0
      : Math.min(100, Math.round((consumed / subscription.usage.limit) * 100));
  const currentOffset = Number(query.cursor ?? 0);
  const retries = usage.items.filter(
    (item) => item.event.key === 'technical_retry',
  ).length;
  const included = usage.items.filter(
    (item) => item.event.key === 'settlement',
  ).length;
  const credits = usage.items.filter((item) => item.quantity > 0).length;
  const breakdownTotal = included + retries + credits;
  const breakdownLabel = `Usage breakdown: ${included} included analyses, ${retries} retries, ${credits} credit events.`;
  const maxQuantity = Math.max(
    1,
    ...usage.items.map((item) => Math.abs(item.quantity)),
  );

  async function exportCsv() {
    setExporting(true);
    setExportError(false);
    const result = await exportAction({
      search: query.search,
      eventType: query.eventType,
      ...periodBounds,
    });
    setExporting(false);

    if (!result.ok) {
      setExportError(true);
      return;
    }

    const blob = new Blob([result.content], { type: result.contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <BillingPage
      eyebrow="Your usage"
      title="Usage ledger"
      description="Track every analysis, retry, credit, refund, and billing event over time."
    >
      <BillingCard className="billing-usage-metrics">
        <div>
          <div className="billing-metric-icon">
            <BillingIcon name="chart" />
          </div>
          <div>
            <div className="billing-metric-label">Current period usage</div>
            <div className="billing-metric-value">
              {consumed} of {subscription.usage.limit}
            </div>
            <div className="billing-progress" aria-hidden="true">
              <span style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
        </div>
        <div>
          <div className="billing-metric-icon billing-metric-symbol">◌</div>
          <div>
            <div className="billing-metric-label">Remaining</div>
            <div className="billing-metric-value">
              {subscription.usage.remaining} analyses
            </div>
          </div>
        </div>
        <div>
          <div className="billing-metric-icon billing-metric-positive">＋</div>
          <div>
            <div className="billing-metric-label">Extra credits</div>
            <div className="billing-metric-value">
              {subscription.usage.extraCredits}
            </div>
          </div>
        </div>
        <div>
          <div className="billing-metric-icon">
            <BillingIcon name="plan" />
          </div>
          <div>
            <div className="billing-metric-label">Reset date</div>
            <div className="billing-metric-value billing-reset-value">
              <time dateTime={subscription.resetAt}>
                {subscription.resetAtLabel}
              </time>
            </div>
          </div>
        </div>
      </BillingCard>

      <div className="billing-usage-layout">
        <BillingCard as="section" className="billing-usage-ledger">
          <form className="billing-toolbar" method="get">
            <label className="billing-search">
              <BillingIcon name="search" />
              <input
                type="search"
                name="search"
                defaultValue={query.search}
                placeholder="Search events…"
                aria-label="Search usage events"
              />
            </label>
            <select
              aria-label="Date range"
              name="range"
              defaultValue={query.range}
            >
              <option value="current">Current billing period</option>
              <option value="last90">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <select
              aria-label="Event type"
              name="eventType"
              defaultValue={query.eventType ?? 'all'}
            >
              <option value="all">All event types</option>
              {eventOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              className="billing-button billing-button-small"
              type="submit"
            >
              Apply
            </button>
            <button
              className="billing-button billing-button-small"
              type="button"
              onClick={exportCsv}
              disabled={exporting}
            >
              <BillingIcon name="download" />
              {exporting ? 'Preparing…' : 'Export CSV'}
            </button>
          </form>
          {exportError && (
            <p className="billing-inline-error" role="alert">
              The CSV export could not be prepared.
            </p>
          )}

          {usage.items.length === 0 ? (
            <div className="billing-empty-state">
              <BillingIcon name="chart" />
              <h2>No usage events found.</h2>
              <p>Try clearing the search or choosing another event type.</p>
            </div>
          ) : (
            <>
              <div className="billing-table-wrap">
                <table className="billing-table" aria-label="Usage activity">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Event</th>
                      <th>Source</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <time dateTime={item.occurredAt}>
                            {item.occurredAtLabel}
                          </time>
                        </td>
                        <td>
                          <b>{item.event.title}</b>
                        </td>
                        <td>
                          {item.source.label}
                          {item.source.detail !== null && (
                            <small className="billing-source-detail">
                              {item.source.detail}
                            </small>
                          )}
                        </td>
                        <td
                          className={
                            item.quantity > 0
                              ? 'billing-quantity-positive'
                              : item.quantity < 0
                                ? 'billing-quantity-negative'
                                : undefined
                          }
                        >
                          {quantityLabel(item.quantity)}
                        </td>
                        <td>
                          <BillingStatus variant={item.status.variant}>
                            {item.status.label}
                          </BillingStatus>
                        </td>
                        <td>{item.remainingBalance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div
                className="billing-mobile-cards"
                role="list"
                aria-label="Usage activity on mobile"
              >
                {usage.items.map((item) => (
                  <BillingCard
                    as="article"
                    className="billing-mobile-row"
                    role="listitem"
                    key={item.id}
                  >
                    <div className="billing-mobile-row-head">
                      <b>{item.event.title}</b>
                      <span>{quantityLabel(item.quantity)}</span>
                    </div>
                    <p className="billing-section-copy">
                      <time dateTime={item.occurredAt}>
                        {item.occurredAtLabel}
                      </time>
                    </p>
                    <div className="billing-summary-row">
                      <span>{item.source.label}</span>
                      <b>{item.remainingBalance} remaining</b>
                    </div>
                    <BillingStatus variant={item.status.variant}>
                      {item.status.label}
                    </BillingStatus>
                  </BillingCard>
                ))}
              </div>
            </>
          )}

          {(currentOffset > 0 || usage.nextCursor !== null) && (
            <div className="billing-pagination">
              <span>
                Showing{' '}
                {usage.items.length === 0
                  ? '0'
                  : `${currentOffset + 1}–${
                      currentOffset + usage.items.length
                    }`}{' '}
                of {usage.totalCount}
              </span>
              <div>
                {currentOffset > 0 && (
                  <Link
                    className="billing-button billing-button-small"
                    href={usageHref(
                      query,
                      String(Math.max(0, currentOffset - pageSize)),
                    )}
                  >
                    Previous page
                  </Link>
                )}
                {usage.nextCursor !== null && (
                  <Link
                    className="billing-button billing-button-small"
                    href={usageHref(query, usage.nextCursor)}
                  >
                    Next page
                  </Link>
                )}
              </div>
            </div>
          )}
        </BillingCard>

        <aside className="billing-usage-side">
          <BillingCard className="billing-chart-card">
            <div className="billing-card-heading">
              <div>
                <h2 className="billing-section-title">Usage breakdown</h2>
                <p className="billing-section-copy">Visible activity</p>
              </div>
              <span className="billing-tag">Live data</span>
            </div>
            <figure
              className="billing-chart-figure"
              role="img"
              aria-label={breakdownLabel}
            >
              <div className="billing-mini-chart" aria-hidden="true">
                {usage.items.map((item) => (
                  <i
                    className="billing-bar"
                    style={{
                      height: `${Math.max(
                        8,
                        (Math.abs(item.quantity) / maxQuantity) * 100,
                      )}%`,
                    }}
                    key={item.id}
                  />
                ))}
              </div>
              <figcaption className="billing-visually-hidden">
                {breakdownLabel}
              </figcaption>
            </figure>
            <div className="billing-chart-legend">
              <div className="billing-legend-row">
                <span>Included analyses</span>
                <b>
                  {included}
                  {breakdownTotal > 0
                    ? ` · ${Math.round((included / breakdownTotal) * 100)}%`
                    : ''}
                </b>
              </div>
              <div className="billing-legend-row">
                <span>Retries</span>
                <b>
                  {retries}
                  {breakdownTotal > 0
                    ? ` · ${Math.round((retries / breakdownTotal) * 100)}%`
                    : ''}
                </b>
              </div>
              <div className="billing-legend-row">
                <span>Credit events</span>
                <b>{credits}</b>
              </div>
            </div>
          </BillingCard>

          <BillingCard className="billing-how-card">
            <h2 className="billing-section-title">How usage works</h2>
            <div className="billing-how-item">
              <div className="billing-metric-icon">
                <BillingIcon name="chart" />
              </div>
              <div>
                <b>Most analyses use one included credit.</b>
                <p>
                  Technical retries do not consume another included analysis.
                </p>
              </div>
            </div>
            <div className="billing-how-item">
              <div className="billing-metric-icon billing-metric-positive">
                ＋
              </div>
              <div>
                <b>Credits add to your balance.</b>
                <p>
                  Renewals, refunds, and support adjustments are recorded
                  automatically.
                </p>
              </div>
            </div>
          </BillingCard>
        </aside>
      </div>
    </BillingPage>
  );
}
