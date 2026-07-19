import type { ResultWorkspaceModel } from './presentation';

export type MarkdownFormat = 'markdown' | 'obsidian' | 'notebooklm';
export type ExportDestination = MarkdownFormat;

export type ExportSelection = Readonly<{
  summary: boolean;
  keyTakeaways: boolean;
  chapters: boolean;
  transcript: boolean;
  metadata: boolean;
}>;

function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

function timecode(offsetMs: number): string {
  const totalSeconds = Math.floor(offsetMs / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function sourceUrl(model: ResultWorkspaceModel, offsetMs?: number): string {
  const base = `https://www.youtube.com/watch?v=${encodeURIComponent(model.source.youtubeVideoId)}`;
  return offsetMs === undefined
    ? base
    : `${base}&t=${Math.floor(offsetMs / 1_000)}s`;
}

function unavailableSection(lines: string[], label: string): void {
  lines.push('', `## ${label} unavailable`, '', `_${label} is unavailable._`);
}

export function serializeExport(
  model: ResultWorkspaceModel,
  destination: ExportDestination,
  selection: ExportSelection,
): string {
  if (!Object.values(selection).some(Boolean)) return '';

  const source = sourceUrl(model);
  const lines: string[] = [];

  if (selection.metadata) {
    if (destination === 'obsidian') {
      lines.push('---', `source: "${source}"`, 'type: gleen-result', '---', '');
    }
    lines.push(`# ${plainText(model.source.title)}`, '');
    if (destination === 'notebooklm') {
      lines.push('> NotebookLM source document', '');
    }
    lines.push(
      `Source: ${source}`,
      `Channel: ${plainText(model.source.channelTitle)}`,
      `Duration: ${timecode(model.source.durationSeconds * 1_000)}`,
    );
    if (model.tabs.transcript.status === 'ready') {
      lines.push(`Language: ${plainText(model.tabs.transcript.data.language)}`);
    }
  }

  if (selection.summary) {
    if (model.tabs.summary.status === 'ready') {
      const summary = model.tabs.summary.data;
      lines.push(
        '',
        '## Summary',
        '',
        `### ${plainText(summary.title)}`,
        '',
        plainText(summary.overview),
      );
    } else {
      unavailableSection(lines, 'Summary');
    }
  }

  if (selection.keyTakeaways) {
    if (model.tabs.summary.status === 'ready') {
      lines.push('', '## Key takeaways');
      for (const point of model.tabs.summary.data.keyPoints) {
        const citation =
          point.sourceOffsetMs === null
            ? ''
            : ` ([${timecode(point.sourceOffsetMs)}](${sourceUrl(model, point.sourceOffsetMs)}))`;
        lines.push(`- ${plainText(point.text)}${citation}`);
      }
    } else {
      unavailableSection(lines, 'Key takeaways');
    }
  }

  if (selection.chapters) {
    if (model.tabs.timestamps.status === 'ready') {
      lines.push('', '## Chapters');
      for (const chapter of model.tabs.timestamps.data.chapters) {
        lines.push(
          '',
          `### ${timecode(chapter.offsetMs)} — ${plainText(chapter.title)}`,
          '',
          plainText(chapter.description),
        );
      }
    } else {
      unavailableSection(lines, 'Chapters');
    }
  }

  if (selection.transcript) {
    if (model.tabs.transcript.status === 'ready') {
      lines.push('', '## Transcript');
      for (const segment of model.tabs.transcript.data.segments) {
        const speaker = segment.speakerLabel
          ? `${plainText(segment.speakerLabel)}: `
          : '';
        lines.push(
          '',
          `**${timecode(segment.offsetMs)}** ${speaker}${plainText(segment.text)}`,
        );
      }
    } else {
      unavailableSection(lines, 'Transcript');
    }
  }

  return `${lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`;
}

export function exportFilename(
  model: ResultWorkspaceModel,
  destination: ExportDestination,
): string {
  const slug = plainText(model.source.title)
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const destinationSuffix =
    destination === 'notebooklm' ? 'notebooklm-source' : destination;
  return `${slug || 'gleen-result'}-${destinationSuffix}.md`;
}

export function serializeMarkdown(
  model: ResultWorkspaceModel,
  format: MarkdownFormat,
): string {
  const source = sourceUrl(model);
  const lines: string[] = [];

  if (format === 'obsidian') {
    lines.push('---', `source: "${source}"`, 'type: gleen-result', '---', '');
  }
  lines.push(`# ${plainText(model.source.title)}`, '');
  if (format === 'notebooklm') lines.push('> NotebookLM source document', '');
  lines.push(
    `Source: ${source}`,
    `Channel: ${plainText(model.source.channelTitle)}`,
  );

  if (model.tabs.summary.status === 'ready') {
    const summary = model.tabs.summary.data;
    lines.push('', '## Summary', '', `### ${plainText(summary.title)}`, '');
    lines.push(plainText(summary.overview), '');
    for (const point of summary.keyPoints) {
      const citation =
        point.sourceOffsetMs === null
          ? ''
          : ` ([${timecode(point.sourceOffsetMs)}](${sourceUrl(model, point.sourceOffsetMs)}))`;
      lines.push(`- ${plainText(point.text)}${citation}`);
    }
  }

  if (model.tabs.flashcards.status === 'ready') {
    lines.push('', '## Flashcards');
    for (const card of model.tabs.flashcards.data.cards) {
      lines.push(
        '',
        `**Q:** ${plainText(card.front)}`,
        '',
        `**A:** ${plainText(card.back)}`,
      );
    }
  }

  if (model.tabs.timestamps.status === 'ready') {
    lines.push('', '## Chapters');
    for (const chapter of model.tabs.timestamps.data.chapters) {
      lines.push(
        '',
        `### ${timecode(chapter.offsetMs)} — ${plainText(chapter.title)}`,
        '',
        plainText(chapter.description),
      );
    }
  }

  if (model.tabs.transcript.status === 'ready') {
    lines.push('', '## Transcript');
    for (const segment of model.tabs.transcript.data.segments) {
      lines.push(
        '',
        `**${timecode(segment.offsetMs)}** ${plainText(segment.text)}`,
      );
    }
  }

  return `${lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`;
}
