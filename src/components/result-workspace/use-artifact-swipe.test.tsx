import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useArtifactSwipe } from './use-artifact-swipe';

function SwipeHarness({
  onNext,
  onPrevious,
}: Readonly<{ onNext: () => void; onPrevious: () => void }>) {
  const handlers = useArtifactSwipe({ onNext, onPrevious });

  return (
    <div data-testid="swipe-root" {...handlers}>
      <span data-testid="plain">Content</span>
      <input data-testid="input" />
      <textarea data-testid="textarea" />
      <button data-testid="button" type="button">
        Action
      </button>
      <span data-testid="slider" role="slider" aria-valuenow={0} tabIndex={0} />
      <span data-testid="guard" data-swipe-guard />
      <span data-testid="horizontal" data-horizontal-scroll />
    </div>
  );
}

function swipe(
  target: Element,
  start: Readonly<{ x: number; y: number }>,
  end: Readonly<{ x: number; y: number }>,
) {
  fireEvent.touchStart(target, {
    touches: [{ identifier: 1, clientX: start.x, clientY: start.y }],
  });
  fireEvent.touchEnd(target, {
    changedTouches: [{ identifier: 1, clientX: end.x, clientY: end.y }],
  });
}

describe('useArtifactSwipe', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: true,
    } as Selection);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('requires 56 pixels and a 1.4 horizontal-to-vertical ratio', () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();
    render(<SwipeHarness onNext={onNext} onPrevious={onPrevious} />);
    const root = screen.getByTestId('swipe-root');

    swipe(root, { x: 100, y: 100 }, { x: 45, y: 100 });
    swipe(root, { x: 100, y: 100 }, { x: 44, y: 141 });
    expect(onNext).not.toHaveBeenCalled();

    swipe(root, { x: 100, y: 100 }, { x: 44, y: 140 });
    expect(onNext).toHaveBeenCalledOnce();
    swipe(root, { x: 44, y: 100 }, { x: 100, y: 100 });
    expect(onPrevious).toHaveBeenCalledOnce();
  });

  it('rejects vertical gestures and every protected interactive target', () => {
    const onNext = vi.fn();
    render(<SwipeHarness onNext={onNext} onPrevious={vi.fn()} />);
    swipe(screen.getByTestId('plain'), { x: 150, y: 20 }, { x: 80, y: 120 });

    for (const id of [
      'input',
      'textarea',
      'button',
      'slider',
      'guard',
      'horizontal',
    ]) {
      swipe(screen.getByTestId(id), { x: 150, y: 100 }, { x: 70, y: 100 });
    }

    expect(onNext).not.toHaveBeenCalled();
  });

  it('rejects active text selection and non-mobile viewports', () => {
    const onNext = vi.fn();
    const view = render(<SwipeHarness onNext={onNext} onPrevious={vi.fn()} />);
    vi.mocked(window.getSelection).mockReturnValue({
      isCollapsed: false,
    } as Selection);
    swipe(screen.getByTestId('plain'), { x: 150, y: 100 }, { x: 70, y: 100 });

    vi.mocked(window.getSelection).mockReturnValue({
      isCollapsed: true,
    } as Selection);
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: false,
    } as MediaQueryList);
    view.rerender(<SwipeHarness onNext={onNext} onPrevious={vi.fn()} />);
    swipe(screen.getByTestId('plain'), { x: 150, y: 100 }, { x: 70, y: 100 });

    expect(onNext).not.toHaveBeenCalled();
  });
});
