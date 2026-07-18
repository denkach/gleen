import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser, saveOwnedTitle, saveOwnedArtifact } = vi.hoisted(() => ({
  getUser: vi.fn(),
  saveOwnedTitle: vi.fn(),
  saveOwnedArtifact: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock('@/lib/youtube-intake/supabase-repository', () => ({
  createSupabaseIntakeRepository: vi.fn(() => ({ saveOwnedTitle })),
}));
vi.mock('@/lib/analysis-pipeline/supabase-repository', () => ({
  createSupabaseAnalysisRepository: vi.fn(() => ({ saveOwnedArtifact })),
}));

import { saveResultArtifact, saveResultTitle } from './actions';

const userId = '11111111-1111-4111-8111-111111111111';
const analysisId = '22222222-2222-4222-8222-222222222222';
const expectedUpdatedAt = '2026-07-18T10:00:00.000Z';

describe('result editing server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: userId } } });
  });

  it('rejects unauthenticated edits without touching persistence', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    await expect(
      saveResultTitle({ analysisId, title: 'Edited', expectedUpdatedAt }),
    ).resolves.toEqual({ status: 'error' });
    expect(saveOwnedTitle).not.toHaveBeenCalled();
  });

  it('returns a controlled error for invalid artifact input', async () => {
    await expect(
      saveResultArtifact({
        analysisId,
        kind: 'transcript',
        content: { schemaVersion: 1, segments: [] },
        expectedUpdatedAt,
      }),
    ).resolves.toEqual({ status: 'error' });
    expect(saveOwnedArtifact).not.toHaveBeenCalled();
  });

  it('maps a cross-user or stale title update to conflict', async () => {
    saveOwnedTitle.mockResolvedValue(null);

    await expect(
      saveResultTitle({ analysisId, title: 'Edited', expectedUpdatedAt }),
    ).resolves.toEqual({ status: 'conflict' });
    expect(saveOwnedTitle).toHaveBeenCalledWith({
      userId,
      analysisId,
      title: 'Edited',
      expectedUpdatedAt,
    });
  });

  it('returns the new timestamp after a successful owned artifact update', async () => {
    const updatedAt = '2026-07-18T10:00:01.000Z';
    const content = {
      schemaVersion: 1 as const,
      cards: [{ front: 'Question', back: 'Answer' }],
    };
    saveOwnedArtifact.mockResolvedValue(updatedAt);

    await expect(
      saveResultArtifact({
        analysisId,
        kind: 'flashcards',
        content,
        expectedUpdatedAt,
      }),
    ).resolves.toEqual({ status: 'saved', updatedAt });
    expect(saveOwnedArtifact).toHaveBeenCalledWith({
      userId,
      analysisId,
      kind: 'flashcards',
      content,
      expectedUpdatedAt,
    });
  });

  it('does not expose repository failures', async () => {
    saveOwnedArtifact.mockRejectedValue(new Error('provider detail'));

    await expect(
      saveResultArtifact({
        analysisId,
        kind: 'summary',
        content: {
          schemaVersion: 2,
          title: 'Title',
          overview: 'Overview',
          keyPoints: [{ text: 'Point' }],
        },
        expectedUpdatedAt,
      }),
    ).resolves.toEqual({ status: 'error' });
  });
});
