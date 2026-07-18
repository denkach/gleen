import { describe, expect, test, vi } from 'vitest';

import type { AnalysisSnapshot } from './domain';
import {
  historyEntryPresentation,
  resolveOwnedActiveAnalysis,
} from './recovery';
import type { AnalysisIntake } from '@/lib/youtube-intake/repository';

const intake = (id: string, userId = 'owner') =>
  ({ id, userId }) as AnalysisIntake;
const snapshot = (
  analysisId: string,
  status: AnalysisSnapshot['job']['status'],
) => ({ job: { analysisId, status } }) as AnalysisSnapshot;

describe('resolveOwnedActiveAnalysis', () => {
  test('prefers an explicitly owned active analysis over continuation and fallback', async () => {
    const findMostRecentOwnedActive = vi.fn();
    const result = await resolveOwnedActiveAnalysis({
      userId: 'owner',
      requestedAnalysisId: 'explicit',
      continuation: { rawUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      intakeRepository: {
        findOwned: vi.fn().mockResolvedValue(intake('explicit')),
      },
      analysisRepository: {
        findOwnedSnapshot: vi
          .fn()
          .mockResolvedValue(snapshot('explicit', 'running')),
        findMostRecentOwnedActive,
      },
    });

    expect(result.initialAnalysis?.intake.id).toBe('explicit');
    expect(result.continuation).toBeNull();
    expect(findMostRecentOwnedActive).not.toHaveBeenCalled();
  });

  test.each(['partial', 'complete', 'failed'] as const)(
    'rejects an explicitly owned %s analysis',
    async (status) => {
      const result = await resolveOwnedActiveAnalysis({
        userId: 'owner',
        requestedAnalysisId: 'explicit',
        continuation: null,
        intakeRepository: {
          findOwned: vi.fn().mockResolvedValue(intake('explicit')),
        },
        analysisRepository: {
          findOwnedSnapshot: vi
            .fn()
            .mockResolvedValue(snapshot('explicit', status)),
          findMostRecentOwnedActive: vi.fn().mockResolvedValue(null),
        },
      });

      expect(result.initialAnalysis).toBeNull();
    },
  );

  test('does not load a snapshot when the requested analysis is not owned', async () => {
    const findOwnedSnapshot = vi.fn();
    await resolveOwnedActiveAnalysis({
      userId: 'owner',
      requestedAnalysisId: 'someone-elses',
      continuation: null,
      intakeRepository: { findOwned: vi.fn().mockResolvedValue(null) },
      analysisRepository: {
        findOwnedSnapshot,
        findMostRecentOwnedActive: vi.fn().mockResolvedValue(null),
      },
    });

    expect(findOwnedSnapshot).not.toHaveBeenCalled();
  });

  test('preserves continuation precedence over the most recent active analysis', async () => {
    const findMostRecentOwnedActive = vi.fn();
    const continuation = {
      rawUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    };
    const result = await resolveOwnedActiveAnalysis({
      userId: 'owner',
      requestedAnalysisId: null,
      continuation,
      intakeRepository: { findOwned: vi.fn() },
      analysisRepository: {
        findOwnedSnapshot: vi.fn(),
        findMostRecentOwnedActive,
      },
    });

    expect(result.continuation).toEqual(continuation);
    expect(findMostRecentOwnedActive).not.toHaveBeenCalled();
  });

  test('falls back only to a valid active owned result', async () => {
    const active = {
      intake: intake('recent'),
      snapshot: snapshot('recent', 'queued'),
    };
    const result = await resolveOwnedActiveAnalysis({
      userId: 'owner',
      requestedAnalysisId: null,
      continuation: null,
      intakeRepository: { findOwned: vi.fn() },
      analysisRepository: {
        findOwnedSnapshot: vi.fn(),
        findMostRecentOwnedActive: vi.fn().mockResolvedValue(active),
      },
    });

    expect(result.initialAnalysis).toBe(active);
  });
});

describe('historyEntryPresentation', () => {
  test('maps active and terminal analyses to their production destinations', () => {
    expect(
      historyEntryPresentation({ id: 'active', status: 'running' }),
    ).toEqual({
      href: '/app?analysis=active',
      statusLabel: 'Processing',
    });
    expect(
      historyEntryPresentation({ id: 'done', status: 'complete' }),
    ).toEqual({
      href: '/app/video/done',
      statusLabel: 'Complete',
    });
  });
});
