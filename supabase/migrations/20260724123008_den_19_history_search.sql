alter table public.analysis_intakes
  add column if not exists history_search tsvector
  generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' ||
      coalesce(channel_title, '') || ' ' ||
      coalesce(canonical_url, '') || ' ' ||
      coalesce(youtube_video_id, '') || ' ' ||
      coalesce(output_locale, '') || ' ' ||
      coalesce(transcript_language, '')
    )
  ) stored;

create index if not exists analysis_intakes_history_search_idx
  on public.analysis_intakes using gin (history_search);

alter table public.analysis_result_states
  add column if not exists last_opened_at timestamptz;

create index if not exists analysis_intakes_owner_analyzed_idx
  on public.analysis_intakes (user_id, created_at desc, id desc);

create index if not exists analysis_result_states_owner_recent_idx
  on public.analysis_result_states (
    user_id,
    last_opened_at desc nulls last,
    analysis_id desc
  );

create index if not exists analysis_intakes_owner_title_idx
  on public.analysis_intakes (user_id, lower(title), id);

create index if not exists analysis_jobs_owner_status_updated_idx
  on public.analysis_jobs (
    user_id,
    status,
    updated_at desc,
    analysis_id desc
  );

create index if not exists analysis_result_states_owner_favorite_idx
  on public.analysis_result_states (user_id, favorite, analysis_id)
  where favorite = true;

create or replace view public.analysis_history
with (security_invoker = true)
as
select
  intake.user_id,
  intake.id as analysis_id,
  intake.youtube_video_id,
  intake.canonical_url,
  intake.title,
  intake.channel_title,
  intake.thumbnail_url,
  intake.transcript_language,
  intake.output_locale,
  intake.duration_seconds,
  intake.selected_artifacts,
  ready.ready_artifacts,
  job.status as job_status,
  intake.created_at as analyzed_at,
  job.updated_at as job_updated_at,
  result_state.last_opened_at,
  coalesce(result_state.favorite, false) as favorite,
  intake.updated_at as intake_revision,
  intake.history_search,
  lower(intake.title) as title_sort
from public.analysis_intakes as intake
join public.analysis_jobs as job
  on job.analysis_id = intake.id
  and job.user_id = intake.user_id
left join public.analysis_result_states as result_state
  on result_state.analysis_id = intake.id
  and result_state.user_id = intake.user_id
left join lateral (
  select coalesce(
    array_agg(artifact.kind order by artifact.kind),
    array[]::text[]
  ) as ready_artifacts
  from public.analysis_artifacts as artifact
  where artifact.analysis_id = intake.id
    and artifact.user_id = intake.user_id
    and artifact.status = 'ready'
) as ready on true;

drop policy if exists "Owners delete analysis intakes"
  on public.analysis_intakes;

create policy "Owners delete analysis intakes"
  on public.analysis_intakes for delete to authenticated
  using ((select auth.uid()) = user_id);

grant delete on public.analysis_intakes to authenticated;

revoke all on public.analysis_history from public, anon;
grant select on public.analysis_history to authenticated;
