create or replace function public.create_owned_result_share(
  p_analysis_id uuid,
  p_token text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  result_token text;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_token !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception 'Invalid result share token' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      caller_id::text || ':' || p_analysis_id::text,
      0
    )
  );

  if not exists (
    select 1
    from public.analysis_intakes as intake
    where intake.id = p_analysis_id and intake.user_id = caller_id
  ) then
    raise exception 'Analysis intake not found' using errcode = 'P0002';
  end if;

  insert into public.analysis_shares (token, analysis_id, user_id, revoked_at)
  values (p_token, p_analysis_id, caller_id, null)
  on conflict (analysis_id, user_id) do update
  set
    token = case
      when public.analysis_shares.revoked_at is null then public.analysis_shares.token
      else excluded.token
    end,
    revoked_at = null
  returning analysis_shares.token into result_token;

  return result_token;
end;
$$;

create or replace function public.revoke_owned_result_share(
  p_analysis_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  revoked boolean;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      caller_id::text || ':' || p_analysis_id::text,
      0
    )
  );

  if not exists (
    select 1
    from public.analysis_intakes as intake
    where intake.id = p_analysis_id and intake.user_id = caller_id
  ) then
    raise exception 'Analysis intake not found' using errcode = 'P0002';
  end if;

  update public.analysis_shares
  set revoked_at = pg_catalog.coalesce(
    public.analysis_shares.revoked_at,
    pg_catalog.now()
  )
  where analysis_id = p_analysis_id and user_id = caller_id
  returning true into revoked;

  return pg_catalog.coalesce(revoked, false);
end;
$$;

revoke all on function public.create_owned_result_share(uuid, text) from PUBLIC, anon, service_role;
revoke all on function public.revoke_owned_result_share(uuid) from PUBLIC, anon, service_role;

grant execute on function public.create_owned_result_share(uuid, text) to authenticated;
grant execute on function public.revoke_owned_result_share(uuid) to authenticated;

-- The secret-key client bypasses RLS, but Postgres object privileges still
-- define which relations it may access. Reset and grant only operations used
-- by the anonymous public projection and the production workflow.
revoke all on table public.analysis_intakes from service_role;
revoke all on table public.analysis_jobs from service_role;
revoke all on table public.analysis_job_events from service_role;
revoke all on table public.analysis_artifacts from service_role;
revoke all on table public.analysis_usage_reservations from service_role;
revoke all on table public.analysis_shares from service_role;

grant select on table public.analysis_intakes to service_role;
grant select, update on table public.analysis_jobs to service_role;
grant select, insert on table public.analysis_job_events to service_role;
grant select, update on table public.analysis_artifacts to service_role;
grant select, update on table public.analysis_usage_reservations to service_role;
grant select on table public.analysis_shares to service_role;
