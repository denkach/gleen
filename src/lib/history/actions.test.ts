import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createHistoryActions } from './actions';

const userId = '11111111-1111-4111-8111-111111111111';
const analysisId = '22222222-2222-4222-8222-222222222222';
const expectedUpdatedAt = '2026-07-24T12:00:00.000Z';

function dependencies() {
  const history = {
    findOwnedReusableDuplicate: vi.fn(),
    deleteOwned: vi.fn(),
  };
  const intake = {
    findOwned: vi.fn(),
    saveOwnedTitle: vi.fn(),
  };
  const userState = {
    savePreference: vi.fn(),
    markOpened: vi.fn(),
  };
  const reanalyze = vi.fn();
  const revalidateHistory = vi.fn();
  const context = {
    userId,
    history,
    intake,
    userState,
    reanalyze,
  };
  const authenticate = vi.fn<() => Promise<typeof context | null>>(
    async () => context,
  );

  return {
    authenticate,
    history,
    intake,
    userState,
    reanalyze,
    revalidateHistory,
  };
}

describe('History server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns unauthorized for every unauthenticated mutation', async () => {
    const deps = dependencies();
    deps.authenticate.mockResolvedValue(null);
    const actions = createHistoryActions(deps);

    await expect(
      actions.toggleHistoryFavorite({ analysisId, favorite: true }),
    ).resolves.toMatchObject({ ok: false, code: 'unauthorized' });
    await expect(
      actions.renameHistoryItem({
        analysisId,
        title: 'Renamed',
        expectedUpdatedAt,
      }),
    ).resolves.toMatchObject({ ok: false, code: 'unauthorized' });
    await expect(
      actions.deleteHistoryItem({ analysisId }),
    ).resolves.toMatchObject({ ok: false, code: 'unauthorized' });
    await expect(
      actions.reanalyzeHistoryDuplicate({ analysisId }),
    ).resolves.toMatchObject({ ok: false, code: 'unauthorized' });
    await expect(
      actions.markHistoryItemOpened({ analysisId }),
    ).resolves.toMatchObject({ ok: false, code: 'unauthorized' });

    expect(deps.intake.findOwned).not.toHaveBeenCalled();
    expect(deps.revalidateHistory).not.toHaveBeenCalled();
  });

  test('rejects invalid input before authentication', async () => {
    const deps = dependencies();
    const actions = createHistoryActions(deps);

    await expect(
      actions.renameHistoryItem({
        analysisId,
        title: '   ',
        expectedUpdatedAt,
      }),
    ).resolves.toMatchObject({ ok: false, code: 'invalid' });
    await expect(
      actions.toggleHistoryFavorite({
        analysisId,
        favorite: 'toggle',
        userId: 'attacker',
      }),
    ).resolves.toMatchObject({ ok: false, code: 'invalid' });

    expect(deps.authenticate).not.toHaveBeenCalled();
  });

  test('maps a foreign or deleted id to not-found before mutating', async () => {
    const deps = dependencies();
    deps.intake.findOwned.mockResolvedValue(null);
    const actions = createHistoryActions(deps);

    await expect(
      actions.toggleHistoryFavorite({ analysisId, favorite: true }),
    ).resolves.toMatchObject({ ok: false, code: 'not-found' });
    await expect(
      actions.renameHistoryItem({
        analysisId,
        title: 'Renamed',
        expectedUpdatedAt,
      }),
    ).resolves.toMatchObject({ ok: false, code: 'not-found' });
    await expect(
      actions.deleteHistoryItem({ analysisId }),
    ).resolves.toMatchObject({ ok: false, code: 'not-found' });
    await expect(
      actions.markHistoryItemOpened({ analysisId }),
    ).resolves.toMatchObject({ ok: false, code: 'not-found' });

    expect(deps.userState.savePreference).not.toHaveBeenCalled();
    expect(deps.intake.saveOwnedTitle).not.toHaveBeenCalled();
    expect(deps.history.deleteOwned).not.toHaveBeenCalled();
    expect(deps.userState.markOpened).not.toHaveBeenCalled();
  });

  test('persists favorite through owned result state and revalidates History', async () => {
    const deps = dependencies();
    deps.intake.findOwned.mockResolvedValue({ id: analysisId });
    const actions = createHistoryActions(deps);

    await expect(
      actions.toggleHistoryFavorite({ analysisId, favorite: false }),
    ).resolves.toEqual({ ok: true, data: undefined });

    expect(deps.userState.savePreference).toHaveBeenCalledWith({
      userId,
      analysisId,
      favorite: false,
    });
    expect(deps.revalidateHistory).toHaveBeenCalledOnce();
  });

  test('reuses title validation and the optimistic revision conflict path', async () => {
    const deps = dependencies();
    deps.intake.findOwned.mockResolvedValue({ id: analysisId });
    deps.intake.saveOwnedTitle.mockResolvedValue(null);
    const actions = createHistoryActions(deps);

    await expect(
      actions.renameHistoryItem({
        analysisId,
        title: '  Renamed  ',
        expectedUpdatedAt,
      }),
    ).resolves.toMatchObject({ ok: false, code: 'conflict' });
    expect(deps.intake.saveOwnedTitle).toHaveBeenCalledWith({
      userId,
      analysisId,
      title: 'Renamed',
      expectedUpdatedAt,
    });
    expect(deps.revalidateHistory).not.toHaveBeenCalled();

    deps.intake.saveOwnedTitle.mockResolvedValue('2026-07-24T12:00:01.000Z');
    await expect(
      actions.renameHistoryItem({
        analysisId,
        title: 'Renamed',
        expectedUpdatedAt,
      }),
    ).resolves.toEqual({
      ok: true,
      data: { updatedAt: '2026-07-24T12:00:01.000Z' },
    });
    expect(deps.revalidateHistory).toHaveBeenCalledOnce();
  });

  test('deletes only through the owner-scoped repository', async () => {
    const deps = dependencies();
    deps.intake.findOwned.mockResolvedValue({ id: analysisId });
    deps.history.deleteOwned.mockResolvedValue(true);
    const actions = createHistoryActions(deps);

    await expect(actions.deleteHistoryItem({ analysisId })).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(deps.history.deleteOwned).toHaveBeenCalledWith(userId, analysisId);
    expect(deps.revalidateHistory).toHaveBeenCalledOnce();

    deps.history.deleteOwned.mockResolvedValue(false);
    await expect(
      actions.deleteHistoryItem({ analysisId }),
    ).resolves.toMatchObject({ ok: false, code: 'not-found' });
  });

  test('reanalyzes only the server-confirmed reusable source id', async () => {
    const deps = dependencies();
    deps.history.findOwnedReusableDuplicate.mockResolvedValue({
      id: analysisId,
      sourceId: analysisId,
    });
    deps.reanalyze.mockResolvedValue({
      redirectTo: '/app/video/33333333-3333-4333-8333-333333333333',
    });
    const actions = createHistoryActions(deps);

    await expect(
      actions.reanalyzeHistoryDuplicate({
        analysisId,
        sourceId: 'attacker-controlled',
      }),
    ).resolves.toMatchObject({ ok: false, code: 'invalid' });
    await expect(
      actions.reanalyzeHistoryDuplicate({ analysisId }),
    ).resolves.toEqual({
      ok: true,
      data: {
        redirectTo: '/app/video/33333333-3333-4333-8333-333333333333',
      },
    });

    expect(deps.history.findOwnedReusableDuplicate).toHaveBeenCalledWith(
      userId,
      analysisId,
    );
    expect(deps.reanalyze).toHaveBeenCalledWith(analysisId);
    expect(deps.revalidateHistory).toHaveBeenCalledOnce();
  });

  test('returns not-found when a duplicate is no longer reusable', async () => {
    const deps = dependencies();
    deps.history.findOwnedReusableDuplicate.mockResolvedValue(null);
    const actions = createHistoryActions(deps);

    await expect(
      actions.reanalyzeHistoryDuplicate({ analysisId }),
    ).resolves.toMatchObject({ ok: false, code: 'not-found' });
    expect(deps.reanalyze).not.toHaveBeenCalled();
  });

  test('marks only owned analyses opened with a server timestamp', async () => {
    const deps = dependencies();
    deps.intake.findOwned.mockResolvedValue({ id: analysisId });
    const actions = createHistoryActions(deps);

    await expect(
      actions.markHistoryItemOpened({ analysisId }),
    ).resolves.toEqual({ ok: true, data: undefined });
    expect(deps.userState.markOpened).toHaveBeenCalledWith({
      userId,
      analysisId,
      openedAt: expect.any(String),
    });
    expect(deps.revalidateHistory).toHaveBeenCalledOnce();
  });

  test('never exposes persistence failure details', async () => {
    const deps = dependencies();
    deps.intake.findOwned.mockRejectedValue(
      new Error('private provider response'),
    );
    const actions = createHistoryActions(deps);

    const result = await actions.deleteHistoryItem({ analysisId });
    expect(result).toMatchObject({ ok: false, code: 'failed' });
    if (!result.ok) expect(result.message).not.toContain('provider');
  });
});
