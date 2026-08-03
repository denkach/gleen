import type { ResultMessages } from '@/lib/i18n/messages/results';

import type { AutosaveState } from './use-autosave';

export function AutosaveStatus({
  status,
  retry,
  copy,
}: Readonly<{
  status: AutosaveState;
  retry: () => void;
  copy: ResultMessages;
}>) {
  if (status === 'idle') return null;
  const retryable = status === 'error' || status === 'offline';
  const label =
    status === 'saving'
      ? copy.stateSaving
      : status === 'saved'
        ? copy.stateSaved
        : status === 'conflict'
          ? copy.autosaveConflict
          : copy.stateNetworkError;
  return (
    <div className="flex min-h-6 flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
      <p role="status" aria-live="polite">
        {label}
      </p>
      {retryable && (
        <button
          type="button"
          onClick={retry}
          className="min-h-11 rounded-lg px-3 text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-4"
        >
          {copy.stateRetry}
        </button>
      )}
    </div>
  );
}
