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

  update public.analysis_artifacts as analysis_artifact
  set
    status = 'pending',
    content = null,
    error_code = null,
    generated_at = null
  where analysis_artifact.analysis_id = intake.id
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
  select private.retry_analysis_pipeline($1);
$$;
