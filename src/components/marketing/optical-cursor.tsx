'use client';

import { useEffect, useRef, useState } from 'react';

import { getBrowserMotionPolicy } from './motion-policy';

export function OpticalCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const policy = getBrowserMotionPolicy(window.matchMedia?.bind(window));
    setEnabled(policy.enableCursor);
    if (!policy.enableCursor) return;
    const move = (event: PointerEvent) => {
      ref.current?.style.setProperty(
        'transform',
        `translate3d(${event.clientX}px,${event.clientY}px,0)`,
      );
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  return enabled ? (
    <div className="optical-cursor" ref={ref} aria-hidden="true">
      <span />
    </div>
  ) : null;
}
