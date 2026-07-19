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

function contentKey(value: string): string {
  return plainText(value).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
}

function yamlDoubleQuoted(value: string): string {
  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, ' ')}"`;
}

function obsidianWikiTarget(value: string): string {
  return (
    plainText(value)
      .normalize('NFKC')
      .replace(/[\[\]|/\\#^\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Source video'
  );
}

function pushSummary(
  lines: string[],
  model: ResultWorkspaceModel,
): ReadonlySet<string> {
  if (model.tabs.summary.status !== 'ready') return new Set();
  const summary = model.tabs.summary.data;
  const represented = new Set<string>();
  const outcome = plainText(summary.outcome);
  const overview = plainText(summary.overview);

  lines.push('', '## Summary', '', `### ${plainText(summary.title)}`);
  represented.add(contentKey(summary.title));
  if (outcome) {
    lines.push('', `**Outcome:** ${outcome}`);
    represented.add(contentKey(outcome));
  }
  if (overview && contentKey(overview) !== contentKey(outcome)) {
    lines.push('', overview);
    represented.add(contentKey(overview));
  }

  for (const section of summary.sections) {
    const sectionSummary = plainText(section.summary);
    const details = plainText(section.details);
    lines.push('', `### ${plainText(section.title)}`);
    represented.add(contentKey(section.title));
    if (sectionSummary) {
      lines.push('', sectionSummary);
      represented.add(contentKey(sectionSummary));
    }
    if (details && contentKey(details) !== contentKey(sectionSummary)) {
      lines.push('', details);
      represented.add(contentKey(details));
    }
    if (section.supportingQuote) {
      lines.push('', `> ${plainText(section.supportingQuote)}`);
      represented.add(contentKey(section.supportingQuote));
    }
    if (section.sourceOffsetMs !== null) {
      lines.push(
        '',
        `[Source moment ${timecode(section.sourceOffsetMs)}](${sourceUrl(model, section.sourceOffsetMs)})`,
      );
    }
  }
  return represented;
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
    const title = plainText(model.source.title);
    if (destination === 'obsidian') {
      lines.push(
        '---',
        `title: ${yamlDoubleQuoted(title)}`,
        `source: ${yamlDoubleQuoted(source)}`,
        'source_type: youtube',
        'type: gleen-result',
        '---',
        '',
      );
    }
    lines.push(`# ${title}`, '');
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
    if (destination === 'obsidian') {
      lines.push(
        `Obsidian source: [[YouTube - ${obsidianWikiTarget(title)}|Source video]]`,
      );
    }
  }

  let representedSummaryContent: ReadonlySet<string> = new Set();
  if (selection.summary) {
    if (model.tabs.summary.status === 'ready') {
      representedSummaryContent = pushSummary(lines, model);
    } else {
      unavailableSection(lines, 'Summary');
    }
  }

  if (selection.keyTakeaways) {
    if (model.tabs.summary.status === 'ready') {
      const points = model.tabs.summary.data.keyPoints.filter(
        (point) => !representedSummaryContent.has(contentKey(point.text)),
      );
      if (points.length > 0) {
        lines.push('', '## Key takeaways');
      } else if (selection.summary) {
        lines.push(
          '',
          '## Key takeaways',
          '',
          '_Included in the structured summary above._',
        );
      }
      for (const point of points) {
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
    if (
      model.tabs.transcript.status === 'ready' &&
      model.tabs.transcript.data.segments.length > 0
    ) {
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
  const normalizedSlug = plainText(model.source.title)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  const slug = Array.from(normalizedSlug).slice(0, 80).join('');
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
