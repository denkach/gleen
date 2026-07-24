import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  initializeResultArtifactNavigation,
  navigateToResultArtifact,
  readResultArtifactHash,
  recommendNextArtifact,
  subscribeToResultArtifactNavigation,
} from './navigation';

describe('result artifact navigation', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  test.each([
    ['#overview', 'overview'],
    ['#summary', 'summary'],
    ['#flashcards', 'flashcards'],
    ['#timestamps', 'timestamps'],
    ['#transcript', 'transcript'],
    ['#export', 'export'],
  ] as const)('parses the supported hash %s', (hash, artifact) => {
    expect(readResultArtifactHash(hash)).toBe(artifact);
  });

  test('falls back to Overview for invalid and unavailable hashes', () => {
    expect(readResultArtifactHash('#private-content')).toBe('overview');
    expect(
      readResultArtifactHash('#transcript', ['overview', 'summary', 'export']),
    ).toBe('overview');
  });

  test('recommends one deterministic next artifact by documented precedence', () => {
    expect(
      recommendNextArtifact({
        summaryVisited: true,
        reviewed: 3,
        flashcardCount: 10,
        lastStudyAction: 'flashcards_reviewed',
      }),
    ).toBe('flashcards');
    expect(
      recommendNextArtifact({
        summaryVisited: true,
        reviewed: 10,
        flashcardCount: 10,
        lastStudyAction: 'transcript_used',
      }),
    ).toBe('transcript');
    expect(recommendNextArtifact({ summaryVisited: true, reviewed: 0 })).toBe(
      'flashcards',
    );
    expect(recommendNextArtifact({ summaryVisited: false, reviewed: 0 })).toBe(
      'summary',
    );
  });

  test('replaces history during initialization and pushes for user navigation', () => {
    window.history.replaceState(null, '', '/app/video/analysis#transcript');
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const pushState = vi.spyOn(window.history, 'pushState');

    expect(
      initializeResultArtifactNavigation(['overview', 'summary', 'export']),
    ).toBe('overview');
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      '',
      '/app/video/analysis#overview',
    );

    navigateToResultArtifact('summary');
    expect(pushState).toHaveBeenLastCalledWith(
      null,
      '',
      '/app/video/analysis#summary',
    );
  });

  test('canonicalizes an already valid initial hash with replaceState', () => {
    window.history.replaceState(null, '', '/app/video/analysis#summary');
    const replaceState = vi.spyOn(window.history, 'replaceState');

    expect(initializeResultArtifactNavigation()).toBe('summary');
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      '',
      '/app/video/analysis#summary',
    );
  });

  test('reacts to hashchange and popstate and removes both listeners', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToResultArtifactNavigation(listener, [
      'overview',
      'summary',
    ]);

    window.history.replaceState(null, '', '#summary');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(listener).toHaveBeenLastCalledWith('summary');

    window.history.replaceState(null, '', '#transcript');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(listener).toHaveBeenLastCalledWith('overview');

    unsubscribe();
    listener.mockClear();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(listener).not.toHaveBeenCalled();
  });

  test('does not require browser globals during SSR', () => {
    expect(initializeResultArtifactNavigation(undefined, null)).toBe(
      'overview',
    );
    expect(() => navigateToResultArtifact('summary', null)).not.toThrow();
  });
});
