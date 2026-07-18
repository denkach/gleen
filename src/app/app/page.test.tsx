import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const getUser = vi.fn();
const read = vi.fn();
const findOwned = vi.fn();
const findOwnedSnapshot = vi.fn();
const findMostRecentOwnedActive = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: read }) }) }),
  }),
}));

vi.mock('@/lib/youtube-intake/supabase-repository', () => ({
  createSupabaseIntakeRepository: () => ({ findOwned }),
}));

vi.mock('@/lib/analysis-pipeline/supabase-repository', () => ({
  createSupabaseAnalysisRepository: () => ({
    findOwnedSnapshot,
    findMostRecentOwnedActive,
  }),
}));

vi.mock('@/components/app-shell/new-analysis-home', () => ({
  NewAnalysisHome: (props: {
    initialAnalysis?: { intake: { id: string } };
    continuation?: { rawUrl: string };
  }) => (
    <div>
      <span data-testid="analysis">{props.initialAnalysis?.intake.id}</span>
      <span data-testid="continuation">{props.continuation?.rawUrl}</span>
    </div>
  ),
}));

import AppPage from './page';

describe('AppPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  test('loads authenticated profile defaults for the intake form', async () => {
    render(await AppPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId('analysis')).toBeEmptyDOMElement();
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
