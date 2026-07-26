import { z } from 'zod';

import {
  artifactKindSchema,
  jobStatusSchema,
} from '@/lib/analysis-pipeline/domain';
import {
  encodeHistoryCursor,
  type HistoryCursor,
  type HistoryQuery,
  type HistorySort,
} from '@/lib/history/query';
import { toHistoryItem } from '@/lib/history/presentation';
import type {
  HistoryDatabaseRow,
  HistoryFacets,
  HistoryPage,
  HistoryRepository,
} from '@/lib/history/repository';

type SupabaseResult = Readonly<{
  data: unknown;
  error: unknown;
}>;

type QueryBuilder = PromiseLike<SupabaseResult> &
  Readonly<{
    select(columns?: string): QueryBuilder;
    delete(): QueryBuilder;
    eq(column: string, value: unknown): QueryBuilder;
    in(column: string, values: readonly unknown[]): QueryBuilder;
    gte(column: string, value: unknown): QueryBuilder;
    gt(column: string, value: unknown): QueryBuilder;
    lt(column: string, value: unknown): QueryBuilder;
    is(column: string, value: unknown): QueryBuilder;
    textSearch(
      column: string,
      value: string,
      options: Readonly<{ config: 'simple'; type: 'websearch' }>,
    ): QueryBuilder;
    order(
      column: string,
      options: Readonly<{ ascending: boolean; nullsFirst?: boolean }>,
    ): QueryBuilder;
    or(expression: string): QueryBuilder;
    limit(count: number): QueryBuilder;
    maybeSingle(): PromiseLike<SupabaseResult>;
  }>;

export type SupabaseHistoryClient = Readonly<{
  from(table: 'analysis_history' | 'analysis_intakes'): QueryBuilder;
}>;

const historyViewRowSchema = z.object({
  analysis_id: z.string().min(1),
  youtube_video_id: z.string().min(1),
  canonical_url: z.string().min(1),
  title: z.string(),
  channel_title: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  transcript_language: z.string().nullable(),
  output_locale: z.string(),
  summary_preset: z.enum(['balanced', 'detailed']).nullable(),
  duration_seconds: z.number().int().nonnegative().nullable(),
  selected_artifacts: z.array(artifactKindSchema),
  ready_artifacts: z.array(artifactKindSchema),
  job_status: jobStatusSchema,
  analyzed_at: z.string(),
  last_opened_at: z.string().nullable(),
  favorite: z.boolean(),
  intake_revision: z.string(),
  title_sort: z.string(),
});

type HistoryViewRow = z.infer<typeof historyViewRowSchema>;

const statusGroups = {
  ready: ['complete', 'partial'],
  processing: ['queued', 'running'],
  failed: ['failed'],
} as const;

const databaseStatusOrder = [
  'complete',
  'partial',
  'queued',
  'running',
  'failed',
] as const;

const sortDefinitions = {
  newest: {
    column: 'analyzed_at',
    ascending: false,
  },
  oldest: {
    column: 'analyzed_at',
    ascending: true,
  },
  recent: {
    column: 'last_opened_at',
    ascending: false,
    nullsFirst: false,
  },
  'title-asc': {
    column: 'title_sort',
    ascending: true,
  },
  'title-desc': {
    column: 'title_sort',
    ascending: false,
  },
} as const satisfies Record<
  HistorySort,
  Readonly<{
    column: string;
    ascending: boolean;
    nullsFirst?: boolean;
  }>
>;

export class HistoryRepositoryError extends Error {
  readonly code = 'history_persistence_failure' as const;

  constructor() {
    super('Unable to access analysis history');
    this.name = 'HistoryRepositoryError';
  }
}

function unwrapRows(result: SupabaseResult): unknown[] {
  if (result.error || !Array.isArray(result.data)) {
    throw new HistoryRepositoryError();
  }
  return result.data;
}

function parseHistoryViewRow(input: unknown): HistoryViewRow {
  const parsed = historyViewRowSchema.safeParse(input);
  if (!parsed.success) throw new HistoryRepositoryError();
  return parsed.data;
}

function toDatabaseRow(row: HistoryViewRow): HistoryDatabaseRow {
  return {
    id: row.analysis_id,
    youtubeVideoId: row.youtube_video_id,
    canonicalUrl: row.canonical_url,
    title: row.title,
    channelTitle: row.channel_title,
    thumbnailUrl: row.thumbnail_url,
    transcriptLanguage: row.transcript_language,
    outputLocale: row.output_locale,
    summaryPreset: row.summary_preset,
    durationSeconds: row.duration_seconds,
    selectedArtifacts: row.selected_artifacts,
    readyArtifacts: row.ready_artifacts,
    status: row.job_status,
    analyzedAt: row.analyzed_at,
    lastOpenedAt: row.last_opened_at,
    favorite: row.favorite,
    titleRevision: row.intake_revision,
  };
}

function pageSize(value: number): number {
  return Math.min(50, Math.max(1, Math.trunc(value) || 1));
}

function databaseStatuses(query: HistoryQuery): readonly string[] {
  const selected = new Set(
    query.status.flatMap((status) => statusGroups[status]),
  );
  return databaseStatusOrder.filter((status) => selected.has(status));
}

function dateThreshold(
  date: HistoryQuery['date'],
  now = new Date(),
): string | null {
  if (date === 'all') return null;

  const threshold = new Date(now);
  if (date === 'today') {
    threshold.setUTCHours(0, 0, 0, 0);
  } else if (date === '7d') {
    threshold.setUTCDate(threshold.getUTCDate() - 7);
  } else if (date === '30d') {
    threshold.setUTCDate(threshold.getUTCDate() - 30);
  } else {
    threshold.setUTCMonth(0, 1);
    threshold.setUTCHours(0, 0, 0, 0);
  }
  return threshold.toISOString();
}

function quoteFilterValue(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function applyCursor(builder: QueryBuilder, query: HistoryQuery): QueryBuilder {
  const cursor = query.cursor;
  if (!cursor || cursor.sort !== query.sort) return builder;

  if (query.sort === 'recent' && cursor.value === '') {
    return builder.is('last_opened_at', null).lt('analysis_id', cursor.id);
  }

  const definition = sortDefinitions[query.sort];
  const comparison = definition.ascending ? 'gt' : 'lt';
  const value = quoteFilterValue(cursor.value);
  const id = quoteFilterValue(cursor.id);
  const equalTie = `and(${definition.column}.eq.${value},analysis_id.${comparison}.${id})`;
  const clauses = [`${definition.column}.${comparison}.${value}`, equalTie];

  if (query.sort === 'recent') {
    clauses.push('last_opened_at.is.null');
  }

  return builder.or(clauses.join(','));
}

function cursorForRow(sort: HistorySort, row: HistoryViewRow): HistoryCursor {
  let value: string;
  if (sort === 'recent') value = row.last_opened_at ?? '';
  else if (sort === 'title-asc' || sort === 'title-desc') {
    value = row.title_sort;
  } else {
    value = row.analyzed_at;
  }

  return { sort, value, id: row.analysis_id };
}

function distinctNonEmpty(
  rows: readonly unknown[],
  column: 'transcript_language' | 'canonical_url',
): string[] {
  const values = rows.flatMap((input) => {
    const parsed = z
      .object({ [column]: z.string().nullable() })
      .safeParse(input);
    const value = parsed.success ? parsed.data[column]?.trim() : null;
    return value ? [value] : [];
  });
  return [...new Set(values)];
}

export function createSupabaseHistoryRepository(
  client: SupabaseHistoryClient,
): HistoryRepository {
  return {
    async listOwned(userId, query, requestedLimit): Promise<HistoryPage> {
      const limit = pageSize(requestedLimit);
      let builder = client
        .from('analysis_history')
        .select('*')
        .eq('user_id', userId);

      if (query.q) {
        builder = builder.textSearch('history_search', query.q, {
          config: 'simple',
          type: 'websearch',
        });
      }

      const statuses = databaseStatuses(query);
      if (statuses.length > 0) {
        builder = builder.in('job_status', statuses);
      }
      if (query.favorite) builder = builder.eq('favorite', true);
      if (query.source) builder = builder.eq('canonical_url', query.source);
      if (query.language) {
        builder = builder.eq('transcript_language', query.language);
      }

      const threshold = dateThreshold(query.date);
      if (threshold) builder = builder.gte('analyzed_at', threshold);

      builder = applyCursor(builder, query);
      const definition = sortDefinitions[query.sort];
      builder = builder.order(definition.column, {
        ascending: definition.ascending,
        ...('nullsFirst' in definition
          ? { nullsFirst: definition.nullsFirst }
          : {}),
      });
      builder = builder
        .order('analysis_id', { ascending: definition.ascending })
        .limit(limit + 1);

      const rows = unwrapRows(await builder).map(parseHistoryViewRow);
      const visibleRows = rows.slice(0, limit);
      const nextCursor =
        rows.length > limit && visibleRows.length > 0
          ? encodeHistoryCursor(
              cursorForRow(query.sort, visibleRows[visibleRows.length - 1]),
            )
          : null;

      return {
        items: visibleRows.map((row) => toHistoryItem(toDatabaseRow(row))),
        nextCursor,
      };
    },

    async listFacets(userId): Promise<HistoryFacets> {
      const languageResult = await client
        .from('analysis_history')
        .select('transcript_language')
        .eq('user_id', userId);
      const sourceResult = await client
        .from('analysis_history')
        .select('canonical_url')
        .eq('user_id', userId);

      return {
        languages: distinctNonEmpty(
          unwrapRows(languageResult),
          'transcript_language',
        ),
        sources: distinctNonEmpty(unwrapRows(sourceResult), 'canonical_url'),
      };
    },

    async findOwnedReusableDuplicate(userId, analysisId) {
      const result = await client
        .from('analysis_history')
        .select('*')
        .eq('user_id', userId)
        .eq('analysis_id', analysisId)
        .in('job_status', ['complete', 'partial'])
        .limit(1)
        .maybeSingle();

      if (result.error) throw new HistoryRepositoryError();
      if (result.data === null) return null;
      return toHistoryItem(toDatabaseRow(parseHistoryViewRow(result.data)));
    },

    async deleteOwned(userId, analysisId) {
      const result = await client
        .from('analysis_intakes')
        .delete()
        .eq('id', analysisId)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();

      if (result.error) throw new HistoryRepositoryError();
      return result.data !== null;
    },
  };
}
