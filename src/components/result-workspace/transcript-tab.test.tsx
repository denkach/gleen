import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resultCopy } from '@/lib/result-workspace/copy';
import type { TranscriptPresentation } from '@/lib/result-workspace/presentation';

import { PlayerProvider } from './player-context';
import type {
  VideoPlayerController,
  VideoPlayerSnapshot,
} from './player-controller';
import { initialTranscriptUiState, TranscriptTab } from './transcript-tab';

const transcript: TranscriptPresentation = {
  schemaVersion: 2,
  language: 'en',
  segments: [
    {
      text: 'Purpose starts with a question.',
      offsetMs: 0,
      durationMs: 3_000,
      segmentType: 'question',
      speakerLabel: 'Host',
    },
    {
      text: 'Purpose creates trust.',
      offsetMs: 3_000,
      durationMs: 3_000,
      segmentType: 'insight',
      speakerLabel: 'Guest',
    },
    {
      text: 'A legacy segment stays readable.',
      offsetMs: 6_000,
      durationMs: 3_000,
      segmentType: 'other',
      speakerLabel: null,
    },
  ],
};

function createController() {
  let snapshot: VideoPlayerSnapshot = {
    status: 'ready',
    currentTimeMs: 0,
    durationMs: 9_000,
    playing: false,
    playbackRate: 1,
    availableRates: [1],
    volume: 100,
    muted: false,
    captionsAvailable: false,
  };
  const listeners = new Set<() => void>();
  const controller: VideoPlayerController = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    getCurrentTimeMs: () => snapshot.currentTimeMs,
    seekTo: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    toggleCaptions: vi.fn(),
    requestFullscreen: vi.fn(async () => undefined),
  };
  return {
    controller,
    update(next: Partial<VideoPlayerSnapshot>) {
      snapshot = { ...snapshot, ...next };
      act(() => listeners.forEach((listener) => listener()));
    },
  };
}

function renderTranscript({
  value = transcript,
  active = true,
  copy = resultCopy.en,
}: Readonly<{
  value?: TranscriptPresentation;
  active?: boolean;
  copy?: (typeof resultCopy)[keyof typeof resultCopy];
}> = {}) {
  const player = createController();
  function TranscriptHarness() {
    const [uiState, setUiState] = useState(initialTranscriptUiState);
    return (
      <TranscriptTab
        transcript={value}
        copy={copy}
        active={active}
        uiState={uiState}
        onUiStateChange={setUiState}
      />
    );
  }
  const view = render(
    <PlayerProvider controller={player.controller}>
      <TranscriptHarness />
    </PlayerProvider>,
  );
  return { ...view, ...player };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('TranscriptTab', () => {
  it('intersects localized text search with type filters and reports an empty result', async () => {
    const user = userEvent.setup();
    const analytics: unknown[] = [];
    window.addEventListener('gleen:analytics', (event) =>
      analytics.push((event as CustomEvent).detail),
    );
    renderTranscript();

    await user.click(screen.getByRole('button', { name: 'Key insight' }));
    await user.type(
      screen.getByRole('searchbox', { name: 'Search transcript' }),
      'purpose',
    );

    expect(screen.getByText('Purpose creates trust.')).toBeVisible();
    expect(screen.queryByText('Purpose starts with a question.')).toBeNull();
    expect(screen.queryByText('A legacy segment stays readable.')).toBeNull();

    await user.clear(
      screen.getByRole('searchbox', { name: 'Search transcript' }),
    );
    await user.type(
      screen.getByRole('searchbox', { name: 'Search transcript' }),
      'legacy',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      resultCopy.en.transcriptNoMatches,
    );
    expect(analytics).toContainEqual({
      name: 'result_transcript_control_changed',
      control: 'filter',
    });
    expect(JSON.stringify(analytics)).not.toContain('purpose');
  });

  it('keeps normalized v1 other segments in All without misclassifying them', async () => {
    const user = userEvent.setup();
    renderTranscript({
      value: {
        schemaVersion: 1,
        language: 'en',
        segments: [transcript.segments[2]],
      },
    });

    expect(screen.getByText('A legacy segment stays readable.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Key insight' }));
    expect(screen.queryByText('A legacy segment stays readable.')).toBeNull();
  });

  it('disables speaker labels honestly when none are reliable', () => {
    renderTranscript({
      value: {
        schemaVersion: 1,
        language: 'en',
        segments: transcript.segments.map((segment) => ({
          ...segment,
          speakerLabel: null,
        })),
      },
    });

    expect(
      screen.getByRole('switch', { name: 'Speaker labels' }),
    ).toBeDisabled();
    expect(
      screen.getByText(resultCopy.en.transcriptSpeakerUnavailable),
    ).toBeVisible();
  });

  it('shows only reliable speaker labels when the speaker control is enabled', async () => {
    const user = userEvent.setup();
    renderTranscript();

    expect(screen.queryByText('Host')).toBeNull();
    await user.click(screen.getByRole('switch', { name: 'Speaker labels' }));
    expect(screen.getByText('Host')).toBeVisible();
    expect(screen.getByText('Guest')).toBeVisible();
  });

  it('copies and downloads the complete unfiltered timestamped transcript', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const createObjectURL = vi.fn((blob: Blob) => {
      expect(blob).toBeInstanceOf(Blob);
      return 'blob:transcript';
    });
    const revokeObjectURL = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    renderTranscript();

    await user.click(screen.getByRole('button', { name: 'Key insight' }));
    await user.click(screen.getByRole('button', { name: 'Copy transcript' }));

    const fullTranscript =
      '00:00 Host: Purpose starts with a question.\n' +
      '00:03 Guest: Purpose creates trust.\n' +
      '00:06 A legacy segment stays readable.';
    expect(writeText).toHaveBeenCalledWith(fullTranscript);
    expect(screen.getByRole('status')).toHaveTextContent(
      resultCopy.en.transcriptCopied,
    );

    await user.click(
      screen.getByRole('button', { name: 'Download transcript' }),
    );
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(await blob.text()).toBe(fullTranscript);
    expect(anchorClick).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:transcript');
    expect(screen.getByRole('status')).toHaveTextContent(
      resultCopy.en.transcriptDownloaded,
    );
  });

  it('uses localized accessible copy and download failure outcomes', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => {
        throw new Error('blocked');
      }),
    });
    renderTranscript({ copy: resultCopy.de });

    await user.click(
      screen.getByRole('button', { name: resultCopy.de.transcriptCopy }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      resultCopy.de.transcriptCopyFailed,
    );
    await user.click(
      screen.getByRole('button', { name: resultCopy.de.transcriptDownload }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      resultCopy.de.transcriptDownloadFailed,
    );
  });

  it('activates the whole row by pointer and keyboard without duplicate commands', async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    const { controller, update } = renderTranscript();
    const transcriptList = screen.getByRole('list', { name: 'Transcript' });
    Object.defineProperty(transcriptList, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });

    await user.click(screen.getByText('Purpose creates trust.'));
    expect(controller.seekTo).toHaveBeenCalledWith(3_000);
    expect(controller.seekTo).toHaveBeenCalledTimes(1);
    expect(controller.play).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).not.toHaveBeenCalled();

    const row = screen.getByRole('button', {
      name: /00:03.*Purpose creates trust/i,
    });
    vi.mocked(controller.seekTo).mockClear();
    vi.mocked(controller.play).mockClear();
    row.focus();
    await user.keyboard('{Enter}');
    expect(controller.seekTo).toHaveBeenCalledTimes(1);
    expect(controller.play).toHaveBeenCalledTimes(1);

    vi.mocked(controller.seekTo).mockClear();
    vi.mocked(controller.play).mockClear();
    await user.keyboard(' ');
    expect(controller.seekTo).toHaveBeenCalledTimes(1);
    expect(controller.play).toHaveBeenCalledTimes(1);

    update({ currentTimeMs: 3_500, playing: true });
    expect(
      screen.getByText('Purpose creates trust.').closest('li'),
    ).toHaveAttribute('aria-current', 'true');
  });

  it('retries the current active row when temporary manual suppression expires', () => {
    vi.useFakeTimers();
    try {
      const view = renderTranscript();
      const list = screen.getByRole('list', { name: 'Transcript' });
      const scrollTo = vi.fn();
      Object.defineProperty(list, 'scrollTo', {
        configurable: true,
        value: scrollTo,
      });

      fireEvent.wheel(list);
      view.update({ currentTimeMs: 3_500, playing: true });
      expect(scrollTo).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(1);

      act(() => vi.advanceTimersByTime(1_599));
      expect(scrollTo).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: 'smooth' }),
      );

      fireEvent.touchStart(list);
      view.update({ currentTimeMs: 6_500 });
      expect(vi.getTimerCount()).toBe(1);
      view.unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses instant retry scrolling under reduced motion', () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    const { update } = renderTranscript();
    const list = screen.getByRole('list', { name: 'Transcript' });
    const scrollTo = vi.fn();
    Object.defineProperty(list, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });

    fireEvent.pointerDown(list);
    update({ currentTimeMs: 3_500, playing: true });
    expect(scrollTo).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1_600));

    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' }),
    );
    vi.useRealTimers();
  });

  it('uses offset plus source index identity for duplicate timestamps', () => {
    const duplicateTranscript: TranscriptPresentation = {
      ...transcript,
      segments: [
        transcript.segments[0],
        { ...transcript.segments[1], text: 'First simultaneous claim.' },
        { ...transcript.segments[1], text: 'Second simultaneous claim.' },
      ],
    };
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { update } = renderTranscript({ value: duplicateTranscript });
    const list = screen.getByRole('list', { name: 'Transcript' });
    const scrollTo = vi.fn();
    Object.defineProperty(list, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });
    const firstDuplicate = screen
      .getByText('First simultaneous claim.')
      .closest('li');
    const secondDuplicate = screen
      .getByText('Second simultaneous claim.')
      .closest('li');
    expect(firstDuplicate).not.toBeNull();
    expect(secondDuplicate).not.toBeNull();
    Object.defineProperty(firstDuplicate!, 'offsetTop', { value: 30 });
    Object.defineProperty(secondDuplicate!, 'offsetTop', { value: 90 });

    update({ currentTimeMs: 3_500, playing: true });

    expect(consoleError).not.toHaveBeenCalled();
    expect(
      [firstDuplicate, secondDuplicate].filter(
        (row) => row?.getAttribute('aria-current') === 'true',
      ),
    ).toEqual([secondDuplicate]);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 90 }));
  });
});
