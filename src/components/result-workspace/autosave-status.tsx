import type { ResultCopy } from '@/lib/result-workspace/copy';

import type { AutosaveState } from './use-autosave';

const labels: Record<AutosaveState, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  conflict:
    'A newer version is available. Your draft is still here; reload to reconcile before saving.',
  error: 'Couldn’t save. Your edit is still here.',
  offline: 'Offline. Your edit has not been saved.',
};

export function AutosaveStatus({
  status,
  retry,
  copy,
}: Readonly<{
  status: AutosaveState;
  retry: () => void;
  copy?: Pick<
    ResultCopy,
    'stateNetworkError' | 'stateRetry' | 'stateSaved' | 'stateSaving'
  >;
}>) {
  if (status === 'idle') return null;
  const retryable = status === 'error' || status === 'offline';
  const label = copy
    ? status === 'saving'
      ? copy.stateSaving
      : status === 'saved'
        ? copy.stateSaved
        : status === 'conflict'
          ? labels.conflict
          : copy.stateNetworkError
    : labels[status];
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
          {copy?.stateRetry ?? 'Retry'}
        </button>
      )}
    </div>
  );
}
