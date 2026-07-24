-- New Supabase projects no longer expose public-schema objects to the Data API
-- automatically. Keep anonymous access closed and grant only the operations
-- exercised by authenticated, ownership-scoped application code.
revoke all on public.profiles from anon;
revoke all on public.analysis_intakes from anon;
revoke all on public.analysis_jobs from anon;
revoke all on public.analysis_job_events from anon;
revoke all on public.analysis_artifacts from anon;
revoke all on public.analysis_usage_reservations from anon;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.analysis_intakes to authenticated;
grant select, insert, update on public.analysis_jobs to authenticated;
grant select, insert on public.analysis_job_events to authenticated;
grant select, insert, update on public.analysis_artifacts to authenticated;
grant select, insert, update on public.analysis_usage_reservations to authenticated;

revoke execute on function public.create_analysis_reattempt(uuid, jsonb) from public, anon;
revoke execute on function public.create_analysis_pipeline(uuid) from public, anon;
revoke execute on function public.retry_analysis_pipeline(uuid) from public, anon;

grant execute on function public.create_analysis_reattempt(uuid, jsonb) to authenticated;
grant execute on function public.create_analysis_pipeline(uuid) to authenticated;
grant execute on function public.retry_analysis_pipeline(uuid) to authenticated;
