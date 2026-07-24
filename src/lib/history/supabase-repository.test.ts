import { afterEach, describe, expect, test, vi } from 'vitest';

import { decodeHistoryCursor, type HistoryQuery } from '@/lib/history/query';

import { createSupabaseHistoryRepository } from './supabase-repository';

type RecordedCall = readonly [string, ...unknown[]];
type SupabaseResult = Readonly<{ data: unknown; error: unknown }>;

const defaults: HistoryQuery = {
  q: '',
  status: [],
  language: null,
  source: null,
  date: 'all',
  favorite: false,
  sort: 'newest',
  cursor: null,
};

function query(overrides: Partial<HistoryQuery> = {}): HistoryQuery {
  return { ...defaults, ...overrides };
}

function databaseRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    user_id: 'owner-1',
    analysis_id: 'analysis-1',
    youtube_video_id: 'video-1',
    canonical_url: 'https://www.youtube.com/watch?v=video-1',
    title: 'Systems thinking',
    channel_title: 'Knowledge Channel',
    thumbnail_url: 'https://i.ytimg.com/vi/video-1/hqdefault.jpg',
    transcript_language: 'en',
    output_locale: 'en',
    summary_preset: 'detailed',
    duration_seconds: 900,
    selected_artifacts: ['summary', 'flashcards'],
    ready_artifacts: ['summary'],
    job_status: 'complete',
    analyzed_at: '2026-07-24T14:35:00.000Z',
    job_updated_at: '2026-07-24T14:36:00.000Z',
    last_opened_at: '2026-07-24T16:05:00.000Z',
    favorite: false,
    intake_revision: '2026-07-24T14:35:00.000Z',
    history_search: null,
    title_sort: 'systems thinking',
    ...overrides,
  };
}

function createRecordingClient(results: readonly SupabaseResult[]) {
  const recorded: RecordedCall[] = [];
  const pending = [...results];

  function from(table: string) {
    recorded.push(['from', table]);
    const result = pending.shift() ?? { data: null, error: null };
    const builder = {
      select(columns = '*') {
        recorded.push(['select', columns]);
        return builder;
      },
      delete() {
        recorded.push(['delete']);
        return builder;
      },
      eq(column: string, value: unknown) {
        recorded.push(['eq', column, value]);
        return builder;
      },
      in(column: string, values: readonly unknown[]) {
        recorded.push(['in', column, values]);
        return builder;
      },
      gte(column: string, value: unknown) {
        recorded.push(['gte', column, value]);
        return builder;
      },
      gt(column: string, value: unknown) {
        recorded.push(['gt', column, value]);
        return builder;
      },
      lt(column: string, value: unknown) {
        recorded.push(['lt', column, value]);
        return builder;
      },
      is(column: string, value: unknown) {
        recorded.push(['is', column, value]);
        return builder;
      },
      textSearch(
        column: string,
        value: string,
        options: Readonly<{ config: string; type: string }>,
      ) {
        recorded.push(['textSearch', column, value, options]);
        return builder;
      },
      order(
        column: string,
        options: Readonly<{ ascending: boolean; nullsFirst?: boolean }>,
      ) {
        recorded.push(['order', column, options]);
        return builder;
      },
      or(expression: string) {
        recorded.push(['or', expression]);
        return builder;
      },
      limit(count: number) {
        recorded.push(['limit', count]);
        return builder;
      },
      maybeSingle() {
        recorded.push(['maybeSingle']);
        return Promise.resolve(result);
      },
      then<TResult1 = SupabaseResult, TResult2 = never>(
        onfulfilled?:
          ((value: SupabaseResult) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?:
          ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        return Promise.resolve(result).then(onfulfilled, onrejected);
      },
    };
    return builder;
  }

  return { client: { from }, recorded };
}

function ownerCallCount(recorded: readonly RecordedCall[]): number {
  return recorded.filter(
    (call) =>
      call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'owner-1',
  ).length;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Supabase History repository', () => {
  test('searches owned history with websearch and a clamped lookahead limit', async () => {
    const { client, recorded } = createRecordingClient([
      { data: [], error: null },
    ]);
    const repository = createSupabaseHistoryRepository(client);

    await repository.listOwned('owner-1', query({ q: 'systems' }), 20);

    expect(recorded).toContainEqual(['from', 'analysis_history']);
    expect(recorded).toContainEqual(['select', '*']);
    expect(recorded).toContainEqual(['eq', 'user_id', 'owner-1']);
    expect(recorded).toContainEqual([
      'textSearch',
      'history_search',
      'systems',
      { config: 'simple', type: 'websearch' },
    ]);
    expect(recorded).toContainEqual(['limit', 21]);
    expect(ownerCallCount(recorded)).toBe(1);
  });

  test.each([
    [['ready'], ['complete', 'partial']],
    [['processing'], ['queued', 'running']],
    [['failed'], ['failed']],
    [
      ['ready', 'processing', 'failed'],
      ['complete', 'partial', 'queued', 'running', 'failed'],
    ],
  ] as const)(
    'combines visual status filters %j into one database status set',
    async (status, expected) => {
      const { client, recorded } = createRecordingClient([
        { data: [], error: null },
      ]);

      await createSupabaseHistoryRepository(client).listOwned(
        'owner-1',
        query({ status }),
        20,
      );

      expect(recorded).toContainEqual(['in', 'job_status', expected]);
      expect(
        recorded.filter((call) => call[0] === 'in' && call[1] === 'job_status'),
      ).toHaveLength(1);
      expect(ownerCallCount(recorded)).toBe(1);
    },
  );

  test('applies favorite, source, language, and date predicates to the owned query', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T12:00:00.000Z'));
    const { client, recorded } = createRecordingClient([
      { data: [], error: null },
    ]);

    await createSupabaseHistoryRepository(client).listOwned(
      'owner-1',
      query({
        favorite: true,
        source: 'https://www.youtube.com/watch?v=video-1',
        language: 'en',
        date: '7d',
      }),
      20,
    );

    expect(recorded).toContainEqual(['eq', 'favorite', true]);
    expect(recorded).toContainEqual([
      'eq',
      'canonical_url',
      'https://www.youtube.com/watch?v=video-1',
    ]);
    expect(recorded).toContainEqual(['eq', 'transcript_language', 'en']);
    expect(recorded).toContainEqual([
      'gte',
      'analyzed_at',
      '2026-07-17T12:00:00.000Z',
    ]);
    expect(ownerCallCount(recorded)).toBe(1);
  });

  test.each([
    [
      'newest',
      [
        ['order', 'analyzed_at', { ascending: false }],
        ['order', 'analysis_id', { ascending: false }],
      ],
    ],
    [
      'oldest',
      [
        ['order', 'analyzed_at', { ascending: true }],
        ['order', 'analysis_id', { ascending: true }],
      ],
    ],
    [
      'recent',
      [
        ['order', 'last_opened_at', { ascending: false, nullsFirst: false }],
        ['order', 'analysis_id', { ascending: false }],
      ],
    ],
    [
      'title-asc',
      [
        ['order', 'title_sort', { ascending: true }],
        ['order', 'analysis_id', { ascending: true }],
      ],
    ],
    [
      'title-desc',
      [
        ['order', 'title_sort', { ascending: false }],
        ['order', 'analysis_id', { ascending: false }],
      ],
    ],
  ] as const)(
    'orders %s with a deterministic analysis id',
    async (sort, calls) => {
      const { client, recorded } = createRecordingClient([
        { data: [], error: null },
      ]);

      await createSupabaseHistoryRepository(client).listOwned(
        'owner-1',
        query({ sort }),
        20,
      );

      for (const call of calls) expect(recorded).toContainEqual(call);
      expect(ownerCallCount(recorded)).toBe(1);
    },
  );

  test.each([
    [
      'newest',
      'analyzed_at.lt."2026-07-24T14:35:00.000Z",and(analyzed_at.eq."2026-07-24T14:35:00.000Z",analysis_id.lt."analysis-1")',
    ],
    [
      'oldest',
      'analyzed_at.gt."2026-07-24T14:35:00.000Z",and(analyzed_at.eq."2026-07-24T14:35:00.000Z",analysis_id.gt."analysis-1")',
    ],
    [
      'title-asc',
      'title_sort.gt."systems thinking",and(title_sort.eq."systems thinking",analysis_id.gt."analysis-1")',
    ],
    [
      'title-desc',
      'title_sort.lt."systems thinking",and(title_sort.eq."systems thinking",analysis_id.lt."analysis-1")',
    ],
  ] as const)(
    'applies a strict %s keyset predicate',
    async (sort, expected) => {
      const { client, recorded } = createRecordingClient([
        { data: [], error: null },
      ]);
      const value = sort.startsWith('title')
        ? 'systems thinking'
        : '2026-07-24T14:35:00.000Z';

      await createSupabaseHistoryRepository(client).listOwned(
        'owner-1',
        query({ sort, cursor: { sort, value, id: 'analysis-1' } }),
        20,
      );

      expect(recorded).toContainEqual(['or', expected]);
      expect(ownerCallCount(recorded)).toBe(1);
    },
  );

  test('includes the null bucket after a non-null recent cursor', async () => {
    const { client, recorded } = createRecordingClient([
      { data: [], error: null },
    ]);

    await createSupabaseHistoryRepository(client).listOwned(
      'owner-1',
      query({
        sort: 'recent',
        cursor: {
          sort: 'recent',
          value: '2026-07-24T16:05:00.000Z',
          id: 'analysis-1',
        },
      }),
      20,
    );

    expect(recorded).toContainEqual([
      'or',
      'last_opened_at.lt."2026-07-24T16:05:00.000Z",and(last_opened_at.eq."2026-07-24T16:05:00.000Z",analysis_id.lt."analysis-1"),last_opened_at.is.null',
    ]);
    expect(ownerCallCount(recorded)).toBe(1);
  });

  test('continues deterministically within the null recent bucket', async () => {
    const { client, recorded } = createRecordingClient([
      { data: [], error: null },
    ]);

    await createSupabaseHistoryRepository(client).listOwned(
      'owner-1',
      query({
        sort: 'recent',
        cursor: { sort: 'recent', value: '', id: 'analysis-20' },
      }),
      20,
    );

    expect(recorded).toContainEqual(['is', 'last_opened_at', null]);
    expect(recorded).toContainEqual(['lt', 'analysis_id', 'analysis-20']);
    expect(ownerCallCount(recorded)).toBe(1);
  });

  test('rejects a cursor for another active sort', async () => {
    const { client, recorded } = createRecordingClient([
      { data: [], error: null },
    ]);

    await createSupabaseHistoryRepository(client).listOwned(
      'owner-1',
      query({
        sort: 'newest',
        cursor: {
          sort: 'oldest',
          value: '2026-07-24T14:35:00.000Z',
          id: 'analysis-1',
        },
      }),
      20,
    );

    expect(recorded.some((call) => call[0] === 'or')).toBe(false);
    expect(ownerCallCount(recorded)).toBe(1);
  });

  test('returns one page and a cursor from the last visible row when lookahead exists', async () => {
    const rows = Array.from({ length: 21 }, (_, index) =>
      databaseRow({
        analysis_id: `analysis-${index + 1}`,
        analyzed_at: `2026-07-${String(24 - index).padStart(2, '0')}T14:35:00.000Z`,
      }),
    );
    const { client } = createRecordingClient([{ data: rows, error: null }]);

    const page = await createSupabaseHistoryRepository(client).listOwned(
      'owner-1',
      query(),
      20,
    );

    expect(page.items).toHaveLength(20);
    expect(page.items.at(-1)?.id).toBe('analysis-20');
    expect(decodeHistoryCursor(page.nextCursor ?? '')).toEqual({
      sort: 'newest',
      value: rows[19].analyzed_at,
      id: 'analysis-20',
    });
  });

  test('returns no cursor when the result does not exceed the page size', async () => {
    const rows = Array.from({ length: 20 }, (_, index) =>
      databaseRow({ analysis_id: `analysis-${index + 1}` }),
    );
    const { client } = createRecordingClient([{ data: rows, error: null }]);

    const page = await createSupabaseHistoryRepository(client).listOwned(
      'owner-1',
      query(),
      20,
    );

    expect(page.items).toHaveLength(20);
    expect(page.nextCursor).toBeNull();
  });

  test.each([
    [-10, 2],
    [200, 51],
  ])(
    'clamps requested page size %i before lookahead',
    async (limit, expected) => {
      const { client, recorded } = createRecordingClient([
        { data: [], error: null },
      ]);

      await createSupabaseHistoryRepository(client).listOwned(
        'owner-1',
        query(),
        limit,
      );

      expect(recorded).toContainEqual(['limit', expected]);
      expect(ownerCallCount(recorded)).toBe(1);
    },
  );

  test('returns distinct non-empty owner-scoped language and source facets', async () => {
    const { client, recorded } = createRecordingClient([
      {
        data: [
          { transcript_language: 'en' },
          { transcript_language: '' },
          { transcript_language: 'uk' },
          { transcript_language: 'en' },
          { transcript_language: null },
        ],
        error: null,
      },
      {
        data: [
          { canonical_url: 'https://youtube.com/watch?v=1' },
          { canonical_url: '' },
          { canonical_url: 'https://youtube.com/watch?v=1' },
          { canonical_url: 'https://youtube.com/watch?v=2' },
        ],
        error: null,
      },
    ]);

    await expect(
      createSupabaseHistoryRepository(client).listFacets('owner-1'),
    ).resolves.toEqual({
      languages: ['en', 'uk'],
      sources: [
        'https://youtube.com/watch?v=1',
        'https://youtube.com/watch?v=2',
      ],
    });

    expect(recorded).toContainEqual(['select', 'transcript_language']);
    expect(recorded).toContainEqual(['select', 'canonical_url']);
    expect(ownerCallCount(recorded)).toBe(2);
  });

  test('verifies duplicate ownership and reusable status before mapping it', async () => {
    const { client, recorded } = createRecordingClient([
      { data: databaseRow(), error: null },
    ]);

    await expect(
      createSupabaseHistoryRepository(client).findOwnedReusableDuplicate(
        'owner-1',
        'analysis-1',
      ),
    ).resolves.toMatchObject({
      id: 'analysis-1',
      summaryPresetLabel: 'Detailed',
    });

    expect(recorded).toContainEqual(['from', 'analysis_history']);
    expect(recorded).toContainEqual(['eq', 'user_id', 'owner-1']);
    expect(recorded).toContainEqual(['eq', 'analysis_id', 'analysis-1']);
    expect(recorded).toContainEqual([
      'in',
      'job_status',
      ['complete', 'partial'],
    ]);
    expect(ownerCallCount(recorded)).toBe(1);
  });

  test('deletes an intake only by both analysis id and owner', async () => {
    const { client, recorded } = createRecordingClient([
      { data: { id: 'analysis-1' }, error: null },
    ]);

    await expect(
      createSupabaseHistoryRepository(client).deleteOwned(
        'owner-1',
        'analysis-1',
      ),
    ).resolves.toBe(true);

    expect(recorded).toContainEqual(['from', 'analysis_intakes']);
    expect(recorded).toContainEqual(['delete']);
    expect(recorded).toContainEqual(['eq', 'id', 'analysis-1']);
    expect(recorded).toContainEqual(['eq', 'user_id', 'owner-1']);
    expect(ownerCallCount(recorded)).toBe(1);
  });
});
