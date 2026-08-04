'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type {
  InvoiceRouteQuery,
  InvoiceScreenStatus,
} from '@/lib/billing/invoice-query';
import type {
  InvoicePresentation,
  InvoiceSummaryPresentation,
  SubscriptionPresentation,
} from '@/lib/billing/presentation';
import type { BillingMessages } from '@/lib/i18n/messages/billing';

import {
  resolveBillingCopySource,
  type BillingCopySource,
} from './billing-copy-source';
import { BillingIcon } from './billing-icons';
import { BillingCard, BillingPage, BillingStatus } from './billing-page';

type CsvActionResult =
  | Readonly<{
      ok: true;
      filename: string;
      contentType: 'text/csv;charset=utf-8';
      content: string;
    }>
  | Readonly<{ ok: false; code: string }>;

type InvoiceExportAction = (filters: {
  search: string;
  status: InvoiceScreenStatus | null;
  year: number | null;
}) => Promise<CsvActionResult>;

function httpsUrl(value: string | null) {
  if (value === null) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function invoiceIdentifier(
  invoice: InvoicePresentation['items'][number],
  copy: BillingMessages,
) {
  return invoice.number ?? copy.invoices.table.pendingNumber;
}

function InvoiceActions({
  invoice,
  copy,
}: Readonly<{
  invoice: InvoicePresentation['items'][number];
  copy: BillingMessages;
}>) {
  const hostedUrl = httpsUrl(invoice.hostedUrl);
  const pdfUrl = httpsUrl(invoice.pdfUrl);
  if (hostedUrl === null && pdfUrl === null) return <span>—</span>;
  return (
    <div className="billing-invoice-actions">
      {hostedUrl !== null && (
        <a href={hostedUrl} target="_blank" rel="noreferrer">
          {copy.invoices.actions.view(invoiceIdentifier(invoice, copy))}
        </a>
      )}
      {pdfUrl !== null && (
        <a href={pdfUrl} target="_blank" rel="noreferrer">
          {copy.invoices.actions.downloadPdf(invoiceIdentifier(invoice, copy))}
        </a>
      )}
    </div>
  );
}

export function InvoicesScreen({
  subscription,
  invoices,
  summary,
  query,
  pageSize,
  exportAction,
  copySource,
}: Readonly<{
  subscription: Pick<
    SubscriptionPresentation,
    'resetAt' | 'resetAtLabel' | 'entitlement'
  > | null;
  invoices: InvoicePresentation | null;
  summary: InvoiceSummaryPresentation | null;
  query: InvoiceRouteQuery;
  pageSize: number;
  exportAction: InvoiceExportAction;
  copySource: BillingCopySource;
}>) {
  const { locale, copy } = resolveBillingCopySource(copySource);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  if (subscription === null || invoices === null || summary === null) {
    return (
      <BillingPage
        locale={locale}
        eyebrow={copy.invoices.eyebrow}
        title={copy.invoices.title}
        description={copy.invoices.description}
      >
        <BillingCard className="billing-state-card">
          <div className="billing-state-icon">
            <BillingIcon name="alert" />
          </div>
          <div role="alert">
            <h2>{copy.invoices.error.title}</h2>
            <p>{copy.invoices.error.description}</p>
          </div>
          <Link className="billing-button" href="/app/subscription/invoices">
            {copy.invoices.error.retry}
          </Link>
        </BillingCard>
      </BillingPage>
    );
  }

  const filtered =
    query.search !== '' || query.status !== null || query.year !== null;
  const offset = query.cursor === null ? 0 : Number(query.cursor);
  const years = [...summary.availableYears];
  if (query.year !== null && !years.includes(query.year))
    years.push(query.year);
  years.sort((left, right) => right - left);
  const pageHref = (cursor: number) => {
    const params = new URLSearchParams();
    if (query.search !== '') params.set('search', query.search);
    if (query.status !== null) params.set('status', query.status);
    if (query.year !== null) params.set('year', String(query.year));
    params.set('cursor', String(cursor));
    return `/app/subscription/invoices?${params.toString()}`;
  };

  async function exportCsv() {
    setExporting(true);
    setExportError(false);
    try {
      const result = await exportAction({
        search: query.search,
        status: query.status,
        year: query.year,
      });
      if (!mounted.current) return;
      if (!result.ok) {
        setExportError(true);
        return;
      }
      const blob = new Blob([result.content], { type: result.contentType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      if (mounted.current) setExportError(true);
    } finally {
      if (mounted.current) setExporting(false);
    }
  }

  return (
    <BillingPage
      locale={locale}
      eyebrow={copy.invoices.eyebrow}
      title={copy.invoices.title}
      description={copy.invoices.description}
    >
      <BillingCard className="billing-invoice-summary">
        <div>
          <div className="billing-metric-icon">$</div>
          <div>
            <div className="billing-metric-label">
              {copy.invoices.metrics.yearToDate}
            </div>
            <div className="billing-metric-value">
              {summary.yearToDateSpendLabel}
            </div>
          </div>
        </div>
        <div>
          <div className="billing-metric-icon">
            <BillingIcon name="plan" />
          </div>
          <div>
            <div className="billing-metric-label">
              {copy.invoices.metrics.lastInvoice}
            </div>
            <div className="billing-metric-value billing-reset-value">
              {summary.lastInvoiceAtLabel}
            </div>
            <div className="billing-metric-note">
              {copy.invoices.metrics.invoiceCount(summary.totalCount)}
            </div>
          </div>
        </div>
        <div>
          <div className="billing-metric-icon">
            <BillingIcon name="plan" />
          </div>
          <div>
            <div className="billing-metric-label">
              {copy.invoices.metrics.nextRenewal}
            </div>
            <div className="billing-metric-value billing-reset-value">
              <time dateTime={subscription.resetAt}>
                {subscription.resetAtLabel}
              </time>
            </div>
          </div>
        </div>
        <div>
          <div className="billing-metric-icon billing-metric-positive">✓</div>
          <div>
            <div className="billing-metric-label">
              {copy.invoices.metrics.paymentStatus}
            </div>
            <div className="billing-metric-value billing-reset-value billing-positive">
              {subscription.entitlement.variant === 'positive'
                ? copy.invoices.metrics.goodStanding
                : subscription.entitlement.label}
            </div>
          </div>
        </div>
      </BillingCard>

      <div className="billing-invoice-layout">
        <BillingCard as="section" className="billing-invoice-main">
          <form className="billing-invoice-toolbar" method="get">
            <label className="billing-search">
              <BillingIcon name="search" />
              <input
                type="search"
                name="search"
                defaultValue={query.search}
                placeholder={copy.invoices.filters.searchPlaceholder}
                aria-label={copy.invoices.filters.searchLabel}
              />
            </label>
            <select
              name="status"
              aria-label={copy.invoices.filters.statusLabel}
              defaultValue={query.status ?? 'all'}
            >
              <option value="all">{copy.invoices.filters.statusAll}</option>
              <option value="paid">
                {copy.presentation.invoice.status.paid}
              </option>
              <option value="open">
                {copy.presentation.invoice.status.open}
              </option>
              <option value="refunded">
                {copy.presentation.invoice.status.refunded}
              </option>
              <option value="failed">
                {copy.presentation.invoice.status.failed}
              </option>
            </select>
            <select
              name="year"
              aria-label={copy.invoices.filters.yearLabel}
              defaultValue={query.year ?? 'all'}
            >
              <option value="all">{copy.invoices.filters.yearAll}</option>
              {years.map((year) => (
                <option value={year} key={year}>
                  {copy.invoices.filters.year(year)}
                </option>
              ))}
            </select>
            <button
              className="billing-button billing-button-small"
              type="submit"
            >
              {copy.invoices.filters.apply}
            </button>
            <button
              className="billing-button billing-button-small"
              type="button"
              onClick={exportCsv}
              disabled={exporting}
            >
              <BillingIcon name="download" />
              {exporting
                ? copy.invoices.export.preparing
                : copy.invoices.export.action}
            </button>
          </form>
          {exportError && (
            <p className="billing-inline-error" role="alert">
              {copy.invoices.export.error}
            </p>
          )}
          {invoices.items.length === 0 ? (
            <div className="billing-empty-state">
              <BillingIcon name="document" />
              <h2>
                {filtered
                  ? copy.invoices.empty.filteredTitle
                  : copy.invoices.empty.initialTitle}
              </h2>
              <p>
                {filtered
                  ? copy.invoices.empty.filteredDescription
                  : copy.invoices.empty.initialDescription}
              </p>
            </div>
          ) : (
            <>
              <div className="billing-table-wrap">
                <table
                  className="billing-table"
                  aria-label={copy.invoices.table.label}
                >
                  <thead>
                    <tr>
                      <th>{copy.invoices.table.invoice}</th>
                      <th>{copy.invoices.table.date}</th>
                      <th>{copy.invoices.table.plan}</th>
                      <th>{copy.invoices.table.amount}</th>
                      <th>{copy.invoices.table.status}</th>
                      <th>{copy.invoices.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.items.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoiceIdentifier(invoice, copy)}</td>
                        <td>
                          <time dateTime={invoice.createdAt}>
                            {invoice.createdAtLabel}
                          </time>
                        </td>
                        <td>{invoice.planName}</td>
                        <td>{invoice.amountDue.formattedAmount}</td>
                        <td>
                          <BillingStatus variant={invoice.status.variant}>
                            {invoice.status.label}
                          </BillingStatus>
                        </td>
                        <td>
                          <InvoiceActions invoice={invoice} copy={copy} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul
                className="billing-mobile-cards"
                aria-label={copy.invoices.table.mobileLabel}
              >
                {invoices.items.map((invoice) => (
                  <li
                    className="billing-card billing-mobile-row"
                    key={invoice.id}
                  >
                    <div className="billing-mobile-row-head">
                      <b>{invoiceIdentifier(invoice, copy)}</b>
                      <BillingStatus variant={invoice.status.variant}>
                        {invoice.status.label}
                      </BillingStatus>
                    </div>
                    <p className="billing-section-copy">
                      {invoice.createdAtLabel} · {invoice.planName}
                    </p>
                    <b>{invoice.amountDue.formattedAmount}</b>
                    <InvoiceActions invoice={invoice} copy={copy} />
                  </li>
                ))}
              </ul>
              <nav
                className="billing-pagination"
                aria-label={copy.invoices.pagination.label}
              >
                <span>
                  {copy.invoices.pagination.showing(
                    offset + 1,
                    offset + invoices.items.length,
                    invoices.totalCount,
                  )}
                </span>
                <div>
                  {offset > 0 && (
                    <Link
                      className="billing-button billing-button-small"
                      href={pageHref(Math.max(0, offset - pageSize))}
                      aria-label={copy.invoices.pagination.previousLabel}
                    >
                      {copy.invoices.pagination.previous}
                    </Link>
                  )}
                  {invoices.nextCursor !== null && (
                    <Link
                      className="billing-button billing-button-small"
                      href={pageHref(Number(invoices.nextCursor))}
                      aria-label={copy.invoices.pagination.nextLabel}
                    >
                      {copy.invoices.pagination.next}
                    </Link>
                  )}
                </div>
              </nav>
            </>
          )}
        </BillingCard>

        <aside className="billing-invoice-side">
          <BillingCard>
            <h2 className="billing-section-title">
              {copy.invoices.details.title}
            </h2>
            <p className="billing-section-copy">
              {copy.invoices.details.description}
            </p>
            <Link
              className="billing-button billing-portal-full-button"
              href="/app/subscription/portal"
            >
              {copy.invoices.details.edit}
            </Link>
          </BillingCard>
          <BillingCard>
            <div className="billing-card-heading">
              <div className="billing-metric-icon">
                <BillingIcon name="document" />
              </div>
              <div>
                <h2 className="billing-section-title">
                  {copy.invoices.details.receiptTitle}
                </h2>
                <p className="billing-section-copy">
                  {copy.invoices.details.receiptDescription}
                </p>
              </div>
            </div>
            <Link
              className="billing-button billing-portal-full-button"
              href="/app/subscription/portal"
            >
              {copy.invoices.details.support}
            </Link>
          </BillingCard>
        </aside>
      </div>
    </BillingPage>
  );
}
