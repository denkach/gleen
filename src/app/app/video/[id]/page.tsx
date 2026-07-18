import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { ResultWorkspace } from '@/components/result-workspace/result-workspace';
import {
  createSupabaseAnalysisRepository,
  type SupabaseAnalysisClient,
} from '@/lib/analysis-pipeline/supabase-repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  saveResultArtifact,
  saveResultTitle,
} from '@/lib/result-workspace/actions';
import { normalizeResultWorkspace } from '@/lib/result-workspace/presentation';
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

  if (snapshot.job.status === 'complete' || snapshot.job.status === 'partial')
    return (
      <ResultWorkspace
        model={normalizeResultWorkspace(intake, snapshot)}
        saveTitle={saveResultTitle}
        saveArtifact={saveResultArtifact}
      />
    );

  redirect(`/app?analysis=${encodeURIComponent(intake.id)}`);
}
