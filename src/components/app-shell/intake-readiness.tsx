import Image from 'next/image';
import Link from 'next/link';

import type { AnalysisIntake } from '@/lib/youtube-intake/repository';

const localeNames = {
  uk: 'Ukrainian',
  ru: 'Russian',
  en: 'English',
  es: 'Spanish',
  de: 'German',
} as const;

const artifactNames = {
  summary: 'Summary',
  timestamps: 'Timestamps',
  transcript: 'Transcript',
  flashcards: 'Flashcards',
} as const;

const statusNames = {
  ready: 'Ready for processing',
  processing: 'Processing',
  complete: 'Complete',
  failed: 'Processing failed',
} as const;

function formatDuration(durationSeconds: number) {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;
  const minuteAndSeconds = `${minutes.toString().padStart(hours ? 2 : 1, '0')}:${seconds.toString().padStart(2, '0')}`;

  return hours ? `${hours}:${minuteAndSeconds}` : minuteAndSeconds;
}

function titleCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function IntakeReadiness({
  intake,
}: Readonly<{ intake: AnalysisIntake }>) {
  const { configuration } = intake;

  return (
    <article className="intake-readiness" aria-labelledby="intake-title">
      <header className="intake-readiness-head">
        <span className="eyebrow">Validated intake</span>
        <p className="intake-ready-status" role="status">
          <span aria-hidden="true" />
          {statusNames[intake.status]}
        </p>
      </header>

      <div className="intake-readiness-grid">
        <div className="intake-thumbnail-frame">
          <Image
            src={intake.thumbnailUrl}
            alt=""
            width={1280}
            height={720}
            sizes="(max-width: 720px) 100vw, 42vw"
            unoptimized
          />
        </div>

        <div className="intake-readiness-details">
          <p className="intake-channel">{intake.channelTitle}</p>
          <h1 id="intake-title">{intake.title}</h1>
          <dl className="intake-metadata">
            <div>
              <dt>Duration</dt>
              <dd>{formatDuration(intake.durationSeconds)}</dd>
            </div>
            <div>
              <dt>Transcript language</dt>
              <dd>
                {localeNames[
                  intake.transcriptLanguage as keyof typeof localeNames
                ] ?? intake.transcriptLanguage}
              </dd>
            </div>
            <div>
              <dt>Output language</dt>
              <dd>{localeNames[configuration.outputLocale]}</dd>
            </div>
            <div>
              <dt>Selected artifacts</dt>
              <dd>
                {configuration.artifacts
                  .map((artifact) => artifactNames[artifact])
                  .join(', ')}
              </dd>
            </div>
            {configuration.summaryPreset ? (
              <div>
                <dt>Summary preset</dt>
                <dd>{titleCase(configuration.summaryPreset)}</dd>
              </div>
            ) : null}
            {configuration.flashcardPreset ? (
              <div>
                <dt>Flashcard preset</dt>
                <dd>{configuration.flashcardPreset} cards</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      <footer className="intake-readiness-foot">
        <p>
          Your video and native transcript are validated. Processing is
          implemented in the next issue; no generated artifacts exist yet.
        </p>
        <Link href="/app">← Back to New analysis</Link>
      </footer>
    </article>
  );
}
