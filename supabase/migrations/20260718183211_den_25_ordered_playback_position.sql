alter table public.analysis_result_states
add column playback_revision bigint not null default 0
check (playback_revision >= 0);

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
