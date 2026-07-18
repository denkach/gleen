'use client';

import { useState } from 'react';
import {
  serializeMarkdown,
  type MarkdownFormat,
} from '@/lib/result-workspace/markdown';
import type { ResultWorkspaceModel } from '@/lib/result-workspace/presentation';

const exports: readonly {
  format: MarkdownFormat;
  label: string;
  filename: string;
}[] = [
  { format: 'markdown', label: 'Markdown', filename: 'gleen-result.md' },
  { format: 'obsidian', label: 'Obsidian', filename: 'gleen-obsidian.md' },
  {
    format: 'notebooklm',
    label: 'NotebookLM',
    filename: 'gleen-notebooklm.md',
  },
];

export function ExportTab({
  model,
}: Readonly<{ model: ResultWorkspaceModel }>) {
  const [message, setMessage] = useState<
    Readonly<{ kind: 'status' | 'error'; text: string }> | undefined
  >();
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(serializeMarkdown(model, 'markdown'));
      setMessage({ kind: 'status', text: 'Markdown copied' });
    } catch {
      setMessage({ kind: 'error', text: 'Could not copy Markdown.' });
    }
  };
  const download = (format: MarkdownFormat, filename: string) => {
    const blob = new Blob([serializeMarkdown(model, format)], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage({ kind: 'status', text: `${filename} downloaded` });
  };

  return (
    <section data-artifact="export">
      <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--artifact-export)]">
        Local export
      </p>
      <h2 className="mt-2 font-[var(--font-display)] text-xl text-[var(--text-primary)]">
        Keep the structure
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Files are created in this browser from the result shown here.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={copy}
          className="min-h-11 rounded-xl border border-[color-mix(in_srgb,var(--artifact-export)_25%,transparent)] px-4 text-left text-sm text-[var(--text-primary)]"
        >
          Copy Markdown
        </button>
        {exports.map((item) => (
          <button
            key={item.format}
            type="button"
            onClick={() => download(item.format, item.filename)}
            className="min-h-11 rounded-xl border border-[var(--border-default)] px-4 text-left text-sm text-[var(--text-primary)] hover:border-[color-mix(in_srgb,var(--artifact-export)_35%,transparent)]"
          >
            Download {item.label}
          </button>
        ))}
        <div className="rounded-xl border border-[var(--border-default)] p-4">
          <p className="text-sm text-[var(--text-primary)]">Notion</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Connection required
          </p>
        </div>
      </div>
      {message && (
        <p
          className="mt-4 text-sm text-[var(--text-secondary)]"
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
