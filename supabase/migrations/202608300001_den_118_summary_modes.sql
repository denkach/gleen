alter table public.profiles
  drop constraint if exists profiles_summary_preset_check;
alter table public.profiles
  add constraint profiles_summary_preset_check
  check (summary_preset in ('compact', 'balanced', 'deep', 'detailed'));

alter table public.analysis_intakes
  drop constraint if exists analysis_intakes_summary_preset_check;
alter table public.analysis_intakes
  add constraint analysis_intakes_summary_preset_check
  check (summary_preset in ('compact', 'balanced', 'deep', 'detailed'));

update public.profiles set summary_preset = 'deep' where summary_preset = 'detailed';
update public.analysis_intakes set summary_preset = 'deep' where summary_preset = 'detailed';

-- Duplicate hashes intentionally remain unchanged for historical rows. Enforce
-- the same semantic identity independently of legacy/canonical hash formats so
-- mixed-version Deep/detailed inserts cannot both win attempt 1.
create unique index analysis_intakes_semantic_identity_attempt_idx
on public.analysis_intakes (
  user_id,
  youtube_video_id,
  output_locale,
  (('summary' = any (selected_artifacts))),
  (('timestamps' = any (selected_artifacts))),
  (('transcript' = any (selected_artifacts))),
  (('flashcards' = any (selected_artifacts))),
  (
    case
      when 'summary' = any (selected_artifacts) then
        case
          when summary_preset in ('deep', 'detailed') then 'deep'
          else pg_catalog.coalesce(summary_preset, 'none')
        end
      else 'none'
    end
  ),
  (
    case
      when 'flashcards' = any (selected_artifacts) then
        pg_catalog.coalesce(flashcard_preset, 0)
      else 0
    end
  ),
  analysis_contract_version,
  attempt
);

create table public.analysis_summary_generation_metrics (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.analysis_jobs(id) on delete cascade,
  attempt integer not null check (attempt > 0),
  status text not null check (status in ('completed', 'failed')),
  error_code text check (
    error_code is null
    or error_code in (
      'provider_unavailable',
      'provider_configuration',
      'provider_rejected',
      'invalid_provider_response'
    )
  ),
  route text not null check (route in ('one-pass', 'two-pass')),
  repair_count integer not null check (repair_count between 0 and 1),
  passes jsonb not null check (
    jsonb_typeof(passes) = 'array'
    and jsonb_array_length(passes) between 0 and 3
  ),
  finding_counts jsonb not null check (jsonb_typeof(finding_counts) = 'object'),
  created_at timestamptz not null default now(),
  unique (job_id, attempt),
  check (
    (status = 'completed' and error_code is null)
    or (status = 'failed' and error_code is not null)
  )
);

alter table public.analysis_summary_generation_metrics enable row level security;

-- Product owners can read/insert analysis_job_events, so provider cost and
-- pass metrics live behind a separate server-only relation. No owner policy is
-- created, which also prevents pre-insertion from claiming the unique key.
revoke all on table public.analysis_summary_generation_metrics from PUBLIC, anon, authenticated, service_role;
grant select, insert on table public.analysis_summary_generation_metrics to service_role;
