import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const { getRequestLocale, isUiPreviewEnabled, notFound } = vi.hoisted(() => ({
  getRequestLocale: vi.fn(async () => 'en'),
  isUiPreviewEnabled: vi.fn(),
  notFound: vi.fn((): never => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/ui-preview', () => ({ isUiPreviewEnabled }));
vi.mock('@/lib/i18n/request-locale', () => ({ getRequestLocale }));

import AnalyzeProcessingFixturePage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  getRequestLocale.mockResolvedValue('en');
});

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

it('uses the normal request locale without an explicit fixture override', async () => {
  isUiPreviewEnabled.mockReturnValue(true);
  getRequestLocale.mockResolvedValue('de');

  render(
    await AnalyzeProcessingFixturePage({
      searchParams: Promise.resolve({}),
    }),
  );

  expect(
    screen.getByRole('heading', {
      name: 'Testansicht für die Analyseverarbeitung',
    }),
  ).toBeInTheDocument();
});

it('calls notFound before rendering whenever UI preview is disabled', async () => {
  isUiPreviewEnabled.mockReturnValue(false);

  await expect(
    AnalyzeProcessingFixturePage({ searchParams: Promise.resolve({}) }),
  ).rejects.toThrow('NEXT_NOT_FOUND');
  expect(notFound).toHaveBeenCalledOnce();
});
