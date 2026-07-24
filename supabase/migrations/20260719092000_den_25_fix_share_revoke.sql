-- COALESCE is SQL syntax, not a pg_catalog function. Recreate the revoke RPC
-- after the live staging check exposed the invalid schema-qualified call.
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
  set revoked_at = coalesce(
    public.analysis_shares.revoked_at,
    pg_catalog.now()
  )
  where analysis_id = p_analysis_id and user_id = caller_id
  returning true into revoked;

  return coalesce(revoked, false);
end;
$$;

revoke all on function public.revoke_owned_result_share(uuid) from PUBLIC, anon, service_role;
grant execute on function public.revoke_owned_result_share(uuid) to authenticated;
