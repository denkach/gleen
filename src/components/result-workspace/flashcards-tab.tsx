'use client';

import { useCallback, useState } from 'react';
import type { FlashcardsArtifact } from '@/lib/analysis-pipeline/artifact-schemas';
import type { ResultSaveState } from '@/lib/result-workspace/actions';

import { AutosaveStatus } from './autosave-status';
import { useAutosave } from './use-autosave';

export function FlashcardsTab({
  analysisId,
  artifact,
  onArtifactChange,
  revision,
  saveArtifact,
}: Readonly<{
  analysisId: string;
  artifact: FlashcardsArtifact;
  onArtifactChange: (artifact: FlashcardsArtifact) => void;
  revision: string;
  saveArtifact: (input: unknown) => Promise<ResultSaveState>;
}>) {
  const value = artifact;
  const setValue = (
    update: (current: FlashcardsArtifact) => FlashcardsArtifact,
  ) => onArtifactChange(update(value));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [studied, setStudied] = useState(0);
  const safeIndex = Math.min(index, value.cards.length - 1);
  const card = value.cards[safeIndex];
  const save = useCallback(
    (content: FlashcardsArtifact, expectedUpdatedAt: string) =>
      saveArtifact({
        analysisId,
        expectedUpdatedAt,
        kind: 'flashcards',
        content,
      }),
    [analysisId, saveArtifact],
  );
  const autosave = useAutosave({ value, revision, save });
  const move = (next: number) => {
    setIndex(next);
    setFlipped(false);
  };
  return (
    <section className="result-flashcards" data-artifact="flashcards">
      <div className="mb-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>
          {safeIndex + 1} / {value.cards.length}
        </span>
        <span aria-live="polite">{studied} studied</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(['front', 'back'] as const).map((side) => (
          <label key={side} className="text-xs text-[var(--text-secondary)]">
            {side === 'front' ? 'Question text' : 'Answer text'}
            <input
              aria-label={
                side === 'front' ? 'Flashcard question' : 'Flashcard answer'
              }
              value={card[side]}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  cards: current.cards.map((item, itemIndex) =>
                    itemIndex === safeIndex
                      ? { ...item, [side]: event.target.value }
                      : item,
                  ),
                }))
              }
              className="mt-1 min-h-11 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--artifact-flashcards)] focus:outline-none"
            />
          </label>
        ))}
      </div>
      <AutosaveStatus {...autosave} />
      <div
        data-reduced-motion="instant"
        className="motion-reduce:transition-none"
      >
        <button
          type="button"
          aria-label={flipped ? 'Show question' : 'Show answer'}
          aria-pressed={flipped}
          onClick={() => setFlipped((value) => !value)}
          className="w-full [perspective:1300px] motion-reduce:[&_[data-flashcard-scene]]:transition-none"
        >
          <span
            data-flashcard-scene=""
            className={`relative grid min-h-64 w-full rounded-[20px] border border-[color-mix(in_srgb,var(--artifact-flashcards)_30%,transparent)] bg-[color-mix(in_srgb,var(--artifact-flashcards)_4%,var(--surface-panel))] text-center [transform-style:preserve-3d] transition-[transform,border-color] duration-300 ${flipped ? '[transform:rotateY(180deg)]' : ''}`}
          >
            <span
              aria-hidden={flipped}
              className="absolute inset-0 grid place-content-center p-8 [backface-visibility:hidden]"
            >
              <span className="mb-4 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--artifact-flashcards)]">
                Question
              </span>
              <span className="font-[var(--font-display)] text-2xl leading-9 text-[var(--text-primary)]">
                {card.front}
              </span>
            </span>
            <span
              aria-hidden={!flipped}
              className="absolute inset-0 grid place-content-center p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]"
            >
              <span className="mb-4 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--artifact-flashcards)]">
                Answer
              </span>
              <span className="font-[var(--font-display)] text-2xl leading-9 text-[var(--text-primary)]">
                {card.back}
              </span>
            </span>
          </span>
        </button>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="min-h-11 px-4 text-sm text-[var(--text-secondary)] disabled:opacity-40"
          disabled={safeIndex === 0}
          onClick={() => move(safeIndex - 1)}
          aria-label="Previous card"
        >
          Previous
        </button>
        <div className="flex flex-wrap justify-center gap-2">
          {['Again', 'Hard', 'Got it'].map((label) => (
            <button
              key={label}
              type="button"
              className="min-h-11 rounded-lg border border-[var(--border-default)] px-4 text-sm text-[var(--text-primary)] hover:border-[var(--artifact-flashcards)]"
              onClick={() => setStudied((value) => value + 1)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="min-h-11 px-4 text-sm text-[var(--text-secondary)] disabled:opacity-40"
          disabled={safeIndex === value.cards.length - 1}
          onClick={() => move(safeIndex + 1)}
          aria-label="Next card"
        >
          Next
        </button>
      </div>
    </section>
  );
}
