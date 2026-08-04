'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { HistoryWorkspace } from '@/components/history/history-workspace';
import type { HistoryWorkspaceProps } from '@/components/history/history-workspace';
import { historyEntryPresentation } from '@/lib/analysis-pipeline/recovery';
import { createSessionRecoveryRepositories } from '@/lib/analysis-pipeline/session-recovery-repository';
import { parseHistoryQuery } from '@/lib/history/query';
import type { HistoryItem } from '@/lib/history/repository';
import { appMessages } from '@/lib/i18n/messages/app';
import type { Locale } from '@/lib/i18n/locales';

import type {
  HistoryFixtureAction,
  HistoryVisualCase,
} from './fixture-history-contract';

export { historyVisualCases } from './fixture-history-contract';
export type { HistoryVisualCase } from './fixture-history-contract';

function ActiveAnalysisRecoveryLink({
  label,
  locale,
}: Readonly<{ label: string; locale: Locale }>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    void createSessionRecoveryRepositories(window.sessionStorage)
      .analysisRepository.findMostRecentOwnedActive('fixture-user')
      .then((active) => {
        setActiveId(active?.intake.id ?? null);
      });
  }, []);

  if (!activeId) return null;

  const presentation = historyEntryPresentation(
    { id: activeId, status: 'running' },
    { app: '/app-shell-fixture', result: '/app-shell-fixture/app/video' },
  );

  return <Link href={`${presentation.href}&locale=${locale}`}>{label}</Link>;
}

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

const duplicateFixtureItem: HistoryItem = {
  ...fixtureItems[0],
  href: '/app-shell-fixture/history/destination?historyAction=open-saved',
};

const loadMoreItem: HistoryItem = {
  ...fixtureItems[0],
  id: '00000000-0000-4000-8000-000000000007',
  sourceId: 'history-fixture-thumbnail--06',
  title: 'A seventh saved analysis',
  analyzedAt: '2026-06-27T10:21:00.000Z',
  analyzedAtLabel: 'Jun 27 · 10:21',
  titleRevision: '2026-06-27T10:21:00.000Z',
};

function fixtureActions(
  fixtureAction: HistoryFixtureAction,
): HistoryWorkspaceProps['actions'] {
  return {
    async toggleHistoryFavorite() {
      return fixtureAction === 'favorite-failure'
        ? {
            ok: false,
            code: 'failed',
          }
        : { ok: true, data: undefined };
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
      if (typeof window !== 'undefined') {
        const current = Number.parseInt(
          window.sessionStorage.getItem('historyFixtureReanalysisCount') ?? '0',
          10,
        );
        window.sessionStorage.setItem(
          'historyFixtureReanalysisCount',
          String(current + 1),
        );
        window.sessionStorage.setItem(
          'historyFixtureIntakeCount',
          String(
            Number.parseInt(
              window.sessionStorage.getItem('historyFixtureIntakeCount') ?? '0',
              10,
            ) + 1,
          ),
        );
      }
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
        data: {
          items: fixtureAction === 'load-more' ? [loadMoreItem] : [],
          nextCursor: null,
        },
      };
    },
  };
}

function fixtureQuery(
  visualCase: HistoryVisualCase,
  queryInput: Readonly<Record<string, string | readonly string[] | undefined>>,
) {
  if (visualCase === 'search-empty') {
    return parseHistoryQuery({ q: 'calm systems' });
  }
  if (visualCase === 'filtered-empty') {
    return parseHistoryQuery({ status: ['ready'], favorite: 'true' });
  }
  if (visualCase === 'filters') {
    return parseHistoryQuery({ status: ['ready'] });
  }
  return parseHistoryQuery(queryInput);
}

function itemsFor(
  visualCase: HistoryVisualCase,
  query: ReturnType<typeof parseHistoryQuery>,
): readonly HistoryItem[] {
  if (
    visualCase === 'empty' ||
    visualCase === 'search-empty' ||
    visualCase === 'filtered-empty'
  ) {
    return [];
  }
  const sourceItems: readonly HistoryItem[] =
    visualCase !== 'partial'
      ? fixtureItems
      : fixtureItems.map((item, index) =>
          index === 1
            ? {
                ...item,
                status: { key: 'partial' as const, label: 'Partial' },
                readyArtifacts: ['summary'] as const,
                canExport: true,
              }
            : item,
        );
  if (visualCase === 'filters') {
    return sourceItems;
  }
  const normalizedSearch = query.q.toLocaleLowerCase('en');
  const filtered = sourceItems.filter((item) => {
    if (
      normalizedSearch &&
      ![item.title, item.channel, item.language, item.source].some((value) =>
        value?.toLocaleLowerCase('en').includes(normalizedSearch),
      )
    ) {
      return false;
    }
    if (
      query.status.length > 0 &&
      !query.status.includes(item.status.key as (typeof query.status)[number])
    ) {
      return false;
    }
    if (query.language !== null && item.language !== query.language) {
      return false;
    }
    if (query.source !== null && query.source !== 'YouTube') {
      return false;
    }
    if (query.favorite && !item.favorite) {
      return false;
    }
    return true;
  });

  return [...filtered].sort((left, right) => {
    if (query.sort === 'oldest') {
      return left.analyzedAt.localeCompare(right.analyzedAt);
    }
    if (query.sort === 'title-asc') {
      return left.title.localeCompare(right.title, 'en');
    }
    if (query.sort === 'title-desc') {
      return right.title.localeCompare(left.title, 'en');
    }
    if (query.sort === 'recent') {
      return (right.lastOpenedAt ?? right.analyzedAt).localeCompare(
        left.lastOpenedAt ?? left.analyzedAt,
      );
    }
    return right.analyzedAt.localeCompare(left.analyzedAt);
  });
}

export function FixtureHistory({
  visualCase,
  fixtureAction = 'success',
  fixtureDuplicate = false,
  queryInput = {},
  locale = 'en',
}: Readonly<{
  visualCase: HistoryVisualCase;
  fixtureAction?: HistoryFixtureAction;
  fixtureDuplicate?: boolean;
  queryInput?: Readonly<Record<string, string | readonly string[] | undefined>>;
  locale?: Locale;
}>) {
  const query = fixtureQuery(visualCase, queryInput);
  const navigationParameters = new URLSearchParams({
    visualCase,
    ...(fixtureAction === 'success' ? {} : { fixtureAction }),
    ...(fixtureDuplicate ? { fixtureDuplicate: 'true' } : {}),
  });

  return (
    <>
      <ActiveAnalysisRecoveryLink
        label={appMessages[locale].processing.fixture.resume}
        locale={locale}
      />
      <HistoryWorkspace
        copySource={{ kind: 'catalog', locale }}
        initialPage={{
          items: itemsFor(visualCase, query),
          nextCursor:
            fixtureAction === 'load-more' ? 'fixture-next-page' : null,
        }}
        query={query}
        facets={fixtureFacets}
        verifiedDuplicate={
          visualCase === 'duplicate' || fixtureDuplicate
            ? duplicateFixtureItem
            : null
        }
        initialOverlay={
          visualCase === 'filters' ||
          visualCase === 'sort' ||
          visualCase === 'rename' ||
          visualCase === 'delete'
            ? visualCase
            : null
        }
        initialFilterDraft={
          visualCase === 'filters'
            ? {
                status: ['ready'],
                language: null,
                source: null,
                date: 'all',
                favorite: false,
              }
            : undefined
        }
        filterPresentationCountOverride={
          visualCase === 'filters' ? 2 : undefined
        }
        actions={fixtureActions(fixtureAction)}
        navigationPath={`/app-shell-fixture/history?${navigationParameters.toString()}`}
      />
    </>
  );
}
