alter table public.billing_invoices
  add column if not exists stripe_subscription_id text
  check (
    stripe_subscription_id is null
    or stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'
  );

update public.billing_invoices as new
set stripe_subscription_id = subscription.stripe_subscription_id
from public.billing_subscriptions as subscription
where new.subscription_id = subscription.id
  and new.user_id = subscription.user_id
  and (
    new.stripe_subscription_id is null
    or new.stripe_subscription_id = subscription.stripe_subscription_id
  );

create or replace function public.apply_billing_invoice_projection(
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
    into subscription
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
    stripe_subscription_id,
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
    subscription.id,
    plan.id,
    target_external_invoice_id,
    target_external_subscription_id,
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
    stripe_subscription_id = excluded.stripe_subscription_id,
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

revoke all on function public.apply_billing_invoice_projection(
  text, timestamptz, uuid, text, text, text, text, text, bigint, bigint, text,
  text, timestamptz, timestamptz, timestamptz, text, text, text, bigint
) from public, anon, authenticated;

grant execute on function public.apply_billing_invoice_projection(
  text, timestamptz, uuid, text, text, text, text, text, bigint, bigint, text,
  text, timestamptz, timestamptz, timestamptz, text, text, text, bigint
) to service_role;

create function private.link_billing_invoice_subscription()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.billing_invoices as invoice
  set subscription_id = new.id
  where invoice.user_id = new.user_id
    and invoice.stripe_subscription_id = new.stripe_subscription_id
    and invoice.subscription_id is null;

  return new;
end;
$$;

revoke all on function private.link_billing_invoice_subscription()
  from public, anon, authenticated, service_role;

create trigger billing_subscriptions_link_invoices
after insert or update of stripe_subscription_id
on public.billing_subscriptions
for each row
execute function private.link_billing_invoice_subscription();
