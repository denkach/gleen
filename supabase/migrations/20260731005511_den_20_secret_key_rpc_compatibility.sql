-- Modern Supabase secret keys authorize PostgREST as service_role without
-- populating the legacy request.jwt.claim.role GUC. These service-role-only
-- wrappers establish that legacy context in the same transaction before
-- delegating to the existing atomic projection functions.

create function public.claim_billing_webhook_event_service_role(
  target_event_id text,
  target_event_type text,
  target_created_at timestamptz
)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.set_config(
    'request.jwt.claim.role',
    'service_role',
    true
  );
  return public.claim_billing_webhook_event(
    target_event_id,
    target_event_type,
    target_created_at
  );
end;
$$;

create function public.apply_billing_subscription_projection_service_role(
  target_event_id text,
  target_event_created_at timestamptz,
  target_user_id uuid,
  target_external_subscription_id text,
  target_external_price_id text,
  target_plan_slug text,
  target_interval text,
  target_status text,
  target_period_start timestamptz,
  target_period_end timestamptz,
  target_trial_ends_at timestamptz,
  target_cancel_at_period_end boolean,
  target_cancellation_effective_at timestamptz,
  target_scheduled_plan_slug text,
  target_scheduled_change_at timestamptz,
  target_paid_through timestamptz
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.set_config(
    'request.jwt.claim.role',
    'service_role',
    true
  );
  perform public.apply_billing_subscription_projection(
    target_event_id,
    target_event_created_at,
    target_user_id,
    target_external_subscription_id,
    target_external_price_id,
    target_plan_slug,
    target_interval,
    target_status,
    target_period_start,
    target_period_end,
    target_trial_ends_at,
    target_cancel_at_period_end,
    target_cancellation_effective_at,
    target_scheduled_plan_slug,
    target_scheduled_change_at,
    target_paid_through
  );
end;
$$;

create function public.apply_billing_invoice_projection_service_role(
  target_event_id text,
  target_event_created_at timestamptz,
  target_user_id uuid,
  target_external_invoice_id text,
  target_external_subscription_id text,
  target_number text,
  target_plan_slug text,
  target_interval text,
  target_amount_due_minor bigint,
  target_amount_paid_minor bigint,
  target_currency text,
  target_status text,
  target_created_at timestamptz,
  target_due_at timestamptz,
  target_paid_at timestamptz,
  target_hosted_url text,
  target_pdf_url text,
  target_refund_status text,
  target_refunded_amount_minor bigint,
  target_advance_paid_through boolean
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.set_config(
    'request.jwt.claim.role',
    'service_role',
    true
  );
  perform public.apply_billing_invoice_projection(
    target_event_id,
    target_event_created_at,
    target_user_id,
    target_external_invoice_id,
    target_external_subscription_id,
    target_number,
    target_plan_slug,
    target_interval,
    target_amount_due_minor,
    target_amount_paid_minor,
    target_currency,
    target_status,
    target_created_at,
    target_due_at,
    target_paid_at,
    target_hosted_url,
    target_pdf_url,
    target_refund_status,
    target_refunded_amount_minor,
    target_advance_paid_through
  );
end;
$$;

create function public.mark_billing_webhook_processed_service_role(
  target_event_id text
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.set_config(
    'request.jwt.claim.role',
    'service_role',
    true
  );
  perform public.mark_billing_webhook_processed(target_event_id);
end;
$$;

create function public.mark_billing_webhook_failed_service_role(
  target_event_id text,
  target_error_code text
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.set_config(
    'request.jwt.claim.role',
    'service_role',
    true
  );
  perform public.mark_billing_webhook_failed(
    target_event_id,
    target_error_code
  );
end;
$$;

revoke all on function public.claim_billing_webhook_event_service_role(
  text,
  text,
  timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.apply_billing_subscription_projection_service_role(
  text,
  timestamptz,
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  boolean,
  timestamptz,
  text,
  timestamptz,
  timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.apply_billing_invoice_projection_service_role(
  text,
  timestamptz,
  uuid,
  text,
  text,
  text,
  text,
  text,
  bigint,
  bigint,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  bigint,
  boolean
) from public, anon, authenticated, service_role;
revoke all on function public.mark_billing_webhook_processed_service_role(
  text
) from public, anon, authenticated, service_role;
revoke all on function public.mark_billing_webhook_failed_service_role(
  text,
  text
) from public, anon, authenticated, service_role;

grant execute on function public.claim_billing_webhook_event_service_role(
  text,
  text,
  timestamptz
) to service_role;
grant execute on function public.apply_billing_subscription_projection_service_role(
  text,
  timestamptz,
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  boolean,
  timestamptz,
  text,
  timestamptz,
  timestamptz
) to service_role;
grant execute on function public.apply_billing_invoice_projection_service_role(
  text,
  timestamptz,
  uuid,
  text,
  text,
  text,
  text,
  text,
  bigint,
  bigint,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  bigint,
  boolean
) to service_role;
grant execute on function public.mark_billing_webhook_processed_service_role(
  text
) to service_role;
grant execute on function public.mark_billing_webhook_failed_service_role(
  text,
  text
) to service_role;
