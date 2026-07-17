import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { AnalysisIntake } from '@/lib/youtube-intake/repository';

const { findOwned, findOwnedSnapshot, getUser, notFound, redirect } =
  vi.hoisted(() => ({
    findOwned: vi.fn(),
    findOwnedSnapshot: vi.fn(),
    getUser: vi.fn(),
    notFound: vi.fn((): never => {
      throw new Error('NEXT_NOT_FOUND');
    }),
    redirect: vi.fn((path: string): never => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    }),
  }));

vi.mock('next/navigation', () => ({ notFound, redirect }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock('@/lib/youtube-intake/supabase-repository', () => ({
  createSupabaseIntakeRepository: vi.fn(() => ({ findOwned })),
}));
vi.mock('@/lib/analysis-pipeline/supabase-repository', () => ({
  createSupabaseAnalysisRepository: vi.fn(() => ({ findOwnedSnapshot })),
}));
vi.mock('@/components/app-shell/analysis-processing-screen', () => ({
  AnalysisProcessingScreen: ({ intake }: { intake: AnalysisIntake }) => (
    <h1>{intake.title}</h1>
  ),
}));

import VideoIntakePage, { generateMetadata } from './page';

const intake = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: 'user-1',
  youtubeVideoId: 'dQw4w9WgXcQ',
  canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  title: 'Owned validated video',
  channelTitle: 'A channel',
  durationSeconds: 60,
  thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  transcriptLanguage: 'en',
  transcriptSegments: [],
  configuration: {
    outputLocale: 'en',
    summaryPreset: 'balanced',
    flashcardPreset: null,
    artifacts: ['summary'],
    analysisContractVersion: 1,
  },
  duplicateKey: 'a'.repeat(64),
  attempt: 1,
  status: 'ready',
  reanalysisOf: null,
  createdAt: '2026-07-12T10:00:00.000Z',
} satisfies AnalysisIntake;

const snapshot = {
  job: {
    id: 'job-1',
    analysisId: intake.id,
    userId: 'user-1',
    workflowRunId: null,
    status: 'running',
    stage: 'transcript',
    attempt: 1,
    revision: 2,
    errorCode: null,
    startedAt: null,
    completedAt: null,
    createdAt: '2026-07-17T00:00:00Z',
    updatedAt: '2026-07-17T00:00:00Z',
  },
  events: [],
  artifacts: [],
  usageReservation: {
    id: 'reservation-1',
    jobId: 'job-1',
    userId: 'user-1',
    status: 'reserved',
    updatedAt: '2026-07-17T00:00:00Z',
  },
} as const;

describe('owned intake readiness page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    findOwned.mockResolvedValue(intake);
    findOwnedSnapshot.mockResolvedValue(snapshot);
  });

  test('loads the asynchronously addressed owned intake', async () => {
    render(
      await VideoIntakePage({ params: Promise.resolve({ id: intake.id }) }),
    );

    expect(findOwned).toHaveBeenCalledWith('user-1', intake.id);
    expect(findOwnedSnapshot).toHaveBeenCalledWith('user-1', intake.id);
    expect(
      screen.getByRole('heading', { name: intake.title }),
    ).toBeInTheDocument();
  });

  test('redirects an expired session before querying intake data', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    await expect(
      VideoIntakePage({ params: Promise.resolve({ id: intake.id }) }),
    ).rejects.toThrow('NEXT_REDIRECT:/session-expired');
    expect(redirect).toHaveBeenCalledWith('/session-expired');
    expect(findOwned).not.toHaveBeenCalled();
  });

  test('returns not found for a missing or foreign intake', async () => {
    findOwned.mockResolvedValue(null);

    await expect(
      VideoIntakePage({ params: Promise.resolve({ id: 'foreign-id' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(findOwned).toHaveBeenCalledWith('user-1', 'foreign-id');
    expect(notFound).toHaveBeenCalledOnce();
    expect(screen.queryByText(intake.title)).not.toBeInTheDocument();
  });

  test('uses only an owned validated title for metadata', async () => {
    await expect(
      generateMetadata({ params: Promise.resolve({ id: intake.id }) }),
    ).resolves.toEqual({ title: `${intake.title} — Gleen` });

    findOwned.mockResolvedValue(null);
    await expect(
      generateMetadata({ params: Promise.resolve({ id: 'foreign-id' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
