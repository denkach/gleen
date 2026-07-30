create view public.billing_invoice_summary
with (security_invoker = true)
as
with year_currency as (
  select
    user_id,
    extract(year from invoice_created_at at time zone 'UTC')::integer as invoice_year,
    currency,
    sum(greatest(amount_paid_minor - refunded_amount_minor, 0))::bigint as net_paid_minor,
    count(*)::bigint as invoice_count
  from public.billing_invoices
  group by user_id, invoice_year, currency
),
owner_totals as (
  select
    user_id,
    count(*)::bigint as total_count,
    max(invoice_created_at) as last_invoice_at
  from public.billing_invoices
  group by user_id
)
select
  owner_totals.user_id,
  owner_totals.total_count,
  owner_totals.last_invoice_at,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'year', year_currency.invoice_year,
        'currency', year_currency.currency,
        'net_paid_minor', year_currency.net_paid_minor,
        'invoice_count', year_currency.invoice_count
      )
      order by year_currency.invoice_year desc, year_currency.currency
    ) filter (where year_currency.invoice_year is not null),
    '[]'::jsonb
  ) as year_summaries
from owner_totals
left join year_currency using (user_id)
group by
  owner_totals.user_id,
  owner_totals.total_count,
  owner_totals.last_invoice_at;

revoke all on public.billing_invoice_summary
from public, anon, authenticated, service_role;
grant select on public.billing_invoice_summary to authenticated;
grant select on public.billing_invoice_summary to service_role;
