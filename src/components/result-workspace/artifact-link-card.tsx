import type { ResultArtifact } from '@/lib/result-workspace/navigation';

export type ArtifactLinkCardState =
  'ready' | 'processing' | 'failed' | 'disabled';

export type ArtifactLinkCardAccent =
  'summary' | 'flashcards' | 'timestamps' | 'neutral' | 'export';

interface ArtifactLinkCardProps {
  readonly accent: ArtifactLinkCardAccent;
  readonly artifact: Exclude<ResultArtifact, 'overview'>;
  readonly description: string;
  readonly label: string;
  readonly onOpen: () => void;
  readonly openLabel: string;
  readonly selected?: boolean;
  readonly state: ArtifactLinkCardState;
}

export function ArtifactLinkCard({
  accent,
  artifact,
  description,
  label,
  onOpen,
  openLabel,
  selected = false,
  state,
}: ArtifactLinkCardProps) {
  const unavailable = state !== 'ready';

  return (
    <button
      type="button"
      className="artifact-link-card"
      data-accent={accent}
      data-artifact={artifact}
      data-selected={selected}
      data-state={state}
      aria-disabled={unavailable}
      aria-label={`${openLabel}: ${label}. ${description}`}
      onClick={unavailable ? undefined : onOpen}
    >
      <span className="artifact-link-card-copy">
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
      <span className="artifact-link-card-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}
