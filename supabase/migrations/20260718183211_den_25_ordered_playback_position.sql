alter table public.analysis_result_states
add column playback_revision bigint not null default 0
check (playback_revision >= 0);

-- Inserts have no prior row to compare; the nonnegative column check governs initial revisions.

create or replace function public.enforce_monotonic_playback_position()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if NEW.playback_revision <= OLD.playback_revision then
    raise exception using
      errcode = '23514',
      message = 'playback revision must strictly increase',
      constraint = 'analysis_result_states_playback_revision_monotonic';
  end if;

  return NEW;
end;
$$;

revoke all on function public.enforce_monotonic_playback_position() from PUBLIC, anon, authenticated;

create trigger analysis_result_states_enforce_monotonic_playback_position
before update of playback_position_ms, playback_revision
on public.analysis_result_states
for each row execute function public.enforce_monotonic_playback_position();

create or replace function public.save_owned_playback_position(
  p_analysis_id uuid,
  p_position_ms bigint,
  p_revision bigint
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  applied boolean;
begin
  insert into public.analysis_result_states (
    analysis_id,
    user_id,
    playback_position_ms,
    playback_revision
  )
  values (p_analysis_id, (select auth.uid()), p_position_ms, p_revision)
  on conflict (analysis_id, user_id) do update
  set playback_position_ms = excluded.playback_position_ms,
      playback_revision = excluded.playback_revision
  where excluded.playback_revision > analysis_result_states.playback_revision
  returning true into applied;

  return coalesce(applied, false);
end;
$$;

revoke all on function public.save_owned_playback_position(uuid, bigint, bigint) from PUBLIC, anon;
revoke all on function public.save_owned_playback_position(uuid, bigint, bigint) from authenticated;
grant execute on function public.save_owned_playback_position(uuid, bigint, bigint) to authenticated;
