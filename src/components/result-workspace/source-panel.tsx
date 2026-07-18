'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';

import {
  formatResultCopy,
  resultCopy,
  type ResultCopy,
} from '@/lib/result-workspace/copy';
import type { TimestampsPresentation } from '@/lib/result-workspace/presentation';

import { ChapterRail } from './chapter-rail';
import { PlayerControls } from './player-controls';
import { useVideoPlayerSnapshot } from './player-context';
import type { VideoPlayerController } from './player-controller';
import { YouTubePlayer } from './youtube-player';

export type SourcePanelSource = Readonly<{
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  language: string;
  thumbnailUrl: string;
}>;

const selectPlayerStatus = (snapshot: { status: string }) => snapshot.status;
const selectCurrentTime = (snapshot: { currentTimeMs: number }) =>
  snapshot.currentTimeMs;

function SourceIcon({ name }: Readonly<{ name: 'heart' | 'share' }>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={
          name === 'heart'
            ? 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8z'
            : 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13'
        }
      />
    </svg>
  );
}

export function SourcePanel({
  source,
  copy = resultCopy.en,
  chapters = [],
  favorite = false,
  favoritePending = false,
  onFavorite,
  onShare,
  playerAvailable = true,
  playerLifecycleKey = source.videoId,
  initialPositionMs = 0,
  onPlayerReady,
  onTimeChange,
}: Readonly<{
  source: SourcePanelSource;
  copy?: ResultCopy;
  chapters?: TimestampsPresentation['chapters'];
  favorite?: boolean;
  favoritePending?: boolean;
  onFavorite?: () => void;
  onShare?: () => void;
  playerAvailable?: boolean;
  playerLifecycleKey?: string;
  initialPositionMs?: number;
  onPlayerReady?: (
    controller: VideoPlayerController | null,
    replaced?: VideoPlayerController,
  ) => void;
  onTimeChange?: (offsetMs: number) => void;
}>) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [failedPlayerKey, setFailedPlayerKey] = useState<string | null>(null);
  const [customControlsMounted, setCustomControlsMounted] = useState(false);
  const playerStageRef = useRef<HTMLDivElement>(null);
  const playerStatus = useVideoPlayerSnapshot(selectPlayerStatus);
  const currentTimeMs = useVideoPlayerSnapshot(selectCurrentTime);
  const playerKey = `${playerLifecycleKey}:${source.videoId}`;
  const showPlayer = playerAvailable && failedPlayerKey !== playerKey;
  const currentChapter = chapters.reduce<
    TimestampsPresentation['chapters'][number] | undefined
  >(
    (selected, chapter) =>
      chapter.offsetMs <= currentTimeMs ? chapter : selected,
    chapters[0],
  );
  const mountCustomControls = useCallback(
    () => setCustomControlsMounted(true),
    [],
  );

  return (
    <aside className="result-source-column" aria-label={copy.sourceLabel}>
      <article className="result-panel result-video-card">
        <header className="result-source-heading">
          <span className="result-source-avatar" aria-hidden="true">
            {source.channel.slice(0, 3).toUpperCase()}
          </span>
          <div className="result-source-copy">
            <h2>{source.title}</h2>
            <p>{source.channel}</p>
          </div>
          <div className="result-source-actions">
            {onFavorite ? (
              <button
                className="result-icon-button"
                type="button"
                aria-label={favorite ? copy.favoriteRemove : copy.favoriteAdd}
                aria-pressed={favorite}
                aria-busy={favoritePending || undefined}
                disabled={favoritePending}
                onClick={onFavorite}
              >
                <SourceIcon name="heart" />
              </button>
            ) : null}
            {onShare ? (
              <button
                className="result-icon-button"
                type="button"
                aria-label={copy.shareTitle}
                onClick={onShare}
              >
                <SourceIcon name="share" />
              </button>
            ) : null}
          </div>
        </header>
        <div className="result-player-stage" ref={playerStageRef}>
          {!thumbnailFailed ? (
            <Image
              className="result-player-poster"
              src={source.thumbnailUrl}
              alt={formatResultCopy(copy.sourceThumbnail, {
                title: source.title,
              })}
              fill
              sizes="(max-width: 1180px) 100vw, 50vw"
              priority
              unoptimized
              onError={() => setThumbnailFailed(true)}
            />
          ) : null}
          {showPlayer && customControlsMounted ? (
            <YouTubePlayer
              videoId={source.videoId}
              lifecycleKey={playerLifecycleKey}
              title={source.title}
              unavailableLabel={copy.playerUnavailable}
              nativeControls={false}
              initialPositionMs={initialPositionMs}
              onReady={onPlayerReady}
              onTimeChange={onTimeChange}
              onUnavailable={() => setFailedPlayerKey(playerKey)}
              fullscreenTargetRef={playerStageRef}
            />
          ) : !showPlayer ? (
            <div className="result-player-unavailable" role="status">
              {copy.playerUnavailable}
              {thumbnailFailed ? (
                <span className="sr-only">{copy.playerPreviewUnavailable}</span>
              ) : null}
            </div>
          ) : null}
          {currentChapter && playerStatus === 'ready' ? (
            <div className="result-current-chapter">
              <span>{copy.currentChapter}</span>
              <strong>{currentChapter.title}</strong>
            </div>
          ) : null}
          {showPlayer ? (
            <PlayerControls
              chapters={chapters}
              copy={copy}
              onMounted={mountCustomControls}
            />
          ) : null}
        </div>
        {chapters.length ? (
          <ChapterRail
            chapters={chapters}
            thumbnailUrl={source.thumbnailUrl}
            copy={copy}
          />
        ) : null}
      </article>
      <dl className="result-panel result-source-meta">
        <SourceMetadata label={copy.metadataChannel} value={source.channel} />
        <SourceMetadata label={copy.metadataDuration} value={source.duration} />
        <SourceMetadata label={copy.metadataLanguage} value={source.language} />
      </dl>
    </aside>
  );
}

function SourceMetadata({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="result-meta-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
