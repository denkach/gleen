import type { SummaryArtifactV3 } from './artifact-schemas';
import type {
  ComposedSummary,
  SummaryIdeaMap,
} from './summary-generation-schemas';
import type { SummaryGenerationPolicy } from './summary-policy';

export type SummaryQualityFinding = Readonly<{
  code:
    | 'missing_high_importance'
    | 'unknown_idea'
    | 'duplicate_section_text'
    | 'duplicate_adjacent_section'
    | 'structural_range';
  sectionIndexes?: readonly number[];
  ideaIds?: readonly string[];
}>;

export type ValidateComposedSummaryInput = Readonly<{
  ideaMap: SummaryIdeaMap;
  summary: ComposedSummary;
  policy: SummaryGenerationPolicy;
}>;

type NormalizedText = Readonly<{
  value: string;
  tokens: readonly string[];
  tokenSet: ReadonlySet<string>;
}>;

const MINIMUM_COMPARISON_TOKENS = 8;
const DUPLICATE_JACCARD_THRESHOLD = 0.82;

function normalizeText(value: string): NormalizedText {
  const normalized = value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\p{P}+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  const tokens = normalized === '' ? [] : normalized.split(' ');

  return {
    value: normalized,
    tokens,
    tokenSet: new Set(tokens),
  };
}

function isDuplicate(leftValue: string, rightValue: string): boolean {
  const left = normalizeText(leftValue);
  const right = normalizeText(rightValue);

  if (left.value !== '' && left.value === right.value) return true;

  if (
    left.tokens.length < MINIMUM_COMPARISON_TOKENS ||
    right.tokens.length < MINIMUM_COMPARISON_TOKENS
  ) {
    return false;
  }

  let intersectionSize = 0;
  for (const token of left.tokenSet) {
    if (right.tokenSet.has(token)) intersectionSize += 1;
  }

  const unionSize = new Set([...left.tokenSet, ...right.tokenSet]).size;
  return intersectionSize / unionSize >= DUPLICATE_JACCARD_THRESHOLD;
}

function canRetainHighImportanceCoverage(
  highImportanceIds: readonly string[],
  summary: ComposedSummary,
  maximumSections: number,
): boolean {
  if (highImportanceIds.length === 0) return true;

  const indexForIdea = new Map(
    highImportanceIds.map((ideaId, index) => [ideaId, index]),
  );
  const sectionCoverage = summary.sections
    .map((section) => [
      ...new Set(
        section.coveredIdeaIds.flatMap((ideaId) => {
          const ideaIndex = indexForIdea.get(ideaId);
          return ideaIndex === undefined ? [] : [ideaIndex];
        }),
      ),
    ])
    .filter((coveredIndexes) => coveredIndexes.length > 0);
  const allCoveredIndexes = new Set(sectionCoverage.flat());

  if (allCoveredIndexes.size !== highImportanceIds.length) return false;

  const seenDepth = new Map<string, number>();
  function coversTarget(coveredIndexes: Set<number>, depth: number): boolean {
    if (coveredIndexes.size === highImportanceIds.length) return true;
    if (depth === maximumSections) return false;

    const stateKey = [...coveredIndexes]
      .sort((left, right) => left - right)
      .join(',');
    const previousDepth = seenDepth.get(stateKey);
    if (previousDepth !== undefined && previousDepth <= depth) return false;
    seenDepth.set(stateKey, depth);

    const nextIdeaIndex = highImportanceIds.findIndex(
      (_, index) => !coveredIndexes.has(index),
    );

    for (const coveredBySection of sectionCoverage) {
      if (
        coveredBySection.includes(nextIdeaIndex) &&
        coversTarget(
          new Set([...coveredIndexes, ...coveredBySection]),
          depth + 1,
        )
      ) {
        return true;
      }
    }

    return false;
  }

  return coversTarget(new Set(), 0);
}

function shouldReportStructuralRange(
  input: ValidateComposedSummaryInput,
  highImportanceIds: readonly string[],
): boolean {
  const sectionCount = input.summary.sections.length;
  const { min, max } = input.policy.sectionRange;

  if (sectionCount < min) {
    if (input.policy.sectionRangeEnforcement === 'strict') return true;
    const distinctIdeaCount = new Set(input.ideaMap.ideas.map(({ id }) => id))
      .size;
    return distinctIdeaCount >= min;
  }

  if (sectionCount > max) {
    return canRetainHighImportanceCoverage(
      highImportanceIds,
      input.summary,
      max,
    );
  }

  return false;
}

export function validateSummaryDuplicates(
  summary: Pick<SummaryArtifactV3, 'sections'>,
): SummaryQualityFinding[] {
  const findings: SummaryQualityFinding[] = [];

  summary.sections.forEach((section, sectionIndex) => {
    if (isDuplicate(section.summary, section.details)) {
      findings.push({
        code: 'duplicate_section_text',
        sectionIndexes: [sectionIndex],
      });
    }

    const nextSection = summary.sections[sectionIndex + 1];
    if (nextSection && isDuplicate(section.details, nextSection.details)) {
      findings.push({
        code: 'duplicate_adjacent_section',
        sectionIndexes: [sectionIndex, sectionIndex + 1],
      });
    }
  });

  return findings;
}

export function validateComposedSummary(
  input: ValidateComposedSummaryInput,
): SummaryQualityFinding[] {
  const findings = validateSummaryDuplicates(input.summary);
  const knownIdeaIds = new Set(input.ideaMap.ideas.map(({ id }) => id));
  const highImportanceIds = input.ideaMap.ideas
    .filter(({ importance }) => importance === 'high')
    .map(({ id }) => id);
  const coveredIdeaIds = new Set(
    input.summary.sections.flatMap(({ coveredIdeaIds: ids }) => ids),
  );
  const missingHighImportanceIds = highImportanceIds.filter(
    (ideaId) => !coveredIdeaIds.has(ideaId),
  );

  if (missingHighImportanceIds.length > 0) {
    findings.push({
      code: 'missing_high_importance',
      ideaIds: missingHighImportanceIds,
    });
  }

  const unknownIdeaIds = [...coveredIdeaIds].filter(
    (ideaId) => !knownIdeaIds.has(ideaId),
  );
  if (unknownIdeaIds.length > 0) {
    findings.push({ code: 'unknown_idea', ideaIds: unknownIdeaIds });
  }

  if (shouldReportStructuralRange(input, highImportanceIds)) {
    findings.push({
      code: 'structural_range',
      sectionIndexes: input.summary.sections.map((_, index) => index),
    });
  }

  return findings;
}

export function requiresRepair(
  findings: readonly SummaryQualityFinding[],
): boolean {
  return findings.length > 0;
}
