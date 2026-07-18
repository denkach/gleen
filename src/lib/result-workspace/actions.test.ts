import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getUser,
  saveOwnedTitle,
  saveOwnedArtifact,
  findOwned,
  savePreference,
  savePlaybackPositionRepository,
  saveFlashcardReviewRepository,
} = vi.hoisted(() => ({
  getUser: vi.fn(),
  saveOwnedTitle: vi.fn(),
  saveOwnedArtifact: vi.fn(),
  findOwned: vi.fn(),
  savePreference: vi.fn(),
  savePlaybackPositionRepository: vi.fn(),
  saveFlashcardReviewRepository: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock('@/lib/youtube-intake/supabase-repository', () => ({
  createSupabaseIntakeRepository: vi.fn(() => ({ saveOwnedTitle, findOwned })),
}));
vi.mock('@/lib/analysis-pipeline/supabase-repository', () => ({
  createSupabaseAnalysisRepository: vi.fn(() => ({ saveOwnedArtifact })),
}));
vi.mock('./user-state-repository', () => ({
  createSupabaseResultUserStateRepository: vi.fn(() => ({
    savePreference,
    savePlaybackPosition: savePlaybackPositionRepository,
    saveFlashcardReview: saveFlashcardReviewRepository,
  })),
}));

import {
  saveFlashcardReview,
  savePlaybackPosition,
  saveResultArtifact,
  saveResultPreference,
  saveResultTitle,
} from './actions';

const userId = '11111111-1111-4111-8111-111111111111';
const analysisId = '22222222-2222-4222-8222-222222222222';
const expectedUpdatedAt = '2026-07-18T10:00:00.000Z';

describe('result editing server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: userId } } });
    findOwned.mockResolvedValue({ durationSeconds: 213 });
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

describe('result owner-state server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: userId } } });
    findOwned.mockResolvedValue({ durationSeconds: 213 });
  });

  it('rejects unauthenticated preference updates', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    await expect(
      saveResultPreference({ analysisId, favorite: true }),
    ).resolves.toEqual({ status: 'error' });
    expect(savePreference).not.toHaveBeenCalled();
  });

  it('requires an explicit boolean favorite', async () => {
    await expect(
      saveResultPreference({ analysisId, favorite: 'toggle' }),
    ).resolves.toEqual({ status: 'error' });
    expect(getUser).not.toHaveBeenCalled();
    expect(savePreference).not.toHaveBeenCalled();
  });

  it('uses the authenticated identity for a valid preference', async () => {
    await expect(
      saveResultPreference({ analysisId, favorite: false }),
    ).resolves.toEqual({ status: 'saved' });
    expect(savePreference).toHaveBeenCalledWith({
      userId,
      analysisId,
      favorite: false,
    });
  });

  it('rejects invalid playback before authentication or persistence', async () => {
    await expect(
      savePlaybackPosition({ analysisId, positionMs: -1, revision: 1 }),
    ).resolves.toEqual({ status: 'error' });
    expect(getUser).not.toHaveBeenCalled();
    expect(findOwned).not.toHaveBeenCalled();
    expect(savePlaybackPositionRepository).not.toHaveBeenCalled();
  });

  it('returns conflict for a foreign analysis', async () => {
    findOwned.mockResolvedValue(null);

    await expect(
      savePlaybackPosition({ analysisId, positionMs: 12_000, revision: 1 }),
    ).resolves.toEqual({ status: 'conflict' });
    expect(findOwned).toHaveBeenCalledWith(userId, analysisId);
    expect(savePlaybackPositionRepository).not.toHaveBeenCalled();
  });

  it('loads the owned intake and clamps playback to its duration', async () => {
    await expect(
      savePlaybackPosition({
        analysisId,
        positionMs: 999_000,
        revision: 1_752_844_800_001,
      }),
    ).resolves.toEqual({ status: 'saved' });
    expect(findOwned).toHaveBeenCalledWith(userId, analysisId);
    expect(savePlaybackPositionRepository).toHaveBeenCalledWith({
      analysisId,
      positionMs: 213_000,
      revision: 1_752_844_800_001,
    });
  });

  it('strictly rejects a missing playback revision', async () => {
    await expect(
      savePlaybackPosition({ analysisId, positionMs: 12_000 }),
    ).resolves.toEqual({ status: 'error' });
    expect(getUser).not.toHaveBeenCalled();
    expect(savePlaybackPositionRepository).not.toHaveBeenCalled();
  });

  it('persists the current revision and card index for a review', async () => {
    await expect(
      saveFlashcardReview({
        analysisId,
        artifactRevision: expectedUpdatedAt,
        cardIndex: 2,
        rating: 'got_it',
      }),
    ).resolves.toEqual({ status: 'saved' });
    expect(saveFlashcardReviewRepository).toHaveBeenCalledWith({
      userId,
      analysisId,
      artifactRevision: expectedUpdatedAt,
      cardIndex: 2,
      rating: 'got_it',
    });
  });

  it('strictly rejects invalid reviews', async () => {
    await expect(
      saveFlashcardReview({
        analysisId,
        artifactRevision: 'not-a-revision',
        cardIndex: -1,
        rating: 'easy',
      }),
    ).resolves.toEqual({ status: 'error' });
    expect(saveFlashcardReviewRepository).not.toHaveBeenCalled();
  });

  it('does not expose owner-state storage failures', async () => {
    savePreference.mockRejectedValue(new Error('provider detail'));

    await expect(
      saveResultPreference({ analysisId, favorite: true }),
    ).resolves.toEqual({ status: 'error' });
  });
});
