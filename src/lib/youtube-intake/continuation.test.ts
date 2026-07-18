import { describe, expect, it } from 'vitest';

import {
  buildAnalysisContinuation,
  parseAnalysisContinuation,
} from './continuation';

describe('analysis continuation boundary', () => {
  it.each([
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['  https://www.youtube.com/shorts/dQw4w9WgXcQ  ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])(
    'normalizes a supported URL before building the internal path',
    (raw, id) => {
      expect(buildAnalysisContinuation(raw)).toBe(
        `/app?continuation=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
      );
    },
  );

  it.each([
    '',
    'not a url',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    '//evil.example/watch?v=dQw4w9WgXcQ',
    String.raw`/\evil.example`,
    String.raw`https://youtu.be/dQw4w9WgXcQ\evil`,
    'https://youtu.be/dQw4w9WgXcQ\u0000',
    'https://youtu.be/dQw4w9WgXcQ\n',
  ])('rejects an unsafe or unsupported raw URL: %s', (raw) => {
    expect(buildAnalysisContinuation(raw)).toBeNull();
  });

  it('round trips one normalized supported YouTube URL', () => {
    const next = buildAnalysisContinuation('https://youtu.be/dQw4w9WgXcQ');

    expect(next).toBe(
      '/app?continuation=' +
        encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    );
    expect(
      parseAnalysisContinuation(
        new URL(next!, 'https://x').searchParams.get('continuation'),
      ),
    ).toEqual({ rawUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
  });

  it.each([
    null,
    '',
    '//evil.example',
    String.raw`/\evil.example`,
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ\u0000',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&v=abcdefghijk',
  ])('parses only one already-normalized supported URL: %s', (candidate) => {
    expect(parseAnalysisContinuation(candidate)).toBeNull();
  });
});
