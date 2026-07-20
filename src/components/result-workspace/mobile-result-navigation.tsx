'use client';

import { useRef, useState, type RefObject } from 'react';

import { trackResultEvent } from '@/lib/analytics/result-events';
import type { ResultCopy } from '@/lib/result-workspace/copy';
import type { ResultArtifact } from '@/lib/result-workspace/navigation';

import type { ResultNavigationItem } from './result-navigation';
import { ResultSheet } from './result-sheet';

type PrimaryArtifact = Extract<
  ResultArtifact,
  'overview' | 'summary' | 'flashcards' | 'timestamps'
>;

const primaryArtifacts: readonly PrimaryArtifact[] = [
  'overview',
  'summary',
  'flashcards',
  'timestamps',
];

function NavigationIcon({
  artifact,
}: Readonly<{ artifact: ResultArtifact | 'more' }>) {
  const paths: Readonly<Record<ResultArtifact | 'more', string>> = {
    overview: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    summary: 'M5 5h14M5 9h14M5 13h9M5 17h11',
    flashcards: 'M6 5h12v14H6zM9 2h9a3 3 0 0 1 3 3v11',
    timestamps: 'M12 5v7l4 2M12 22a10 10 0 1 0-10-10',
    transcript: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
    export: 'M12 3v12M8 7l4-4 4 4M5 14v6h14v-6',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[artifact]} />
    </svg>
  );
}

export function MobileResultNavigation({
  activeArtifact,
  copy,
  items,
  onSelect,
  responsiveFallbackRef,
}: Readonly<{
  activeArtifact: ResultArtifact;
  copy: ResultCopy;
  items: readonly ResultNavigationItem[];
  onSelect: (artifact: ResultArtifact) => void;
  responsiveFallbackRef: RefObject<HTMLElement | null>;
}>) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const itemByArtifact = new Map(items.map((item) => [item.value, item]));
  const moreActive =
    activeArtifact === 'transcript' || activeArtifact === 'export';
  const selectArtifact = (artifact: ResultArtifact) => {
    trackResultEvent({ name: 'result_mobile_tab_changed', artifact });
    onSelect(artifact);
  };

  return (
    <>
      <nav className="result-mobile-navigation" aria-label={copy.tabsLabel}>
        {primaryArtifacts.map((artifact) => {
          const item = itemByArtifact.get(artifact);
          if (!item) return null;
          return (
            <button
              className="result-mobile-navigation-item"
              type="button"
              key={artifact}
              aria-current={activeArtifact === artifact ? 'page' : undefined}
              disabled={item.unavailable}
              onClick={() => selectArtifact(artifact)}
            >
              <NavigationIcon artifact={artifact} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          ref={moreTriggerRef}
          className="result-mobile-navigation-item"
          type="button"
          aria-current={moreActive ? 'page' : undefined}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
        >
          <NavigationIcon artifact="more" />
          <span>{copy.tabMore}</span>
        </button>
      </nav>
      <ResultSheet
        className="result-more-sheet"
        open={moreOpen}
        onOpenChange={setMoreOpen}
        title={copy.sheetMoreTitle}
        closeLabel={copy.sheetClose}
        responsiveFallbackRef={responsiveFallbackRef}
        restoreFocusRef={moreTriggerRef}
      >
        <div className="result-sheet-destinations">
          {(['transcript', 'export'] as const).map((artifact) => {
            const item = itemByArtifact.get(artifact);
            if (!item) return null;
            return (
              <button
                type="button"
                key={artifact}
                aria-current={activeArtifact === artifact ? 'page' : undefined}
                disabled={item.unavailable}
                onClick={() => {
                  setMoreOpen(false);
                  selectArtifact(artifact);
                }}
              >
                <NavigationIcon artifact={artifact} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </ResultSheet>
    </>
  );
}
