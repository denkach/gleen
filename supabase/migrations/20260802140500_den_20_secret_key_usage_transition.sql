-- Modern Supabase secret keys authorize PostgREST as service_role without
-- populating the legacy request.jwt.claim.role GUC. Establish that context in
-- the same transaction before delegating to the atomic usage transition.
create function public.transition_analysis_usage_service_role(
  target_job_id uuid,
  target_status text
)
returns public.analysis_usage_reservations
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.set_config(
    'request.jwt.claim.role',
    'service_role',
    true
  );
  return public.transition_analysis_usage(target_job_id, target_status);
end;
$$;

revoke all on function public.transition_analysis_usage_service_role(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.transition_analysis_usage_service_role(uuid, text)
  to service_role;
