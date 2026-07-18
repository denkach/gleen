'use client';

import { useState } from 'react';
import type { FlashcardsArtifact } from '@/lib/analysis-pipeline/artifact-schemas';

export function FlashcardsTab({
  artifact,
}: Readonly<{ artifact: FlashcardsArtifact }>) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [studied, setStudied] = useState(0);
  const card = artifact.cards[index];
  const move = (next: number) => {
    setIndex(next);
    setFlipped(false);
  };
  return (
    <section className="result-flashcards" data-artifact="flashcards">
      <div className="mb-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>
          {index + 1} / {artifact.cards.length}
        </span>
        <span aria-live="polite">{studied} studied</span>
      </div>
      <div
        data-reduced-motion="instant"
        className="motion-reduce:transition-none"
      >
        <button
          type="button"
          aria-label={flipped ? 'Show question' : 'Show answer'}
          aria-pressed={flipped}
          onClick={() => setFlipped((value) => !value)}
          className="grid min-h-64 w-full place-content-center rounded-[20px] border border-[color-mix(in_srgb,var(--artifact-flashcards)_30%,transparent)] bg-[color-mix(in_srgb,var(--artifact-flashcards)_4%,var(--surface-panel))] p-8 text-center transition-[transform,border-color] duration-300 motion-reduce:transition-none"
        >
          <span className="mb-4 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--artifact-flashcards)]">
            {flipped ? 'Answer' : 'Question'}
          </span>
          <span className="font-[var(--font-display)] text-2xl leading-9 text-[var(--text-primary)]">
            {flipped ? card.back : card.front}
          </span>
        </button>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="min-h-11 px-4 text-sm text-[var(--text-secondary)] disabled:opacity-40"
          disabled={index === 0}
          onClick={() => move(index - 1)}
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
          disabled={index === artifact.cards.length - 1}
          onClick={() => move(index + 1)}
          aria-label="Next card"
        >
          Next
        </button>
      </div>
    </section>
  );
}
