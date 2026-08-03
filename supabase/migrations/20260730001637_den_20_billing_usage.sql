create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null check (btrim(display_name) <> ''),
  description text not null check (btrim(description) <> ''),
  analysis_limit integer not null check (analysis_limit >= 0),
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  display_order integer not null check (display_order >= 0),
  is_default boolean not null default false,
  is_purchasable boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index billing_plans_default_idx
  on public.billing_plans (is_default)
  where is_default;

create table public.billing_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.billing_plans(id) on delete cascade,
  billing_interval text not null check (billing_interval in ('month', 'year')),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  unit_amount_minor bigint not null check (unit_amount_minor >= 0),
  monthly_equivalent_minor bigint not null check (monthly_equivalent_minor >= 0),
  comparison_copy text,
  savings_copy text,
  stripe_price_id text unique check (
    stripe_price_id is null or stripe_price_id ~ '^price_[A-Za-z0-9]+$'
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, billing_interval, currency)
);

create index billing_prices_plan_idx on public.billing_prices(plan_id);

create table public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null check (stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index billing_customers_user_idx on public.billing_customers(user_id);
create unique index billing_customers_stripe_idx on public.billing_customers(stripe_customer_id);

create table public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.billing_customers(id) on delete cascade,
  plan_id uuid not null references public.billing_plans(id),
  stripe_subscription_id text not null unique check (
    stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'
  ),
  stripe_price_id text not null check (stripe_price_id ~ '^price_[A-Za-z0-9]+$'),
  billing_interval text not null check (billing_interval in ('month', 'year')),
  status text not null check (
    status in (
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused'
    )
  ),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancellation_effective_at timestamptz,
  scheduled_plan_id uuid references public.billing_plans(id),
  scheduled_change_at timestamptz,
  latest_stripe_event_created_at timestamptz not null,
  paid_through timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_period_end > current_period_start),
  check (
    (scheduled_plan_id is null and scheduled_change_at is null)
    or (scheduled_plan_id is not null and scheduled_change_at is not null)
  )
);

create index billing_subscriptions_customer_idx on public.billing_subscriptions(customer_id);
create index billing_subscriptions_plan_idx on public.billing_subscriptions(plan_id);
create index billing_subscriptions_scheduled_plan_idx
  on public.billing_subscriptions(scheduled_plan_id)
  where scheduled_plan_id is not null;
create index billing_subscriptions_user_status_idx on public.billing_subscriptions(user_id, status);

create table public.billing_entitlement_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.billing_plans(id),
  subscription_id uuid references public.billing_subscriptions(id) on delete set null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  analysis_limit integer not null check (analysis_limit >= 0),
  is_paid_through boolean not null default false,
  source text not null check (source in ('free', 'stripe', 'migration')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end > period_start),
  check (
    (source in ('free', 'migration') and subscription_id is null)
    or (source = 'stripe' and subscription_id is not null)
  ),
  unique (user_id, plan_id, period_start, period_end)
);

create index billing_entitlement_plan_idx on public.billing_entitlement_periods(plan_id);
create index billing_entitlement_subscription_idx
  on public.billing_entitlement_periods(subscription_id)
  where subscription_id is not null;
create unique index billing_entitlement_free_period_idx
  on public.billing_entitlement_periods(user_id, period_start, period_end)
  where source = 'free';
create unique index billing_entitlement_subscription_period_idx
  on public.billing_entitlement_periods(subscription_id, period_start, period_end)
  where subscription_id is not null;
create index billing_entitlement_user_period_idx on public.billing_entitlement_periods(user_id, period_end desc);

create table public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.billing_subscriptions(id) on delete set null,
  plan_id uuid not null references public.billing_plans(id),
  stripe_invoice_id text not null unique check (
    stripe_invoice_id ~ '^in_[A-Za-z0-9]+$'
  ),
  invoice_number text,
  billing_interval text not null check (billing_interval in ('month', 'year')),
  amount_due_minor bigint not null check (amount_due_minor >= 0),
  amount_paid_minor bigint not null check (amount_paid_minor >= 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  status text not null check (
    status in ('draft', 'open', 'paid', 'uncollectible', 'void', 'failed')
  ),
  invoice_created_at timestamptz not null,
  due_at timestamptz,
  paid_at timestamptz,
  hosted_invoice_url text check (
    hosted_invoice_url is null or hosted_invoice_url ~ '^https://'
  ),
  invoice_pdf_url text check (
    invoice_pdf_url is null or invoice_pdf_url ~ '^https://'
  ),
  refund_status text not null default 'none' check (
    refund_status in ('none', 'partial', 'full')
  ),
  refunded_amount_minor bigint not null default 0 check (refunded_amount_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (refunded_amount_minor <= amount_paid_minor)
);

create index billing_invoices_subscription_idx
  on public.billing_invoices(subscription_id)
  where subscription_id is not null;
create index billing_invoices_plan_idx on public.billing_invoices(plan_id);
create index billing_invoices_user_created_idx on public.billing_invoices(user_id, created_at desc);

create table public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null,
  event_type text not null check (btrim(event_type) <> ''),
  stripe_created_at timestamptz not null,
  processing_status text not null default 'pending' check (
    processing_status in ('pending', 'processing', 'processed', 'failed')
  ),
  processing_attempts integer not null default 0 check (processing_attempts >= 0),
  error_code text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stripe_event_id)
);

create index billing_webhook_status_created_idx
  on public.billing_webhook_events(processing_status, stripe_created_at);

alter table public.analysis_usage_reservations
  alter column job_id drop not null,
  add column analysis_id uuid references public.analysis_intakes(id) on delete cascade,
  add column entitlement_period_id uuid references public.billing_entitlement_periods(id) on delete cascade,
  add column quantity integer not null default 1 check (quantity = 1),
  add column reserved_at timestamptz not null default now(),
  add column settled_at timestamptz,
  add column released_at timestamptz;

update public.analysis_usage_reservations as reservation
set analysis_id = job.analysis_id
from public.analysis_jobs as job
where job.id = reservation.job_id;

alter table public.analysis_usage_reservations
  alter column analysis_id set not null;

create unique index usage_reservations_analysis_idx
  on public.analysis_usage_reservations(analysis_id);
create index usage_reservations_entitlement_status_idx
  on public.analysis_usage_reservations(entitlement_period_id, status);

create table public.usage_ledger (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_period_id uuid not null references public.billing_entitlement_periods(id) on delete cascade,
  reservation_id uuid references public.analysis_usage_reservations(id) on delete set null,
  job_id uuid references public.analysis_jobs(id) on delete set null,
  event_type text not null check (
    event_type in (
      'reservation',
      'settlement',
      'release',
      'period_renewal',
      'manual_adjustment',
      'refund',
      'technical_retry'
    )
  ),
  quantity integer not null,
  source text not null check (
    source in ('analysis_pipeline', 'stripe_webhook', 'system', 'manual')
  ),
  status text not null check (
    status in ('reserved', 'settled', 'released', 'applied', 'informational')
  ),
  remaining_balance integer not null check (remaining_balance >= 0),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create index usage_ledger_user_occurred_idx on public.usage_ledger(user_id, occurred_at desc, id desc);
create unique index usage_ledger_idempotency_idx on public.usage_ledger(idempotency_key);
create index usage_ledger_entitlement_idx on public.usage_ledger(entitlement_period_id);
create index usage_ledger_reservation_idx
  on public.usage_ledger(reservation_id)
  where reservation_id is not null;
create index usage_ledger_job_idx
  on public.usage_ledger(job_id)
  where job_id is not null;

create function public.set_billing_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger billing_plans_set_updated_at
before update on public.billing_plans
for each row execute function public.set_billing_updated_at();
create trigger billing_prices_set_updated_at
before update on public.billing_prices
for each row execute function public.set_billing_updated_at();
create trigger billing_customers_set_updated_at
before update on public.billing_customers
for each row execute function public.set_billing_updated_at();
create trigger billing_subscriptions_set_updated_at
before update on public.billing_subscriptions
for each row execute function public.set_billing_updated_at();
create trigger billing_entitlement_periods_set_updated_at
before update on public.billing_entitlement_periods
for each row execute function public.set_billing_updated_at();
create trigger billing_invoices_set_updated_at
before update on public.billing_invoices
for each row execute function public.set_billing_updated_at();
create trigger billing_webhook_events_set_updated_at
before update on public.billing_webhook_events
for each row execute function public.set_billing_updated_at();

insert into public.billing_plans
  (slug, display_name, description, analysis_limit, features, display_order,
   is_default, is_purchasable, is_active)
values
  ('free', 'Free', 'For exploring Gleen.', 3,
   '["3 analyses per month","Saved history"]'::jsonb, 0, true, false, true),
  ('starter', 'Starter',
   'For individuals getting started with AI analysis.', 10,
   '["10 analyses per month","Basic insights & summaries","Standard templates","Export results","Email support"]'::jsonb,
   1, false, true, true),
  ('prism-pro', 'Prism Pro',
   'For professionals who need deeper insights and more capacity.', 25,
   '["25 analyses per month","Advanced insights & takeaways","All premium templates","Export & download","Priority support"]'::jsonb,
   2, false, true, true),
  ('team', 'Team', 'For teams collaborating and scaling their impact.', 100,
   '["100 analyses per month","Team workspace","Collaboration & sharing","Admin controls & roles","Priority onboarding"]'::jsonb,
   3, false, false, true);

insert into public.billing_prices
  (plan_id, billing_interval, currency, unit_amount_minor,
   monthly_equivalent_minor, comparison_copy, savings_copy, is_active)
select
  plan.id,
  price.billing_interval,
  'usd',
  price.unit_amount_minor,
  price.monthly_equivalent_minor,
  price.comparison_copy,
  price.savings_copy,
  true
from public.billing_plans as plan
join (
  values
    ('starter', 'month', 1900::bigint, 1900::bigint, null::text, null::text),
    ('starter', 'year', 18000::bigint, 1500::bigint, '$19 monthly', 'Save 20%'),
    ('prism-pro', 'month', 4900::bigint, 4900::bigint, null::text, null::text),
    ('prism-pro', 'year', 46800::bigint, 3900::bigint, '$49 monthly', 'Save 20%'),
    ('team', 'month', 12900::bigint, 12900::bigint, null::text, null::text),
    ('team', 'year', 123600::bigint, 10300::bigint, '$129 monthly', 'Save 20%')
) as price(
  plan_slug,
  billing_interval,
  unit_amount_minor,
  monthly_equivalent_minor,
  comparison_copy,
  savings_copy
) on plan.slug = price.plan_slug;

insert into public.billing_entitlement_periods (
  user_id,
  plan_id,
  period_start,
  period_end,
  analysis_limit,
  is_paid_through,
  source
)
select distinct
  reservation.user_id,
  plan.id,
  pg_catalog.date_trunc('month', pg_catalog.now() at time zone 'UTC')
    at time zone 'UTC',
  (
    pg_catalog.date_trunc('month', pg_catalog.now() at time zone 'UTC')
      at time zone 'UTC'
  ) + interval '1 month',
  plan.analysis_limit,
  true,
  'free'
from public.analysis_usage_reservations as reservation
cross join public.billing_plans as plan
where plan.slug = 'free'
  and reservation.status = 'reserved'
on conflict do nothing;

insert into public.billing_entitlement_periods (
  user_id,
  plan_id,
  period_start,
  period_end,
  analysis_limit,
  is_paid_through,
  source
)
select distinct
  reservation.user_id,
  plan.id,
  (
    pg_catalog.date_trunc('month', pg_catalog.now() at time zone 'UTC')
      at time zone 'UTC'
  ) - interval '1 month',
  pg_catalog.date_trunc('month', pg_catalog.now() at time zone 'UTC')
    at time zone 'UTC',
  plan.analysis_limit,
  false,
  'migration'
from public.analysis_usage_reservations as reservation
cross join public.billing_plans as plan
where plan.slug = 'free'
  and reservation.status in ('settled', 'released')
on conflict do nothing;

update public.analysis_usage_reservations as reservation
set entitlement_period_id = entitlement.id
from public.billing_entitlement_periods as entitlement
where reservation.entitlement_period_id is null
  and entitlement.user_id = reservation.user_id
  and entitlement.source = case
    when reservation.status = 'reserved' then 'free'
    else 'migration'
  end
  and entitlement.period_start =
    case
      when reservation.status = 'reserved' then
        pg_catalog.date_trunc('month', pg_catalog.now() at time zone 'UTC')
          at time zone 'UTC'
      else
        (
          pg_catalog.date_trunc('month', pg_catalog.now() at time zone 'UTC')
            at time zone 'UTC'
        ) - interval '1 month'
    end;

alter table public.analysis_usage_reservations
  alter column entitlement_period_id set not null;

alter table public.billing_plans enable row level security;
alter table public.billing_prices enable row level security;
alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_entitlement_periods enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_webhook_events enable row level security;
alter table public.usage_ledger enable row level security;

create policy "billing_plans_select_active"
on public.billing_plans for select
to authenticated
using (is_active);

create policy "billing_prices_select_active"
on public.billing_prices for select
to authenticated
using (
  is_active
  and exists (
    select 1
    from public.billing_plans
    where billing_plans.id = billing_prices.plan_id
      and billing_plans.is_active
  )
);

create policy "billing_customers_select_own"
on public.billing_customers for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "billing_subscriptions_select_own"
on public.billing_subscriptions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "billing_entitlement_periods_select_own"
on public.billing_entitlement_periods for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "billing_invoices_select_own"
on public.billing_invoices for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "usage_ledger_select_own"
on public.usage_ledger for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "analysis_usage_reservations_select_own"
  on public.analysis_usage_reservations;
drop policy if exists "analysis_usage_reservations_insert_own"
  on public.analysis_usage_reservations;
drop policy if exists "analysis_usage_reservations_update_own"
  on public.analysis_usage_reservations;

create policy "analysis_usage_reservations_select_own"
on public.analysis_usage_reservations for select
to authenticated
using ((select auth.uid()) = user_id);

create view public.billing_plan_catalog
with (security_invoker = true)
as
select
  plan.slug,
  plan.display_name,
  plan.description,
  plan.analysis_limit,
  plan.features,
  plan.display_order,
  plan.is_default,
  plan.is_purchasable,
  price.billing_interval,
  price.currency,
  price.unit_amount_minor,
  price.monthly_equivalent_minor,
  price.comparison_copy,
  price.savings_copy
from public.billing_plans as plan
left join public.billing_prices as price
  on price.plan_id = plan.id and price.is_active
where plan.is_active;

create view public.billing_subscription_overview
with (security_invoker = true)
as
select
  distinct on (entitlement.user_id)
  entitlement.user_id,
  plan.slug as plan_slug,
  plan.display_name as plan_name,
  plan.description as plan_description,
  entitlement.analysis_limit,
  (
    select count(*)::integer
    from public.analysis_usage_reservations as reservation
    where reservation.entitlement_period_id = entitlement.id
      and reservation.status in ('reserved', 'settled')
  ) as used_analyses,
  greatest(
    entitlement.analysis_limit - (
      select count(*)::integer
      from public.analysis_usage_reservations as reservation
      where reservation.entitlement_period_id = entitlement.id
        and reservation.status in ('reserved', 'settled')
    ),
    0
  ) as remaining_analyses,
  entitlement.period_start,
  entitlement.period_end as resets_at,
  subscription.status as subscription_status,
  subscription.billing_interval,
  subscription.cancel_at_period_end,
  subscription.cancellation_effective_at,
  scheduled_plan.slug as scheduled_plan_slug,
  subscription.scheduled_change_at,
  subscription.paid_through
from public.billing_entitlement_periods as entitlement
join public.billing_plans as plan on plan.id = entitlement.plan_id
left join public.billing_subscriptions as subscription
  on subscription.id = entitlement.subscription_id
left join public.billing_plans as scheduled_plan
  on scheduled_plan.id = subscription.scheduled_plan_id
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
  entitlement.id;

create view public.billing_usage_activity
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
  job.analysis_id
from public.usage_ledger as ledger
join public.billing_entitlement_periods as entitlement
  on entitlement.id = ledger.entitlement_period_id
join public.billing_plans as plan on plan.id = entitlement.plan_id
left join public.analysis_jobs as job on job.id = ledger.job_id;

create view public.billing_invoice_history
with (security_invoker = true)
as
select
  invoice.id,
  invoice.user_id,
  invoice.invoice_number,
  plan.slug as plan_slug,
  plan.display_name as plan_name,
  invoice.billing_interval,
  invoice.amount_due_minor,
  invoice.amount_paid_minor,
  invoice.currency,
  invoice.status,
  invoice.invoice_created_at,
  invoice.due_at,
  invoice.paid_at,
  invoice.hosted_invoice_url,
  invoice.invoice_pdf_url,
  invoice.refund_status,
  invoice.refunded_amount_minor
from public.billing_invoices as invoice
join public.billing_plans as plan on plan.id = invoice.plan_id;

create function private.get_or_create_free_entitlement(target_user_id uuid)
returns public.billing_entitlement_periods
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_role text := pg_catalog.current_setting('request.jwt.claim.role', true);
  period_start_at timestamptz :=
    pg_catalog.date_trunc('month', pg_catalog.now() at time zone 'UTC')
      at time zone 'UTC';
  period public.billing_entitlement_periods%rowtype;
begin
  if target_user_id is null
    or (
      caller_id is distinct from target_user_id
      and caller_role is distinct from 'service_role'
    )
  then
    raise exception 'billing_entitlement_forbidden' using errcode = '42501';
  end if;

  insert into public.billing_entitlement_periods (
    user_id,
    plan_id,
    period_start,
    period_end,
    analysis_limit,
    is_paid_through,
    source
  )
  select
    target_user_id,
    plan.id,
    period_start_at,
    period_start_at + interval '1 month',
    plan.analysis_limit,
    true,
    'free'
  from public.billing_plans as plan
  where plan.slug = 'free' and plan.is_default and plan.is_active
  on conflict do nothing;

  select entitlement.*
  into strict period
  from public.billing_entitlement_periods as entitlement
  where entitlement.user_id = target_user_id
    and entitlement.period_start = period_start_at
    and entitlement.period_end = period_start_at + interval '1 month'
    and entitlement.source = 'free'
  order by entitlement.id
  limit 1;

  return period;
end;
$$;

create function private.reserve_analysis_usage(analysis_id uuid)
returns public.analysis_usage_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  intake public.analysis_intakes%rowtype;
  period public.billing_entitlement_periods%rowtype;
  reservation public.analysis_usage_reservations%rowtype;
  consumed integer;
begin
  if caller_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select analysis_intake.*
  into intake
  from public.analysis_intakes as analysis_intake
  where analysis_intake.id = reserve_analysis_usage.analysis_id
    and analysis_intake.user_id = caller_id;

  if not found then
    raise exception 'analysis intake not found' using errcode = 'P0002';
  end if;

  select existing_reservation.*
  into reservation
  from public.analysis_usage_reservations as existing_reservation
  where existing_reservation.analysis_id = intake.id;

  if found then
    return reservation;
  end if;

  select entitlement.*
  into period
  from public.billing_entitlement_periods as entitlement
  where entitlement.user_id = caller_id
    and entitlement.period_start <= pg_catalog.now()
    and entitlement.period_end > pg_catalog.now()
    and (
      (entitlement.source = 'stripe' and entitlement.is_paid_through)
      or entitlement.source = 'free'
    )
  order by
    case when entitlement.source = 'stripe' then 0 else 1 end,
    entitlement.period_end desc,
    entitlement.id
  limit 1
  for update;

  if not found then
    period := private.get_or_create_free_entitlement(caller_id);

    select entitlement.*
    into strict period
    from public.billing_entitlement_periods as entitlement
    where entitlement.id = period.id
    for update;
  end if;

  select existing_reservation.*
  into reservation
  from public.analysis_usage_reservations as existing_reservation
  where existing_reservation.analysis_id = intake.id;

  if found then
    return reservation;
  end if;

  select count(*)::integer
  into consumed
  from public.analysis_usage_reservations as current_reservation
  where current_reservation.entitlement_period_id = period.id
    and current_reservation.status in ('reserved', 'settled');

  if consumed >= period.analysis_limit then
    raise exception 'usage_limit_reached'
      using errcode = 'P0001', detail = period.period_end::text;
  end if;

  insert into public.analysis_usage_reservations (
    analysis_id,
    user_id,
    entitlement_period_id,
    status
  )
  values (intake.id, caller_id, period.id, 'reserved')
  on conflict (analysis_id) do nothing
  returning * into reservation;

  if not found then
    select existing_reservation.*
    into strict reservation
    from public.analysis_usage_reservations as existing_reservation
    where existing_reservation.analysis_id = intake.id;
    return reservation;
  end if;

  insert into public.usage_ledger (
    idempotency_key,
    user_id,
    entitlement_period_id,
    reservation_id,
    event_type,
    quantity,
    source,
    status,
    remaining_balance
  )
  values (
    'analysis:' || intake.id::text || ':reservation',
    caller_id,
    period.id,
    reservation.id,
    'reservation',
    -1,
    'analysis_pipeline',
    'reserved',
    period.analysis_limit - consumed - 1
  )
  on conflict (idempotency_key) do nothing;

  return reservation;
end;
$$;

create function private.attach_analysis_usage_reservation(
  analysis_id uuid,
  job_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if not exists (
    select 1
    from public.analysis_jobs as analysis_job
    where analysis_job.id = attach_analysis_usage_reservation.job_id
      and analysis_job.analysis_id = attach_analysis_usage_reservation.analysis_id
      and analysis_job.user_id = caller_id
  ) then
    raise exception 'analysis job not found' using errcode = 'P0002';
  end if;

  update public.analysis_usage_reservations as reservation
  set job_id = attach_analysis_usage_reservation.job_id
  where reservation.analysis_id = attach_analysis_usage_reservation.analysis_id
    and reservation.user_id = caller_id
    and reservation.job_id is null;

  if not found then
    raise exception 'usage reservation not found' using errcode = 'P0002';
  end if;
end;
$$;

create function private.record_analysis_technical_retry(
  target_job_id uuid,
  target_attempt integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  reservation public.analysis_usage_reservations%rowtype;
  period public.billing_entitlement_periods%rowtype;
  consumed integer;
begin
  if not exists (
    select 1
    from public.analysis_jobs as analysis_job
    where analysis_job.id = target_job_id
      and analysis_job.user_id = caller_id
      and analysis_job.attempt = target_attempt
  ) then
    raise exception 'analysis job not found' using errcode = 'P0002';
  end if;

  select current_reservation.*
  into reservation
  from public.analysis_usage_reservations as current_reservation
  where current_reservation.job_id = target_job_id
    and current_reservation.user_id = caller_id;

  if not found then
    raise exception 'usage reservation not found' using errcode = 'P0002';
  end if;

  select entitlement.*
  into strict period
  from public.billing_entitlement_periods as entitlement
  where entitlement.id = reservation.entitlement_period_id
  for update;

  select current_reservation.*
  into strict reservation
  from public.analysis_usage_reservations as current_reservation
  where current_reservation.id = reservation.id
  for update;

  if reservation.status is distinct from 'reserved' then
    raise exception 'usage_reservation_not_active' using errcode = 'P0001';
  end if;

  select count(*)::integer
  into consumed
  from public.analysis_usage_reservations as current_reservation
  where current_reservation.entitlement_period_id = period.id
    and current_reservation.status in ('reserved', 'settled');

  insert into public.usage_ledger (
    idempotency_key,
    user_id,
    entitlement_period_id,
    reservation_id,
    job_id,
    event_type,
    quantity,
    source,
    status,
    remaining_balance
  )
  values (
    'reservation:' || reservation.id::text || ':technical_retry:' || target_attempt::text,
    reservation.user_id,
    period.id,
    reservation.id,
    reservation.job_id,
    'technical_retry',
    0,
    'analysis_pipeline',
    'informational',
    period.analysis_limit - consumed
  )
  on conflict (idempotency_key) do nothing;
end;
$$;

create function private.transition_analysis_usage(
  target_job_id uuid,
  target_status text
)
returns public.analysis_usage_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation public.analysis_usage_reservations%rowtype;
  period public.billing_entitlement_periods%rowtype;
  consumed integer;
  event_type text;
  event_quantity integer;
begin
  if pg_catalog.current_setting(
    'request.jwt.claim.role',
    true
  ) is distinct from 'service_role' then
    raise exception 'billing_projection_forbidden' using errcode = '42501';
  end if;

  if target_status not in ('settled', 'released') then
    raise exception 'invalid usage transition' using errcode = '22023';
  end if;

  select current_reservation.*
  into reservation
  from public.analysis_usage_reservations as current_reservation
  where current_reservation.job_id = target_job_id;

  if not found then
    raise exception 'usage reservation not found' using errcode = 'P0002';
  end if;

  select entitlement.*
  into strict period
  from public.billing_entitlement_periods as entitlement
  where entitlement.id = reservation.entitlement_period_id
  for update;

  select current_reservation.*
  into strict reservation
  from public.analysis_usage_reservations as current_reservation
  where current_reservation.id = reservation.id
  for update;

  if reservation.status <> 'reserved' then
    return reservation;
  end if;

  update public.analysis_usage_reservations as current_reservation
  set
    status = target_status,
    settled_at = case
      when target_status = 'settled' then pg_catalog.now()
      else current_reservation.settled_at
    end,
    released_at = case
      when target_status = 'released' then pg_catalog.now()
      else current_reservation.released_at
    end
  where current_reservation.id = reservation.id
  returning * into reservation;

  select count(*)::integer
  into consumed
  from public.analysis_usage_reservations as current_reservation
  where current_reservation.entitlement_period_id = period.id
    and current_reservation.status in ('reserved', 'settled');

  event_type := case when target_status = 'settled' then 'settlement' else 'release' end;
  event_quantity := case when target_status = 'released' then 1 else 0 end;

  insert into public.usage_ledger (
    idempotency_key,
    user_id,
    entitlement_period_id,
    reservation_id,
    job_id,
    event_type,
    quantity,
    source,
    status,
    remaining_balance
  )
  values (
    'reservation:' || reservation.id::text || ':' || target_status,
    reservation.user_id,
    period.id,
    reservation.id,
    reservation.job_id,
    event_type,
    event_quantity,
    'analysis_pipeline',
    target_status,
    period.analysis_limit - consumed
  )
  on conflict (idempotency_key) do nothing;

  return reservation;
end;
$$;

create function public.get_or_create_free_entitlement(target_user_id uuid)
returns public.billing_entitlement_periods
language sql
security invoker
set search_path = ''
as $$
  select private.get_or_create_free_entitlement(target_user_id);
$$;

create function public.reserve_analysis_usage(analysis_id uuid)
returns public.analysis_usage_reservations
language sql
security invoker
set search_path = ''
as $$
  select private.reserve_analysis_usage(analysis_id);
$$;

create function public.transition_analysis_usage(
  target_job_id uuid,
  target_status text
)
returns public.analysis_usage_reservations
language sql
security invoker
set search_path = ''
as $$
  select private.transition_analysis_usage(target_job_id, target_status);
$$;

create or replace function public.create_analysis_pipeline(analysis_id uuid)
returns public.analysis_jobs
language plpgsql
security invoker
set search_path = ''
as $$
declare
  intake public.analysis_intakes%rowtype;
  job public.analysis_jobs%rowtype;
begin
  select *
  into intake
  from public.analysis_intakes as analysis_intake
  where analysis_intake.id = create_analysis_pipeline.analysis_id
    and analysis_intake.user_id = (select auth.uid());

  if not found then
    raise exception 'analysis intake not found' using errcode = 'P0002';
  end if;

  perform public.reserve_analysis_usage(intake.id);

  insert into public.analysis_jobs (analysis_id, user_id, status, stage)
  values (intake.id, intake.user_id, 'queued', 'validating')
  returning * into job;

  perform private.attach_analysis_usage_reservation(intake.id, job.id);

  insert into public.analysis_artifacts (analysis_id, user_id, kind, status)
  select intake.id, intake.user_id, selected.kind, 'pending'
  from unnest(intake.selected_artifacts) as selected(kind);

  return job;
end;
$$;

create function private.retry_analysis_pipeline(analysis_id uuid)
returns public.analysis_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake public.analysis_intakes%rowtype;
  job public.analysis_jobs%rowtype;
  reservation public.analysis_usage_reservations%rowtype;
  period public.billing_entitlement_periods%rowtype;
begin
  select *
  into intake
  from public.analysis_intakes as analysis_intake
  where analysis_intake.id = retry_analysis_pipeline.analysis_id
    and analysis_intake.user_id = (select auth.uid());

  if not found then
    raise exception 'analysis intake not found' using errcode = 'P0002';
  end if;

  select *
  into job
  from public.analysis_jobs as analysis_job
  where analysis_job.analysis_id = intake.id;

  if not found then
    raise exception 'analysis job not found' using errcode = 'P0002';
  end if;

  select current_reservation.*
  into strict reservation
  from public.analysis_usage_reservations as current_reservation
  where current_reservation.job_id = job.id
    and current_reservation.user_id = intake.user_id;

  select entitlement.*
  into strict period
  from public.billing_entitlement_periods as entitlement
  where entitlement.id = reservation.entitlement_period_id
  for update;

  select current_reservation.*
  into strict reservation
  from public.analysis_usage_reservations as current_reservation
  where current_reservation.id = reservation.id
  for update;

  if reservation.status is distinct from 'reserved' then
    raise exception 'usage_reservation_not_active'
      using errcode = 'P0001',
      detail = 'Released usage requires a new capacity reservation';
  end if;

  select *
  into strict job
  from public.analysis_jobs as analysis_job
  where analysis_job.id = job.id
    and analysis_job.analysis_id = intake.id
  for update;

  update public.analysis_jobs
  set
    status = 'queued',
    stage = 'validating',
    attempt = attempt + 1,
    revision = revision + 1,
    workflow_run_id = null,
    error_code = null,
    started_at = null,
    completed_at = null
  where id = job.id
  returning * into job;

  update public.analysis_artifacts
  set
    status = 'pending',
    content = null,
    error_code = null,
    generated_at = null
  where analysis_id = intake.id
    and status in ('pending', 'failed');

  perform private.record_analysis_technical_retry(job.id, job.attempt);

  return job;
end;
$$;

create or replace function public.retry_analysis_pipeline(analysis_id uuid)
returns public.analysis_jobs
language sql
security invoker
set search_path = ''
as $$
  select private.retry_analysis_pipeline(analysis_id);
$$;

revoke all on table public.billing_plans from anon, authenticated;
revoke all on table public.billing_prices from anon, authenticated;
revoke all on table public.billing_customers from anon, authenticated;
revoke all on table public.billing_subscriptions from anon, authenticated;
revoke all on table public.billing_entitlement_periods from anon, authenticated;
revoke all on table public.billing_invoices from anon, authenticated;
revoke all on table public.billing_webhook_events from anon, authenticated;
revoke all on table public.usage_ledger from anon, authenticated;
revoke all on table public.analysis_usage_reservations from anon, authenticated;

grant select on table public.billing_plans to authenticated;
grant select on table public.billing_prices to authenticated;
grant select on table public.billing_customers to authenticated;
grant select on table public.billing_subscriptions to authenticated;
grant select on table public.billing_entitlement_periods to authenticated;
grant select on table public.billing_invoices to authenticated;
grant select on table public.usage_ledger to authenticated;
grant select on table public.analysis_usage_reservations to authenticated;

revoke all on public.billing_plan_catalog from anon;
revoke all on public.billing_subscription_overview from anon;
revoke all on public.billing_usage_activity from anon;
revoke all on public.billing_invoice_history from anon;

grant select on public.billing_plan_catalog to authenticated;
grant select on public.billing_subscription_overview to authenticated;
grant select on public.billing_usage_activity to authenticated;
grant select on public.billing_invoice_history to authenticated;

revoke all on function public.set_billing_updated_at() from public, anon, authenticated;
revoke all on function private.get_or_create_free_entitlement(uuid) from public, anon;
revoke all on function private.reserve_analysis_usage(uuid) from public, anon;
revoke all on function private.attach_analysis_usage_reservation(uuid, uuid) from public, anon;
revoke all on function private.record_analysis_technical_retry(uuid, integer)
  from public, anon;
revoke all on function private.retry_analysis_pipeline(uuid) from public, anon;
revoke all on function private.transition_analysis_usage(uuid, text) from public, anon, authenticated;
revoke all on function public.get_or_create_free_entitlement(uuid) from public, anon;
revoke all on function public.reserve_analysis_usage(uuid) from public, anon;
revoke all on function public.transition_analysis_usage(uuid, text) from public, anon, authenticated;

grant usage on schema private to authenticated, service_role;
grant execute on function private.get_or_create_free_entitlement(uuid)
  to authenticated, service_role;
grant execute on function private.reserve_analysis_usage(uuid) to authenticated;
grant execute on function private.attach_analysis_usage_reservation(uuid, uuid)
  to authenticated;
grant execute on function private.record_analysis_technical_retry(uuid, integer)
  to authenticated;
grant execute on function private.retry_analysis_pipeline(uuid) to authenticated;
grant execute on function private.transition_analysis_usage(uuid, text)
  to service_role;
grant execute on function public.get_or_create_free_entitlement(uuid)
  to authenticated, service_role;
grant execute on function public.reserve_analysis_usage(uuid) to authenticated;
grant execute on function public.transition_analysis_usage(uuid, text)
  to service_role;

revoke all on table public.billing_plans from service_role;
revoke all on table public.billing_prices from service_role;
revoke all on table public.billing_customers from service_role;
revoke all on table public.billing_subscriptions from service_role;
revoke all on table public.billing_entitlement_periods from service_role;
revoke all on table public.billing_invoices from service_role;
revoke all on table public.billing_webhook_events from service_role;
revoke all on table public.usage_ledger from service_role;

grant select, update on table public.billing_plans to service_role;
grant select, update on table public.billing_prices to service_role;
grant select, insert, update on table public.billing_customers to service_role;
grant select, insert, update on table public.billing_subscriptions to service_role;
grant select, insert, update on table public.billing_entitlement_periods to service_role;
grant select, insert, update on table public.billing_invoices to service_role;
grant select, insert, update on table public.billing_webhook_events to service_role;
grant select, insert on table public.usage_ledger to service_role;
