import type { TranscriptSegment } from '@/lib/youtube-intake/providers';
import type { SummaryMode } from '@/lib/summary-mode';

import {
  flashcardsArtifactSchema,
  flashcardsJsonSchema,
  summaryArtifactV3Schema,
  summaryJsonSchema,
  timestampsArtifactSchema,
  timestampsJsonSchema,
  type SummaryArtifactV3,
} from './artifact-schemas';
import {
  ProviderError,
  type GenerationResult,
  type StructuredGenerationProvider,
  type StructuredGenerationRequest,
} from './provider';
import {
  composedSummaryJsonSchema,
  composedSummarySchema,
  summaryIdeaMapJsonSchema,
  summaryIdeaMapSchema,
  toSummaryArtifact,
  type ComposedSummary,
  type SummaryIdeaMap,
} from './summary-generation-schemas';
import {
  requiresRepair,
  validateComposedSummary,
  validateSummaryDuplicates,
  type SummaryQualityFinding,
} from './summary-quality';
import {
  selectSummaryPolicy,
  type SummaryGenerationPolicy,
} from './summary-policy';

export type GeneratorContext = Readonly<{
  outputLocale: 'uk' | 'ru' | 'en' | 'es' | 'de';
  transcriptLanguage: string;
  summaryPreset: SummaryMode | null;
  flashcardPreset: 18 | 30 | null;
  durationSeconds: number;
  transcriptSegments: readonly TranscriptSegment[];
}>;

const FLASHCARDS_SYSTEM_PROMPT =
  'Create only concise study flashcards grounded in the supplied transcript.';
const TIMESTAMPS_SYSTEM_PROMPT =
  'Create only useful timestamp chapters grounded in the supplied transcript.';

const MODE_INSTRUCTIONS: Record<SummaryMode, string> = {
  compact:
    'Compress aggressively, but preserve every main conclusion and material caveat.',
  balanced:
    'Preserve conclusions, arguments, important context, representative examples, and caveats.',
  deep: 'Preserve full argument structure, causal links, significant examples, exceptions, and practical implications.',
};

const IDEA_MAP_SYSTEM_PROMPT =
  'Create only a grounded idea map from the supplied transcript. Cluster semantically related facts, but do not discard distinct claims, evidence, caveats, examples, or relationships. Assign every cluster a unique stable ID and importance. Use only supplied transcript segment offsets in sourceOffsetsMs.';

type SummaryPassResult = Readonly<{
  name: string;
  result: GenerationResult<unknown>;
}>;

function transcriptInput(context: GeneratorContext): string {
  return context.transcriptSegments
    .map((segment) => `[${segment.offsetMs}ms] ${segment.text}`)
    .join('\n');
}

function commonInput(context: GeneratorContext): string {
  return `Output locale: ${context.outputLocale}\nTranscript language: ${context.transcriptLanguage}\nVideo duration: ${context.durationSeconds}s\nTranscript:\n${transcriptInput(context)}`;
}

function modeForContext(context: GeneratorContext): SummaryMode {
  return context.summaryPreset ?? 'balanced';
}

function rangeLabel(policy: SummaryGenerationPolicy): string {
  return `${policy.sectionRange.min}–${policy.sectionRange.max}`;
}

function summaryInstructions(
  mode: SummaryMode,
  policy: SummaryGenerationPolicy,
): string {
  return [
    'Create only a faithful structured summary from the supplied transcript.',
    `Requested mode: ${mode}. ${MODE_INSTRUCTIONS[mode]}`,
    `Write ${rangeLabel(policy)} complete sections for this video. This duration-based range is guidance and must not omit high-importance ideas, important caveats, or distinct conclusions.`,
    'Return schemaVersion 3 with an outcome and one complete main paragraph per section.',
    'Keep each section summary as a short thesis and expand it in details without repeating the thesis or adjacent section details.',
    'Each section must include nullable supportingQuote and sourceOffsetMs fields with grounded offsets. Use a supportingQuote only when it appears in the transcript, and use the nearest supplied transcript segment offset; otherwise return null.',
  ].join(' ');
}

function compositionInstructions(
  mode: SummaryMode,
  policy: SummaryGenerationPolicy,
): string {
  return [
    summaryInstructions(mode, policy),
    'Use both the transcript and idea map as evidence.',
    'Every section must list the idea-map IDs it covers in coveredIdeaIds, and all high-importance IDs must appear in coveredIdeaIds.',
    'The requested section range is guidance: you must not omit high-importance ideas to satisfy it.',
    'If more than 20 high-importance clusters exist, combine semantically related clusters inside broader sections while retaining their claims, evidence, caveats, examples, and relationships in details.',
  ].join(' ');
}

function repairInput(
  context: GeneratorContext,
  findings: readonly SummaryQualityFinding[],
  candidate: SummaryArtifactV3 | ComposedSummary,
  ideaMap?: SummaryIdeaMap,
): string {
  return [
    commonInput(context),
    ideaMap === undefined ? null : `Idea map:\n${JSON.stringify(ideaMap)}`,
    `Candidate summary:\n${JSON.stringify(candidate)}`,
    `Quality findings:\n${JSON.stringify(findings)}`,
  ]
    .filter((part): part is string => part !== null)
    .join('\n\n');
}

async function generateRepair<T>(
  provider: StructuredGenerationProvider,
  request: StructuredGenerationRequest<T>,
): Promise<GenerationResult<T>> {
  try {
    return await provider.generate(request);
  } catch (error) {
    if (
      error instanceof ProviderError &&
      error.code !== 'invalid_provider_response'
    ) {
      throw error;
    }
    throw new ProviderError('invalid_provider_response', true);
  }
}

function summaryMetadata(
  policy: SummaryGenerationPolicy,
  repairCount: number,
  passResults: readonly SummaryPassResult[],
) {
  return {
    route: policy.route,
    repairCount,
    passes: passResults.map(({ name, result }) => ({
      name,
      requestId: result.metadata.requestId,
      model: result.metadata.model,
      usage: result.metadata.usage,
      latencyMs: result.metadata.latencyMs,
    })),
  } as const;
}

function normalizeGroundingText(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase();
}

function sanitizeSummaryGrounding(
  summary: SummaryArtifactV3,
  context: GeneratorContext,
): SummaryArtifactV3 {
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
    ...summary,
    sections: summary.sections.map((section) => {
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
  };
}

export async function generateSummary(
  provider: StructuredGenerationProvider,
  context: GeneratorContext,
) {
  const mode = modeForContext(context);
  const policy = selectSummaryPolicy({
    durationSeconds: context.durationSeconds,
    mode,
    transcriptSegments: context.transcriptSegments,
  });
  const passResults: SummaryPassResult[] = [];

  if (policy.route === 'one-pass') {
    const initialResult = await provider.generate({
      name: 'gleen_summary_v3',
      system: summaryInstructions(mode, policy),
      input: `Preset: ${mode}\n${commonInput(context)}`,
      jsonSchema: summaryJsonSchema,
      parse: (value) => summaryArtifactV3Schema.parse(value),
    });
    passResults.push({ name: 'gleen_summary_v3', result: initialResult });

    let candidate = initialResult.value;
    const findings = validateSummaryDuplicates(candidate);
    let repairCount = 0;
    if (requiresRepair(findings)) {
      const repairResult = await generateRepair<SummaryArtifactV3>(provider, {
        name: 'gleen_summary_repair_v3',
        system: `${summaryInstructions(mode, policy)} Repair the candidate once by resolving every supplied duplicate finding while preserving all grounded evidence, conclusions, and caveats.`,
        input: repairInput(context, findings, candidate),
        jsonSchema: summaryJsonSchema,
        parse: (value) => summaryArtifactV3Schema.parse(value),
      });
      passResults.push({
        name: 'gleen_summary_repair_v3',
        result: repairResult,
      });
      repairCount = 1;
      candidate = repairResult.value;
      if (requiresRepair(validateSummaryDuplicates(candidate))) {
        throw new ProviderError('invalid_provider_response', true);
      }
    }

    return {
      value: sanitizeSummaryGrounding(candidate, context),
      metadata: summaryMetadata(policy, repairCount, passResults),
    };
  }

  const ideaMapResult = await provider.generate({
    name: 'gleen_summary_idea_map_v1',
    system: IDEA_MAP_SYSTEM_PROMPT,
    input: `Requested mode: ${mode}\n${commonInput(context)}`,
    jsonSchema: summaryIdeaMapJsonSchema,
    parse: (value) => summaryIdeaMapSchema.parse(value),
  });
  passResults.push({
    name: 'gleen_summary_idea_map_v1',
    result: ideaMapResult,
  });

  const compositionResult = await provider.generate({
    name: 'gleen_summary_compose_v3',
    system: compositionInstructions(mode, policy),
    input: `Idea map:\n${JSON.stringify(ideaMapResult.value)}\n\n${commonInput(context)}`,
    jsonSchema: composedSummaryJsonSchema,
    parse: (value) => composedSummarySchema.parse(value),
  });
  passResults.push({
    name: 'gleen_summary_compose_v3',
    result: compositionResult,
  });

  let candidate = compositionResult.value;
  const findings = validateComposedSummary({
    ideaMap: ideaMapResult.value,
    summary: candidate,
    policy,
  });
  let repairCount = 0;
  if (requiresRepair(findings)) {
    const repairResult = await generateRepair<ComposedSummary>(provider, {
      name: 'gleen_summary_repair_v3',
      system: `${compositionInstructions(mode, policy)} Repair the candidate once by resolving every supplied finding while preserving all transcript evidence and correctly reporting covered idea IDs.`,
      input: repairInput(context, findings, candidate, ideaMapResult.value),
      jsonSchema: composedSummaryJsonSchema,
      parse: (value) => composedSummarySchema.parse(value),
    });
    passResults.push({ name: 'gleen_summary_repair_v3', result: repairResult });
    repairCount = 1;
    candidate = repairResult.value;
    if (
      requiresRepair(
        validateComposedSummary({
          ideaMap: ideaMapResult.value,
          summary: candidate,
          policy,
        }),
      )
    ) {
      throw new ProviderError('invalid_provider_response', true);
    }
  }

  return {
    value: sanitizeSummaryGrounding(toSummaryArtifact(candidate), context),
    metadata: summaryMetadata(policy, repairCount, passResults),
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
