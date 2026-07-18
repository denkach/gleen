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

const storyMarkers = [
  'i remember',
  'i once',
  'when i',
  'my experience',
  "я пам'ятаю",
  'колись я',
  'коли я',
  'мій досвід',
  'я помню',
  'однажды я',
  'когда я',
  'мой опыт',
  'recuerdo que',
  'una vez',
  'cuando yo',
  'mi experiencia',
  'ich erinnere mich',
  'einmal habe ich',
  'als ich',
  'meine erfahrung',
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
  if (storyMarkers.some((marker) => normalized.includes(marker)))
    return 'story';
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
