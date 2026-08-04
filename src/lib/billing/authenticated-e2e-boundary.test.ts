import { beforeEach, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  billingE2eOwnerId,
  createAuthenticatedBillingE2eClient,
  isAuthenticatedBillingE2eBoundaryEnabled,
  resetAuthenticatedBillingE2eProfiles,
} from './authenticated-e2e-boundary';
import {
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from './supabase-repository';
import { readInterfaceLocale } from '@/lib/onboarding/repository';
import { createSupabaseOnboardingStorage } from '@/lib/onboarding/supabase-storage';

const token = 'playwright-local-only-token';

describe('authenticated billing E2E boundary', () => {
  beforeEach(() => {
    resetAuthenticatedBillingE2eProfiles();
  });

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

  it('supports the owner-scoped profile lookup used by request locale resolution', async () => {
    const client = createAuthenticatedBillingE2eClient();
    const storage = createSupabaseOnboardingStorage(
      client as unknown as SupabaseClient,
    );

    await expect(
      readInterfaceLocale(storage, billingE2eOwnerId),
    ).resolves.toBeNull();
    expect(() => client.from('profiles_archive')).toThrow(
      'Authenticated billing fixture rejected unknown table',
    );
  });

  it('persists the exact owner-scoped interface locale across fixture clients', async () => {
    const writer = createSupabaseOnboardingStorage(
      createAuthenticatedBillingE2eClient() as unknown as SupabaseClient,
    );

    await expect(
      writer.upsertInterfaceLocale(billingE2eOwnerId, 'es'),
    ).resolves.toEqual({ data: { interface_locale: 'es' }, error: null });

    const reader = createSupabaseOnboardingStorage(
      createAuthenticatedBillingE2eClient() as unknown as SupabaseClient,
    );
    await expect(readInterfaceLocale(reader, billingE2eOwnerId)).resolves.toBe(
      'es',
    );
  });

  it('rejects every profile upsert outside the locale persistence contract', () => {
    const client = createAuthenticatedBillingE2eClient();
    const upsert = (
      table: string,
      values: Record<string, unknown>,
      options: Record<string, unknown>,
    ) =>
      (
        client.from(table) as unknown as {
          upsert(
            row: Record<string, unknown>,
            config: Record<string, unknown>,
          ): unknown;
        }
      ).upsert(values, options);

    expect(() =>
      upsert(
        'profiles',
        { user_id: billingE2eOwnerId, output_locale: 'uk' },
        { onConflict: 'user_id' },
      ),
    ).toThrow('Authenticated billing fixture rejected profile upsert');
    expect(() =>
      upsert(
        'profiles',
        {
          user_id: '99999999-9999-4999-8999-999999999999',
          interface_locale: 'es',
        },
        { onConflict: 'user_id' },
      ),
    ).toThrow('Authenticated billing fixture rejected profile upsert');
    expect(() =>
      upsert(
        'profiles',
        { user_id: billingE2eOwnerId, interface_locale: 'fr' },
        { onConflict: 'user_id' },
      ),
    ).toThrow('Authenticated billing fixture rejected profile upsert');
    expect(() =>
      upsert(
        'profiles',
        { user_id: billingE2eOwnerId, interface_locale: 'es' },
        { onConflict: 'id' },
      ),
    ).toThrow('Authenticated billing fixture rejected profile upsert');
    expect(() =>
      upsert(
        'billing_plan_catalog',
        { user_id: billingE2eOwnerId, interface_locale: 'es' },
        { onConflict: 'user_id' },
      ),
    ).toThrow('Authenticated billing fixture rejected profile upsert');
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
