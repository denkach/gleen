import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  adminClient,
  getRequestLocale,
  loadPublicResultProjection,
  notFound,
  resultWorkspace,
} = vi.hoisted(() => ({
  adminClient: { privileged: true },
  getRequestLocale: vi.fn(async () => 'en'),
  loadPublicResultProjection: vi.fn(),
  notFound: vi.fn((): never => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  resultWorkspace: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/i18n/request-locale', () => ({ getRequestLocale }));
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

import { resultMessages } from '@/lib/i18n/messages/results';
import PublicResultNotFound from './not-found';
import PublicResultPage, { dynamic, generateMetadata } from './page';

const token = 'A'.repeat(43);
const projection = {
  source: { title: 'Safe public result' },
  summary: { overview: 'Generated English summary' },
  transcript: { segments: [{ text: 'Generated English transcript' }] },
  userState: null,
};

describe('public result page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRequestLocale.mockResolvedValue('en');
    loadPublicResultProjection.mockResolvedValue(projection);
  });

  it('is uncached, noindex, and uses localized owner-independent metadata', async () => {
    getRequestLocale.mockResolvedValue('de');

    expect(dynamic).toBe('force-dynamic');
    await expect(generateMetadata()).resolves.toEqual(
      expect.objectContaining({
        title: resultMessages.de.publicViewTitle,
        description: resultMessages.de.publicViewShared,
        robots: expect.objectContaining({ index: false, follow: false }),
      }),
    );
    expect(JSON.stringify(await generateMetadata())).not.toContain(
      'Safe public result',
    );
  });

  it('uses the public request locale without changing shared generated content', async () => {
    getRequestLocale.mockResolvedValue('de');

    render(await PublicResultPage({ params: Promise.resolve({ token }) }));
    expect(loadPublicResultProjection).toHaveBeenCalledWith(adminClient, token);
    expect(resultWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'public',
        copy: resultMessages.de,
        model: projection,
      }),
    );
    expect(resultWorkspace.mock.calls[0]?.[0]).not.toHaveProperty('saveTitle');
    expect(resultWorkspace.mock.calls[0]?.[0]).not.toHaveProperty(
      'saveArtifact',
    );
    expect(screen.getByText(resultMessages.de.publicViewShared)).toBeVisible();
    expect(resultWorkspace.mock.calls[0]?.[0].model.summary.overview).toBe(
      'Generated English summary',
    );
    expect(
      resultWorkspace.mock.calls[0]?.[0].model.transcript.segments[0].text,
    ).toBe('Generated English transcript');
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

  it('renders localized neutral unavailable copy without diagnostics', async () => {
    getRequestLocale.mockResolvedValue('de');

    render(await PublicResultNotFound());
    expect(
      screen.getByRole('heading', {
        name: resultMessages.de.publicViewUnavailable,
      }),
    ).toBeVisible();
    expect(screen.getByText(resultMessages.de.publicViewExpired)).toBeVisible();
    expect(document.body.textContent).not.toMatch(/token|database|revoked_at/i);
  });
});
