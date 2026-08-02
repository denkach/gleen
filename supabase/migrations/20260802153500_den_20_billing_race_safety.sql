create function public.claim_billing_webhook_event_state_service_role(
  target_event_id text,
  target_event_type text,
  target_created_at timestamptz
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  claimed boolean;
  current_status text;
begin
  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);
  claimed := public.claim_billing_webhook_event(
    target_event_id,
    target_event_type,
    target_created_at
  );
  if claimed then
    return 'claimed';
  end if;

  select webhook.processing_status
  into current_status
  from public.billing_webhook_events as webhook
  where webhook.stripe_event_id = target_event_id
    and webhook.event_type = target_event_type
    and webhook.stripe_created_at = target_created_at;

  if current_status = 'processed' then
    return 'processed';
  end if;
  if current_status = 'processing' then
    return 'in_progress';
  end if;
  raise exception 'billing_webhook_claim_state_invalid' using errcode = 'P0002';
end;
$$;

revoke all on function public.claim_billing_webhook_event_state_service_role(
  text, text, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.claim_billing_webhook_event_state_service_role(
  text, text, timestamptz
) to service_role;

create table public.billing_checkout_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_slug text not null,
  billing_interval text not null check (billing_interval in ('month', 'year')),
  idempotency_key text not null unique,
  stripe_session_id text unique,
  client_secret text,
  updated_at timestamptz not null default pg_catalog.now()
);
alter table public.billing_checkout_attempts enable row level security;
revoke all on table public.billing_checkout_attempts from public, anon, authenticated;
grant select, insert, update, delete on table public.billing_checkout_attempts to service_role;

create function public.claim_billing_checkout_attempt_service_role(
  target_user_id uuid,
  target_plan_slug text,
  target_interval text,
  target_replace_session_id text
)
returns table (
  idempotency_key text,
  plan_slug text,
  billing_interval text,
  stripe_session_id text,
  client_secret text
)
language plpgsql
set search_path = ''
as $$
declare attempt public.billing_checkout_attempts%rowtype;
begin
  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);
  insert into public.billing_checkout_attempts (
    user_id, plan_slug, billing_interval, idempotency_key
  ) values (
    target_user_id,
    target_plan_slug,
    target_interval,
    'gleen-checkout:' || target_user_id::text || ':' || pg_catalog.gen_random_uuid()::text
  ) on conflict (user_id) do nothing;

  select current_attempt.* into strict attempt
  from public.billing_checkout_attempts as current_attempt
  where current_attempt.user_id = target_user_id
  for update;

  if (attempt.plan_slug, attempt.billing_interval)
      is distinct from (target_plan_slug, target_interval)
    and (
      target_replace_session_id = attempt.stripe_session_id
      or (
        attempt.stripe_session_id is null
        and attempt.updated_at <= pg_catalog.now() - interval '5 minutes'
      )
    ) then
    update public.billing_checkout_attempts as current_attempt
    set
      plan_slug = target_plan_slug,
      billing_interval = target_interval,
      idempotency_key = 'gleen-checkout:' || target_user_id::text || ':' || pg_catalog.gen_random_uuid()::text,
      stripe_session_id = null,
      client_secret = null,
      updated_at = pg_catalog.now()
    where current_attempt.user_id = target_user_id
    returning current_attempt.* into attempt;
  end if;

  return query select
    attempt.idempotency_key,
    attempt.plan_slug,
    attempt.billing_interval,
    attempt.stripe_session_id,
    attempt.client_secret;
end;
$$;

create function public.persist_billing_checkout_attempt_service_role(
  target_user_id uuid,
  target_idempotency_key text,
  target_session_id text,
  target_client_secret text
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);
  update public.billing_checkout_attempts as attempt
  set
    stripe_session_id = target_session_id,
    client_secret = target_client_secret,
    updated_at = pg_catalog.now()
  where attempt.user_id = target_user_id
    and attempt.idempotency_key = target_idempotency_key;
  if not found then raise exception 'billing_checkout_attempt_conflict'; end if;
end;
$$;

create function public.clear_billing_checkout_attempt_service_role(
  target_user_id uuid,
  target_session_id text
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);
  delete from public.billing_checkout_attempts as attempt
  where attempt.user_id = target_user_id
    and attempt.stripe_session_id = target_session_id;
end;
$$;

revoke all on function public.claim_billing_checkout_attempt_service_role(
  uuid, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.persist_billing_checkout_attempt_service_role(
  uuid, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.clear_billing_checkout_attempt_service_role(
  uuid, text
) from public, anon, authenticated, service_role;
grant execute on function public.claim_billing_checkout_attempt_service_role(
  uuid, text, text, text
) to service_role;
grant execute on function public.persist_billing_checkout_attempt_service_role(
  uuid, text, text, text
) to service_role;
grant execute on function public.clear_billing_checkout_attempt_service_role(
  uuid, text
) to service_role;

create or replace function public.apply_billing_subscription_projection_service_role(
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
set search_path = ''
as $$
declare
  paid_entitlement public.billing_entitlement_periods%rowtype;
begin
  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);

  select entitlement.*
  into paid_entitlement
  from public.billing_entitlement_periods as entitlement
  join public.billing_subscriptions as subscription
    on subscription.id = entitlement.subscription_id
  where subscription.user_id = target_user_id
    and subscription.stripe_subscription_id = target_external_subscription_id
    and entitlement.period_start = target_period_start
    and entitlement.period_end = target_period_end
    and entitlement.is_paid_through
  for update of entitlement;

  perform public.apply_billing_subscription_projection(
    target_event_id,
    target_event_created_at,
    target_user_id,
    target_external_subscription_id,
    target_external_price_id,
    target_plan_slug,
    target_interval,
    target_status,
    target_period_start,
    target_period_end,
    target_trial_ends_at,
    target_cancel_at_period_end,
    target_cancellation_effective_at,
    target_scheduled_plan_slug,
    target_scheduled_change_at,
    target_paid_through
  );

  if paid_entitlement.id is not null
    and target_status in ('active', 'past_due') then
    update public.billing_entitlement_periods as entitlement
    set
      plan_id = paid_entitlement.plan_id,
      analysis_limit = paid_entitlement.analysis_limit,
      is_paid_through = true
    where entitlement.id = paid_entitlement.id;

    update public.billing_subscriptions as subscription
    set paid_through = greatest(
      subscription.paid_through,
      paid_entitlement.period_end
    )
    where subscription.id = paid_entitlement.subscription_id;
  end if;
end;
$$;

create function public.apply_billing_invoice_paid_period_service_role(
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
  target_period_start timestamptz,
  target_period_end timestamptz,
  target_hosted_url text,
  target_pdf_url text,
  target_refund_status text,
  target_refunded_amount_minor bigint,
  target_advance_paid_through boolean
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  paid_plan public.billing_plans%rowtype;
  projected_subscription public.billing_subscriptions%rowtype;
begin
  perform pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);
  perform public.apply_billing_invoice_projection(
    target_event_id,
    target_event_created_at,
    target_user_id,
    target_external_invoice_id,
    target_external_subscription_id,
    target_number,
    target_plan_slug,
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
    target_advance_paid_through
  );

  if target_advance_paid_through
    and target_external_subscription_id is not null then
    select plan.* into strict paid_plan
    from public.billing_plans as plan
    where plan.slug = target_plan_slug;

    update public.billing_subscriptions as subscription
    set
      plan_id = paid_plan.id,
      billing_interval = target_interval,
      status = case
        when subscription.status in ('incomplete', 'past_due') then 'active'
        else subscription.status
      end,
      paid_through = greatest(subscription.paid_through, target_period_end)
    where subscription.user_id = target_user_id
      and subscription.stripe_subscription_id = target_external_subscription_id
      and subscription.current_period_start = target_period_start
      and subscription.current_period_end = target_period_end
    returning * into projected_subscription;

    if found then
      update public.billing_entitlement_periods as entitlement
      set
        plan_id = paid_plan.id,
        analysis_limit = paid_plan.analysis_limit,
        is_paid_through = true
      where entitlement.subscription_id = projected_subscription.id
        and entitlement.period_start = target_period_start
        and entitlement.period_end = target_period_end;
    end if;
  end if;
end;
$$;

revoke all on function public.apply_billing_subscription_projection_service_role(
  text, timestamptz, uuid, text, text, text, text, text, timestamptz,
  timestamptz, timestamptz, boolean, timestamptz, text, timestamptz, timestamptz
) from public, anon, authenticated;
revoke all on function public.apply_billing_invoice_paid_period_service_role(
  text, timestamptz, uuid, text, text, text, text, text, bigint, bigint, text,
  text, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz,
  text, text, text, bigint, boolean
) from public, anon, authenticated, service_role;
grant execute on function public.apply_billing_invoice_paid_period_service_role(
  text, timestamptz, uuid, text, text, text, text, text, bigint, bigint, text,
  text, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz,
  text, text, text, bigint, boolean
) to service_role;
