import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser, persistOwnedPlaybackPosition } = vi.hoisted(() => ({
  getUser: vi.fn(),
  persistOwnedPlaybackPosition: vi.fn(),
}));

const supabase = { auth: { getUser } };

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => supabase),
}));

vi.mock('@/lib/result-workspace/playback-persistence-server', () => ({
  persistOwnedPlaybackPosition,
  playbackPositionSchema: {
    safeParse(input: unknown) {
      const value = input as Record<string, unknown>;
      const valid =
        value !== null &&
        typeof value === 'object' &&
        Object.keys(value).length === 3 &&
        typeof value.analysisId === 'string' &&
        typeof value.positionMs === 'number' &&
        Number.isSafeInteger(value.positionMs) &&
        value.positionMs >= 0 &&
        typeof value.revision === 'number' &&
        Number.isSafeInteger(value.revision) &&
        value.revision >= 0;
      return valid ? { success: true, data: value } : { success: false };
    },
  },
}));

import { POST } from './route';

const analysisId = '22222222-2222-4222-8222-222222222222';
const userId = '11111111-1111-4111-8111-111111111111';
const input = {
  analysisId,
  positionMs: 12_000,
  revision: 1_752_844_800_001,
};

function request(body: unknown) {
  return new NextRequest('https://gleen.example/api/result/playback-position', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('ordered playback pagehide route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: userId } } });
    persistOwnedPlaybackPosition.mockResolvedValue({ status: 'saved' });
  });

  it('strictly rejects invalid input before authentication', async () => {
    const response = await POST(request({ ...input, userId }));

    expect(response.status).toBe(400);
    expect(getUser).not.toHaveBeenCalled();
    expect(persistOwnedPlaybackPosition).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated pagehide request', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(request(input));

    expect(response.status).toBe(401);
    expect(persistOwnedPlaybackPosition).not.toHaveBeenCalled();
  });

  it('uses the cookie-authenticated user and shared ordered persistence', async () => {
    const response = await POST(request(input));

    expect(response.status).toBe(202);
    expect(persistOwnedPlaybackPosition).toHaveBeenCalledExactlyOnceWith(
      supabase,
      userId,
      input,
    );
  });
});
