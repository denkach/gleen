import { describe, expect, it } from 'vitest';

import type { ResultWorkspaceModel } from './presentation';
import { serializeMarkdown } from './markdown';

const model: ResultWorkspaceModel = {
  source: {
    intakeId: '5c28b973-7e73-480a-8e53-c07345bde584',
    youtubeVideoId: 'dQw4w9WgXcQ',
    title: 'Light <script>alert(1)</script> & learning',
    channelTitle: 'Gleen Studio',
    durationSeconds: 900,
    thumbnailUrl: 'https://example.com/thumb.jpg?token=private',
  },
  revision: 1,
  revisions: {
    title: '2026-07-18T00:00:00.000Z',
    summary: '2026-07-18T00:01:00.000Z',
    flashcards: '2026-07-18T00:01:00.000Z',
    timestamps: '2026-07-18T00:01:00.000Z',
  },
  tabs: {
    summary: {
      status: 'ready',
      data: {
        schemaVersion: 2,
        title: 'A structured summary',
        overview: 'One source becomes useful outputs.',
        keyPoints: [
          { text: 'Legacy text remains readable.', sourceOffsetMs: null },
          { text: 'Sources remain grounded.', sourceOffsetMs: 755_000 },
        ],
      },
    },
    flashcards: {
      status: 'ready',
      data: {
        schemaVersion: 1,
        cards: [{ front: 'What does a prism do?', back: 'Separates light.' }],
      },
    },
    timestamps: {
      status: 'ready',
      data: {
        schemaVersion: 1,
        chapters: [
          { offsetMs: 0, title: 'Opening', description: 'The premise' },
          { offsetMs: 755_000, title: 'Sources', description: 'Grounding' },
        ],
      },
    },
    transcript: {
      status: 'ready',
      data: {
        schemaVersion: 1,
        language: 'en',
        segments: [
          { text: 'A prism separates light.', offsetMs: 0, durationMs: 3_000 },
          {
            text: 'Sources stay grounded.',
            offsetMs: 755_000,
            durationMs: 2_000,
          },
        ],
      },
    },
  },
};

describe('serializeMarkdown', () => {
  it.each(['markdown', 'obsidian', 'notebooklm'] as const)(
    'serializes a deterministic and complete %s document',
    (format) => {
      const output = serializeMarkdown(model, format);

      expect(output).toContain('# Light alert(1) & learning');
      expect(output).toContain(
        'Source: https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      );
      expect(output).toContain('## Summary');
      expect(output).toContain('### A structured summary');
      expect(output).toContain('Sources remain grounded. ([12:35]');
      expect(output).toContain('## Flashcards');
      expect(output).toContain('**Q:** What does a prism do?');
      expect(output).toContain('**A:** Separates light.');
      expect(output).toContain('## Chapters');
      expect(output).toContain('### 12:35 — Sources');
      expect(output).toContain('## Transcript');
      expect(output).toContain('**12:35** Sources stay grounded.');
      expect(output).not.toMatch(/<[^>]+>/);
      expect(output).not.toContain('private');
      expect(serializeMarkdown(model, format)).toBe(output);
    },
  );

  it('uses Obsidian properties only for the Obsidian format', () => {
    expect(serializeMarkdown(model, 'obsidian')).toMatch(
      /^---\nsource: "https:\/\/www\.youtube\.com\/watch\?v=dQw4w9WgXcQ"/,
    );
    expect(serializeMarkdown(model, 'markdown')).not.toMatch(/^---/);
  });

  it('labels NotebookLM input as a source document', () => {
    expect(serializeMarkdown(model, 'notebooklm')).toContain(
      '> NotebookLM source document',
    );
  });
});
