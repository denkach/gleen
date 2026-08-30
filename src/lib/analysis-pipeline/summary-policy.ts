import type { SummaryMode } from '@/lib/summary-mode';
import type { TranscriptSegment } from '@/lib/youtube-intake/providers';

export type SummaryPolicyInput = Readonly<{
  durationSeconds: number;
  mode: SummaryMode;
  transcriptSegments: readonly TranscriptSegment[];
}>;

export type SummaryGenerationPolicy = Readonly<{
  route: 'one-pass' | 'two-pass';
  sectionRange: Readonly<{ min: number; max: number }>;
  signals: Readonly<{
    durationSeconds: number;
    wordCount: number;
    segmentCount: number;
  }>;
}>;

function sectionRangeForDuration(
  durationSeconds: number,
): Readonly<{ min: number; max: number }> {
  if (durationSeconds < 1_200) return { min: 4, max: 8 };
  if (durationSeconds < 2_700) return { min: 8, max: 12 };
  if (durationSeconds < 5_400) return { min: 10, max: 16 };
  return { min: 14, max: 20 };
}

function wordCountForSegments(
  transcriptSegments: readonly TranscriptSegment[],
): number {
  return transcriptSegments.reduce(
    (count, segment) =>
      count + segment.text.trim().split(/\s+/u).filter(Boolean).length,
    0,
  );
}

export function selectSummaryPolicy(
  input: SummaryPolicyInput,
): SummaryGenerationPolicy {
  const wordCount = wordCountForSegments(input.transcriptSegments);
  const longForm = input.durationSeconds >= 1_200;
  const denseShortVideo =
    wordCount >= 10_000 || input.transcriptSegments.length >= 1_000;
  const deepEscalation = input.mode === 'deep' && wordCount >= 4_000;

  return {
    route:
      longForm || denseShortVideo || deepEscalation ? 'two-pass' : 'one-pass',
    sectionRange: sectionRangeForDuration(input.durationSeconds),
    signals: {
      durationSeconds: input.durationSeconds,
      wordCount,
      segmentCount: input.transcriptSegments.length,
    },
  };
}
