import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePlayerVisibility } from './use-player-visibility';

class TestIntersectionObserver implements IntersectionObserver {
  static instances: TestIntersectionObserver[] = [];

  readonly root = null;
  readonly rootMargin: string;
  readonly thresholds: readonly number[];
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
  readonly takeRecords = vi.fn(() => []);

  constructor(
    readonly callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {},
  ) {
    this.rootMargin = options.rootMargin ?? '0px';
    this.thresholds = Array.isArray(options.threshold)
      ? options.threshold
      : [options.threshold ?? 0];
    TestIntersectionObserver.instances.push(this);
  }
}

function VisibilityHarness() {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerVisible = usePlayerVisibility(playerRef);

  return (
    <>
      <div ref={playerRef} data-testid="player" />
      <output>{playerVisible ? 'visible' : 'outside'}</output>
    </>
  );
}

describe('usePlayerVisibility', () => {
  afterEach(() => {
    TestIntersectionObserver.instances = [];
    vi.unstubAllGlobals();
  });

  it('uses the sufficient-player threshold and updates visibility from entries', () => {
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
    render(<VisibilityHarness />);

    const observer = TestIntersectionObserver.instances[0];
    expect(observer).toBeDefined();
    expect(observer.thresholds).toContain(0.4);
    expect(observer.observe).toHaveBeenCalledExactlyOnceWith(
      screen.getByTestId('player'),
    );
    expect(screen.getByText('visible')).toBeInTheDocument();

    act(() =>
      observer.callback(
        [
          {
            target: screen.getByTestId('player'),
            isIntersecting: true,
            intersectionRatio: 0.39,
          } as unknown as IntersectionObserverEntry,
        ],
        observer,
      ),
    );
    expect(screen.getByText('outside')).toBeInTheDocument();

    act(() =>
      observer.callback(
        [
          {
            target: screen.getByTestId('player'),
            isIntersecting: true,
            intersectionRatio: 0.4,
          } as unknown as IntersectionObserverEntry,
        ],
        observer,
      ),
    );
    expect(screen.getByText('visible')).toBeInTheDocument();
  });

  it('owns one observer across orientation changes and disconnects on cleanup', () => {
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
    const view = render(<VisibilityHarness />);

    window.dispatchEvent(new Event('orientationchange'));
    view.rerender(<VisibilityHarness />);

    expect(TestIntersectionObserver.instances).toHaveLength(1);
    const observer = TestIntersectionObserver.instances[0];
    view.unmount();
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });
});
