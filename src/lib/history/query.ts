import { z } from 'zod';

export const historySortSchema = z.enum([
  'newest',
  'oldest',
  'recent',
  'title-asc',
  'title-desc',
]);
export const historyStatusSchema = z.enum(['ready', 'processing', 'failed']);
export const historyDateSchema = z.enum(['all', 'today', '7d', '30d', 'year']);

export type HistorySort = z.infer<typeof historySortSchema>;
export type HistoryStatusFilter = z.infer<typeof historyStatusSchema>;
export type HistoryCursor = Readonly<{
  sort: HistorySort;
  value: string;
  id: string;
}>;
export type HistoryQuery = Readonly<{
  q: string;
  status: readonly HistoryStatusFilter[];
  language: string | null;
  source: string | null;
  date: z.infer<typeof historyDateSchema>;
  favorite: boolean;
  sort: HistorySort;
  cursor: HistoryCursor | null;
}>;

type QueryValue = string | readonly string[] | null | undefined;
type HistoryQueryInput = URLSearchParams | Readonly<Record<string, QueryValue>>;

const historyCursorSchema = z
  .object({
    sort: historySortSchema,
    value: z.string(),
    id: z.string(),
  })
  .strict();

function readValues(input: HistoryQueryInput, key: string): string[] {
  if (input instanceof URLSearchParams) {
    return input.getAll(key);
  }

  const value = input[key];

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  return typeof value === 'string' ? [value] : [];
}

function readScalar(input: HistoryQueryInput, key: string): string | undefined {
  return readValues(input, key)[0];
}

function readOptionalScalar(
  input: HistoryQueryInput,
  key: string,
): string | null {
  const value = readScalar(input, key)?.trim();
  return value ? value : null;
}

function encodeUtf8Base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

function decodeUtf8Base64Url(value: string): string {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function encodeHistoryCursor(cursor: HistoryCursor): string {
  return encodeUtf8Base64Url(JSON.stringify(cursor));
}

export function decodeHistoryCursor(value: string): HistoryCursor | null {
  try {
    const decoded: unknown = JSON.parse(decodeUtf8Base64Url(value));
    const cursor = historyCursorSchema.safeParse(decoded);
    return cursor.success ? cursor.data : null;
  } catch {
    return null;
  }
}

export function parseHistoryQuery(input: HistoryQueryInput): HistoryQuery {
  const q = (readScalar(input, 'q') ?? '').trim().slice(0, 160);
  const status = [
    ...new Set(
      readValues(input, 'status').filter(
        (value): value is HistoryStatusFilter =>
          historyStatusSchema.safeParse(value).success,
      ),
    ),
  ];
  const dateResult = historyDateSchema.safeParse(readScalar(input, 'date'));
  const sortResult = historySortSchema.safeParse(readScalar(input, 'sort'));
  const sort = sortResult.success ? sortResult.data : 'newest';
  const decodedCursor = decodeHistoryCursor(readScalar(input, 'cursor') ?? '');

  return {
    q,
    status,
    language: readOptionalScalar(input, 'language'),
    source: readOptionalScalar(input, 'source'),
    date: dateResult.success ? dateResult.data : 'all',
    favorite: readScalar(input, 'favorite') === 'true',
    sort,
    cursor: decodedCursor?.sort === sort ? decodedCursor : null,
  };
}

export function serializeHistoryQuery(query: HistoryQuery): URLSearchParams {
  const parameters = new URLSearchParams();

  if (query.q) {
    parameters.set('q', query.q);
  }

  for (const status of query.status) {
    parameters.append('status', status);
  }

  if (query.language) {
    parameters.set('language', query.language);
  }

  if (query.source) {
    parameters.set('source', query.source);
  }

  if (query.date !== 'all') {
    parameters.set('date', query.date);
  }

  if (query.favorite) {
    parameters.set('favorite', 'true');
  }

  if (query.sort !== 'newest') {
    parameters.set('sort', query.sort);
  }

  if (query.cursor?.sort === query.sort) {
    parameters.set('cursor', encodeHistoryCursor(query.cursor));
  }

  return parameters;
}
