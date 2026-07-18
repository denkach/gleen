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

it('renders the explicitly labelled fixture when UI preview is enabled', () => {
  isUiPreviewEnabled.mockReturnValue(true);

  render(<AnalyzeProcessingFixturePage />);

  expect(
    screen.getByRole('heading', { name: 'Analyze processing motion fixture' }),
  ).toBeInTheDocument();
  expect(notFound).not.toHaveBeenCalled();
});

it('calls notFound before rendering whenever UI preview is disabled', () => {
  isUiPreviewEnabled.mockReturnValue(false);

  expect(() => AnalyzeProcessingFixturePage()).toThrow('NEXT_NOT_FOUND');
  expect(notFound).toHaveBeenCalledOnce();
});
