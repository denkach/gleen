-- Supabase grants service_role direct privileges to newly created public
-- objects. DEN-25 user state is accessed only through the authenticated
-- session client, while the public Share projection needs read-only access
-- to analysis_shares (granted by the preceding migration).
revoke all on table public.analysis_result_states from service_role;
revoke all on table public.analysis_flashcard_reviews from service_role;

revoke all on function public.save_owned_playback_position(uuid, bigint, bigint) from service_role;
revoke all on function public.enforce_monotonic_playback_position() from service_role;
