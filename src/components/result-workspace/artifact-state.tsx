import type { ResultMessages } from '@/lib/i18n/messages/results';
import type { UnavailableTab } from '@/lib/result-workspace/presentation';

function messageFor(reason: UnavailableTab['reason'], copy: ResultMessages) {
  switch (reason) {
    case 'not_requested':
      return {
        title: copy.artifactNotRequestedTitle,
        body: copy.artifactNotRequestedBody,
      };
    case 'missing':
      return {
        title: copy.artifactMissingTitle,
        body: copy.artifactMissingBody,
      };
    case 'pending':
      return {
        title: copy.artifactPendingTitle,
        body: copy.artifactPendingBody,
      };
    case 'malformed':
      return {
        title: copy.artifactMalformedTitle,
        body: copy.artifactMalformedBody,
      };
    case 'failed':
      return {
        title: copy.artifactFailedTitle,
        body: copy.artifactFailedBody,
      };
  }
}

export function ArtifactState({
  state,
  copy,
}: Readonly<{ state: UnavailableTab; copy: ResultMessages }>) {
  const message = messageFor(state.reason, copy);
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
