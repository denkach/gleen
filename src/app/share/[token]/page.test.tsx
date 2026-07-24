import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { adminClient, loadPublicResultProjection, notFound, resultWorkspace } =
  vi.hoisted(() => ({
    adminClient: { privileged: true },
    loadPublicResultProjection: vi.fn(),
    notFound: vi.fn((): never => {
      throw new Error('NEXT_NOT_FOUND');
    }),
    resultWorkspace: vi.fn(),
  }));

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: vi.fn(() => adminClient),
}));
vi.mock('@/lib/result-workspace/share-repository', () => ({
  loadPublicResultProjection,
}));
vi.mock('@/components/result-workspace/result-workspace', () => ({
  ResultWorkspace: (props: {
    model: { source: { title: string } };
    mode: string;
  }) => {
    resultWorkspace(props);
    return <div data-testid="public-workspace">{props.model.source.title}</div>;
  },
}));

import { resultCopy } from '@/lib/result-workspace/copy';
import PublicResultNotFound from './not-found';
import PublicResultPage, { dynamic, metadata } from './page';

const token = 'A'.repeat(43);
const projection = {
  source: { title: 'Safe public result' },
  userState: null,
};

describe('public result page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadPublicResultProjection.mockResolvedValue(projection);
  });

  it('is uncached, noindex, and uses owner-independent metadata', () => {
    expect(dynamic).toBe('force-dynamic');
    expect(metadata).toEqual(
      expect.objectContaining({
        title: resultCopy.en.publicViewTitle,
        robots: expect.objectContaining({ index: false, follow: false }),
      }),
    );
    expect(JSON.stringify(metadata)).not.toContain('Safe public result');
  });

  it('loads an exact bearer token through the admin boundary and renders public mode', async () => {
    render(await PublicResultPage({ params: Promise.resolve({ token }) }));
    expect(loadPublicResultProjection).toHaveBeenCalledWith(adminClient, token);
    expect(resultWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        model: projection,
        mode: 'public',
        copy: resultCopy.en,
      }),
    );
    expect(resultWorkspace.mock.calls[0]?.[0]).not.toHaveProperty('saveTitle');
    expect(resultWorkspace.mock.calls[0]?.[0]).not.toHaveProperty(
      'saveArtifact',
    );
    expect(screen.getByText(resultCopy.en.publicViewShared)).toBeVisible();
    expect(screen.queryByText(token)).not.toBeInTheDocument();
  });

  it('uses the identical neutral not-found path for malformed, revoked, or foreign tokens', async () => {
    for (const candidate of ['bad', token, 'B'.repeat(43)]) {
      loadPublicResultProjection.mockResolvedValueOnce(null);
      await expect(
        PublicResultPage({ params: Promise.resolve({ token: candidate }) }),
      ).rejects.toThrow('NEXT_NOT_FOUND');
    }
    expect(notFound).toHaveBeenCalledTimes(3);
  });

  it('renders localized neutral unavailable copy without diagnostics', () => {
    render(<PublicResultNotFound />);
    expect(
      screen.getByRole('heading', {
        name: resultCopy.en.publicViewUnavailable,
      }),
    ).toBeVisible();
    expect(screen.getByText(resultCopy.en.publicViewExpired)).toBeVisible();
    expect(document.body.textContent).not.toMatch(/token|database|revoked_at/i);
  });
});
