alter table public.analysis_usage_reservations
  add constraint analysis_usage_reservations_analysis_id_key
  unique using index usage_reservations_analysis_idx;

create or replace function private.reserve_analysis_usage(analysis_id uuid)
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
  on conflict on constraint analysis_usage_reservations_analysis_id_key do nothing
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
