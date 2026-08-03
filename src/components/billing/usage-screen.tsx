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
import { formatNumber } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/locales';
import type { BillingMessages } from '@/lib/i18n/messages/billing';

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

function eventOptions(copy: BillingMessages) {
  const event = copy.presentation.usage.event;
  return [
    { value: 'reservation', label: event.reservation },
    { value: 'settlement', label: event.settlement },
    { value: 'release', label: event.release },
    { value: 'period_renewal', label: event.periodRenewal },
    { value: 'manual_adjustment', label: event.manualAdjustment },
    { value: 'refund', label: event.refund },
    { value: 'technical_retry', label: event.technicalRetry },
  ] as const satisfies readonly Readonly<{
    value: UsageEventType;
    label: string;
  }>[];
}

function quantityLabel(quantity: number, locale: Locale) {
  if (quantity === 0) return '—';
  const formatted = formatNumber({ value: Math.abs(quantity), locale });
  return quantity > 0 ? `+${formatted}` : `−${formatted}`;
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
  locale,
  copy,
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
  locale: Locale;
  copy: BillingMessages;
}>) {
  const [exportError, setExportError] = useState(false);
  const [exporting, setExporting] = useState(false);

  if (subscription === null || usage === null) {
    return (
      <BillingPage
        eyebrow={copy.usage.eyebrow}
        title={copy.usage.title}
        description={copy.usage.description}
        copy={copy}
      >
        <BillingCard className="billing-state-card">
          <div className="billing-state-icon">
            <BillingIcon name="alert" />
          </div>
          <div role="alert">
            <h2>{copy.usage.error.title}</h2>
            <p>{copy.usage.error.description}</p>
          </div>
          <Link className="billing-button" href="/app/subscription/usage">
            {copy.usage.error.retry}
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
  const breakdownLabel = copy.usage.breakdown.label(included, retries, credits);
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
      eyebrow={copy.usage.eyebrow}
      title={copy.usage.title}
      description={copy.usage.description}
      copy={copy}
    >
      <BillingCard className="billing-usage-metrics">
        <div>
          <div className="billing-metric-icon">
            <BillingIcon name="chart" />
          </div>
          <div>
            <div className="billing-metric-label">
              {copy.usage.metrics.current}
            </div>
            <div className="billing-metric-value">
              {copy.usage.metrics.of(consumed, subscription.usage.limit)}
            </div>
            <div className="billing-progress" aria-hidden="true">
              <span style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
        </div>
        <div>
          <div className="billing-metric-icon billing-metric-symbol">◌</div>
          <div>
            <div className="billing-metric-label">
              {copy.usage.metrics.remaining}
            </div>
            <div className="billing-metric-value">
              {copy.usage.metrics.analyses(subscription.usage.remaining)}
            </div>
          </div>
        </div>
        <div>
          <div className="billing-metric-icon billing-metric-positive">＋</div>
          <div>
            <div className="billing-metric-label">
              {copy.usage.metrics.extraCredits}
            </div>
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
            <div className="billing-metric-label">
              {copy.usage.metrics.resetDate}
            </div>
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
                placeholder={copy.usage.filters.searchPlaceholder}
                aria-label={copy.usage.filters.searchLabel}
              />
            </label>
            <select
              aria-label={copy.usage.filters.dateRange}
              name="range"
              defaultValue={query.range}
            >
              <option value="current">{copy.usage.filters.current}</option>
              <option value="last90">{copy.usage.filters.last90}</option>
              <option value="all">{copy.usage.filters.allTime}</option>
            </select>
            <select
              aria-label={copy.usage.filters.eventType}
              name="eventType"
              defaultValue={query.eventType ?? 'all'}
            >
              <option value="all">{copy.usage.filters.allEvents}</option>
              {eventOptions(copy).map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              className="billing-button billing-button-small"
              type="submit"
            >
              {copy.usage.filters.apply}
            </button>
            <button
              className="billing-button billing-button-small"
              type="button"
              onClick={exportCsv}
              disabled={exporting}
            >
              <BillingIcon name="download" />
              {exporting
                ? copy.usage.export.preparing
                : copy.usage.export.action}
            </button>
          </form>
          {exportError && (
            <p className="billing-inline-error" role="alert">
              {copy.usage.export.error}
            </p>
          )}

          {usage.items.length === 0 ? (
            <div className="billing-empty-state">
              <BillingIcon name="chart" />
              <h2>{copy.usage.empty.title}</h2>
              <p>{copy.usage.empty.description}</p>
            </div>
          ) : (
            <>
              <div className="billing-table-wrap">
                <table
                  className="billing-table"
                  aria-label={copy.usage.table.label}
                >
                  <thead>
                    <tr>
                      <th>{copy.usage.table.date}</th>
                      <th>{copy.usage.table.event}</th>
                      <th>{copy.usage.table.source}</th>
                      <th>{copy.usage.table.quantity}</th>
                      <th>{copy.usage.table.status}</th>
                      <th>{copy.usage.table.remaining}</th>
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
                          {quantityLabel(item.quantity, locale)}
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
                aria-label={copy.usage.table.mobileLabel}
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
                      <span>{quantityLabel(item.quantity, locale)}</span>
                    </div>
                    <p className="billing-section-copy">
                      <time dateTime={item.occurredAt}>
                        {item.occurredAtLabel}
                      </time>
                    </p>
                    <div className="billing-summary-row">
                      <span>{item.source.label}</span>
                      <b>
                        {copy.usage.table.remainingValue(item.remainingBalance)}
                      </b>
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
                {copy.usage.pagination.showing(
                  usage.items.length === 0
                    ? '0'
                    : `${currentOffset + 1}–${
                        currentOffset + usage.items.length
                      }`,
                  usage.totalCount,
                )}
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
                    {copy.usage.pagination.previous}
                  </Link>
                )}
                {usage.nextCursor !== null && (
                  <Link
                    className="billing-button billing-button-small"
                    href={usageHref(query, usage.nextCursor)}
                  >
                    {copy.usage.pagination.next}
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
                <h2 className="billing-section-title">
                  {copy.usage.breakdown.title}
                </h2>
                <p className="billing-section-copy">
                  {copy.usage.breakdown.visible}
                </p>
              </div>
              <span className="billing-tag">{copy.usage.breakdown.live}</span>
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
                <span>{copy.usage.breakdown.included}</span>
                <b>
                  {included}
                  {breakdownTotal > 0
                    ? ` · ${Math.round((included / breakdownTotal) * 100)}%`
                    : ''}
                </b>
              </div>
              <div className="billing-legend-row">
                <span>{copy.usage.breakdown.retries}</span>
                <b>
                  {retries}
                  {breakdownTotal > 0
                    ? ` · ${Math.round((retries / breakdownTotal) * 100)}%`
                    : ''}
                </b>
              </div>
              <div className="billing-legend-row">
                <span>{copy.usage.breakdown.credits}</span>
                <b>{credits}</b>
              </div>
            </div>
          </BillingCard>

          <BillingCard className="billing-how-card">
            <h2 className="billing-section-title">{copy.usage.help.title}</h2>
            <div className="billing-how-item">
              <div className="billing-metric-icon">
                <BillingIcon name="chart" />
              </div>
              <div>
                <b>{copy.usage.help.includedTitle}</b>
                <p>{copy.usage.help.includedDescription}</p>
              </div>
            </div>
            <div className="billing-how-item">
              <div className="billing-metric-icon billing-metric-positive">
                ＋
              </div>
              <div>
                <b>{copy.usage.help.creditsTitle}</b>
                <p>{copy.usage.help.creditsDescription}</p>
              </div>
            </div>
          </BillingCard>
        </aside>
      </div>
    </BillingPage>
  );
}
