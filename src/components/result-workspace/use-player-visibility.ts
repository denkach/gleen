import { useEffect, useState, type RefObject } from 'react';

export const playerVisibilityThreshold = 0.4;

export function usePlayerVisibility(
  playerRef: RefObject<Element | null>,
): boolean {
  const [playerVisible, setPlayerVisible] = useState(true);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find((candidate) => candidate.target === player);
        if (!entry) return;
        setPlayerVisible(
          entry.isIntersecting &&
            entry.intersectionRatio >= playerVisibilityThreshold,
        );
      },
      { threshold: [0, playerVisibilityThreshold] },
    );
    observer.observe(player);

    return () => observer.disconnect();
  }, [playerRef]);

  return playerVisible;
}
