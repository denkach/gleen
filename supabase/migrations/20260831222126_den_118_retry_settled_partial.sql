create or replace function private.record_analysis_technical_retry(
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
      and analysis_job.status = 'queued'
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

  if reservation.status not in ('reserved', 'settled') then
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

create or replace function private.retry_analysis_pipeline(analysis_id uuid)
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
  select analysis_intake.*
  into intake
  from public.analysis_intakes as analysis_intake
  where analysis_intake.id = retry_analysis_pipeline.analysis_id
    and analysis_intake.user_id = (select auth.uid());

  if not found then
    raise exception 'analysis intake not found' using errcode = 'P0002';
  end if;

  select analysis_job.*
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

  select analysis_job.*
  into strict job
  from public.analysis_jobs as analysis_job
  where analysis_job.id = job.id
    and analysis_job.analysis_id = intake.id
  for update;

  if not (
    (
      job.status = 'partial'
      and reservation.status in ('reserved', 'settled')
    )
    or (
      job.status = 'failed'
      and reservation.status = 'reserved'
    )
  ) then
    raise exception 'analysis_retry_not_allowed'
      using errcode = 'P0001';
  end if;

  update public.analysis_jobs as analysis_job
  set
    status = 'queued',
    stage = 'validating',
    attempt = analysis_job.attempt + 1,
    revision = analysis_job.revision + 1,
    workflow_run_id = null,
    error_code = null,
    started_at = null,
    completed_at = null
  where analysis_job.id = job.id
  returning analysis_job.* into job;

  update public.analysis_artifacts as analysis_artifact
  set
    status = 'pending',
    content = null,
    error_code = null,
    generated_at = null
  where analysis_artifact.analysis_id = intake.id
    and analysis_artifact.status in ('pending', 'failed');

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
  select private.retry_analysis_pipeline($1);
$$;

revoke all on function private.record_analysis_technical_retry(uuid, integer)
  from public, anon, authenticated;
revoke all on function private.retry_analysis_pipeline(uuid) from public, anon;
revoke all on function public.retry_analysis_pipeline(uuid) from public, anon;

grant execute on function private.retry_analysis_pipeline(uuid)
  to authenticated;
grant execute on function public.retry_analysis_pipeline(uuid)
  to authenticated;
