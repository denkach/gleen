import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOwned, savePlaybackPosition } = vi.hoisted(() => ({
  findOwned: vi.fn(),
  savePlaybackPosition: vi.fn(),
}));

vi.mock('@/lib/youtube-intake/supabase-repository', () => ({
  createSupabaseIntakeRepository: vi.fn(() => ({ findOwned })),
}));

vi.mock('./user-state-repository', () => ({
  createSupabaseResultUserStateRepository: vi.fn(() => ({
    savePlaybackPosition,
  })),
}));

import { persistOwnedPlaybackPosition } from './playback-persistence-server';

const userId = '11111111-1111-4111-8111-111111111111';
const input = {
  analysisId: '22222222-2222-4222-8222-222222222222',
  positionMs: 12_000,
  revision: 1_752_844_800_001,
};

describe('ordered playback persistence service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findOwned.mockResolvedValue({ durationSeconds: 213 });
  });

  it('returns conflict when the RPC rejects an equal or stale revision', async () => {
    savePlaybackPosition.mockResolvedValue(false);

    await expect(
      persistOwnedPlaybackPosition({} as never, userId, input),
    ).resolves.toEqual({ status: 'conflict' });
  });

  it('returns saved only when the RPC applies the revision', async () => {
    savePlaybackPosition.mockResolvedValue(true);

    await expect(
      persistOwnedPlaybackPosition({} as never, userId, input),
    ).resolves.toEqual({ status: 'saved' });
  });
});
