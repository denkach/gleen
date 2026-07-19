import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const { fixtureResultWorkspace, isUiPreviewEnabled, notFound, push } =
  vi.hoisted(() => ({
    fixtureResultWorkspace: vi.fn(),
    isUiPreviewEnabled: vi.fn(),
    notFound: vi.fn((): never => {
      throw new Error('NEXT_NOT_FOUND');
    }),
    push: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  notFound,
  usePathname: () => '/app',
  useRouter: () => ({ push }),
}));
vi.mock('@/lib/ui-preview', () => ({ isUiPreviewEnabled }));
vi.mock('@/components/app-shell/analysis-processing-fixture-screen', () => ({
  AnalysisProcessingFixtureScreen: () => null,
}));
vi.mock('./app/video/[id]/fixture-result-workspace', () => ({
  FixtureResultWorkspace: (props: unknown) => {
    fixtureResultWorkspace(props);
    return <div data-testid="fixture-result-workspace" />;
  },
}));

import { fixtureCases } from './fixture-cases';
import FixtureVideoPage from './app/video/[id]/page';
import AppShellFixturePage from './page';
import type { ResultWorkspaceModel } from '@/lib/result-workspace/presentation';

beforeEach(() => vi.clearAllMocks());

it('defines every deterministic intake fixture case', () => {
  expect(fixtureCases).toEqual([
    'ready',
    'duplicate',
    'invalid-url',
    'video-unavailable',
    'transcript-unavailable',
    'provider-outage',
    'reanalysis',
    'pipeline-queued',
    'pipeline-validating',
    'pipeline-transcript',
    'pipeline-structuring',
    'pipeline-artifacts',
    'pipeline-partial',
    'pipeline-failed',
    'pipeline-retrying',
    'pipeline-complete',
    'result-complete',
    'result-legacy',
    'result-partial',
    'result-corrupted',
    'result-empty',
    'result-den-25',
    'result-den-25-partial',
    'result-den-25-public',
  ]);
});

it('freezes the complete DEN-25 result fixture contract', async () => {
  isUiPreviewEnabled.mockReturnValue(true);

  render(
    await FixtureVideoPage({
      params: Promise.resolve({ id: 'result-den-25' }),
      searchParams: Promise.resolve({}),
    }),
  );

  const den25Model = (
    fixtureResultWorkspace.mock.calls.at(-1)?.[0] as
      { initialModel: ResultWorkspaceModel } | undefined
  )?.initialModel;
  expect(den25Model).toBeDefined();
  if (!den25Model) return;

  expect(den25Model.tabs.summary.status).toBe('ready');
  if (den25Model.tabs.summary.status !== 'ready') return;
  expect(den25Model.tabs.summary.data.keyPoints).toHaveLength(5);
  expect(den25Model.tabs.summary.data.keyPoints[0]).toEqual({
    text: 'Start communication with the purpose behind the work.',
    sourceOffsetMs: 75_000,
  });

  expect(den25Model.tabs.flashcards.status).toBe('ready');
  if (den25Model.tabs.flashcards.status !== 'ready') return;
  expect(den25Model.tabs.flashcards.data.cards).toHaveLength(28);

  expect(den25Model.tabs.timestamps.status).toBe('ready');
  if (den25Model.tabs.timestamps.status !== 'ready') return;
  expect(den25Model.tabs.timestamps.data.chapters).toHaveLength(18);

  expect(den25Model.tabs.transcript.status).toBe('ready');
  if (den25Model.tabs.transcript.status !== 'ready') return;
  expect(den25Model.tabs.transcript.data.segments).toHaveLength(36);
  expect(den25Model.userState?.reviews).toHaveLength(11);
});

it('keeps DEN-25 owner state out of legacy and public fixtures', async () => {
  isUiPreviewEnabled.mockReturnValue(true);

  for (const id of [
    'result-complete',
    'result-legacy',
    'result-den-25-public',
  ]) {
    render(
      await FixtureVideoPage({
        params: Promise.resolve({ id }),
        searchParams: Promise.resolve({}),
      }),
    );
    const fixtureModel = (
      fixtureResultWorkspace.mock.calls.at(-1)?.[0] as
        { initialModel: ResultWorkspaceModel } | undefined
    )?.initialModel;
    expect(fixtureModel?.userState).toBeNull();
  }
});

it('renders the real app shell and New analysis home when preview is enabled', async () => {
  isUiPreviewEnabled.mockReturnValue(true);

  render(await AppShellFixturePage({ searchParams: Promise.resolve({}) }));

  expect(
    screen.getByRole('heading', {
      name: 'Turn a video into something useful.',
    }),
  ).toBeInTheDocument();
  expect(screen.getByText('Test User')).toBeInTheDocument();
  expect(screen.getByText('test@example.com')).toBeInTheDocument();
  for (const link of screen.getAllByRole('link', { name: 'New analysis' })) {
    expect(link).toHaveAttribute('aria-current', 'page');
  }
  expect(notFound).not.toHaveBeenCalled();
});

it('returns not found before rendering when preview is disabled', async () => {
  isUiPreviewEnabled.mockReturnValue(false);

  await expect(
    AppShellFixturePage({ searchParams: Promise.resolve({ intake: 'ready' }) }),
  ).rejects.toThrow('NEXT_NOT_FOUND');
  expect(notFound).toHaveBeenCalledOnce();
});

it('returns not found for an unknown fixture selection', async () => {
  isUiPreviewEnabled.mockReturnValue(true);

  await expect(
    AppShellFixturePage({ searchParams: Promise.resolve({ intake: 'other' }) }),
  ).rejects.toThrow('NEXT_NOT_FOUND');
});
