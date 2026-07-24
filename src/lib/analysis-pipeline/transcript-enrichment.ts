import type { TranscriptSegment } from '@/lib/youtube-intake/providers';

export type TranscriptSegmentType =
  'insight' | 'question' | 'example' | 'story' | 'other';

const exampleMarkers = [
  'for example',
  'for instance',
  'e.g.',
  'наприклад',
  'приміром',
  'например',
  'к примеру',
  'por ejemplo',
  'zum beispiel',
  'beispielsweise',
] as const;

const storyPatterns = [
  /(?:^|[^\p{L}\p{N}_])i remember(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])i once(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])when i(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])my experience(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])я пам'ятаю(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])колись я(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])коли я(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])мій досвід(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])я помню(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])однажды я(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])когда я(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])мой опыт(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])recuerdo que(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])cuando yo(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])mi experiencia(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])ich erinnere mich(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])einmal habe ich(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])als ich(?=$|[^\p{L}\p{N}_])/u,
  /(?:^|[^\p{L}\p{N}_])meine erfahrung(?=$|[^\p{L}\p{N}_])/u,
] as const;

function normalizedForClassification(text: string): string {
  return text
    .normalize('NFKC')
    .replaceAll('’', "'")
    .toLocaleLowerCase()
    .replace(/\s+/gu, ' ')
    .trim();
}

export function classifyTranscriptSegment(text: string): TranscriptSegmentType {
  const normalized = normalizedForClassification(text);
  if (normalized.includes('?')) return 'question';
  if (exampleMarkers.some((marker) => normalized.includes(marker)))
    return 'example';
  if (storyPatterns.some((pattern) => pattern.test(normalized))) return 'story';
  return 'other';
}

export function enrichTranscriptSegments(
  segments: readonly TranscriptSegment[],
) {
  return segments.map((segment) => ({
    ...segment,
    segmentType: classifyTranscriptSegment(segment.text),
    speakerLabel: null,
  }));
}
