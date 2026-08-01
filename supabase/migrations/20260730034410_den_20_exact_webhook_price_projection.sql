create function public.apply_billing_subscription_projection(
  target_event_id text,
  target_event_created_at timestamptz,
  target_user_id uuid,
  target_external_subscription_id text,
  target_external_price_id text,
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
  where billing_plan.slug = target_plan_slug;

  select price.*
  into strict configured_price
  from public.billing_prices as price
  where price.stripe_price_id = target_external_price_id
    and price.plan_id = plan.id
    and price.billing_interval = target_interval;

  select billing_customer.*
  into strict customer
  from public.billing_customers as billing_customer
  where billing_customer.user_id = target_user_id;

  if target_scheduled_plan_slug is not null then
    select billing_plan.*
    into strict scheduled_plan
    from public.billing_plans as billing_plan
    where billing_plan.slug = target_scheduled_plan_slug;
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
    case
      when target_scheduled_plan_slug is null then null
      else scheduled_plan.id
    end,
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

revoke all on function public.apply_billing_subscription_projection(
  text, timestamptz, uuid, text, text, text, text, text, timestamptz, timestamptz,
  timestamptz, boolean, timestamptz, text, timestamptz, timestamptz
) from public, anon, authenticated;

grant execute on function public.apply_billing_subscription_projection(
  text, timestamptz, uuid, text, text, text, text, text, timestamptz, timestamptz,
  timestamptz, boolean, timestamptz, text, timestamptz, timestamptz
) to service_role;
