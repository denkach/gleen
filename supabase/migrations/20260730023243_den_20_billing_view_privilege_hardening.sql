revoke all on public.billing_usage_summary from public, anon, authenticated, service_role;
grant select on public.billing_usage_summary to authenticated, service_role;

revoke all on public.billing_customer_overview from public, anon, authenticated, service_role;
grant select on public.billing_customer_overview to authenticated, service_role;

revoke all on public.billing_payment_summary from public, anon, authenticated, service_role;
grant select on public.billing_payment_summary to authenticated, service_role;
