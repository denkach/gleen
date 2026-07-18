import type { ResultWorkspaceModel } from '@/lib/result-workspace/presentation';

const labels = {
  summary: 'Summary',
  flashcards: 'Flashcards',
  timestamps: 'Timestamps',
  transcript: 'Transcript',
} as const;

export function OverviewTab({
  model,
  openTab,
}: Readonly<{
  model: ResultWorkspaceModel;
  openTab: (tab: keyof typeof labels) => void;
}>) {
  const ready = Object.entries(model.tabs).filter(
    ([, state]) => state.status === 'ready',
  );
  return (
    <section>
      <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
        Result overview
      </p>
      <h2 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--text-primary)]">
        {model.source.title}
      </h2>
      <p className="mt-3 max-w-2xl leading-7 text-[var(--text-secondary)]">
        One source, separated into {ready.length} ready knowledge artifacts.
        Unavailable results remain visible with their current state.
      </p>
      <ul className="mt-7 grid gap-3 sm:grid-cols-2">
        {(Object.keys(labels) as (keyof typeof labels)[]).map((key) => {
          const state = model.tabs[key];
          return (
            <li
              key={key}
              className="rounded-xl border border-[var(--border-default)] p-4"
            >
              <button
                type="button"
                className="min-h-11 w-full text-left"
                onClick={() => openTab(key)}
              >
                <span className="block text-[var(--text-primary)]">
                  {labels[key]}
                </span>
                <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                  {state.status === 'ready'
                    ? 'Ready to explore'
                    : state.reason.replace('_', ' ')}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
