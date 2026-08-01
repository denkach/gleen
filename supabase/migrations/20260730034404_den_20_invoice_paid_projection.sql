create function public.apply_billing_invoice_projection(
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
security invoker
set search_path = ''
as $$
declare
  projected_subscription public.billing_subscriptions%rowtype;
begin
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
    target_refunded_amount_minor
  );

  if target_advance_paid_through
    and target_external_subscription_id is not null then
    update public.billing_subscriptions as billing_subscription
    set
      status = case
        when billing_subscription.status in ('incomplete', 'past_due')
          then 'active'
        else billing_subscription.status
      end,
      paid_through = pg_catalog.greatest(
        coalesce(
          billing_subscription.paid_through,
          billing_subscription.current_period_end
        ),
        billing_subscription.current_period_end
      ),
      latest_stripe_event_created_at = target_event_created_at
    where billing_subscription.stripe_subscription_id =
        target_external_subscription_id
      and billing_subscription.user_id = target_user_id
      and billing_subscription.latest_stripe_event_created_at
        <= target_event_created_at
    returning * into projected_subscription;

    if found then
      update public.billing_entitlement_periods as entitlement
      set is_paid_through =
        projected_subscription.status in ('active', 'trialing')
      where entitlement.subscription_id = projected_subscription.id
        and entitlement.period_start =
          projected_subscription.current_period_start
        and entitlement.period_end = projected_subscription.current_period_end;
    end if;
  end if;
end;
$$;

revoke all on function public.apply_billing_invoice_projection(
  text, timestamptz, uuid, text, text, text, text, text, bigint, bigint, text,
  text, timestamptz, timestamptz, timestamptz, text, text, text, bigint, boolean
) from public, anon, authenticated;

grant execute on function public.apply_billing_invoice_projection(
  text, timestamptz, uuid, text, text, text, text, text, bigint, bigint, text,
  text, timestamptz, timestamptz, timestamptz, text, text, text, bigint, boolean
) to service_role;
