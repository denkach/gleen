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

import AppShellFixturePage from './page';

beforeEach(() => vi.clearAllMocks());

it('renders the real app shell and New analysis home when preview is enabled', () => {
  isUiPreviewEnabled.mockReturnValue(true);

  render(<AppShellFixturePage />);

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

it('returns not found before rendering when preview is disabled', () => {
  isUiPreviewEnabled.mockReturnValue(false);

  expect(() => AppShellFixturePage()).toThrow('NEXT_NOT_FOUND');
  expect(notFound).toHaveBeenCalledOnce();
});
