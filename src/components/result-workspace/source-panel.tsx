'use client';

import { useState } from 'react';
import Image from 'next/image';

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

export function SourcePanel({
  source,
  playerAvailable = true,
  onPlayerReady,
  onTimeChange,
}: Readonly<{
  source: SourcePanelSource;
  playerAvailable?: boolean;
  onPlayerReady?: (controller: VideoPlayerController) => void;
  onTimeChange?: (offsetMs: number) => void;
}>) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [failedPlayerVideoId, setFailedPlayerVideoId] = useState<string | null>(
    null,
  );
  const showPlayer = playerAvailable && failedPlayerVideoId !== source.videoId;

  return (
    <aside
      className="source-panel sticky top-[92px] overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-white/[0.015] max-[1024px]:relative max-[1024px]:top-0"
      aria-label="Video source"
    >
      <div className="relative grid aspect-video place-items-center overflow-hidden border-b border-[var(--border-default)] bg-[radial-gradient(circle_at_70%_30%,color-mix(in_srgb,var(--artifact-timestamps)_13%,transparent),transparent_35%),linear-gradient(145deg,var(--surface-raised),var(--background-deep))]">
        {showPlayer ? (
          <YouTubePlayer
            videoId={source.videoId}
            title={source.title}
            onReady={onPlayerReady}
            onTimeChange={onTimeChange}
            onUnavailable={() => setFailedPlayerVideoId(source.videoId)}
          />
        ) : (
          <div className="relative grid size-full place-items-center">
            {!thumbnailFailed && (
              <Image
                className="absolute inset-0 size-full object-cover"
                src={source.thumbnailUrl}
                alt={`Thumbnail for ${source.title}`}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                unoptimized
                onError={() => setThumbnailFailed(true)}
              />
            )}
            <div
              className="relative z-10 rounded-lg bg-[var(--overlay)] px-4 py-3 text-center text-sm text-[var(--text-secondary)]"
              role="status"
            >
              Player unavailable
            </div>
            {thumbnailFailed && (
              <span className="sr-only">Video preview unavailable</span>
            )}
          </div>
        )}
      </div>
      <div className="p-5 max-[720px]:p-4">
        <h2 className="mb-2.5 font-[var(--font-display)] text-lg leading-[1.28] text-[var(--text-primary)]">
          {source.title}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">{source.channel}</p>
        <dl className="mt-[18px] grid grid-cols-2 gap-[13px]">
          <SourceMetadata label="Duration" value={source.duration} />
          <SourceMetadata label="Language" value={source.language} />
        </dl>
      </div>
    </aside>
  );
}

function SourceMetadata({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[10px] border border-[var(--border-default)] p-3">
      <dt className="mb-1.5 font-[var(--font-mono)] text-[8px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="text-[11px] font-medium text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}
