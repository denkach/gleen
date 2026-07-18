create table public.analysis_intakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  youtube_video_id text not null
    check (char_length(youtube_video_id) = 11 and youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  canonical_url text not null
    check (canonical_url ~ '^https://'),
  title text not null check (btrim(title) <> ''),
  channel_title text not null check (btrim(channel_title) <> ''),
  duration_seconds integer not null check (duration_seconds > 0),
  thumbnail_url text not null check (thumbnail_url ~ '^https://'),
  transcript_language text not null check (btrim(transcript_language) <> ''),
  transcript_segments jsonb not null
    check (jsonb_typeof(transcript_segments) = 'array'),
  output_locale text not null check (btrim(output_locale) <> ''),
  summary_preset text check (summary_preset in ('balanced', 'detailed')),
  flashcard_preset integer check (flashcard_preset in (18, 30)),
  selected_artifacts text[] not null
    check (
      cardinality(selected_artifacts) > 0
      and selected_artifacts <@ array['summary', 'timestamps', 'transcript', 'flashcards']::text[]
    ),
  analysis_contract_version integer not null
    check (analysis_contract_version > 0),
  duplicate_key text not null
    check (duplicate_key ~ '^[0-9a-f]{64}$'),
  attempt integer not null default 1 check (attempt > 0),
  status text not null default 'ready'
    check (status in ('ready', 'processing', 'complete', 'failed')),
  reanalysis_of uuid references public.analysis_intakes (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, duplicate_key, attempt)
);

create trigger analysis_intakes_set_updated_at
before update on public.analysis_intakes
for each row execute function public.set_updated_at();

create index analysis_intakes_user_duplicate_created_idx
on public.analysis_intakes (user_id, duplicate_key, created_at desc);

create index analysis_intakes_user_created_idx
on public.analysis_intakes (user_id, created_at desc);

alter table public.analysis_intakes enable row level security;

create policy "analysis_intakes_select_own"
on public.analysis_intakes for select
to authenticated
using (auth.uid() = user_id);

create policy "analysis_intakes_insert_own"
on public.analysis_intakes for insert
to authenticated
with check (auth.uid() = user_id);

create policy "analysis_intakes_update_own"
on public.analysis_intakes for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create function public.create_analysis_reattempt(
  source_id uuid,
  refreshed_snapshot jsonb
)
returns public.analysis_intakes
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_row public.analysis_intakes%rowtype;
  created_row public.analysis_intakes%rowtype;
  next_attempt integer;
begin
  select *
  into source_row
  from public.analysis_intakes
  where id = source_id and auth.uid() = user_id;

  if not found then
    raise exception 'Analysis intake not found' using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      source_row.user_id::text || ':' || source_row.duplicate_key,
      0
    )
  );

  select *
  into source_row
  from public.analysis_intakes
  where id = source_id
  for update;

  if not found then
    raise exception 'Analysis intake not found' using errcode = 'P0002';
  end if;

  if refreshed_snapshot ->> 'youtube_video_id' is distinct from source_row.youtube_video_id
    or refreshed_snapshot ->> 'duplicate_key' is distinct from source_row.duplicate_key
    or refreshed_snapshot ->> 'output_locale' is distinct from source_row.output_locale
    or (refreshed_snapshot ->> 'analysis_contract_version')::integer
      is distinct from source_row.analysis_contract_version then
    raise exception 'Refreshed snapshot does not match source configuration'
      using errcode = '22023';
  end if;

  select coalesce(max(attempt) + 1, 1)
  into next_attempt
  from public.analysis_intakes
  where user_id = source_row.user_id
    and duplicate_key = source_row.duplicate_key;

  insert into public.analysis_intakes (
    user_id,
    youtube_video_id,
    canonical_url,
    title,
    channel_title,
    duration_seconds,
    thumbnail_url,
    transcript_language,
    transcript_segments,
    output_locale,
    summary_preset,
    flashcard_preset,
    selected_artifacts,
    analysis_contract_version,
    duplicate_key,
    attempt,
    status,
    reanalysis_of
  ) values (
    source_row.user_id,
    refreshed_snapshot ->> 'youtube_video_id',
    refreshed_snapshot ->> 'canonical_url',
    refreshed_snapshot ->> 'title',
    refreshed_snapshot ->> 'channel_title',
    (refreshed_snapshot ->> 'duration_seconds')::integer,
    refreshed_snapshot ->> 'thumbnail_url',
    refreshed_snapshot ->> 'transcript_language',
    refreshed_snapshot -> 'transcript_segments',
    source_row.output_locale,
    source_row.summary_preset,
    source_row.flashcard_preset,
    source_row.selected_artifacts,
    source_row.analysis_contract_version,
    source_row.duplicate_key,
    next_attempt,
    'ready',
    source_id
  )
  returning * into created_row;

  return created_row;
end;
$$;
