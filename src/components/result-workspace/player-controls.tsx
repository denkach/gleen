'use client';

import { useEffect } from 'react';

import { formatResultCopy, type ResultCopy } from '@/lib/result-workspace/copy';

import { useVideoPlayer, useVideoPlayerSnapshot } from './player-context';

type PlayerChapter = Readonly<{ offsetMs: number }>;

const selectStatus = (snapshot: { status: string }) => snapshot.status;
const selectCurrentTime = (snapshot: { currentTimeMs: number }) =>
  snapshot.currentTimeMs;
const selectDuration = (snapshot: { durationMs: number }) =>
  snapshot.durationMs;
const selectPlaying = (snapshot: { playing: boolean }) => snapshot.playing;
const selectRate = (snapshot: { playbackRate: number }) =>
  snapshot.playbackRate;
const selectRates = (snapshot: { availableRates: readonly number[] }) =>
  snapshot.availableRates.join(',');
const selectVolume = (snapshot: { volume: number }) => snapshot.volume;
const selectMuted = (snapshot: { muted: boolean }) => snapshot.muted;
const selectCaptions = (snapshot: { captionsAvailable: boolean }) =>
  snapshot.captionsAvailable;

function formatTime(offsetMs: number): string {
  const seconds = Math.max(0, Math.floor(offsetMs / 1_000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function ControlIcon({ name }: Readonly<{ name: string }>) {
  if (name === 'play')
    return (
      <svg viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
    );
  if (name === 'pause')
    return (
      <svg viewBox="0 0 24 24">
        <path d="M9 5v14M15 5v14" />
      </svg>
    );
  if (name === 'rewind')
    return (
      <svg viewBox="0 0 24 24">
        <path d="M9 8l-4 4 4 4M5 12h8a5 5 0 1 1-3.6 8.5" />
      </svg>
    );
  if (name === 'volume')
    return (
      <svg viewBox="0 0 24 24">
        <path d="M11 5 6 9H3v6h3l5 4zM15 9a4 4 0 0 1 0 6M17.5 6.5a8 8 0 0 1 0 11" />
      </svg>
    );
  if (name === 'muted')
    return (
      <svg viewBox="0 0 24 24">
        <path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6M21 9l-5 6" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24">
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
    </svg>
  );
}

export interface PlayerControlsProps {
  chapters: readonly PlayerChapter[];
  copy: ResultCopy;
  onMounted?: () => void;
}

export function PlayerControls({
  chapters,
  copy,
  onMounted,
}: PlayerControlsProps) {
  const controller = useVideoPlayer();
  const status = useVideoPlayerSnapshot(selectStatus);
  const currentTimeMs = useVideoPlayerSnapshot(selectCurrentTime);
  const durationMs = useVideoPlayerSnapshot(selectDuration);
  const playing = useVideoPlayerSnapshot(selectPlaying);
  const playbackRate = useVideoPlayerSnapshot(selectRate);
  const availableRatesValue = useVideoPlayerSnapshot(selectRates);
  const volume = useVideoPlayerSnapshot(selectVolume);
  const muted = useVideoPlayerSnapshot(selectMuted);
  const captionsAvailable = useVideoPlayerSnapshot(selectCaptions);
  const availableRates = availableRatesValue
    ? availableRatesValue.split(',').map(Number)
    : [];

  useEffect(() => onMounted?.(), [onMounted]);

  if (!controller || status !== 'ready') {
    return (
      <div
        className="result-player-controls"
        aria-label={copy.playerLabel}
        aria-busy="true"
      >
        <button
          className="result-control-button"
          type="button"
          aria-label={copy.playerPlay}
          disabled
        >
          <ControlIcon name="play" />
        </button>
        <span className="result-timecode">00:00 / 00:00</span>
      </div>
    );
  }

  const maximum = Math.max(0, durationMs);
  const current = Math.min(maximum || currentTimeMs, currentTimeMs);
  const togglePlayback = () =>
    playing ? controller.pause() : controller.play();
  const seekRelative = (deltaMs: number) =>
    controller.seekTo(Math.max(0, Math.min(maximum, current + deltaMs)));
  const selectedRate = availableRates.reduce<number | undefined>(
    (closest, candidate) =>
      closest === undefined ||
      Math.abs(candidate - playbackRate) < Math.abs(closest - playbackRate)
        ? candidate
        : closest,
    undefined,
  );
  const displayedVolume = muted ? 0 : volume;

  return (
    <>
      <button
        className="result-center-play"
        type="button"
        aria-label={playing ? copy.playerPause : copy.playerPlay}
        onClick={togglePlayback}
      >
        <ControlIcon name={playing ? 'pause' : 'play'} />
      </button>
      <div className="result-progress-wrap">
        <input
          className="result-progress-input"
          type="range"
          aria-label={copy.playerProgress}
          aria-valuetext={formatResultCopy(copy.playerProgressValue, {
            current: formatTime(current),
            duration: formatTime(maximum),
          })}
          min={0}
          max={maximum}
          step={1_000}
          value={current}
          onChange={(event) =>
            controller.seekTo(event.currentTarget.valueAsNumber)
          }
          style={
            {
              '--result-progress': `${maximum ? (current / maximum) * 100 : 0}%`,
            } as React.CSSProperties
          }
        />
        <div className="result-chapter-markers" aria-hidden="true">
          {chapters.map((chapter) => (
            <i
              key={chapter.offsetMs}
              style={{
                left: `${maximum ? (chapter.offsetMs / maximum) * 100 : 0}%`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="result-player-controls" aria-label={copy.playerLabel}>
        <button
          className="result-control-button"
          type="button"
          aria-label={playing ? copy.playerPause : copy.playerPlay}
          onClick={togglePlayback}
        >
          <ControlIcon name={playing ? 'pause' : 'play'} />
        </button>
        <button
          className="result-control-button"
          type="button"
          aria-label={copy.playerSeekBackward}
          onClick={() => seekRelative(-10_000)}
        >
          <ControlIcon name="rewind" />
        </button>
        <button
          className="result-control-button result-control-forward"
          type="button"
          aria-label={copy.playerSeekForward}
          onClick={() => seekRelative(10_000)}
        >
          <ControlIcon name="rewind" />
        </button>
        <span className="result-timecode">
          {formatTime(current)} / {formatTime(maximum)}
        </span>
        <span className="result-control-spacer" />
        <button
          className="result-control-button result-caption-control"
          type="button"
          aria-label={
            captionsAvailable
              ? copy.playerCaptions
              : copy.playerCaptionsUnavailable
          }
          disabled={!captionsAvailable}
          onClick={() => controller.toggleCaptions()}
        >
          CC
        </button>
        {availableRates.length > 0 ? (
          <select
            className="result-speed-control"
            aria-label={copy.playerPlaybackRate}
            value={selectedRate}
            onChange={(event) =>
              controller.setPlaybackRate(Number(event.currentTarget.value))
            }
          >
            {availableRates.map((rate) => (
              <option key={rate} value={rate}>
                {rate}×
              </option>
            ))}
          </select>
        ) : null}
        <button
          className="result-control-button"
          type="button"
          aria-label={muted ? copy.playerUnmute : copy.playerMute}
          onClick={() => controller.toggleMute()}
        >
          <ControlIcon name={muted ? 'muted' : 'volume'} />
        </button>
        <input
          className="result-volume-input"
          type="range"
          aria-label={copy.playerVolume}
          aria-valuetext={formatResultCopy(copy.playerVolumeValue, {
            percent: displayedVolume,
          })}
          min={0}
          max={100}
          value={displayedVolume}
          onChange={(event) => {
            const nextVolume = event.currentTarget.valueAsNumber;
            if (muted && nextVolume > 0) controller.toggleMute();
            controller.setVolume(nextVolume);
          }}
        />
        <button
          className="result-control-button"
          type="button"
          aria-label={copy.playerEnterFullscreen}
          onClick={() => void controller.requestFullscreen()}
        >
          <ControlIcon name="fullscreen" />
        </button>
      </div>
    </>
  );
}
