import { afterEach, describe, expect, expectTypeOf, test, vi } from 'vitest';

import { trackResultEvent, type ResultEvent } from './result-events';

describe('result analytics events', () => {
  afterEach(() => vi.restoreAllMocks());

  test('dispatches only a validated content-free event', () => {
    const listener = vi.fn();
    window.addEventListener('gleen:analytics', listener);

    trackResultEvent({
      name: 'result_overview_artifact_opened',
      artifact: 'summary',
    });

    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      name: 'result_overview_artifact_opened',
      artifact: 'summary',
    });
    window.removeEventListener('gleen:analytics', listener);
  });

  test.each([
    { name: 'result_favorite_changed', favorite: true, title: 'private' },
    {
      name: 'result_transcript_control_changed',
      control: 'filter',
      query: 'generated words',
    },
    {
      name: 'result_share_changed',
      action: 'copied',
      token: 'secret-token',
    },
    {
      name: 'result_chapter_selected',
      anonymousAnalysisId: 'anonymous-1',
      speaker: 'Owner Name',
    },
    { name: 'arbitrary_event', content: 'generated content' },
  ])('rejects invalid or sensitive runtime properties: %#', (event) => {
    const dispatchEvent = vi.spyOn(window, 'dispatchEvent');

    expect(() => (trackResultEvent as (value: unknown) => void)(event)).toThrow(
      TypeError,
    );
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  test('exposes a closed compile-time event union', () => {
    expectTypeOf<ResultEvent>().not.toHaveProperty('title');
    expectTypeOf<ResultEvent>().not.toHaveProperty('transcript');
    expectTypeOf<ResultEvent>().not.toHaveProperty('owner');
    expectTypeOf<ResultEvent>().not.toHaveProperty('token');
  });
});
