create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null unique references public.analysis_intakes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workflow_run_id text,
  status text not null check (status in ('queued','running','partial','complete','failed')),
  stage text not null check (stage in ('validating','transcript','structuring','artifacts','complete')),
  attempt integer not null default 1 check (attempt > 0),
  revision bigint not null default 1 check (revision > 0),
  error_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.analysis_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.analysis_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  stage text not null check (stage in ('validating','transcript','structuring','artifacts','complete')),
  status text not null check (status in ('started','completed','retrying','failed')),
  error_code text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique(job_id, idempotency_key)
);

create table public.analysis_artifacts (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analysis_intakes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('transcript','summary','flashcards','timestamps')),
  status text not null check (status in ('pending','ready','failed')),
  schema_version integer not null default 1 check (schema_version > 0),
  content jsonb,
  error_code text,
  generated_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(analysis_id, kind),
  check ((status = 'ready' and content is not null and error_code is null)
    or (status = 'failed' and content is null and error_code is not null)
    or (status = 'pending' and content is null and error_code is null))
);

create table public.analysis_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.analysis_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('reserved','settled','released')),
  updated_at timestamptz not null default now()
);

create index analysis_jobs_user_created_idx on public.analysis_jobs (user_id, created_at desc);
create index analysis_job_events_job_created_idx on public.analysis_job_events (job_id, created_at);
create index analysis_job_events_user_created_idx on public.analysis_job_events (user_id, created_at desc);
create index analysis_artifacts_user_analysis_idx on public.analysis_artifacts (user_id, analysis_id);
create index analysis_usage_reservations_user_updated_idx on public.analysis_usage_reservations (user_id, updated_at desc);

create function public.set_analysis_pipeline_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.set_analysis_job_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  if new.revision = old.revision then new.revision = old.revision + 1; end if;
  return new;
end;
$$;

create trigger analysis_jobs_set_updated_at before update on public.analysis_jobs
for each row execute function public.set_analysis_job_updated_at();
create trigger analysis_artifacts_set_updated_at before update on public.analysis_artifacts
for each row execute function public.set_analysis_pipeline_updated_at();
create trigger analysis_usage_reservations_set_updated_at before update on public.analysis_usage_reservations
for each row execute function public.set_analysis_pipeline_updated_at();

alter table public.analysis_jobs enable row level security;
alter table public.analysis_job_events enable row level security;
alter table public.analysis_artifacts enable row level security;
alter table public.analysis_usage_reservations enable row level security;

create policy "analysis_jobs_select_own" on public.analysis_jobs for select to authenticated using (auth.uid() = user_id);
create policy "analysis_job_events_select_own" on public.analysis_job_events for select to authenticated using (auth.uid() = user_id);
create policy "analysis_artifacts_select_own" on public.analysis_artifacts for select to authenticated using (auth.uid() = user_id);
create policy "analysis_usage_reservations_select_own" on public.analysis_usage_reservations for select to authenticated using (auth.uid() = user_id);
create policy "analysis_jobs_insert_own" on public.analysis_jobs for insert to authenticated with check (auth.uid() = user_id);
create policy "analysis_jobs_update_own" on public.analysis_jobs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "analysis_artifacts_insert_own" on public.analysis_artifacts for insert to authenticated with check (auth.uid() = user_id);
create policy "analysis_artifacts_update_own" on public.analysis_artifacts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "analysis_usage_reservations_insert_own" on public.analysis_usage_reservations for insert to authenticated with check (auth.uid() = user_id);

create function public.create_analysis_pipeline(analysis_id uuid)
returns public.analysis_jobs
language plpgsql security invoker set search_path = '' as $$
declare intake public.analysis_intakes%rowtype; job public.analysis_jobs%rowtype;
begin
  select * into intake from public.analysis_intakes i
  where i.id = create_analysis_pipeline.analysis_id and i.user_id = auth.uid();
  if not found then raise exception 'analysis intake not found' using errcode = 'P0002'; end if;

  insert into public.analysis_jobs (analysis_id, user_id, status, stage)
  values (intake.id, intake.user_id, 'queued', 'validating') returning * into job;
  insert into public.analysis_usage_reservations (job_id, user_id, status)
  values (job.id, intake.user_id, 'reserved');
  insert into public.analysis_artifacts (analysis_id, user_id, kind, status)
  select intake.id, intake.user_id, selected.kind, 'pending'
  from unnest(intake.selected_artifacts) as selected(kind);
  return job;
end;
$$;

create function public.retry_analysis_pipeline(analysis_id uuid)
returns public.analysis_jobs
language plpgsql security invoker set search_path = '' as $$
declare intake public.analysis_intakes%rowtype; job public.analysis_jobs%rowtype;
begin
  select * into intake from public.analysis_intakes i
  where i.id = retry_analysis_pipeline.analysis_id and i.user_id = auth.uid();
  if not found then raise exception 'analysis intake not found' using errcode = 'P0002'; end if;

  select * into job from public.analysis_jobs j where j.analysis_id = intake.id for update;
  if not found then raise exception 'analysis job not found' using errcode = 'P0002'; end if;
  update public.analysis_jobs set status = 'queued', stage = 'validating', attempt = attempt + 1,
    revision = revision + 1, workflow_run_id = null, error_code = null, started_at = null, completed_at = null
  where id = job.id returning * into job;
  update public.analysis_artifacts set status = 'pending', content = null, error_code = null, generated_at = null
  where analysis_id = intake.id and status in ('pending', 'failed');
  update public.analysis_usage_reservations set status = 'reserved' where job_id = job.id;
  return job;
end;
$$;

alter publication supabase_realtime add table public.analysis_jobs;
alter publication supabase_realtime add table public.analysis_job_events;
alter publication supabase_realtime add table public.analysis_artifacts;
