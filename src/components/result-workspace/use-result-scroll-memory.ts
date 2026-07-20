import { useCallback, useEffect, useRef } from 'react';

import type { ResultArtifact } from '@/lib/result-workspace/navigation';

export function resultScrollMemoryKey(
  analysisId: string,
  artifact: ResultArtifact,
): string {
  return `gleen:result-scroll:${analysisId}:${artifact}`;
}

export function useResultScrollMemory(_analysisId: string) {
  const frameRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const saveScrollPosition = useCallback(
    (artifact: ResultArtifact, position = window.scrollY) => {
      const safePosition = Number.isFinite(position)
        ? Math.max(0, position)
        : 0;
      try {
        window.sessionStorage.setItem(
          resultScrollMemoryKey(_analysisId, artifact),
          String(safePosition),
        );
      } catch {
        // A blocked or full session store must not interrupt navigation.
      }
    },
    [_analysisId],
  );

  const restoreScrollPosition = useCallback(
    (artifact: ResultArtifact) => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        let storedPosition: string | null = null;
        try {
          storedPosition = window.sessionStorage.getItem(
            resultScrollMemoryKey(_analysisId, artifact),
          );
        } catch {
          return;
        }
        if (storedPosition === null) return;
        const parsedPosition = Number(storedPosition);
        if (!Number.isFinite(parsedPosition)) return;
        const documentHeight = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
        );
        const maximum = Math.max(0, documentHeight - window.innerHeight);
        window.scrollTo({
          top: Math.min(maximum, Math.max(0, parsedPosition)),
          left: 0,
          behavior: 'auto',
        });
      });
    },
    [_analysisId],
  );

  return {
    saveScrollPosition,
    restoreScrollPosition,
  };
}
