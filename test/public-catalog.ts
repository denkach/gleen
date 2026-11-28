import { billingFixtureCatalog } from '@/lib/billing/fixtures';

export async function getPublicPlans() {
  return billingFixtureCatalog;
}
