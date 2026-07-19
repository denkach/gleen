import { describe, expect, it, vi } from 'vitest';

import {
  createSupabaseResultShareRepository,
  loadPublicResultProjection,
  type SupabaseResultShareClient,
} from './share-repository';
import { createResultShareToken, resultShareTokenSchema } from './share';

type Result = { data: unknown; error: { code?: string } | null };

function fakeClient(results: Result[]) {
  const calls: Array<{ table: string; operation: string; args: unknown[] }> =
    [];
  let resultIndex = 0;

  class Query implements PromiseLike<Result> {
    constructor(private readonly table: string) {}
    private record(operation: string, ...args: unknown[]) {
      calls.push({ table: this.table, operation, args });
      return this;
    }
    select(columns?: string) {
      return this.record('select', columns);
    }
    insert(values: Record<string, unknown>) {
      return this.record('insert', values);
    }
    update(values: Record<string, unknown>) {
      return this.record('update', values);
    }
    eq(column: string, value: unknown) {
      return this.record('eq', column, value);
    }
    is(column: string, value: unknown) {
      return this.record('is', column, value);
    }
    order(column: string, options: { ascending: boolean }) {
      return this.record('order', column, options);
    }
    limit(count: number) {
      return this.record('limit', count);
    }
    maybeSingle(): PromiseLike<Result> {
      this.record('maybeSingle');
      return Promise.resolve(results[resultIndex++]!);
    }
    then<TResult1 = Result, TResult2 = never>(
      onfulfilled?:
        ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?:
        ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      this.record('then');
      return Promise.resolve(results[resultIndex++]!).then(
        onfulfilled,
        onrejected,
      );
    }
  }

  return {
    calls,
    client: {
      from: vi.fn((table: string) => new Query(table)),
    } as unknown as SupabaseResultShareClient,
  };
}

const userId = '11111111-1111-4111-8111-111111111111';
const analysisId = '22222222-2222-4222-8222-222222222222';
const token = 'A'.repeat(43);

describe('result share tokens', () => {
  it('creates exactly 32 random bytes encoded as 43 URL-safe characters', () => {
    const generated = Array.from({ length: 20 }, () =>
      createResultShareToken(),
    );
    expect(new Set(generated)).toHaveLength(generated.length);
    for (const candidate of generated) {
      expect(candidate).toHaveLength(43);
      expect(candidate).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(resultShareTokenSchema.parse(candidate)).toBe(candidate);
    }
  });

  it('rejects malformed or padded bearer tokens', () => {
    for (const candidate of [
      '',
      'A'.repeat(42),
      'A'.repeat(44),
      `${'A'.repeat(42)}=`,
    ]) {
      expect(resultShareTokenSchema.safeParse(candidate).success).toBe(false);
    }
  });
});

describe('owner result share repository', () => {
  it('reuses the current active token after explicit ownership lookup', async () => {
    const { client, calls } = fakeClient([
      { data: { id: analysisId }, error: null },
      { data: { token, revoked_at: null }, error: null },
    ]);

    await expect(
      createSupabaseResultShareRepository(client).createOwned({
        userId,
        analysisId,
      }),
    ).resolves.toBe(token);

    expect(calls).toContainEqual({
      table: 'analysis_intakes',
      operation: 'eq',
      args: ['user_id', userId],
    });
    expect(calls).toContainEqual({
      table: 'analysis_shares',
      operation: 'eq',
      args: ['analysis_id', analysisId],
    });
    expect(calls).toContainEqual({
      table: 'analysis_shares',
      operation: 'eq',
      args: ['user_id', userId],
    });
    expect(calls.some(({ operation }) => operation === 'insert')).toBe(false);
  });

  it('rotates a revoked row to a new active token for the same owner', async () => {
    const { client, calls } = fakeClient([
      { data: { id: analysisId }, error: null },
      { data: { token, revoked_at: '2026-07-18T10:00:00.000Z' }, error: null },
      { data: { token: 'B'.repeat(43) }, error: null },
    ]);

    const repository = createSupabaseResultShareRepository(client, () =>
      'B'.repeat(43),
    );
    await expect(repository.createOwned({ userId, analysisId })).resolves.toBe(
      'B'.repeat(43),
    );
    expect(calls).toContainEqual({
      table: 'analysis_shares',
      operation: 'update',
      args: [{ token: 'B'.repeat(43), revoked_at: null }],
    });
    expect(calls).toContainEqual({
      table: 'analysis_shares',
      operation: 'eq',
      args: ['token', token],
    });
  });

  it('does not create or revoke for a foreign analysis', async () => {
    const create = fakeClient([{ data: null, error: null }]);
    await expect(
      createSupabaseResultShareRepository(create.client).createOwned({
        userId,
        analysisId,
      }),
    ).resolves.toBeNull();
    expect(create.calls.some(({ table }) => table === 'analysis_shares')).toBe(
      false,
    );

    const revoke = fakeClient([{ data: null, error: null }]);
    await expect(
      createSupabaseResultShareRepository(revoke.client).revokeOwned({
        userId,
        analysisId,
      }),
    ).resolves.toBe(false);
    expect(revoke.calls.some(({ table }) => table === 'analysis_shares')).toBe(
      false,
    );
  });

  it('revokes only the active row matching both owner identifiers', async () => {
    const { client, calls } = fakeClient([
      { data: { id: analysisId }, error: null },
      { data: { token }, error: null },
    ]);
    await expect(
      createSupabaseResultShareRepository(client).revokeOwned({
        userId,
        analysisId,
      }),
    ).resolves.toBe(true);
    expect(calls).toContainEqual({
      table: 'analysis_shares',
      operation: 'is',
      args: ['revoked_at', null],
    });
    expect(calls).toContainEqual({
      table: 'analysis_shares',
      operation: 'eq',
      args: ['user_id', userId],
    });
  });
});

describe('anonymous public result projection', () => {
  const sourceRow = {
    youtube_video_id: 'dQw4w9WgXcQ',
    title: 'Public title',
    channel_title: 'Public channel',
    duration_seconds: 60,
    thumbnail_url: 'https://example.com/thumb.jpg',
    transcript_language: 'en',
  };
  const artifacts = [
    {
      kind: 'summary',
      content: {
        schemaVersion: 2,
        title: 'Summary',
        overview: 'Safe result outcome',
        keyPoints: [{ text: 'Safe point', sourceOffsetMs: 0 }],
      },
      updated_at: '2026-07-18T10:00:00.000Z',
    },
    {
      kind: 'transcript',
      content: {
        schemaVersion: 1,
        language: 'en',
        segments: [{ text: 'Safe transcript.', offsetMs: 0, durationMs: 1000 }],
      },
      updated_at: '2026-07-18T10:00:00.000Z',
    },
  ];

  it('validates before lookup and treats malformed or revoked tokens alike', async () => {
    const malformed = fakeClient([]);
    await expect(
      loadPublicResultProjection(malformed.client, 'bad'),
    ).resolves.toBeNull();
    expect(malformed.calls).toEqual([]);

    const revoked = fakeClient([{ data: null, error: null }]);
    await expect(
      loadPublicResultProjection(revoked.client, token),
    ).resolves.toBeNull();
    expect(revoked.calls).toContainEqual({
      table: 'analysis_shares',
      operation: 'is',
      args: ['revoked_at', null],
    });
  });

  it('uses exact token/owner filters and returns only safe ready content', async () => {
    const { client, calls } = fakeClient([
      { data: { analysis_id: analysisId, user_id: userId }, error: null },
      { data: sourceRow, error: null },
      { data: artifacts, error: null },
    ]);
    const projection = await loadPublicResultProjection(client, token);

    expect(projection).toEqual(
      expect.objectContaining({
        source: expect.objectContaining({
          intakeId: 'public-result',
          title: 'Public title',
          channelTitle: 'Public channel',
        }),
        userState: null,
      }),
    );
    expect(projection?.tabs.summary.status).toBe('ready');
    expect(projection?.tabs.transcript.status).toBe('ready');
    expect(JSON.stringify(projection)).not.toMatch(
      /user_id|analysis_id|email|profile|favorite|playbackPosition|reviews|draft/i,
    );
    expect(calls).toContainEqual({
      table: 'analysis_shares',
      operation: 'eq',
      args: ['token', token],
    });
    expect(calls).toContainEqual({
      table: 'analysis_intakes',
      operation: 'eq',
      args: ['user_id', userId],
    });
    expect(calls).toContainEqual({
      table: 'analysis_artifacts',
      operation: 'eq',
      args: ['status', 'ready'],
    });
    const publicSelects = calls.filter(
      ({ operation }) => operation === 'select',
    );
    expect(publicSelects.every(({ args }) => args[0] !== '*')).toBe(true);
  });

  it('returns the same neutral null for a foreign/missing intake or query error', async () => {
    const foreign = fakeClient([
      { data: { analysis_id: analysisId, user_id: userId }, error: null },
      { data: null, error: null },
    ]);
    await expect(
      loadPublicResultProjection(foreign.client, token),
    ).resolves.toBeNull();

    const failed = fakeClient([{ data: null, error: { code: 'network' } }]);
    await expect(
      loadPublicResultProjection(failed.client, token),
    ).resolves.toBeNull();
  });
});
