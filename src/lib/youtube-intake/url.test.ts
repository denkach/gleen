import { describe, expect, test } from 'vitest';
import { parseYouTubeUrl } from './url';

describe('parseYouTubeUrl', () => {
  test.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=4', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=value', 'dQw4w9WgXcQ'],
    ['https://youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('accepts %s', (raw, videoId) => {
    expect(parseYouTubeUrl(`  ${raw}  `)).toEqual({
      ok: true,
      videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    });
  });

  test.each([
    'http://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
    'https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com:444/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/playlist?list=PL123',
    'https://youtube.com/watch?v=short',
    'https://youtu.be/dQw4w9WgXcQ?v=aaaaaaaaaaa',
    'https://youtube.com/watch?v=dQw4w9WgXcQ&v=aaaaaaaaaaa',
    'https://youtube.com/shorts/dQw4w9WgXcQ?v=dQw4w9WgXcQ&v=aaaaaaaaaaa',
  ])('rejects %s', (raw) => {
    expect(parseYouTubeUrl(raw)).toEqual({ ok: false, code: 'invalid_url' });
  });
});
