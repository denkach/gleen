'use client';

import Link from 'next/link';
import { useState } from 'react';
import { z } from 'zod';

import type { InvoiceStatus } from '@/lib/billing/domain';
import type {
  InvoicePresentation,
  SubscriptionPresentation,
} from '@/lib/billing/presentation';
import { formatMoney } from '@/lib/billing/presentation';

import { BillingIcon } from './billing-icons';
import { BillingCard, BillingPage, BillingStatus } from './billing-page';

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

function invoiceIdentifier(invoice: InvoicePresentation['items'][number]) {
  return invoice.number ?? 'Pending number';
}

function InvoiceActions({
  invoice,
}: Readonly<{ invoice: InvoicePresentation['items'][number] }>) {
  const hostedUrl = httpsUrl(invoice.hostedUrl);
  const pdfUrl = httpsUrl(invoice.pdfUrl);
  if (hostedUrl === null && pdfUrl === null) return <span>—</span>;
  return (
    <div className="billing-invoice-actions">
      {hostedUrl !== null && (
        <a href={hostedUrl} target="_blank" rel="noreferrer">
          View invoice {invoiceIdentifier(invoice)}
        </a>
      )}
      {pdfUrl !== null && (
        <a href={pdfUrl} target="_blank" rel="noreferrer">
          Download PDF {invoiceIdentifier(invoice)}
        </a>
      )}
    </div>
  );
}

export function InvoicesScreen({
  subscription,
  invoices,
  query,
  exportAction,
}: Readonly<{
  subscription: Pick<
    SubscriptionPresentation,
    'resetAt' | 'resetAtLabel' | 'entitlement'
  > | null;
  invoices: InvoicePresentation | null;
  query: InvoiceRouteQuery;
  exportAction: InvoiceExportAction;
}>) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

  if (subscription === null || invoices === null) {
    return (
      <BillingPage
        eyebrow="Billing history"
        title="Invoices"
        description="View, download, and track the status of every invoice."
      >
        <BillingCard className="billing-state-card">
          <div className="billing-state-icon">
            <BillingIcon name="alert" />
          </div>
          <div role="alert">
            <h2>Invoice history is temporarily unavailable.</h2>
            <p>Please try again. Your billing records have not been changed.</p>
          </div>
          <Link className="billing-button" href="/app/subscription/invoices">
            Try invoices again
          </Link>
        </BillingCard>
      </BillingPage>
    );
  }

  const visiblePaid = invoices.items.filter(
    (invoice) => invoice.status.key === 'paid',
  );
  const ytd = visiblePaid.reduce(
    (total, invoice) => total + invoice.amountPaid.amountMinor,
    0,
  );
  const paidCurrencies = new Set(
    visiblePaid.map((invoice) => invoice.amountPaid.currency),
  );
  const moneySample = visiblePaid[0]?.amountPaid;
  const ytdLabel =
    moneySample === undefined || paidCurrencies.size !== 1
      ? '—'
      : formatMoney({
          amountMinor: ytd,
          currency: moneySample.currency,
        });
  const lastInvoice = invoices.items[0] ?? null;
  const filtered =
    query.search !== '' || query.status !== null || query.year !== null;

  async function exportCsv() {
    setExporting(true);
    setExportError(false);
    const result = await exportAction({
      search: query.search,
      status: query.status,
      year: query.year,
    });
    setExporting(false);
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
  }

  return (
    <BillingPage
      eyebrow="Billing history"
      title="Invoices"
      description="View, download, and track the status of every invoice."
    >
      <BillingCard className="billing-invoice-summary">
        <div>
          <div className="billing-metric-icon">$</div>
          <div>
            <div className="billing-metric-label">Year-to-date spend</div>
            <div className="billing-metric-value">{ytdLabel}</div>
          </div>
        </div>
        <div>
          <div className="billing-metric-icon">
            <BillingIcon name="plan" />
          </div>
          <div>
            <div className="billing-metric-label">Last invoice</div>
            <div className="billing-metric-value billing-reset-value">
              {lastInvoice?.createdAtLabel ?? 'No invoices'}
            </div>
          </div>
        </div>
        <div>
          <div className="billing-metric-icon">
            <BillingIcon name="plan" />
          </div>
          <div>
            <div className="billing-metric-label">Next renewal</div>
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
            <div className="billing-metric-label">Payment status</div>
            <div className="billing-metric-value billing-reset-value billing-positive">
              {subscription.entitlement.variant === 'positive'
                ? 'In good standing'
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
                placeholder="Search invoices…"
                aria-label="Search invoices"
              />
            </label>
            <select
              name="status"
              aria-label="Invoice status"
              defaultValue={query.status ?? 'all'}
            >
              <option value="all">Status · All</option>
              <option value="paid">Paid</option>
              <option value="open">Open</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
            <select
              name="year"
              aria-label="Invoice year"
              defaultValue={query.year ?? 'all'}
            >
              <option value="all">Year · All</option>
              {[
                ...new Set(
                  invoices.items.map((invoice) =>
                    new Date(invoice.createdAt).getUTCFullYear(),
                  ),
                ),
              ]
                .sort((left, right) => right - left)
                .map((year) => (
                  <option value={year} key={year}>
                    Year · {year}
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
              The invoice export could not be prepared.
            </p>
          )}
          {invoices.items.length === 0 ? (
            <div className="billing-empty-state">
              <BillingIcon name="document" />
              <h2>
                {filtered
                  ? 'No invoices match these filters.'
                  : 'No invoices yet.'}
              </h2>
              <p>
                {filtered
                  ? 'Try changing the search, status, or year.'
                  : 'Invoices will appear here after billing activity.'}
              </p>
            </div>
          ) : (
            <>
              <div className="billing-table-wrap">
                <table className="billing-table" aria-label="Invoice history">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Date</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.items.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoiceIdentifier(invoice)}</td>
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
                          <InvoiceActions invoice={invoice} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul
                className="billing-mobile-cards"
                aria-label="Invoice history on mobile"
              >
                {invoices.items.map((invoice) => (
                  <li
                    className="billing-card billing-mobile-row"
                    key={invoice.id}
                  >
                    <div className="billing-mobile-row-head">
                      <b>{invoiceIdentifier(invoice)}</b>
                      <BillingStatus variant={invoice.status.variant}>
                        {invoice.status.label}
                      </BillingStatus>
                    </div>
                    <p className="billing-section-copy">
                      {invoice.createdAtLabel} · {invoice.planName}
                    </p>
                    <b>{invoice.amountDue.formattedAmount}</b>
                    <InvoiceActions invoice={invoice} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </BillingCard>

        <aside className="billing-invoice-side">
          <BillingCard>
            <h2 className="billing-section-title">Billing details</h2>
            <p className="billing-section-copy">
              Billing identity, company, and tax details are securely managed in
              Stripe.
            </p>
            <Link
              className="billing-button billing-portal-full-button"
              href="/app/subscription/portal"
            >
              Edit details
            </Link>
          </BillingCard>
          <BillingCard>
            <div className="billing-card-heading">
              <div className="billing-metric-icon">
                <BillingIcon name="document" />
              </div>
              <div>
                <h2 className="billing-section-title">
                  Need a formal receipt?
                </h2>
                <p className="billing-section-copy">
                  Receipts include payment and tax details.
                </p>
              </div>
            </div>
            <Link
              className="billing-button billing-portal-full-button"
              href="/app/subscription/portal"
            >
              Open billing support
            </Link>
          </BillingCard>
        </aside>
      </div>
    </BillingPage>
  );
}
