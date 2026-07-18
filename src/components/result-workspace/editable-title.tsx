'use client';

import { useCallback, useState } from 'react';
import type { ResultSaveState } from '@/lib/result-workspace/actions';

import { AutosaveStatus } from './autosave-status';
import { useAutosave } from './use-autosave';

export function EditableTitle({
  analysisId,
  initialTitle,
  revision,
  saveTitle,
}: Readonly<{
  analysisId: string;
  initialTitle: string;
  revision: string;
  saveTitle: (input: unknown) => Promise<ResultSaveState>;
}>) {
  const [title, setTitle] = useState(initialTitle);
  const save = useCallback(
    (value: string, expectedUpdatedAt: string) =>
      saveTitle({ analysisId, expectedUpdatedAt, title: value }),
    [analysisId, saveTitle],
  );
  const autosave = useAutosave({ value: title, revision, save });

  return (
    <div className="border-b border-[var(--border-default)] px-6 py-4 max-[720px]:px-4">
      <label className="block">
        <span className="sr-only">Result title</span>
        <input
          aria-label="Result title"
          value={title}
          maxLength={300}
          onChange={(event) => setTitle(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-transparent bg-transparent px-2 font-[var(--font-display)] text-xl text-[var(--text-primary)] hover:border-[var(--border-hover)] focus:border-[var(--border-strong)] focus:outline-none"
        />
      </label>
      <AutosaveStatus {...autosave} />
    </div>
  );
}
