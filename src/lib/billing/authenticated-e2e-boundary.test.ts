import { describe, expect, it } from 'vitest';

import {
  billingE2eOwnerId,
  createAuthenticatedBillingE2eClient,
  isAuthenticatedBillingE2eBoundaryEnabled,
} from './authenticated-e2e-boundary';
import {
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from './supabase-repository';

const token = 'playwright-local-only-token';

describe('authenticated billing E2E boundary', () => {
  it.each(['production', 'preview', 'development'])(
    'never enables for the Vercel %s environment',
    (vercelEnvironment) => {
      expect(
        isAuthenticatedBillingE2eBoundaryEnabled(
          {
            NODE_ENV: 'development',
            VERCEL_ENV: vercelEnvironment,
            PLAYWRIGHT_AUTH_FIXTURE_MODE: '1',
            PLAYWRIGHT_AUTH_FIXTURE_TOKEN: token,
          },
          token,
        ),
      ).toBe(false);
    },
  );

  it('never enables without the explicit local Playwright mode', () => {
    expect(
      isAuthenticatedBillingE2eBoundaryEnabled(
        {
          NODE_ENV: 'development',
          PLAYWRIGHT_AUTH_FIXTURE_TOKEN: token,
        },
        token,
      ),
    ).toBe(false);
  });

  it('never enables for local NODE_ENV production without Vercel metadata', () => {
    expect(
      isAuthenticatedBillingE2eBoundaryEnabled(
        {
          NODE_ENV: 'production',
          PLAYWRIGHT_AUTH_FIXTURE_MODE: '1',
          PLAYWRIGHT_AUTH_FIXTURE_TOKEN: token,
        },
        token,
      ),
    ).toBe(false);
  });

  it('keeps the real client without an environment token or exact cookie match', () => {
    expect(
      isAuthenticatedBillingE2eBoundaryEnabled(
        {
          NODE_ENV: 'development',
          PLAYWRIGHT_AUTH_FIXTURE_MODE: '1',
          PLAYWRIGHT_AUTH_FIXTURE_TOKEN: undefined,
        },
        token,
      ),
    ).toBe(false);
    expect(
      isAuthenticatedBillingE2eBoundaryEnabled(
        {
          NODE_ENV: 'development',
          PLAYWRIGHT_AUTH_FIXTURE_MODE: '1',
          PLAYWRIGHT_AUTH_FIXTURE_TOKEN: token,
        },
        'wrong-token',
      ),
    ).toBe(false);
  });

  it('enables only the explicit token-gated local Playwright boundary', () => {
    expect(
      isAuthenticatedBillingE2eBoundaryEnabled(
        {
          NODE_ENV: 'development',
          PLAYWRIGHT_AUTH_FIXTURE_MODE: '1',
          PLAYWRIGHT_AUTH_FIXTURE_TOKEN: token,
        },
        token,
      ),
    ).toBe(true);
  });

  it('exercises repository owner filters against mixed owner and foreign rows', async () => {
    const repository = createSupabaseBillingRepository(
      createAuthenticatedBillingE2eClient() as unknown as SupabaseBillingClient,
    );
    const [snapshot, usage, invoices] = await Promise.all([
      repository.getOwnedSnapshot(billingE2eOwnerId),
      repository.listOwnedUsage(billingE2eOwnerId, {
        cursor: null,
        limit: 25,
        search: '',
        eventType: null,
        periodStart: null,
        periodEnd: null,
      }),
      repository.listOwnedInvoices(billingE2eOwnerId, {
        cursor: null,
        limit: 25,
        search: '',
        status: null,
        refundedOnly: false,
        year: null,
      }),
    ]);

    expect(snapshot.usage).toEqual({
      used: 9,
      reserved: 1,
      remaining: 0,
      limit: 10,
      extraCredits: 0,
    });
    expect(usage.items.map((item) => item.analysisTitle)).toEqual([
      'Owner-only billing analysis',
    ]);
    expect(invoices.items.map((item) => item.number)).toEqual([
      'OWNER-2026-001',
    ]);
    expect(JSON.stringify({ usage, invoices })).not.toContain(
      'foreign-owner@example.test',
    );
  });
});
