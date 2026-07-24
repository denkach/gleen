import { describe, expect, test } from 'vitest';

import {
  decodeHistoryCursor,
  encodeHistoryCursor,
  parseHistoryQuery,
  serializeHistoryQuery,
  type HistoryQuery,
} from '@/lib/history/query';

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

describe('history query contract', () => {
  test('parses trimmed search and unique valid status filters with safe defaults', () => {
    expect(
      parseHistoryQuery({
        q: '  systems  ',
        status: ['ready', 'failed', 'ready', 'unknown'],
      }),
    ).toEqual({
      q: 'systems',
      status: ['ready', 'failed'],
      language: null,
      source: null,
      date: 'all',
      favorite: false,
      sort: 'newest',
      cursor: null,
    });
  });

  test('bounds search and coerces scalar array inputs to their first value', () => {
    expect(
      parseHistoryQuery({
        q: [`  ${'s'.repeat(170)}  `, 'ignored'],
        language: ['  en  ', 'uk'],
        source: ['  youtube  ', 'other'],
        date: ['7d', 'year'],
        favorite: ['true', 'false'],
        sort: ['oldest', 'newest'],
      }),
    ).toMatchObject({
      q: 's'.repeat(160),
      language: 'en',
      source: 'youtube',
      date: '7d',
      favorite: true,
      sort: 'oldest',
    });
  });

  test('rejects invalid scalar values and malformed cursors', () => {
    expect(
      parseHistoryQuery({
        date: 'forever',
        sort: 'unknown',
        favorite: 'yes',
        cursor: 'bad',
      }),
    ).toMatchObject({
      date: 'all',
      favorite: false,
      sort: 'newest',
      cursor: null,
    });
  });

  test('round-trips a base64url cursor', () => {
    const cursor = {
      sort: 'title-asc' as const,
      value: 'calm interfaces',
      id: 'analysis-2',
    };
    const encoded = encodeHistoryCursor(cursor);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeHistoryCursor(encoded)).toEqual(cursor);
  });

  test('rejects a valid cursor when its sort differs from the applied sort', () => {
    const cursor = encodeHistoryCursor({
      sort: 'oldest',
      value: '2026-07-01T00:00:00.000Z',
      id: 'analysis-1',
    });

    expect(parseHistoryQuery({ sort: 'newest', cursor }).cursor).toBeNull();
    expect(parseHistoryQuery({ sort: 'oldest', cursor }).cursor).toEqual({
      sort: 'oldest',
      value: '2026-07-01T00:00:00.000Z',
      id: 'analysis-1',
    });
  });

  test('serializes non-default values in stable canonical order', () => {
    const cursor = {
      sort: 'oldest' as const,
      value: '2026-07-01T00:00:00.000Z',
      id: 'analysis-1',
    };

    expect(
      serializeHistoryQuery({
        q: 'systems',
        status: ['ready', 'failed'],
        language: 'en',
        source: 'youtube',
        date: '30d',
        favorite: true,
        sort: 'oldest',
        cursor,
      }).toString(),
    ).toBe(
      `q=systems&status=ready&status=failed&language=en&source=youtube&date=30d&favorite=true&sort=oldest&cursor=${encodeHistoryCursor(cursor)}`,
    );
  });

  test('omits default values from serialized queries', () => {
    expect(
      serializeHistoryQuery({
        ...defaults,
        q: 'systems',
        sort: 'oldest',
      }).toString(),
    ).toBe('q=systems&sort=oldest');
    expect(serializeHistoryQuery(defaults).toString()).toBe('');
  });
});
