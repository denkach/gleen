import { describe, expect, it } from 'vitest';

import {
  classifyTranscriptSegment,
  enrichTranscriptSegments,
} from './transcript-enrichment';

describe('transcript enrichment', () => {
  it.each([
    ['What should we do?', 'question'],
    ['For example, apply it to a real decision.', 'example'],
    ['Наприклад, перевірте першоджерело.', 'example'],
    ['Например, начните с контекста.', 'example'],
    ['Por ejemplo, revisa la fuente.', 'example'],
    ['Zum Beispiel prüfen wir die Quelle.', 'example'],
    ['I remember when this first worked.', 'story'],
    ["Я пам'ятаю цей перший результат.", 'story'],
    ['Я помню этот первый результат.', 'story'],
    ['Cuando yo lo probé, funcionó.', 'story'],
    ['Als ich es ausprobiert habe, funktionierte es.', 'story'],
    ['A grounded statement without a classification marker.', 'other'],
  ] as const)('classifies %s as %s', (text, expected) => {
    expect(classifyTranscriptSegment(text)).toBe(expected);
  });

  it('gives a real question mark precedence over other markers', () => {
    expect(classifyTranscriptSegment('For example, why does this work?')).toBe(
      'question',
    );
  });

  it.each([
    'When in doubt, verify the source.',
    'AI remembers context across the prompt.',
    'Una vez concluida la etapa, revisa el resultado.',
  ])('keeps non-first-person narrative-like text conservative: %s', (text) => {
    expect(classifyTranscriptSegment(text)).toBe('other');
  });

  it('adds deterministic metadata without rewriting text or naming a speaker', () => {
    const segments = [
      {
        text: '  For example, keep this text byte-for-byte.  ',
        offsetMs: 1_250,
        durationMs: 750,
      },
    ] as const;

    expect(enrichTranscriptSegments(segments)).toEqual([
      {
        ...segments[0],
        segmentType: 'example',
        speakerLabel: null,
      },
    ]);
    expect(enrichTranscriptSegments(segments)[0]?.text).toBe(segments[0].text);
  });
});
