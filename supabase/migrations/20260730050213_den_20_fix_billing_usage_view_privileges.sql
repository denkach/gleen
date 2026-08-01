revoke all on public.billing_usage_activity from public, anon, authenticated, service_role;
grant select on public.billing_usage_activity to authenticated, service_role;

revoke all on public.billing_usage_summary from public, anon, authenticated, service_role;
grant select on public.billing_usage_summary to authenticated, service_role;
