import type { TranscriptSegment } from '@/lib/youtube-intake/providers';

import {
  flashcardsArtifactSchema,
  flashcardsJsonSchema,
  summaryArtifactV3Schema,
  summaryJsonSchema,
  timestampsArtifactSchema,
  timestampsJsonSchema,
} from './artifact-schemas';
import type { StructuredGenerationProvider } from './provider';

export type GeneratorContext = Readonly<{
  outputLocale: 'uk' | 'ru' | 'en' | 'es' | 'de';
  transcriptLanguage: string;
  summaryPreset: 'balanced' | 'detailed' | null;
  flashcardPreset: 18 | 30 | null;
  durationSeconds: number;
  transcriptSegments: readonly TranscriptSegment[];
}>;

const SUMMARY_SYSTEM_PROMPT =
  'Create only a faithful structured summary from the supplied transcript. Return schemaVersion 3 with an outcome and grounded sections. Each section must include nullable supportingQuote and sourceOffsetMs fields. Use a supportingQuote only when it appears in the transcript, and use the nearest supplied transcript segment offset; otherwise return null.';
const FLASHCARDS_SYSTEM_PROMPT =
  'Create only concise study flashcards grounded in the supplied transcript.';
const TIMESTAMPS_SYSTEM_PROMPT =
  'Create only useful timestamp chapters grounded in the supplied transcript.';

function transcriptInput(context: GeneratorContext): string {
  return context.transcriptSegments
    .map((segment) => `[${segment.offsetMs}ms] ${segment.text}`)
    .join('\n');
}

function commonInput(context: GeneratorContext): string {
  return `Output locale: ${context.outputLocale}\nVideo duration: ${context.durationSeconds}s\nTranscript:\n${transcriptInput(context)}`;
}

function normalizeGroundingText(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase();
}

export async function generateSummary(
  provider: StructuredGenerationProvider,
  context: GeneratorContext,
) {
  const result = await provider.generate({
    name: 'gleen_summary_v3',
    system: SUMMARY_SYSTEM_PROMPT,
    input: `Preset: ${context.summaryPreset ?? 'balanced'}\n${commonInput(context)}`,
    jsonSchema: summaryJsonSchema,
    parse: (value) => summaryArtifactV3Schema.parse(value),
  });
  const normalizedTranscript = normalizeGroundingText(
    context.transcriptSegments.map((segment) => segment.text).join(' '),
  );
  const normalizedSegments = context.transcriptSegments.map((segment) => ({
    offsetMs: segment.offsetMs,
    text: normalizeGroundingText(segment.text),
  }));
  const sourceOffsets = new Set(
    context.transcriptSegments.map((segment) => segment.offsetMs),
  );
  const durationMs = context.durationSeconds * 1_000;
  return {
    ...result,
    value: {
      ...result.value,
      sections: result.value.sections.map((section) => {
        const normalizedQuote =
          section.supportingQuote === null
            ? null
            : normalizeGroundingText(section.supportingQuote);
        const supportingQuote =
          normalizedQuote !== null &&
          normalizedTranscript.includes(normalizedQuote)
            ? section.supportingQuote
            : null;
        const groundedOffsets =
          supportingQuote === null
            ? sourceOffsets
            : new Set(
                normalizedSegments
                  .filter((segment) =>
                    segment.text.includes(normalizedQuote ?? ''),
                  )
                  .map((segment) => segment.offsetMs),
              );
        return {
          ...section,
          supportingQuote,
          sourceOffsetMs:
            section.sourceOffsetMs !== null &&
            (section.sourceOffsetMs > durationMs ||
              !groundedOffsets.has(section.sourceOffsetMs))
              ? null
              : section.sourceOffsetMs,
        };
      }),
    },
  };
}

export function generateFlashcards(
  provider: StructuredGenerationProvider,
  context: GeneratorContext,
) {
  return provider.generate({
    name: 'gleen_flashcards_v1',
    system: FLASHCARDS_SYSTEM_PROMPT,
    input: `Card count: ${context.flashcardPreset ?? 18}\n${commonInput(context)}`,
    jsonSchema: flashcardsJsonSchema,
    parse: (value) => flashcardsArtifactSchema.parse(value),
  });
}

export async function generateTimestamps(
  provider: StructuredGenerationProvider,
  context: GeneratorContext,
) {
  const result = await provider.generate({
    name: 'gleen_timestamps_v1',
    system: TIMESTAMPS_SYSTEM_PROMPT,
    input: commonInput(context),
    jsonSchema: timestampsJsonSchema,
    parse: (value) => timestampsArtifactSchema.parse(value),
  });
  const durationMs = context.durationSeconds * 1_000;
  if (result.value.chapters.some((chapter) => chapter.offsetMs > durationMs)) {
    throw new Error('Timestamp exceeds video duration');
  }
  return result;
}
