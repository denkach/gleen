import { useRef, type TouchEventHandler } from 'react';

const swipeGuardSelector =
  'input,textarea,button,[role="slider"],[data-swipe-guard],[data-horizontal-scroll]';
const minimumHorizontalTravel = 56;
const minimumHorizontalRatio = 1.4;

function mobileResultViewport(): boolean {
  return (
    typeof window !== 'undefined' &&
    (typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 620px)').matches
      : window.innerWidth <= 620)
  );
}

function protectedTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element && Boolean(target.closest(swipeGuardSelector))
  );
}

function activeTextSelection(): boolean {
  const selection = window.getSelection?.();
  return Boolean(selection && !selection.isCollapsed);
}

export function useArtifactSwipe(
  options: Readonly<{
    onNext: () => void;
    onPrevious: () => void;
  }>,
) {
  const startRef = useRef<{
    identifier: number;
    x: number;
    y: number;
  } | null>(null);

  const onTouchStart: TouchEventHandler<HTMLElement> = (event) => {
    startRef.current = null;
    if (
      !mobileResultViewport() ||
      event.touches.length !== 1 ||
      protectedTarget(event.target) ||
      activeTextSelection()
    ) {
      return;
    }
    const touch = event.touches[0];
    startRef.current = {
      identifier: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const onTouchEnd: TouchEventHandler<HTMLElement> = (event) => {
    const start = startRef.current;
    startRef.current = null;
    if (!start || activeTextSelection()) return;
    const touch = Array.from(event.changedTouches).find(
      (candidate) => candidate.identifier === start.identifier,
    );
    if (!touch) return;
    const horizontalTravel = touch.clientX - start.x;
    const verticalTravel = touch.clientY - start.y;
    const horizontalDistance = Math.abs(horizontalTravel);
    const verticalDistance = Math.abs(verticalTravel);
    if (
      horizontalDistance < minimumHorizontalTravel ||
      horizontalDistance < verticalDistance * minimumHorizontalRatio
    ) {
      return;
    }
    if (horizontalTravel < 0) options.onNext();
    else options.onPrevious();
  };

  const onTouchCancel: TouchEventHandler<HTMLElement> = () => {
    startRef.current = null;
  };

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
