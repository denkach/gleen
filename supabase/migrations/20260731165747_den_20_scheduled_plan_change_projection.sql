alter table public.billing_subscriptions
  add column stripe_subscription_schedule_id text check (
    stripe_subscription_schedule_id is null
    or stripe_subscription_schedule_id ~ '^sub_sched_[A-Za-z0-9]+$'
  ),
  add column scheduled_change_event_created_at timestamptz;

create unique index billing_subscriptions_schedule_id_idx
  on public.billing_subscriptions(stripe_subscription_schedule_id)
  where stripe_subscription_schedule_id is not null;

create function private.preserve_billing_schedule_projection()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.stripe_subscription_schedule_id is not null
    and new.scheduled_plan_id is null
    and new.scheduled_change_at is null
    and new.scheduled_change_event_created_at is not distinct from old.scheduled_change_event_created_at
    and pg_catalog.current_setting(
      'gleen.billing_schedule_projection_write',
      true
    ) is distinct from 'on'
  then
    if new.plan_id = old.scheduled_plan_id
      or new.current_period_start >= old.scheduled_change_at
    then
      new.stripe_subscription_schedule_id := null;
    else
      new.stripe_subscription_schedule_id := old.stripe_subscription_schedule_id;
      new.scheduled_plan_id := old.scheduled_plan_id;
      new.scheduled_change_at := old.scheduled_change_at;
      new.scheduled_change_event_created_at := old.scheduled_change_event_created_at;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.preserve_billing_schedule_projection()
  from public, anon, authenticated, service_role;

create trigger billing_subscriptions_preserve_schedule_projection
before update on public.billing_subscriptions
for each row
execute function private.preserve_billing_schedule_projection();

create function public.apply_billing_schedule_projection(
  target_event_id text,
  target_event_created_at timestamptz,
  target_user_id uuid,
  target_external_subscription_id text,
  target_external_schedule_id text,
  target_scheduled_plan_slug text,
  target_scheduled_change_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  scheduled_plan public.billing_plans%rowtype;
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

  if (
    target_scheduled_plan_slug is null
    and target_scheduled_change_at is not null
  ) or (
    target_scheduled_plan_slug is not null
    and target_scheduled_change_at is null
  ) then
    raise exception 'billing_schedule_projection_incomplete'
      using errcode = '22023';
  end if;

  if target_scheduled_plan_slug is not null then
    select billing_plan.*
    into strict scheduled_plan
    from public.billing_plans as billing_plan
    where billing_plan.slug = target_scheduled_plan_slug;

    perform pg_catalog.set_config(
      'gleen.billing_schedule_projection_write',
      'on',
      true
    );
    update public.billing_subscriptions as subscription
    set
      stripe_subscription_schedule_id = target_external_schedule_id,
      scheduled_plan_id = scheduled_plan.id,
      scheduled_change_at = target_scheduled_change_at,
      scheduled_change_event_created_at = target_event_created_at
    where subscription.user_id = target_user_id
      and subscription.stripe_subscription_id = target_external_subscription_id
      and (
        subscription.scheduled_change_event_created_at is null
        or subscription.scheduled_change_event_created_at <= target_event_created_at
      );
    perform pg_catalog.set_config(
      'gleen.billing_schedule_projection_write',
      'off',
      true
    );
  else
    perform pg_catalog.set_config(
      'gleen.billing_schedule_projection_write',
      'on',
      true
    );
    update public.billing_subscriptions as subscription
    set
      stripe_subscription_schedule_id = null,
      scheduled_plan_id = null,
      scheduled_change_at = null,
      scheduled_change_event_created_at = target_event_created_at
    where subscription.user_id = target_user_id
      and subscription.stripe_subscription_id = target_external_subscription_id
      and subscription.stripe_subscription_schedule_id = target_external_schedule_id
      and (
        subscription.scheduled_change_event_created_at is null
        or subscription.scheduled_change_event_created_at <= target_event_created_at
      );
    perform pg_catalog.set_config(
      'gleen.billing_schedule_projection_write',
      'off',
      true
    );
  end if;
end;
$$;

create function public.apply_billing_schedule_projection_service_role(
  target_event_id text,
  target_event_created_at timestamptz,
  target_user_id uuid,
  target_external_subscription_id text,
  target_external_schedule_id text,
  target_scheduled_plan_slug text,
  target_scheduled_change_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.set_config(
    'request.jwt.claim.role',
    'service_role',
    true
  );
  perform public.apply_billing_schedule_projection(
    target_event_id,
    target_event_created_at,
    target_user_id,
    target_external_subscription_id,
    target_external_schedule_id,
    target_scheduled_plan_slug,
    target_scheduled_change_at
  );
end;
$$;

revoke all on function public.apply_billing_schedule_projection(
  text,
  timestamptz,
  uuid,
  text,
  text,
  text,
  timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.apply_billing_schedule_projection_service_role(
  text,
  timestamptz,
  uuid,
  text,
  text,
  text,
  timestamptz
) from public, anon, authenticated, service_role;

grant execute on function public.apply_billing_schedule_projection(
  text,
  timestamptz,
  uuid,
  text,
  text,
  text,
  timestamptz
) to service_role;
grant execute on function public.apply_billing_schedule_projection_service_role(
  text,
  timestamptz,
  uuid,
  text,
  text,
  text,
  timestamptz
) to service_role;
