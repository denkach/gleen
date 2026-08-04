import fs from 'node:fs';
import path from 'node:path';

import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getRequestLocale, isUiPreviewEnabled, notFound, push } = vi.hoisted(
  () => ({
    getRequestLocale: vi.fn(async () => 'en'),
    isUiPreviewEnabled: vi.fn(),
    notFound: vi.fn((): never => {
      throw new Error('NEXT_NOT_FOUND');
    }),
    push: vi.fn(),
  }),
);

vi.mock('next/navigation', () => ({
  notFound,
  usePathname: () => '/app-shell-fixture/history',
  useRouter: () => ({ push }),
}));
vi.mock('@/lib/ui-preview', () => ({ isUiPreviewEnabled }));
vi.mock('@/lib/i18n/request-locale', () => ({ getRequestLocale }));

import FixtureHistoryPage, {
  generateMetadata,
} from '@/app/app-shell-fixture/history/page';
import type { AnalysisSnapshot } from '@/lib/analysis-pipeline/domain';
import { createSessionRecoveryRepositories } from '@/lib/analysis-pipeline/session-recovery-repository';
import type { AnalysisIntake } from '@/lib/youtube-intake/repository';
import {
  FixtureHistory,
  historyVisualCases,
} from '@/components/app-shell/fixture-history';

function stubDesktopViewport() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((media: string) => ({
      matches: false,
      media,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  getRequestLocale.mockResolvedValue('en');
  stubDesktopViewport();
});

afterEach(() => vi.unstubAllGlobals());

describe('FixtureHistory', () => {
  it('preserves the active locale in the analysis recovery link', async () => {
    await createSessionRecoveryRepositories(window.sessionStorage).saveActive({
      intake: {
        id: 'active-analysis',
        userId: 'fixture-user',
      } as AnalysisIntake,
      snapshot: {
        job: {
          analysisId: 'active-analysis',
          userId: 'fixture-user',
          status: 'running',
        },
      } as AnalysisSnapshot,
    });

    render(<FixtureHistory visualCase="default" locale="de" />);

    expect(
      await screen.findByRole('link', { name: 'Aktive Analyse fortsetzen' }),
    ).toHaveAttribute(
      'href',
      '/app-shell-fixture?analysis=active-analysis&locale=de',
    );
  });

  it('freezes the supported deterministic visual cases', () => {
    expect(historyVisualCases).toEqual([
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
    ]);
  });

  it('renders the six approved rows and token-backed fixture thumbnails', () => {
    render(<FixtureHistory visualCase="default" />);

    const desktop = screen.getByTestId('history-desktop-list');
    const approvedRows = [
      [
        'How to Learn Anything Faster — The Science of Effective Learning',
        'Signal Lab',
        'English',
        '34:18',
        'Ready',
      ],
      [
        'The Hidden Structure of Great Explanations',
        'Clear Thinking',
        'Deutsch',
        '18:42',
        'Ready',
      ],
      [
        'A Practical Introduction to Systems Thinking',
        'Frame School',
        'Español',
        '47:09',
        'Ready',
      ],
      [
        'Designing Calm Interfaces for Complex Products',
        'Form & Signal',
        'Українська',
        '51:26',
        'Processing',
      ],
      [
        'What Most People Get Wrong About Motivation',
        'Mindful Work',
        'English',
        '20:11',
        'Failed',
      ],
      [
        'The Art of Focus in a Noisy World',
        'Deep Focus',
        'English',
        '29:33',
        'Ready',
      ],
    ] as const;

    const rows = within(desktop).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(approvedRows.length);
    for (const [index, expected] of approvedRows.entries()) {
      for (const value of expected) {
        expect(within(rows[index]).getByText(value)).toBeInTheDocument();
      }
      expect(
        within(rows[index]).getByLabelText(
          `Thumbnail unavailable for ${expected[0]}`,
        ),
      ).toHaveClass(`history-fixture-thumbnail--0${String(index + 1)}`);
    }

    expect(
      screen.getByRole('button', {
        name: /Remove A Practical Introduction to Systems Thinking from favorites/,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it.each([
    ['duplicate', 'complementary', 'Saved analysis available'],
    ['filters', 'region', 'Filter results'],
    ['sort', 'menu', 'Sort history: Newest'],
    ['rename', 'dialog', 'Rename saved analysis'],
    ['delete', 'dialog', 'Delete saved analysis?'],
  ] as const)(
    'opens the deterministic %s overlay',
    (visualCase, role, accessibleName) => {
      render(<FixtureHistory visualCase={visualCase} />);

      expect(
        screen.getByRole(role, { name: accessibleName }),
      ).toBeInTheDocument();
    },
  );

  it('renders a truthful Partial status without changing the six-row geometry', () => {
    render(<FixtureHistory visualCase="partial" />);

    expect(
      screen.getByTestId('history-desktop-list').querySelectorAll('tbody tr'),
    ).toHaveLength(6);
    expect(screen.getByText('Partial')).toHaveAttribute(
      'data-status',
      'partial',
    );
  });

  it('derives deterministic result rows from applied status, search, and sort query state', () => {
    render(
      <FixtureHistory
        visualCase="default"
        queryInput={{ status: 'ready', q: 'the', sort: 'oldest' }}
      />,
    );

    const titles = within(screen.getByTestId('history-desktop-list'))
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('link')[1]?.textContent?.trim());
    expect(titles).toEqual([
      'The Art of Focus in a Noisy World',
      'The Hidden Structure of Great Explanations',
      'How to Learn Anything Faster — The Science of Effective Learning',
    ]);
  });

  it('can compose the verified duplicate with an ordinary or overlay fixture', () => {
    render(<FixtureHistory visualCase="filters" fixtureDuplicate />);

    expect(
      screen.getByTestId('history-desktop-list').querySelectorAll('tbody tr'),
    ).toHaveLength(6);
    expect(
      screen.getByRole('complementary', {
        name: 'Saved analysis available',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Filter results' }),
    ).toBeInTheDocument();
    const filterPanel = screen.getByRole('region', {
      name: 'Filter results',
    });
    expect(
      within(filterPanel).getByRole('checkbox', { name: 'Ready' }),
    ).toBeChecked();
    expect(
      within(filterPanel).getByRole('checkbox', { name: 'Processing' }),
    ).not.toBeChecked();
    expect(
      within(filterPanel).getByRole('button', { name: 'Apply filters (2)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Filters, 2 applied' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['empty', 'No analyses yet'],
    ['search-empty', 'No results for “calm systems”'],
    ['filtered-empty', 'No analyses match these filters'],
  ] as const)('renders the deterministic %s state', (visualCase, heading) => {
    render(<FixtureHistory visualCase={visualCase} />);

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('defines all six thumbnail backgrounds with shared tokens only', () => {
    const css = fs.readFileSync(
      path.join(process.cwd(), 'src/styles/history-reference.css'),
      'utf8',
    );

    for (let index = 1; index <= 6; index += 1) {
      const selector = `.history-item-media__fallback.history-fixture-thumbnail--0${String(index)}`;
      expect(css).toContain(selector);
      const rule = css.slice(
        css.indexOf(selector),
        css.indexOf('}', css.indexOf(selector)),
      );
      expect(rule).toMatch(/var\(--(?:surface|artifact)-/);
      expect(rule).not.toMatch(/#[\da-f]{3,8}|rgba?\(/i);
    }
  });
});

describe('FixtureHistoryPage', () => {
  it('localizes fixture metadata with an explicit or resolved locale', async () => {
    await expect(
      generateMetadata({ searchParams: Promise.resolve({ locale: 'de' }) }),
    ).resolves.toEqual({ title: 'Verlauf — Gleen' });

    getRequestLocale.mockResolvedValue('uk');
    await expect(
      generateMetadata({ searchParams: Promise.resolve({}) }),
    ).resolves.toEqual({ title: 'Історія — Gleen' });
  });

  it('is preview-gated and uses the real History shell selection', async () => {
    isUiPreviewEnabled.mockReturnValue(true);

    render(
      await FixtureHistoryPage({
        searchParams: Promise.resolve({ visualCase: 'default' }),
      }),
    );

    for (const link of screen.getAllByRole('link', { name: 'History' })) {
      expect(link).toHaveAttribute('aria-current', 'page');
    }
    expect(screen.getByText('Alex Koval')).toBeInTheDocument();
    expect(screen.getByText('alex@gleen.space')).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('uses the selected locale across the fixture shell and workspace', async () => {
    isUiPreviewEnabled.mockReturnValue(true);

    render(
      await FixtureHistoryPage({
        searchParams: Promise.resolve({
          visualCase: 'default',
          locale: 'de',
        }),
      }),
    );

    expect(screen.getByRole('heading', { name: 'Verlauf' })).toBeVisible();
    for (const link of screen.getAllByRole('link', { name: 'Verlauf' })) {
      expect(link).toHaveAttribute('aria-current', 'page');
    }
  });

  it('returns not found before rendering when preview is disabled', async () => {
    isUiPreviewEnabled.mockReturnValue(false);

    await expect(
      FixtureHistoryPage({
        searchParams: Promise.resolve({ visualCase: 'default' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledOnce();
  });

  it.each([['unknown'], [['default']]])(
    'returns not found for invalid visualCase %j',
    async (visualCase) => {
      isUiPreviewEnabled.mockReturnValue(true);

      await expect(
        FixtureHistoryPage({
          searchParams: Promise.resolve({ visualCase }),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');
    },
  );

  it('returns not found for an invalid fixture duplicate selector', async () => {
    isUiPreviewEnabled.mockReturnValue(true);

    await expect(
      FixtureHistoryPage({
        searchParams: Promise.resolve({
          visualCase: 'default',
          fixtureDuplicate: 'false',
        }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
