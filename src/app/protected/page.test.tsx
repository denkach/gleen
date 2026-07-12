import { expect, it, vi } from 'vitest';

const redirect = vi.hoisted(() =>
  vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
);

vi.mock('next/navigation', () => ({ redirect }));

import ProtectedCompatibilityPage from './page';

it('redirects the compatibility route to the authenticated app', async () => {
  await expect(ProtectedCompatibilityPage()).rejects.toThrow(
    'NEXT_REDIRECT:/app',
  );
  expect(redirect).toHaveBeenCalledWith('/app');
});
