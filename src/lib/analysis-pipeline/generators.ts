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
  metadata: GenerationResult<unknown>['metadata'];
}>;

type SummaryGenerationProgress = {
  readonly policy: SummaryGenerationPolicy;
  readonly passResults: SummaryPassResult[];
  repairCount: number;
  findings: readonly SummaryQualityFinding[];
};

export type SummaryGenerationMetadata = Readonly<{
  route: SummaryGenerationPolicy['route'];
  repairCount: number;
  passes: readonly Readonly<{
    name: string;
    requestId: string | null;
    model: string | null;
    usage: GenerationResult<unknown>['metadata']['usage'];
    latencyMs: number;
  }>[];
}>;

export type SummaryFindingCounts = Readonly<
  Partial<Record<SummaryQualityFinding['code'], number>>
>;

export class SummaryGenerationError extends ProviderError {
  constructor(
    code: ProviderError['code'],
    retryable: boolean,
    readonly metadata: SummaryGenerationMetadata &
      Readonly<{ findingCounts: SummaryFindingCounts }>,
    retryAfterMs?: number,
  ) {
    super(code, retryable, retryAfterMs);
    this.name = 'SummaryGenerationError';
  }
}

function transcriptInput(context: GeneratorContext): string {
  return context.transcriptSegments
    .map((segment) => `[${segment.offsetMs}ms] ${segment.text}`)
    .join('\n');
}

function commonInput(context: GeneratorContext): string {
  return `Output locale: ${context.outputLocale}\nVideo duration: ${context.durationSeconds}s\nTranscript:\n${transcriptInput(context)}`;
}

function summaryInput(context: GeneratorContext): string {
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
    summaryInput(context),
    ideaMap === undefined ? null : `Idea map:\n${JSON.stringify(ideaMap)}`,
    `Candidate summary:\n${JSON.stringify(candidate)}`,
    `Quality findings:\n${JSON.stringify(findings)}`,
  ]
    .filter((part): part is string => part !== null)
    .join('\n\n');
}

async function generatePass<T>(
  provider: StructuredGenerationProvider,
  request: StructuredGenerationRequest<T>,
  progress: SummaryGenerationProgress,
): Promise<GenerationResult<T>> {
  try {
    const result = await provider.generate(request);
    progress.passResults.push({
      name: request.name,
      metadata: result.metadata,
    });
    return result;
  } catch (error) {
    if (error instanceof ProviderError && error.generationMetadata) {
      progress.passResults.push({
        name: request.name,
        metadata: error.generationMetadata,
      });
    }
    throw error;
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
    passes: passResults.map(({ name, metadata }) => ({
      name,
      requestId: metadata.requestId,
      model: metadata.model,
      usage: metadata.usage,
      latencyMs: metadata.latencyMs,
    })),
  } as const satisfies SummaryGenerationMetadata;
}

function findingCounts(
  findings: readonly SummaryQualityFinding[],
): SummaryFindingCounts {
  return findings.reduce<
    Partial<Record<SummaryQualityFinding['code'], number>>
  >((counts, finding) => {
    counts[finding.code] = (counts[finding.code] ?? 0) + 1;
    return counts;
  }, {});
}

function failSummaryQuality(
  policy: SummaryGenerationPolicy,
  repairCount: number,
  passResults: readonly SummaryPassResult[],
  findings: readonly SummaryQualityFinding[],
): never {
  throw new SummaryGenerationError('invalid_provider_response', true, {
    ...summaryMetadata(policy, repairCount, passResults),
    findingCounts: findingCounts(findings),
  });
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

async function generateSummaryAttempt(
  provider: StructuredGenerationProvider,
  context: GeneratorContext,
  progress: SummaryGenerationProgress,
) {
  const mode = modeForContext(context);
  const { policy, passResults } = progress;

  if (policy.route === 'one-pass') {
    const initialResult = await generatePass(
      provider,
      {
        name: 'gleen_summary_v3',
        system: summaryInstructions(mode, policy),
        input: `Preset: ${mode}\n${summaryInput(context)}`,
        jsonSchema: summaryJsonSchema,
        parse: (value) => summaryArtifactV3Schema.parse(value),
      },
      progress,
    );

    let candidate = initialResult.value;
    const findings = validateSummaryDuplicates(candidate);
    progress.findings = findings;
    if (requiresRepair(findings)) {
      progress.repairCount = 1;
      const repairResult = await generatePass<SummaryArtifactV3>(
        provider,
        {
          name: 'gleen_summary_repair_v3',
          system: `${summaryInstructions(mode, policy)} Repair the candidate once by resolving every supplied duplicate finding while preserving all grounded evidence, conclusions, and caveats.`,
          input: repairInput(context, findings, candidate),
          jsonSchema: summaryJsonSchema,
          parse: (value) => summaryArtifactV3Schema.parse(value),
        },
        progress,
      );
      candidate = repairResult.value;
      const repairedFindings = validateSummaryDuplicates(candidate);
      progress.findings = repairedFindings;
      if (requiresRepair(repairedFindings))
        failSummaryQuality(
          policy,
          progress.repairCount,
          passResults,
          repairedFindings,
        );
    }

    return {
      value: sanitizeSummaryGrounding(candidate, context),
      metadata: summaryMetadata(policy, progress.repairCount, passResults),
    };
  }

  const ideaMapResult = await generatePass(
    provider,
    {
      name: 'gleen_summary_idea_map_v1',
      system: IDEA_MAP_SYSTEM_PROMPT,
      input: `Requested mode: ${mode}\n${summaryInput(context)}`,
      jsonSchema: summaryIdeaMapJsonSchema,
      parse: (value) => summaryIdeaMapSchema.parse(value),
    },
    progress,
  );

  const compositionResult = await generatePass(
    provider,
    {
      name: 'gleen_summary_compose_v3',
      system: compositionInstructions(mode, policy),
      input: `Idea map:\n${JSON.stringify(ideaMapResult.value)}\n\n${summaryInput(context)}`,
      jsonSchema: composedSummaryJsonSchema,
      parse: (value) => composedSummarySchema.parse(value),
    },
    progress,
  );

  let candidate = compositionResult.value;
  const findings = validateComposedSummary({
    ideaMap: ideaMapResult.value,
    summary: candidate,
    policy,
  });
  progress.findings = findings;
  if (requiresRepair(findings)) {
    progress.repairCount = 1;
    const repairResult = await generatePass<ComposedSummary>(
      provider,
      {
        name: 'gleen_summary_repair_v3',
        system: `${compositionInstructions(mode, policy)} Repair the candidate once by resolving every supplied finding while preserving all transcript evidence and correctly reporting covered idea IDs.`,
        input: repairInput(context, findings, candidate, ideaMapResult.value),
        jsonSchema: composedSummaryJsonSchema,
        parse: (value) => composedSummarySchema.parse(value),
      },
      progress,
    );
    candidate = repairResult.value;
    const repairedFindings = validateComposedSummary({
      ideaMap: ideaMapResult.value,
      summary: candidate,
      policy,
    });
    progress.findings = repairedFindings;
    if (requiresRepair(repairedFindings))
      failSummaryQuality(
        policy,
        progress.repairCount,
        passResults,
        repairedFindings,
      );
  }

  return {
    value: sanitizeSummaryGrounding(toSummaryArtifact(candidate), context),
    metadata: summaryMetadata(policy, progress.repairCount, passResults),
  };
}

export async function generateSummary(
  provider: StructuredGenerationProvider,
  context: GeneratorContext,
) {
  const policy = selectSummaryPolicy({
    durationSeconds: context.durationSeconds,
    mode: modeForContext(context),
    transcriptSegments: context.transcriptSegments,
  });
  const progress: SummaryGenerationProgress = {
    policy,
    passResults: [],
    repairCount: 0,
    findings: [],
  };

  try {
    return await generateSummaryAttempt(provider, context, progress);
  } catch (error) {
    if (error instanceof SummaryGenerationError) throw error;
    const providerError =
      error instanceof ProviderError
        ? error
        : new ProviderError('invalid_provider_response', true);
    throw new SummaryGenerationError(
      providerError.code,
      providerError.retryable,
      {
        ...summaryMetadata(
          progress.policy,
          progress.repairCount,
          progress.passResults,
        ),
        findingCounts: findingCounts(progress.findings),
      },
      providerError.retryAfterMs,
    );
  }
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
