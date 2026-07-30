alter table public.billing_invoices
  add column latest_stripe_event_created_at timestamptz;

create view public.billing_usage_summary
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
)
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
group by entitlement.user_id;

create view public.billing_customer_overview
with (security_invoker = true)
as
select
  customer.user_id,
  customer.stripe_customer_id
from public.billing_customers as customer;

create view public.billing_payment_summary
with (security_invoker = true)
as
select
  invoice.user_id,
  invoice.currency,
  pg_catalog.sum(
    greatest(
      invoice.amount_due_minor - invoice.amount_paid_minor,
      0
    )
  )::bigint as outstanding_amount_minor
from public.billing_invoices as invoice
where invoice.status in ('open', 'uncollectible', 'failed')
group by invoice.user_id, invoice.currency;

create function public.claim_billing_webhook_event(
  target_event_id text,
  target_event_type text,
  target_created_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed boolean;
begin
  if pg_catalog.current_setting(
    'request.jwt.claim.role',
    true
  ) is distinct from 'service_role' then
    raise exception 'billing_projection_forbidden' using errcode = '42501';
  end if;

  insert into public.billing_webhook_events (
    stripe_event_id,
    event_type,
    stripe_created_at,
    processing_status,
    processing_attempts
  )
  values (
    target_event_id,
    target_event_type,
    target_created_at,
    'processing',
    1
  )
  on conflict (stripe_event_id) do nothing
  returning true into claimed;

  if claimed then
    return true;
  end if;

  update public.billing_webhook_events as webhook
  set
    processing_status = 'processing',
    processing_attempts = webhook.processing_attempts + 1,
    error_code = null,
    processed_at = null
  where webhook.stripe_event_id = target_event_id
    and webhook.event_type = target_event_type
    and webhook.stripe_created_at = target_created_at
    and webhook.processing_status in ('failed', 'processing')
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

create function public.apply_billing_subscription_projection(
  target_event_id text,
  target_event_created_at timestamptz,
  target_user_id uuid,
  target_external_subscription_id text,
  target_plan_slug text,
  target_interval text,
  target_status text,
  target_period_start timestamptz,
  target_period_end timestamptz,
  target_trial_ends_at timestamptz,
  target_cancel_at_period_end boolean,
  target_cancellation_effective_at timestamptz,
  target_scheduled_plan_slug text,
  target_scheduled_change_at timestamptz,
  target_paid_through timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  plan public.billing_plans%rowtype;
  configured_price public.billing_prices%rowtype;
  customer public.billing_customers%rowtype;
  scheduled_plan public.billing_plans%rowtype;
  subscription public.billing_subscriptions%rowtype;
begin
  if pg_catalog.current_setting(
    'request.jwt.claim.role',
    true
  ) is distinct from 'service_role' then
    raise exception 'billing_projection_forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.billing_webhook_events as webhook
    where webhook.stripe_event_id = target_event_id
      and webhook.stripe_created_at = target_event_created_at
      and webhook.processing_status = 'processing'
  ) then
    raise exception 'billing_webhook_not_claimed' using errcode = 'P0002';
  end if;

  select billing_plan.*
  into strict plan
  from public.billing_plans as billing_plan
  where billing_plan.slug = target_plan_slug
    and billing_plan.is_active;

  select price.*
  into strict configured_price
  from public.billing_prices as price
  where price.plan_id = plan.id
    and price.billing_interval = target_interval
    and price.is_active
    and price.stripe_price_id is not null;

  select billing_customer.*
  into strict customer
  from public.billing_customers as billing_customer
  where billing_customer.user_id = target_user_id;

  if target_scheduled_plan_slug is not null then
    select billing_plan.*
    into strict scheduled_plan
    from public.billing_plans as billing_plan
    where billing_plan.slug = target_scheduled_plan_slug
      and billing_plan.is_active;
  end if;

  insert into public.billing_subscriptions (
    user_id,
    customer_id,
    plan_id,
    stripe_subscription_id,
    stripe_price_id,
    billing_interval,
    status,
    current_period_start,
    current_period_end,
    trial_end,
    cancel_at_period_end,
    cancellation_effective_at,
    scheduled_plan_id,
    scheduled_change_at,
    latest_stripe_event_created_at,
    paid_through
  )
  values (
    target_user_id,
    customer.id,
    plan.id,
    target_external_subscription_id,
    configured_price.stripe_price_id,
    target_interval,
    target_status,
    target_period_start,
    target_period_end,
    target_trial_ends_at,
    target_cancel_at_period_end,
    target_cancellation_effective_at,
    case when target_scheduled_plan_slug is null then null else scheduled_plan.id end,
    target_scheduled_change_at,
    target_event_created_at,
    target_paid_through
  )
  on conflict (stripe_subscription_id) do update
  set
    customer_id = excluded.customer_id,
    plan_id = excluded.plan_id,
    stripe_price_id = excluded.stripe_price_id,
    billing_interval = excluded.billing_interval,
    status = excluded.status,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    trial_end = excluded.trial_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    cancellation_effective_at = excluded.cancellation_effective_at,
    scheduled_plan_id = excluded.scheduled_plan_id,
    scheduled_change_at = excluded.scheduled_change_at,
    latest_stripe_event_created_at = excluded.latest_stripe_event_created_at,
    paid_through = excluded.paid_through
  where billing_subscriptions.user_id = excluded.user_id
    and billing_subscriptions.latest_stripe_event_created_at
      <= excluded.latest_stripe_event_created_at
  returning * into subscription;

  if not found then
    return;
  end if;

  insert into public.billing_entitlement_periods (
    user_id,
    plan_id,
    subscription_id,
    period_start,
    period_end,
    analysis_limit,
    is_paid_through,
    source
  )
  values (
    target_user_id,
    plan.id,
    subscription.id,
    target_period_start,
    target_period_end,
    plan.analysis_limit,
    coalesce(
      target_status in ('trialing', 'active')
        and (
          target_status = 'trialing'
          or target_paid_through >= target_period_end
        ),
      false
    ),
    'stripe'
  )
  on conflict (subscription_id, period_start, period_end)
    where subscription_id is not null
  do update
  set
    plan_id = excluded.plan_id,
    analysis_limit = excluded.analysis_limit,
    is_paid_through = excluded.is_paid_through;
end;
$$;

create function public.apply_billing_invoice_projection(
  target_event_id text,
  target_event_created_at timestamptz,
  target_user_id uuid,
  target_external_invoice_id text,
  target_external_subscription_id text,
  target_number text,
  target_plan_slug text,
  target_interval text,
  target_amount_due_minor bigint,
  target_amount_paid_minor bigint,
  target_currency text,
  target_status text,
  target_created_at timestamptz,
  target_due_at timestamptz,
  target_paid_at timestamptz,
  target_hosted_url text,
  target_pdf_url text,
  target_refund_status text,
  target_refunded_amount_minor bigint
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  plan public.billing_plans%rowtype;
  subscription public.billing_subscriptions%rowtype;
begin
  if pg_catalog.current_setting(
    'request.jwt.claim.role',
    true
  ) is distinct from 'service_role' then
    raise exception 'billing_projection_forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.billing_webhook_events as webhook
    where webhook.stripe_event_id = target_event_id
      and webhook.stripe_created_at = target_event_created_at
      and webhook.processing_status = 'processing'
  ) then
    raise exception 'billing_webhook_not_claimed' using errcode = 'P0002';
  end if;

  select billing_plan.*
  into strict plan
  from public.billing_plans as billing_plan
  where billing_plan.slug = target_plan_slug
    and billing_plan.is_active;

  if target_external_subscription_id is not null then
    select billing_subscription.*
    into strict subscription
    from public.billing_subscriptions as billing_subscription
    where billing_subscription.stripe_subscription_id =
        target_external_subscription_id
      and billing_subscription.user_id = target_user_id;
  end if;

  insert into public.billing_invoices (
    user_id,
    subscription_id,
    plan_id,
    stripe_invoice_id,
    invoice_number,
    billing_interval,
    amount_due_minor,
    amount_paid_minor,
    currency,
    status,
    invoice_created_at,
    due_at,
    paid_at,
    hosted_invoice_url,
    invoice_pdf_url,
    refund_status,
    refunded_amount_minor,
    latest_stripe_event_created_at
  )
  values (
    target_user_id,
    case
      when target_external_subscription_id is null then null
      else subscription.id
    end,
    plan.id,
    target_external_invoice_id,
    target_number,
    target_interval,
    target_amount_due_minor,
    target_amount_paid_minor,
    target_currency,
    target_status,
    target_created_at,
    target_due_at,
    target_paid_at,
    target_hosted_url,
    target_pdf_url,
    target_refund_status,
    target_refunded_amount_minor,
    target_event_created_at
  )
  on conflict (stripe_invoice_id) do update
  set
    subscription_id = excluded.subscription_id,
    plan_id = excluded.plan_id,
    invoice_number = excluded.invoice_number,
    billing_interval = excluded.billing_interval,
    amount_due_minor = excluded.amount_due_minor,
    amount_paid_minor = excluded.amount_paid_minor,
    currency = excluded.currency,
    status = excluded.status,
    invoice_created_at = excluded.invoice_created_at,
    due_at = excluded.due_at,
    paid_at = excluded.paid_at,
    hosted_invoice_url = excluded.hosted_invoice_url,
    invoice_pdf_url = excluded.invoice_pdf_url,
    refund_status = excluded.refund_status,
    refunded_amount_minor = excluded.refunded_amount_minor,
    latest_stripe_event_created_at = excluded.latest_stripe_event_created_at
  where billing_invoices.user_id = excluded.user_id
    and (
      billing_invoices.latest_stripe_event_created_at is null
      or billing_invoices.latest_stripe_event_created_at
        <= excluded.latest_stripe_event_created_at
    );
end;
$$;

create function public.mark_billing_webhook_processed(target_event_id text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if pg_catalog.current_setting(
    'request.jwt.claim.role',
    true
  ) is distinct from 'service_role' then
    raise exception 'billing_projection_forbidden' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.billing_webhook_events as webhook
    where webhook.stripe_event_id = target_event_id
      and webhook.processing_status = 'processed'
  ) then
    return;
  end if;

  update public.billing_webhook_events as webhook
  set
    processing_status = 'processed',
    processed_at = pg_catalog.now(),
    error_code = null
  where webhook.stripe_event_id = target_event_id
    and webhook.processing_status = 'processing';

  if not found then
    raise exception 'billing_webhook_not_processing' using errcode = 'P0002';
  end if;
end;
$$;

create function public.mark_billing_webhook_failed(
  target_event_id text,
  target_error_code text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if pg_catalog.current_setting(
    'request.jwt.claim.role',
    true
  ) is distinct from 'service_role' then
    raise exception 'billing_projection_forbidden' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.billing_webhook_events as webhook
    where webhook.stripe_event_id = target_event_id
      and webhook.processing_status = 'processed'
  ) then
    return;
  end if;

  update public.billing_webhook_events as webhook
  set
    processing_status = 'failed',
    processed_at = null,
    error_code = target_error_code
  where webhook.stripe_event_id = target_event_id
    and webhook.processing_status = 'processing';

  if not found then
    raise exception 'billing_webhook_not_processing' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on public.billing_usage_summary from public, anon;
revoke all on public.billing_customer_overview from public, anon;
revoke all on public.billing_payment_summary from public, anon;
grant select on public.billing_usage_summary to authenticated;
grant select on public.billing_customer_overview to authenticated;
grant select on public.billing_payment_summary to authenticated;

revoke all on function public.claim_billing_webhook_event(text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.apply_billing_subscription_projection(
  text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz,
  timestamptz, boolean, timestamptz, text, timestamptz, timestamptz
) from public, anon, authenticated;
revoke all on function public.apply_billing_invoice_projection(
  text, timestamptz, uuid, text, text, text, text, text, bigint, bigint, text,
  text, timestamptz, timestamptz, timestamptz, text, text, text, bigint
) from public, anon, authenticated;
revoke all on function public.mark_billing_webhook_processed(text)
  from public, anon, authenticated;
revoke all on function public.mark_billing_webhook_failed(text, text)
  from public, anon, authenticated;

grant execute on function public.claim_billing_webhook_event(
  text, text, timestamptz
) to service_role;
grant execute on function public.apply_billing_subscription_projection(
  text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz,
  timestamptz, boolean, timestamptz, text, timestamptz, timestamptz
) to service_role;
grant execute on function public.apply_billing_invoice_projection(
  text, timestamptz, uuid, text, text, text, text, text, bigint, bigint, text,
  text, timestamptz, timestamptz, timestamptz, text, text, text, bigint
) to service_role;
grant execute on function public.mark_billing_webhook_processed(text)
  to service_role;
grant execute on function public.mark_billing_webhook_failed(text, text)
  to service_role;
