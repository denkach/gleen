import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  createSupabaseBillingProjectionRepository,
  type SupabaseBillingAdminClient,
} from './supabase-projection-repository';

describe('Supabase billing projection repository', () => {
  it('is isolated behind an explicit server-only module boundary', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/billing/supabase-projection-repository.ts'),
      'utf8',
    );
    expect(source.startsWith("import 'server-only';")).toBe(true);
    expect(source).toContain('supabaseBillingAdminClientBrand');
  });

  it('uses only privileged atomic RPCs for webhook state changes', async () => {
    const admin = {
      rpc: vi
        .fn()
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValue({ data: null, error: null }),
    };
    const repository = createSupabaseBillingProjectionRepository(
      admin as unknown as SupabaseBillingAdminClient,
    );

    await expect(
      repository.claimWebhookEvent({
        eventId: 'evt_1',
        type: 'invoice.paid',
        createdAt: '2026-07-30T00:00:00.000Z',
      }),
    ).resolves.toBe('claimed');
    await repository.markWebhookProcessed('evt_1');

    expect(admin.rpc).toHaveBeenNthCalledWith(
      1,
      'claim_billing_webhook_event',
      {
        target_event_id: 'evt_1',
        target_event_type: 'invoice.paid',
        target_created_at: '2026-07-30T00:00:00.000Z',
      },
    );
    expect(admin.rpc).toHaveBeenNthCalledWith(
      2,
      'mark_billing_webhook_processed',
      { target_event_id: 'evt_1' },
    );
  });
});
