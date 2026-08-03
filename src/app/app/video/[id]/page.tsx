import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { ResultWorkspace } from '@/components/result-workspace/result-workspace';
import {
  createSupabaseAnalysisRepository,
  type SupabaseAnalysisClient,
} from '@/lib/analysis-pipeline/supabase-repository';
import { resultMessages } from '@/lib/i18n/messages/results';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  createResultShare,
  revokeResultShare,
  saveFlashcardReview,
  savePlaybackPosition,
  saveResultArtifact,
  saveResultPreference,
  saveResultTitle,
} from '@/lib/result-workspace/actions';
import { normalizeResultWorkspace } from '@/lib/result-workspace/presentation';
import {
  createSupabaseResultUserStateRepository,
  type SupabaseResultUserStateClient,
} from '@/lib/result-workspace/user-state-repository';
import {
  createSupabaseIntakeRepository,
  type SupabaseIntakeClient,
} from '@/lib/youtube-intake/supabase-repository';

type VideoIntakePageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

async function loadOwnedIntake({ params }: VideoIntakePageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/session-expired');

  const repository = createSupabaseIntakeRepository(
    supabase as unknown as SupabaseIntakeClient,
  );
  const intake = await repository.findOwned(user.id, id);
  if (!intake) notFound();

  return { intake, supabase, userId: user.id };
}

export async function generateMetadata(
  props: VideoIntakePageProps,
): Promise<Metadata> {
  const { intake } = await loadOwnedIntake(props);
  return { title: `${intake.title} — Gleen` };
}

export default async function VideoIntakePage(props: VideoIntakePageProps) {
  const { intake, supabase, userId } = await loadOwnedIntake(props);
  const repository = createSupabaseAnalysisRepository(
    supabase as unknown as SupabaseAnalysisClient,
  );
  const snapshot = await repository.findOwnedSnapshot(userId, intake.id);
  if (!snapshot) notFound();

  if (snapshot.job.status === 'complete' || snapshot.job.status === 'partial') {
    let userState = null;
    const userStateRepository = createSupabaseResultUserStateRepository(
      supabase as unknown as SupabaseResultUserStateClient,
    );
    try {
      userState = await userStateRepository.findOwned(userId, intake.id);
    } catch {
      // Artifact data remains usable, but private progress must stay unknown.
    }
    try {
      await userStateRepository.markOpened({
        userId,
        analysisId: intake.id,
        openedAt: new Date().toISOString(),
      });
    } catch {
      // Recently-opened state must never hide an owned result workspace.
    }
    const locale = await getRequestLocale();
    return (
      <ResultWorkspace
        model={normalizeResultWorkspace(intake, snapshot, userState)}
        copy={resultMessages[locale]}
        saveTitle={saveResultTitle}
        saveArtifact={saveResultArtifact}
        savePreference={saveResultPreference}
        savePlaybackPosition={savePlaybackPosition}
        saveFlashcardReview={saveFlashcardReview}
        createShare={createResultShare}
        revokeShare={revokeResultShare}
      />
    );
  }

  redirect(`/app?analysis=${encodeURIComponent(intake.id)}`);
}
