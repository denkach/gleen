'use client';

import { useCallback } from 'react';
import type { ResultMessages } from '@/lib/i18n/messages/results';
import type { ResultSaveState } from '@/lib/result-workspace/actions';

import { AutosaveStatus } from './autosave-status';
import { useAutosave } from './use-autosave';

export function EditableTitle({
  analysisId,
  title,
  serverTitle = title,
  onTitleChange,
  revision,
  saveTitle,
  copy,
}: Readonly<{
  analysisId: string;
  title: string;
  serverTitle?: string;
  onTitleChange: (title: string) => void;
  revision: string;
  saveTitle: (input: unknown) => Promise<ResultSaveState>;
  copy: ResultMessages;
}>) {
  const save = useCallback(
    (value: string, expectedUpdatedAt: string) =>
      saveTitle({ analysisId, expectedUpdatedAt, title: value }),
    [analysisId, saveTitle],
  );
  const autosave = useAutosave({
    value: title,
    serverValue: serverTitle,
    revision,
    save,
  });

  return (
    <div className="border-b border-[var(--border-default)] px-6 py-4 max-[720px]:px-4">
      <label className="block">
        <span className="sr-only">{copy.resultTitle}</span>
        <input
          aria-label={copy.resultTitle}
          value={title}
          maxLength={300}
          onChange={(event) => onTitleChange(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-transparent bg-transparent px-2 font-[var(--font-display)] text-xl text-[var(--text-primary)] hover:border-[var(--border-hover)] focus:border-[var(--border-strong)] focus:outline-none"
        />
      </label>
      <AutosaveStatus {...autosave} copy={copy} />
    </div>
  );
}
