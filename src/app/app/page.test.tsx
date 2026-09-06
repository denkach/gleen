import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const getUser = vi.fn();
const read = vi.fn();
const findOwned = vi.fn();
const findOwnedSnapshot = vi.fn();
const findMostRecentOwnedActive = vi.fn();
const listOwned = vi.fn();
const getOwnedSnapshot = vi.fn();
const listOwnedUsage = vi.fn();
const { getRequestLocale } = vi.hoisted(() => ({
  getRequestLocale: vi.fn(async () => 'uk'),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: read }) }) }),
  }),
}));
vi.mock('@/lib/i18n/request-locale', () => ({ getRequestLocale }));

vi.mock('@/lib/youtube-intake/supabase-repository', () => ({
  createSupabaseIntakeRepository: () => ({ findOwned }),
}));

vi.mock('@/lib/analysis-pipeline/supabase-repository', () => ({
  createSupabaseAnalysisRepository: () => ({
    findOwnedSnapshot,
    findMostRecentOwnedActive,
  }),
}));
vi.mock('@/lib/history/supabase-repository', () => ({
  createSupabaseHistoryRepository: () => ({ listOwned }),
}));
vi.mock('@/lib/billing/supabase-repository', () => ({
  createSupabaseBillingRepository: () => ({
    getOwnedSnapshot,
    listOwnedUsage,
  }),
}));

vi.mock('@/components/app-shell/new-analysis-home', () => ({
  NewAnalysisHome: (props: {
    copy: { newAnalysis: { title: string } };
    profileDefaults: { outputLocale: string };
    initialAnalysis?: { intake: { id: string } };
    continuation?: { rawUrl: string };
    recentAnalyses: { kind: string; items?: readonly { id: string }[] };
    monthlyUsage: { kind: string; used?: number; limit?: number };
  }) => (
    <div>
      <span data-testid="analysis">{props.initialAnalysis?.intake.id}</span>
      <span data-testid="continuation">{props.continuation?.rawUrl}</span>
      <span data-testid="localized-title">{props.copy.newAnalysis.title}</span>
      <span data-testid="output-locale">
        {props.profileDefaults.outputLocale}
      </span>
      <span data-testid="recent-state">
        {props.recentAnalyses.kind}:
        {props.recentAnalyses.items?.map((item) => item.id).join(',')}
      </span>
      <span data-testid="monthly-state">
        {props.monthlyUsage?.kind}:{props.monthlyUsage?.used}/
        {props.monthlyUsage?.limit}
      </span>
    </div>
  ),
}));

import AppPage from './page';

describe('AppPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-06T12:00:00.000Z'));
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    read.mockResolvedValue({
      data: {
        interface_locale: 'en',
        output_locale: 'es',
        summary_preset: 'detailed',
        flashcard_preset: 30,
        onboarding_step: 3,
        onboarding_completed_at: '2026-07-12T00:00:00.000Z',
      },
      error: null,
    });
    findOwned.mockResolvedValue(null);
    findOwnedSnapshot.mockResolvedValue(null);
    findMostRecentOwnedActive.mockResolvedValue(null);
    listOwned.mockResolvedValue({
      items: [{ id: 'analysis-1' }],
      nextCursor: null,
    });
    getOwnedSnapshot.mockResolvedValue({
      currentPlan: { slug: 'starter', analysisLimit: 50 },
      usage: { used: 21, reserved: 1, remaining: 28, limit: 50 },
      availablePlans: [
        {
          plan: { slug: 'prism-pro', analysisLimit: 100, purchasable: true },
        },
      ],
    });
    listOwnedUsage
      .mockResolvedValueOnce({
        items: [
          {
            eventType: 'settlement',
            quantity: -1,
            occurredAt: '2026-09-05T10:00:00.000Z',
          },
        ],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        items: [
          {
            eventType: 'settlement',
            quantity: -1,
            occurredAt: '2026-08-05T10:00:00.000Z',
          },
        ],
        nextCursor: null,
      });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('loads authenticated profile defaults for the intake form', async () => {
    render(await AppPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId('analysis')).toBeEmptyDOMElement();
    expect(screen.getByTestId('localized-title')).toHaveTextContent(
      'Перетворіть відео на щось корисне.',
    );
    expect(screen.getByTestId('output-locale')).toHaveTextContent('es');
    expect(screen.getByTestId('recent-state')).toHaveTextContent(
      'ready:analysis-1',
    );
    expect(screen.getByTestId('monthly-state')).toHaveTextContent(
      'ready:22/50',
    );
    expect(listOwned).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ sort: 'newest', cursor: null }),
      3,
    );
  });

  test('keeps recent analyses available when monthly usage cannot load', async () => {
    getOwnedSnapshot.mockRejectedValue(new Error('billing unavailable'));
    render(await AppPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId('recent-state')).toHaveTextContent(
      'ready:analysis-1',
    );
    expect(screen.getByTestId('monthly-state')).toHaveTextContent(
      'unavailable:/',
    );
  });

  test('keeps the intake available when recent history cannot load', async () => {
    listOwned.mockRejectedValue(new Error('history unavailable'));
    render(await AppPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId('localized-title')).toBeVisible();
    expect(screen.getByTestId('recent-state')).toHaveTextContent(
      'unavailable:',
    );
  });

  test('prefers an explicitly owned active analysis', async () => {
    findOwned.mockResolvedValue({ id: 'explicit-id' });
    findOwnedSnapshot.mockResolvedValue({
      job: { analysisId: 'explicit-id', status: 'running' },
    });

    render(
      await AppPage({
        searchParams: Promise.resolve({ analysis: 'explicit-id' }),
      }),
    );

    expect(screen.getByTestId('analysis')).toHaveTextContent('explicit-id');
    expect(findOwned).toHaveBeenCalledWith('user-1', 'explicit-id');
    expect(findMostRecentOwnedActive).not.toHaveBeenCalled();
  });

  test('restores an explicitly owned failed analysis', async () => {
    findOwned.mockResolvedValue({ id: 'failed-id' });
    findOwnedSnapshot.mockResolvedValue({
      job: { analysisId: 'failed-id', status: 'failed' },
    });
    render(
      await AppPage({
        searchParams: Promise.resolve({ analysis: 'failed-id' }),
      }),
    );
    expect(screen.getByTestId('analysis')).toHaveTextContent('failed-id');
  });

  test('falls back to the most recent owned active analysis', async () => {
    findMostRecentOwnedActive.mockResolvedValue({
      intake: { id: 'recent-id' },
      snapshot: { job: { analysisId: 'recent-id', status: 'queued' } },
    });

    render(await AppPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId('analysis')).toHaveTextContent('recent-id');
  });

  test('uses a valid continuation before active fallback', async () => {
    const rawUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    render(
      await AppPage({
        searchParams: Promise.resolve({ continuation: rawUrl }),
      }),
    );

    expect(screen.getByTestId('continuation')).toHaveTextContent(rawUrl);
    expect(findMostRecentOwnedActive).not.toHaveBeenCalled();
  });

  test('prefers an explicitly owned active analysis over a continuation', async () => {
    const rawUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    findOwned.mockResolvedValue({ id: 'explicit-id' });
    findOwnedSnapshot.mockResolvedValue({
      job: { analysisId: 'explicit-id', status: 'running' },
    });

    render(
      await AppPage({
        searchParams: Promise.resolve({
          analysis: 'explicit-id',
          continuation: rawUrl,
        }),
      }),
    );

    expect(screen.getByTestId('analysis')).toHaveTextContent('explicit-id');
    expect(screen.getByTestId('continuation')).toBeEmptyDOMElement();
  });
});
