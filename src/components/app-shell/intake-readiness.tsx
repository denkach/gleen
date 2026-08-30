import Image from 'next/image';
import Link from 'next/link';

import type { AnalysisIntake } from '@/lib/youtube-intake/repository';
import { selectPlural } from '@/lib/i18n/format';
import { localeMetadata, type Locale } from '@/lib/i18n/locales';
import type { AppMessages } from '@/lib/i18n/messages/app';

function formatDuration(durationSeconds: number) {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;
  const minuteAndSeconds = `${minutes.toString().padStart(hours ? 2 : 1, '0')}:${seconds.toString().padStart(2, '0')}`;

  return hours ? `${hours}:${minuteAndSeconds}` : minuteAndSeconds;
}

export function IntakeReadiness({
  copy,
  intake,
  locale,
}: Readonly<{ copy: AppMessages; intake: AnalysisIntake; locale: Locale }>) {
  const { configuration } = intake;

  return (
    <article className="intake-readiness" aria-labelledby="intake-title">
      <header className="intake-readiness-head">
        <span className="eyebrow">{copy.readiness.eyebrow}</span>
        <p className="intake-ready-status" role="status">
          <span aria-hidden="true" />
          {copy.readiness.statuses[intake.status]}
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
              <dt>{copy.readiness.duration}</dt>
              <dd>{formatDuration(intake.durationSeconds)}</dd>
            </div>
            <div>
              <dt>{copy.readiness.transcriptLanguage}</dt>
              <dd>
                {localeMetadata[intake.transcriptLanguage as Locale]
                  ?.nativeName ?? intake.transcriptLanguage}
              </dd>
            </div>
            <div>
              <dt>{copy.readiness.outputLanguage}</dt>
              <dd>{localeMetadata[configuration.outputLocale].nativeName}</dd>
            </div>
            <div>
              <dt>{copy.readiness.selectedArtifacts}</dt>
              <dd>
                {configuration.artifacts
                  .map((artifact) => copy.newAnalysis.artifacts[artifact])
                  .join(', ')}
              </dd>
            </div>
            {configuration.summaryPreset ? (
              <div>
                <dt>{copy.readiness.summaryPreset}</dt>
                <dd>
                  {configuration.summaryPreset === 'deep'
                    ? copy.newAnalysis.advanced.detailed
                    : copy.newAnalysis.advanced.balanced}
                </dd>
              </div>
            ) : null}
            {configuration.flashcardPreset ? (
              <div>
                <dt>{copy.readiness.flashcardPreset}</dt>
                <dd>
                  {selectPlural(
                    locale,
                    configuration.flashcardPreset,
                    copy.readiness.cards,
                  )}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      <footer className="intake-readiness-foot">
        <p>{copy.readiness.note}</p>
        <Link href="/app">{copy.readiness.back}</Link>
      </footer>
    </article>
  );
}
