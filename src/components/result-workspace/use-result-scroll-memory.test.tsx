import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  resultScrollMemoryKey,
  useResultScrollMemory,
} from './use-result-scroll-memory';

describe('useResultScrollMemory', () => {
  const frameCallbacks = new Map<number, FrameRequestCallback>();
  let nextFrame = 1;

  beforeEach(() => {
    sessionStorage.clear();
    frameCallbacks.clear();
    nextFrame = 1;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        const frame = nextFrame++;
        frameCallbacks.set(frame, callback);
        return frame;
      }),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((frame: number) => frameCallbacks.delete(frame)),
    );
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('stores independent positions per analysis and artifact', () => {
    const { result, rerender } = renderHook(
      ({ analysisId }) => useResultScrollMemory(analysisId),
      { initialProps: { analysisId: 'analysis-a' } },
    );

    act(() => {
      result.current.saveScrollPosition('summary', 120);
      result.current.saveScrollPosition('transcript', 780);
    });
    rerender({ analysisId: 'analysis-b' });
    act(() => result.current.saveScrollPosition('summary', 40));

    expect(
      sessionStorage.getItem(resultScrollMemoryKey('analysis-a', 'summary')),
    ).toBe('120');
    expect(
      sessionStorage.getItem(resultScrollMemoryKey('analysis-a', 'transcript')),
    ).toBe('780');
    expect(
      sessionStorage.getItem(resultScrollMemoryKey('analysis-b', 'summary')),
    ).toBe('40');
  });

  it('restores in an animation frame, clamps stale positions, and preserves hash', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 2_400,
    });
    Object.defineProperty(document.body, 'scrollHeight', {
      configurable: true,
      value: 2_100,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    window.history.replaceState(null, '', '/app/video/result#transcript');
    sessionStorage.setItem(
      resultScrollMemoryKey('analysis-a', 'transcript'),
      '5000',
    );
    const { result } = renderHook(() => useResultScrollMemory('analysis-a'));

    act(() => result.current.restoreScrollPosition('transcript'));
    expect(scrollTo).not.toHaveBeenCalled();
    act(() => {
      for (const [frame, callback] of frameCallbacks) {
        frameCallbacks.delete(frame);
        callback(0);
      }
    });

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
      top: 1_600,
      left: 0,
      behavior: 'auto',
    });
    expect(window.location.hash).toBe('#transcript');
  });

  it('does not restore another analysis position and cancels pending work', () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    sessionStorage.setItem(
      resultScrollMemoryKey('analysis-a', 'summary'),
      '240',
    );
    const view = renderHook(() => useResultScrollMemory('analysis-b'));

    act(() => view.result.current.restoreScrollPosition('summary'));
    view.unmount();
    act(() => {
      for (const callback of frameCallbacks.values()) callback(0);
    });

    expect(scrollTo).not.toHaveBeenCalled();
    expect(cancelAnimationFrame).toHaveBeenCalledOnce();
  });
});
