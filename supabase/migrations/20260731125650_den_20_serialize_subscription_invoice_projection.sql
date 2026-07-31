create function private.serialize_billing_subscription_projection()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.stripe_subscription_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        new.user_id::text || ':' || new.stripe_subscription_id,
        0::bigint
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function private.serialize_billing_subscription_projection()
  from public, anon, authenticated, service_role;

create trigger billing_subscriptions_serialize_invoice_projection
before insert or update of stripe_subscription_id
on public.billing_subscriptions
for each row
execute function private.serialize_billing_subscription_projection();

create trigger billing_invoices_serialize_subscription_projection
before insert or update of stripe_subscription_id
on public.billing_invoices
for each row
execute function private.serialize_billing_subscription_projection();

create function private.link_billing_invoice_from_invoice()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.stripe_subscription_id is null
    or new.subscription_id is not null then
    return new;
  end if;

  update public.billing_invoices as invoice
  set subscription_id = subscription.id
  from public.billing_subscriptions as subscription
  where invoice.id = new.id
    and invoice.user_id = new.user_id
    and invoice.user_id = subscription.user_id
    and invoice.stripe_subscription_id = new.stripe_subscription_id
    and invoice.stripe_subscription_id = subscription.stripe_subscription_id
    and invoice.subscription_id is null;

  return new;
end;
$$;

revoke all on function private.link_billing_invoice_from_invoice()
  from public, anon, authenticated, service_role;

create trigger billing_invoices_link_subscription
after insert or update of stripe_subscription_id
on public.billing_invoices
for each row
execute function private.link_billing_invoice_from_invoice();
