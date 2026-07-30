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
