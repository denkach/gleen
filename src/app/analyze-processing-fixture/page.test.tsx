import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const { isUiPreviewEnabled, notFound } = vi.hoisted(() => ({
  isUiPreviewEnabled: vi.fn(),
  notFound: vi.fn((): never => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/ui-preview', () => ({ isUiPreviewEnabled }));

import AnalyzeProcessingFixturePage from './page';

beforeEach(() => vi.clearAllMocks());

it('renders localized fixture controls when UI preview is enabled', async () => {
  isUiPreviewEnabled.mockReturnValue(true);

  render(
    await AnalyzeProcessingFixturePage({
      searchParams: Promise.resolve({ locale: 'de' }),
    }),
  );

  expect(
    screen.getByRole('heading', {
      name: 'Testansicht für die Analyseverarbeitung',
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Sequenz wiederholen' }),
  ).toBeInTheDocument();
  expect(notFound).not.toHaveBeenCalled();
});

it('calls notFound before rendering whenever UI preview is disabled', async () => {
  isUiPreviewEnabled.mockReturnValue(false);

  await expect(
    AnalyzeProcessingFixturePage({ searchParams: Promise.resolve({}) }),
  ).rejects.toThrow('NEXT_NOT_FOUND');
  expect(notFound).toHaveBeenCalledOnce();
});
