import 'server-only';

import { unstable_cache } from 'next/cache';

import { parseBillingCatalogRows } from '@/lib/billing/domain';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const loadPublicPlans = unstable_cache(
  async () => {
    const { data, error } = await createAdminSupabaseClient()
      .from('billing_plan_catalog')
      .select(
        'slug,display_name,description,analysis_limit,features,display_order,is_default,is_purchasable,billing_interval,currency,unit_amount_minor,monthly_equivalent_minor,comparison_copy,savings_copy',
      )
      .abortSignal(AbortSignal.timeout(4000));
    if (error) throw new Error('Billing catalog unavailable');
    return parseBillingCatalogRows(data);
  },
  ['landing-billing-catalog-v1'],
  { revalidate: 60 },
);

export async function getPublicPlans() {
  try {
    return await loadPublicPlans();
  } catch {
    console.error({ event: 'marketing_billing_catalog_unavailable' });
    return [];
  }
}
