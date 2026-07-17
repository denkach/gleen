import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { AnalysisProcessingScreen } from '@/components/app-shell/analysis-processing-screen';
import {
  refreshAnalysisSnapshot,
  retryAnalysis,
} from '@/lib/analysis-pipeline/retry-actions';
import {
  createSupabaseAnalysisRepository,
  type SupabaseAnalysisClient,
} from '@/lib/analysis-pipeline/supabase-repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';
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

  return (
    <AnalysisProcessingScreen
      intake={intake}
      initialSnapshot={snapshot}
      retryAction={retryAnalysis}
      refreshAction={refreshAnalysisSnapshot}
    />
  );
}
