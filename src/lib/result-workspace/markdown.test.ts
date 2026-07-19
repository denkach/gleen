import { describe, expect, it } from 'vitest';

import type { ResultWorkspaceModel } from './presentation';
import {
  exportFilename,
  serializeExport,
  serializeMarkdown,
  type ExportSelection,
} from './markdown';

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
  overview: {
    outcome: 'One source becomes useful outputs.',
    durationSeconds: 900,
    summarySectionCount: 2,
    flashcardCount: 1,
    reviewedFlashcardCount: 0,
    keyMomentCount: 2,
    transcriptWordCount: 7,
    currentTimeSeconds: 0,
    currentChapter: {
      id: 'chapter-0',
      title: 'Opening',
      startSeconds: 0,
      endSeconds: 755,
    },
    availableExports: ['markdown', 'obsidian', 'notebooklm'],
  },
  userState: {
    favorite: false,
    playbackPositionMs: 0,
    lastArtifact: 'overview',
    lastStudyAction: null,
    reviews: [],
  },
  tabs: {
    summary: {
      status: 'ready',
      data: {
        schemaVersion: 2,
        title: 'A structured summary',
        outcome: 'One source becomes useful outputs.',
        overview: 'One source becomes useful outputs.',
        sections: [
          {
            title: 'Legacy text remains readable.',
            summary: 'Legacy text remains readable.',
            details: 'Legacy text remains readable.',
            supportingQuote: null,
            sourceOffsetMs: null,
          },
          {
            title: 'Sources remain grounded.',
            summary: 'Sources remain grounded.',
            details: 'Sources remain grounded.',
            supportingQuote: null,
            sourceOffsetMs: 755_000,
          },
        ],
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
          {
            offsetMs: 0,
            title: 'Opening',
            description: 'The premise',
            durationMs: 755_000,
          },
          {
            offsetMs: 755_000,
            title: 'Sources',
            description: 'Grounding',
            durationMs: 145_000,
          },
        ],
      },
    },
    transcript: {
      status: 'ready',
      data: {
        schemaVersion: 1,
        language: 'en',
        segments: [
          {
            text: 'A prism separates light.',
            offsetMs: 0,
            durationMs: 3_000,
            segmentType: 'other',
            speakerLabel: null,
          },
          {
            text: 'Sources stay grounded.',
            offsetMs: 755_000,
            durationMs: 2_000,
            segmentType: 'other',
            speakerLabel: null,
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

describe('serializeExport', () => {
  const selection: ExportSelection = {
    summary: true,
    keyTakeaways: false,
    chapters: true,
    transcript: false,
    metadata: true,
  };

  it.each(['markdown', 'obsidian', 'notebooklm'] as const)(
    'uses the closed selection contract for %s',
    (destination) => {
      const output = serializeExport(model, destination, selection);

      expect(output).toContain('## Summary');
      expect(output).toContain('One source becomes useful outputs.');
      expect(output).toContain('## Chapters');
      expect(output).toContain('### 12:35 — Sources');
      expect(output).toContain('# Light alert(1) & learning');
      expect(output).not.toContain('## Key takeaways');
      expect(output).not.toContain('## Transcript');
      expect(output).not.toContain('## Flashcards');
      expect(serializeExport(model, destination, selection)).toBe(output);
    },
  );

  it('keeps summary and key takeaways independently selectable', () => {
    const keyTakeawaysOnly = serializeExport(model, 'markdown', {
      summary: false,
      keyTakeaways: true,
      chapters: false,
      transcript: false,
      metadata: false,
    });

    expect(keyTakeawaysOnly).toContain('## Key takeaways');
    expect(keyTakeawaysOnly).toContain('- Legacy text remains readable.');
    expect(keyTakeawaysOnly).not.toContain('## Summary');
    expect(keyTakeawaysOnly).not.toContain('Source:');
  });

  it('acknowledges takeaways already represented by a selected summary', () => {
    const output = serializeExport(model, 'markdown', {
      summary: true,
      keyTakeaways: true,
      chapters: false,
      transcript: false,
      metadata: false,
    });

    expect(output).toContain(
      '## Key takeaways\n\n_Included in the structured summary above._',
    );
    expect(output.match(/Legacy text remains readable\./g)).toHaveLength(1);
    expect(output.match(/Sources remain grounded\./g)).toHaveLength(1);
  });

  it('exports every structured summary field and avoids repeated takeaways', () => {
    if (model.tabs.summary.status !== 'ready') {
      throw new Error('Expected a ready summary fixture');
    }
    const structuredModel: ResultWorkspaceModel = {
      ...model,
      tabs: {
        ...model.tabs,
        summary: {
          status: 'ready',
          data: {
            ...model.tabs.summary.data,
            sections: [
              {
                title: 'Refraction in practice',
                summary: 'A prism separates a source into useful outputs.',
                details: 'The outputs remain traceable to the original source.',
                supportingQuote: 'Every useful claim stays grounded.',
                sourceOffsetMs: 75_000,
              },
            ],
            keyPoints: [
              {
                text: 'A prism separates a source into useful outputs.',
                sourceOffsetMs: 75_000,
              },
              { text: 'A distinct takeaway.', sourceOffsetMs: null },
            ],
          },
        },
      },
    };

    const output = serializeExport(structuredModel, 'markdown', {
      summary: true,
      keyTakeaways: true,
      chapters: false,
      transcript: false,
      metadata: false,
    });

    expect(output).toContain('### Refraction in practice');
    expect(output).toContain('A prism separates a source into useful outputs.');
    expect(output).toContain(
      'The outputs remain traceable to the original source.',
    );
    expect(output).toContain('> Every useful claim stays grounded.');
    expect(output).toContain(
      '[Source moment 1:15](https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=75s)',
    );
    expect(
      output.match(/A prism separates a source into useful outputs\./g),
    ).toHaveLength(1);
    expect(output).toContain('## Key takeaways\n- A distinct takeaway.');
  });

  it('adds only truthful destination-specific document syntax', () => {
    const markdown = serializeExport(model, 'markdown', selection);
    const obsidian = serializeExport(model, 'obsidian', selection);
    const notebookLm = serializeExport(model, 'notebooklm', selection);

    expect(markdown).not.toMatch(/^---/);
    expect(markdown).not.toContain('NotebookLM source document');
    expect(obsidian).toMatch(/^---\ntitle: "Light alert\(1\) & learning"/);
    expect(obsidian).toContain(
      'source: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"',
    );
    expect(obsidian).toContain(
      '[[YouTube - Light alert(1) & learning|Source video]]',
    );
    expect(notebookLm).toContain('> NotebookLM source document');
    expect(notebookLm).not.toMatch(/^---/);
  });

  it('serializes current draft values without mutating the model', () => {
    if (
      model.tabs.summary.status !== 'ready' ||
      model.tabs.timestamps.status !== 'ready'
    ) {
      throw new Error('Expected ready export fixture artifacts');
    }
    const draftModel: ResultWorkspaceModel = {
      ...model,
      source: { ...model.source, title: 'Current draft title' },
      tabs: {
        ...model.tabs,
        summary: {
          status: 'ready',
          data: {
            ...model.tabs.summary.data,
            overview: 'Current draft overview',
          },
        },
        timestamps: {
          status: 'ready',
          data: {
            ...model.tabs.timestamps.data,
            chapters: model.tabs.timestamps.data.chapters.map(
              (chapter, index) =>
                index === 0
                  ? { ...chapter, title: 'Current draft chapter' }
                  : chapter,
            ),
          },
        },
      },
    };

    const output = serializeExport(draftModel, 'markdown', selection);

    expect(output).toContain('# Current draft title');
    expect(output).toContain('Current draft overview');
    expect(output).toContain('Current draft chapter');
    expect(model.source.title).toContain('<script>');
  });

  it('reports selected unavailable content honestly without empty headings', () => {
    const unavailableModel: ResultWorkspaceModel = {
      ...model,
      tabs: {
        ...model.tabs,
        summary: { status: 'unavailable', reason: 'failed', errorCode: 'x' },
        transcript: { status: 'unavailable', reason: 'missing' },
      },
    };
    const output = serializeExport(unavailableModel, 'markdown', {
      summary: true,
      keyTakeaways: true,
      chapters: false,
      transcript: true,
      metadata: false,
    });

    expect(output).toContain('Summary unavailable');
    expect(output).toContain('Key takeaways unavailable');
    expect(output).toContain('Transcript unavailable');
    expect(output).not.toMatch(/## Summary\n\n##/);
  });

  it('reports a ready transcript with zero segments as unavailable', () => {
    const transcriptFixture = model.tabs.transcript;
    if (transcriptFixture.status !== 'ready') {
      throw new Error('Expected a ready transcript fixture');
    }
    const emptyTranscriptModel: ResultWorkspaceModel = {
      ...model,
      tabs: {
        ...model.tabs,
        transcript: {
          status: 'ready',
          data: { ...transcriptFixture.data, segments: [] },
        },
      },
    };

    const output = serializeExport(emptyTranscriptModel, 'markdown', {
      summary: false,
      keyTakeaways: false,
      chapters: false,
      transcript: true,
      metadata: false,
    });

    expect(output).toContain('## Transcript unavailable');
    expect(output).not.toMatch(/^## Transcript$/m);
  });

  it('escapes Obsidian properties and wiki-link targets safely', () => {
    const unsafeTitleModel: ResultWorkspaceModel = {
      ...model,
      source: {
        ...model.source,
        title: 'Notes "one" ]] | / \\ next',
      },
    };

    const output = serializeExport(unsafeTitleModel, 'obsidian', {
      summary: false,
      keyTakeaways: false,
      chapters: false,
      transcript: false,
      metadata: true,
    });

    expect(output).toContain('title: "Notes \\"one\\" ]] | / \\\\ next"');
    expect(output).toContain('[[YouTube - Notes "one" next|Source video]]');
    expect(output).not.toContain('[[YouTube - Notes "one" ]]');
  });

  it('returns no bytes for an empty selection', () => {
    expect(
      serializeExport(model, 'markdown', {
        summary: false,
        keyTakeaways: false,
        chapters: false,
        transcript: false,
        metadata: false,
      }),
    ).toBe('');
  });

  it('creates destination-specific filenames from the current title', () => {
    expect(exportFilename(model, 'markdown')).toBe(
      'light-alert-1-learning-markdown.md',
    );
    expect(exportFilename(model, 'obsidian')).toBe(
      'light-alert-1-learning-obsidian.md',
    );
    expect(exportFilename(model, 'notebooklm')).toBe(
      'light-alert-1-learning-notebooklm-source.md',
    );
  });

  it.each([
    ['Призма і знання', 'призма-і-знання-markdown.md'],
    ['ПРИЗМА ТА ЗНАННЯ', 'призма-та-знання-markdown.md'],
    ['  ../Prism\\notes: one?  ', 'prism-notes-one-markdown.md'],
  ])(
    'preserves Unicode letters and strips unsafe separators from %s',
    (title, filename) => {
      expect(
        exportFilename(
          { ...model, source: { ...model.source, title } },
          'markdown',
        ),
      ).toBe(filename);
    },
  );
});
