import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const { isUiPreviewEnabled, notFound, push } = vi.hoisted(() => ({
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

import { fixtureCases } from './fixture-cases';
import AppShellFixturePage from './page';

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
  ]);
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
