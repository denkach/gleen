create or replace view public.billing_usage_summary
with (security_invoker = true)
as
with active_entitlement as (
  select distinct on (entitlement.user_id)
    entitlement.id,
    entitlement.user_id
  from public.billing_entitlement_periods as entitlement
  where entitlement.period_start <= pg_catalog.now()
    and entitlement.period_end > pg_catalog.now()
    and (
      (entitlement.source = 'stripe' and entitlement.is_paid_through)
      or entitlement.source = 'free'
    )
  order by
    entitlement.user_id,
    case when entitlement.source = 'stripe' then 0 else 1 end,
    entitlement.period_end desc,
    entitlement.id
),
reservation_summary as (
  select
    entitlement.user_id,
    count(*) filter (
      where reservation.status = 'settled'
    )::integer as settled_analyses,
    count(*) filter (
      where reservation.status = 'reserved'
    )::integer as reserved_analyses
  from active_entitlement as entitlement
  left join public.analysis_usage_reservations as reservation
    on reservation.entitlement_period_id = entitlement.id
    and reservation.user_id = entitlement.user_id
  group by entitlement.user_id
),
credit_summary as (
  select
    entitlement.user_id,
    pg_catalog.coalesce(
      pg_catalog.sum(ledger.quantity) filter (
        where ledger.event_type in ('manual_adjustment', 'refund')
          and ledger.quantity > 0
      ),
      0
    )::integer as extra_credits
  from active_entitlement as entitlement
  left join public.usage_ledger as ledger
    on ledger.entitlement_period_id = entitlement.id
    and ledger.user_id = entitlement.user_id
  group by entitlement.user_id
)
select
  reservation.user_id,
  reservation.settled_analyses,
  reservation.reserved_analyses,
  credit.extra_credits
from reservation_summary as reservation
join credit_summary as credit on credit.user_id = reservation.user_id;

create or replace view public.billing_usage_activity
with (security_invoker = true)
as
select
  ledger.id,
  ledger.user_id,
  plan.slug as plan_slug,
  ledger.event_type,
  ledger.quantity,
  ledger.status,
  ledger.remaining_balance,
  ledger.occurred_at,
  ledger.job_id,
  job.analysis_id,
  ledger.source,
  intake.title as analysis_title,
  intake.channel_title,
  pg_catalog.concat_ws(
    ' ',
    ledger.event_type,
    ledger.source,
    intake.title,
    intake.channel_title
  ) as search_text
from public.usage_ledger as ledger
join public.billing_entitlement_periods as entitlement
  on entitlement.id = ledger.entitlement_period_id
  and entitlement.user_id = ledger.user_id
join public.billing_plans as plan on plan.id = entitlement.plan_id
left join public.analysis_jobs as job
  on job.id = ledger.job_id
  and job.user_id = ledger.user_id
left join public.analysis_intakes as intake
  on intake.id = job.analysis_id
  and intake.user_id = ledger.user_id;
