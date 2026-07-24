'use client';

import { HistoryWorkspace } from '@/components/history/history-workspace';
import type { HistoryWorkspaceProps } from '@/components/history/history-workspace';
import { parseHistoryQuery } from '@/lib/history/query';
import type { HistoryItem } from '@/lib/history/repository';

export const historyVisualCases = [
  'default',
  'duplicate',
  'filters',
  'sort',
  'partial',
  'empty',
  'search-empty',
  'filtered-empty',
  'rename',
  'delete',
] as const;

export type HistoryVisualCase = (typeof historyVisualCases)[number];

const fixtureRows = [
  {
    title: 'How to Learn Anything Faster — The Science of Effective Learning',
    channel: 'Signal Lab',
    language: 'English',
    durationSeconds: 2_058,
    durationLabel: '34:18',
    analyzedAt: '2026-07-24T11:42:00.000Z',
    analyzedAtLabel: 'Today · 11:42',
    status: { key: 'ready', label: 'Ready' },
    favorite: false,
  },
  {
    title: 'The Hidden Structure of Great Explanations',
    channel: 'Clear Thinking',
    language: 'Deutsch',
    durationSeconds: 1_122,
    durationLabel: '18:42',
    analyzedAt: '2026-07-09T18:20:00.000Z',
    analyzedAtLabel: 'Jul 09 · 18:20',
    status: { key: 'ready', label: 'Ready' },
    favorite: false,
  },
  {
    title: 'A Practical Introduction to Systems Thinking',
    channel: 'Frame School',
    language: 'Español',
    durationSeconds: 2_829,
    durationLabel: '47:09',
    analyzedAt: '2026-07-06T09:12:00.000Z',
    analyzedAtLabel: 'Jul 06 · 09:12',
    status: { key: 'ready', label: 'Ready' },
    favorite: true,
  },
  {
    title: 'Designing Calm Interfaces for Complex Products',
    channel: 'Form & Signal',
    language: 'Українська',
    durationSeconds: 3_086,
    durationLabel: '51:26',
    analyzedAt: '2026-07-04T14:05:00.000Z',
    analyzedAtLabel: 'Jul 04 · 14:05',
    status: { key: 'processing', label: 'Processing' },
    favorite: false,
  },
  {
    title: 'What Most People Get Wrong About Motivation',
    channel: 'Mindful Work',
    language: 'English',
    durationSeconds: 1_211,
    durationLabel: '20:11',
    analyzedAt: '2026-06-30T16:33:00.000Z',
    analyzedAtLabel: 'Jun 30 · 16:33',
    status: { key: 'failed', label: 'Failed' },
    favorite: false,
  },
  {
    title: 'The Art of Focus in a Noisy World',
    channel: 'Deep Focus',
    language: 'English',
    durationSeconds: 1_773,
    durationLabel: '29:33',
    analyzedAt: '2026-06-28T10:21:00.000Z',
    analyzedAtLabel: 'Jun 28 · 10:21',
    status: { key: 'ready', label: 'Ready' },
    favorite: false,
  },
] as const satisfies readonly Pick<
  HistoryItem,
  | 'title'
  | 'channel'
  | 'language'
  | 'durationSeconds'
  | 'durationLabel'
  | 'analyzedAt'
  | 'analyzedAtLabel'
  | 'status'
  | 'favorite'
>[];

const fixtureItems: readonly HistoryItem[] = fixtureRows.map((row, index) => {
  const position = String(index + 1).padStart(2, '0');
  const id = `00000000-0000-4000-8000-0000000000${position}`;
  const reusable = row.status.key === 'ready';

  return {
    ...row,
    id,
    sourceId: `history-fixture-thumbnail--${position}`,
    href: reusable ? `/app/video/${id}` : `/app?analysis=${id}`,
    thumbnailUrl: null,
    source: `https://www.youtube.com/watch?v=fixture${position}`,
    outputLocale: 'en',
    summaryPresetLabel: reusable ? 'Balanced' : null,
    lastOpenedAt: null,
    lastOpenedAtLabel: null,
    selectedArtifacts: ['summary', 'flashcards', 'timestamps'],
    readyArtifacts: reusable ? ['summary', 'flashcards', 'timestamps'] : [],
    canExport: reusable,
    titleRevision: row.analyzedAt,
  };
});

const fixtureFacets = {
  languages: ['Deutsch', 'English', 'Español', 'Українська'],
  sources: ['YouTube'],
} as const;

const fixtureActions: HistoryWorkspaceProps['actions'] = {
  async toggleHistoryFavorite() {
    return { ok: true, data: undefined };
  },
  async renameHistoryItem() {
    return {
      ok: true,
      data: { updatedAt: '2026-07-24T12:00:00.000Z' },
    };
  },
  async deleteHistoryItem() {
    return { ok: true, data: undefined };
  },
  async reanalyzeHistoryDuplicate() {
    return {
      ok: true,
      data: {
        redirectTo: '/app/video/00000000-0000-4000-8000-000000000099',
      },
    };
  },
  async markHistoryItemOpened() {
    return { ok: true, data: undefined };
  },
  async loadMoreHistory() {
    return {
      ok: true,
      data: { items: [], nextCursor: null },
    };
  },
};

function fixtureQuery(visualCase: HistoryVisualCase) {
  if (visualCase === 'search-empty') {
    return parseHistoryQuery({ q: 'calm systems' });
  }
  if (visualCase === 'filtered-empty') {
    return parseHistoryQuery({ status: ['ready'], favorite: 'true' });
  }
  if (visualCase === 'filters') {
    return parseHistoryQuery({ status: ['ready', 'processing'] });
  }
  return parseHistoryQuery({});
}

function itemsFor(visualCase: HistoryVisualCase): readonly HistoryItem[] {
  if (
    visualCase === 'empty' ||
    visualCase === 'search-empty' ||
    visualCase === 'filtered-empty'
  ) {
    return [];
  }
  if (visualCase !== 'partial') return fixtureItems;

  return fixtureItems.map((item, index) =>
    index === 1
      ? {
          ...item,
          status: { key: 'partial', label: 'Partial' },
          readyArtifacts: ['summary'],
          canExport: true,
        }
      : item,
  );
}

export function FixtureHistory({
  visualCase,
}: Readonly<{ visualCase: HistoryVisualCase }>) {
  return (
    <HistoryWorkspace
      initialPage={{ items: itemsFor(visualCase), nextCursor: null }}
      query={fixtureQuery(visualCase)}
      facets={fixtureFacets}
      verifiedDuplicate={visualCase === 'duplicate' ? fixtureItems[0] : null}
      initialOverlay={
        visualCase === 'filters' ||
        visualCase === 'sort' ||
        visualCase === 'rename' ||
        visualCase === 'delete'
          ? visualCase
          : null
      }
      actions={fixtureActions}
    />
  );
}
