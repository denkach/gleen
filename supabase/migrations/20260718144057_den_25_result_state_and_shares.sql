create table public.analysis_result_states (
  analysis_id uuid not null references public.analysis_intakes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  favorite boolean not null default false,
  playback_position_ms bigint not null default 0 check (playback_position_ms >= 0),
  last_artifact text not null default 'overview'
    check (last_artifact in ('overview','summary','flashcards','timestamps','transcript','export')),
  last_study_action text check (last_study_action in ('summary_opened','flashcards_reviewed','transcript_used')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (analysis_id, user_id)
);

create table public.analysis_flashcard_reviews (
  analysis_id uuid not null references public.analysis_intakes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_revision timestamptz not null,
  card_index integer not null check (card_index >= 0),
  rating text not null check (rating in ('again','hard','got_it')),
  updated_at timestamptz not null default now(),
  primary key (analysis_id, user_id, artifact_revision, card_index)
);

create table public.analysis_shares (
  token text primary key check (token ~ '^[A-Za-z0-9_-]{43}$'),
  analysis_id uuid not null references public.analysis_intakes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (analysis_id, user_id)
);

create index analysis_result_states_user_id_idx
on public.analysis_result_states (user_id);

create index analysis_result_states_analysis_id_idx
on public.analysis_result_states (analysis_id);

create index analysis_flashcard_reviews_user_id_idx
on public.analysis_flashcard_reviews (user_id);

create index analysis_flashcard_reviews_analysis_id_idx
on public.analysis_flashcard_reviews (analysis_id);

create index analysis_shares_user_id_idx
on public.analysis_shares (user_id);

create index analysis_shares_analysis_id_idx
on public.analysis_shares (analysis_id);

create index analysis_shares_active_token_idx
on public.analysis_shares (token)
where revoked_at is null;

create trigger analysis_result_states_set_updated_at
before update on public.analysis_result_states
for each row execute function public.set_updated_at();

create trigger analysis_flashcard_reviews_set_updated_at
before update on public.analysis_flashcard_reviews
for each row execute function public.set_updated_at();

alter table public.analysis_result_states enable row level security;
alter table public.analysis_flashcard_reviews enable row level security;
alter table public.analysis_shares enable row level security;

-- The identity term `using ((select auth.uid()) = user_id)` is combined below
-- with an owned analysis_intakes row. The SQL is repeated intentionally so
-- each operation remains independently auditable.

create policy "analysis_result_states_select_own"
on public.analysis_result_states for select
to authenticated
using (((select auth.uid()) = user_id)
  and exists (
    select 1
    from public.analysis_intakes
    where analysis_intakes.id = analysis_result_states.analysis_id
      and analysis_intakes.user_id = (select auth.uid())
  ));

create policy "analysis_result_states_insert_own"
on public.analysis_result_states for insert
to authenticated
with check ((select auth.uid()) = user_id
  and exists (
    select 1
    from public.analysis_intakes
    where analysis_intakes.id = analysis_result_states.analysis_id
      and analysis_intakes.user_id = (select auth.uid())
  ));

create policy "analysis_result_states_update_own"
on public.analysis_result_states for update
to authenticated
using (((select auth.uid()) = user_id)
  and exists (
    select 1
    from public.analysis_intakes
    where analysis_intakes.id = analysis_result_states.analysis_id
      and analysis_intakes.user_id = (select auth.uid())
  ))
with check ((select auth.uid()) = user_id
  and exists (
    select 1
    from public.analysis_intakes
    where analysis_intakes.id = analysis_result_states.analysis_id
      and analysis_intakes.user_id = (select auth.uid())
  ));

create policy "analysis_result_states_delete_own"
on public.analysis_result_states for delete
to authenticated
using (((select auth.uid()) = user_id)
  and exists (
    select 1
    from public.analysis_intakes
    where analysis_intakes.id = analysis_result_states.analysis_id
      and analysis_intakes.user_id = (select auth.uid())
  ));

create policy "analysis_flashcard_reviews_select_own"
on public.analysis_flashcard_reviews for select
to authenticated
using (((select auth.uid()) = user_id)
  and exists (
    select 1
    from public.analysis_intakes
    where analysis_intakes.id = analysis_flashcard_reviews.analysis_id
      and analysis_intakes.user_id = (select auth.uid())
  ));

create policy "analysis_flashcard_reviews_insert_own"
on public.analysis_flashcard_reviews for insert
to authenticated
with check ((select auth.uid()) = user_id
  and exists (
    select 1
    from public.analysis_intakes
    where analysis_intakes.id = analysis_flashcard_reviews.analysis_id
      and analysis_intakes.user_id = (select auth.uid())
  ));

create policy "analysis_flashcard_reviews_update_own"
on public.analysis_flashcard_reviews for update
to authenticated
using (((select auth.uid()) = user_id)
  and exists (
    select 1
    from public.analysis_intakes
    where analysis_intakes.id = analysis_flashcard_reviews.analysis_id
      and analysis_intakes.user_id = (select auth.uid())
  ))
with check ((select auth.uid()) = user_id
  and exists (
    select 1
    from public.analysis_intakes
    where analysis_intakes.id = analysis_flashcard_reviews.analysis_id
      and analysis_intakes.user_id = (select auth.uid())
  ));

create policy "analysis_flashcard_reviews_delete_own"
on public.analysis_flashcard_reviews for delete
to authenticated
using (((select auth.uid()) = user_id)
  and exists (
    select 1
    from public.analysis_intakes
    where analysis_intakes.id = analysis_flashcard_reviews.analysis_id
      and analysis_intakes.user_id = (select auth.uid())
  ));

create policy "analysis_shares_select_own"
on public.analysis_shares for select
to authenticated
using (((select auth.uid()) = user_id)
  and exists (
    select 1
    from public.analysis_intakes
    where analysis_intakes.id = analysis_shares.analysis_id
      and analysis_intakes.user_id = (select auth.uid())
  ));

create policy "analysis_shares_insert_own"
on public.analysis_shares for insert
to authenticated
with check ((select auth.uid()) = user_id
  and exists (
    select 1
    from public.analysis_intakes
    where analysis_intakes.id = analysis_shares.analysis_id
      and analysis_intakes.user_id = (select auth.uid())
  ));

create policy "analysis_shares_update_own"
on public.analysis_shares for update
to authenticated
using (((select auth.uid()) = user_id)
  and exists (
    select 1
    from public.analysis_intakes
    where analysis_intakes.id = analysis_shares.analysis_id
      and analysis_intakes.user_id = (select auth.uid())
  ))
with check ((select auth.uid()) = user_id
  and exists (
    select 1
    from public.analysis_intakes
    where analysis_intakes.id = analysis_shares.analysis_id
      and analysis_intakes.user_id = (select auth.uid())
  ));

create policy "analysis_shares_delete_own"
on public.analysis_shares for delete
to authenticated
using (((select auth.uid()) = user_id)
  and exists (
    select 1
    from public.analysis_intakes
    where analysis_intakes.id = analysis_shares.analysis_id
      and analysis_intakes.user_id = (select auth.uid())
  ));

revoke all on public.analysis_result_states from PUBLIC, anon, authenticated;
revoke all on public.analysis_flashcard_reviews from PUBLIC, anon, authenticated;
revoke all on public.analysis_shares from PUBLIC, anon, authenticated;

grant select, insert, update, delete on public.analysis_result_states to authenticated;
grant select, insert, update, delete on public.analysis_flashcard_reviews to authenticated;
grant select, insert, update, delete on public.analysis_shares to authenticated;
