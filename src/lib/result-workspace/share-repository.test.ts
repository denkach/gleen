import { describe, expect, it, vi } from 'vitest';

import {
  createSupabaseResultShareRepository,
  loadPublicResultProjection,
  type SupabaseResultShareClient,
} from './share-repository';
import { createResultShareToken, resultShareTokenSchema } from './share';

type Result = { data: unknown; error: { code?: string } | null };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

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
      rpc: vi.fn(),
    } as unknown as SupabaseResultShareClient,
  };
}

function rpcClient(
  handler: (
    functionName: string,
    arguments_: Readonly<Record<string, unknown>>,
  ) => PromiseLike<Result>,
) {
  const calls: Array<{
    functionName: string;
    arguments_: Readonly<Record<string, unknown>>;
  }> = [];
  return {
    calls,
    client: {
      from: vi.fn(),
      rpc: vi.fn((functionName, arguments_) => {
        calls.push({ functionName, arguments_ });
        return handler(functionName, arguments_);
      }),
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
  it('converges concurrent first creates despite reordered RPC responses', async () => {
    const first = deferred<Result>();
    const second = deferred<Result>();
    const candidates = ['A'.repeat(43), 'B'.repeat(43)];
    let candidateIndex = 0;
    const { client, calls } = rpcClient((_, arguments_) =>
      arguments_.p_token === candidates[0] ? first.promise : second.promise,
    );
    const repository = createSupabaseResultShareRepository(
      client,
      () => candidates[candidateIndex++]!,
    );

    const firstCreate = repository.createOwned({ userId, analysisId });
    const secondCreate = repository.createOwned({ userId, analysisId });
    second.resolve({ data: token, error: null });
    first.resolve({ data: token, error: null });

    await expect(Promise.all([firstCreate, secondCreate])).resolves.toEqual([
      token,
      token,
    ]);
    expect(calls).toEqual([
      {
        functionName: 'create_owned_result_share',
        arguments_: { p_analysis_id: analysisId, p_token: 'A'.repeat(43) },
      },
      {
        functionName: 'create_owned_result_share',
        arguments_: { p_analysis_id: analysisId, p_token: 'B'.repeat(43) },
      },
    ]);
  });

  it('converges concurrent revoked-token rotations on the database winner', async () => {
    const first = deferred<Result>();
    const second = deferred<Result>();
    const winner = 'C'.repeat(43);
    const candidates = ['B'.repeat(43), winner];
    const { client } = rpcClient((_, arguments_) =>
      arguments_.p_token === 'B'.repeat(43) ? first.promise : second.promise,
    );
    const repository = createSupabaseResultShareRepository(client, () =>
      candidates.shift()!,
    );

    const firstRotation = repository.createOwned({ userId, analysisId });
    const secondRotation = repository.createOwned({ userId, analysisId });
    second.resolve({ data: winner, error: null });
    first.resolve({ data: winner, error: null });

    await expect(Promise.all([firstRotation, secondRotation])).resolves.toEqual(
      [winner, winner],
    );
  });

  it('returns neutral failures when the RPC rejects foreign ownership', async () => {
    const { client, calls } = rpcClient(() =>
      Promise.resolve({ data: null, error: { code: 'P0002' } }),
    );
    const repository = createSupabaseResultShareRepository(client);

    await expect(
      repository.createOwned({ userId, analysisId }),
    ).resolves.toBeNull();
    await expect(repository.revokeOwned({ userId, analysisId })).resolves.toBe(
      false,
    );
    expect(calls).toEqual([
      {
        functionName: 'create_owned_result_share',
        arguments_: {
          p_analysis_id: analysisId,
          p_token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
        },
      },
      {
        functionName: 'revoke_owned_result_share',
        arguments_: { p_analysis_id: analysisId },
      },
    ]);
  });

  it('treats double revoke as saved and delegates ordering to one atomic RPC', async () => {
    const first = deferred<Result>();
    const second = deferred<Result>();
    let call = 0;
    const { client, calls } = rpcClient(() =>
      call++ === 0 ? first.promise : second.promise,
    );
    const repository = createSupabaseResultShareRepository(client);

    const firstRevoke = repository.revokeOwned({ userId, analysisId });
    const secondRevoke = repository.revokeOwned({ userId, analysisId });
    second.resolve({ data: true, error: null });
    first.resolve({ data: true, error: null });

    await expect(Promise.all([firstRevoke, secondRevoke])).resolves.toEqual([
      true,
      true,
    ]);
    expect(calls).toEqual([
      {
        functionName: 'revoke_owned_result_share',
        arguments_: { p_analysis_id: analysisId },
      },
      {
        functionName: 'revoke_owned_result_share',
        arguments_: { p_analysis_id: analysisId },
      },
    ]);
  });

  it('keeps create and revoke as single atomic RPCs under reordered responses', async () => {
    const create = deferred<Result>();
    const revoke = deferred<Result>();
    const { client, calls } = rpcClient((functionName) =>
      functionName === 'create_owned_result_share'
        ? create.promise
        : revoke.promise,
    );
    const repository = createSupabaseResultShareRepository(client, () => token);

    const createResult = repository.createOwned({ userId, analysisId });
    const revokeResult = repository.revokeOwned({ userId, analysisId });
    revoke.resolve({ data: true, error: null });
    create.resolve({ data: token, error: null });

    await expect(Promise.all([createResult, revokeResult])).resolves.toEqual([
      token,
      true,
    ]);
    expect(calls).toEqual([
      {
        functionName: 'create_owned_result_share',
        arguments_: { p_analysis_id: analysisId, p_token: token },
      },
      {
        functionName: 'revoke_owned_result_share',
        arguments_: { p_analysis_id: analysisId },
      },
    ]);
  });

  it('strictly rejects malformed scalar RPC output', async () => {
    const { client } = rpcClient((functionName) =>
      Promise.resolve({
        data:
          functionName === 'create_owned_result_share' ? `${token}=` : 'true',
        error: null,
      }),
    );
    const repository = createSupabaseResultShareRepository(client);

    await expect(
      repository.createOwned({ userId, analysisId }),
    ).resolves.toBeNull();
    await expect(repository.revokeOwned({ userId, analysisId })).resolves.toBe(
      false,
    );
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
