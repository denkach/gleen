import type { UnavailableTab } from '@/lib/result-workspace/presentation';

const messages: Record<
  UnavailableTab['reason'],
  { title: string; body: string }
> = {
  not_requested: {
    title: 'Artifact not requested',
    body: 'This artifact was not selected for this analysis.',
  },
  missing: {
    title: 'No artifact content',
    body: 'This analysis did not produce usable content for this artifact.',
  },
  pending: {
    title: 'Artifact still processing',
    body: 'This artifact is not ready yet. Other available results remain usable.',
  },
  malformed: {
    title: 'Artifact could not be read',
    body: 'The saved content is corrupted or uses an unsupported format.',
  },
  failed: {
    title: 'Artifact could not be generated',
    body: 'Generation failed, but the rest of this result is still available.',
  },
};

export function ArtifactState({ state }: Readonly<{ state: UnavailableTab }>) {
  const message = messages[state.reason];
  return (
    <section
      className="grid min-h-56 place-content-center rounded-2xl border border-[var(--border-default)] bg-white/[0.015] px-6 py-10 text-center"
      role="status"
    >
      <h2 className="font-[var(--font-display)] text-xl text-[var(--text-primary)]">
        {message.title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
        {message.body}
      </p>
      {state.reason === 'failed' && (
        <p className="mt-3 font-[var(--font-mono)] text-[10px] text-[var(--text-muted)]">
          {state.errorCode}
        </p>
      )}
    </section>
  );
}
