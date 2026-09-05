import Image from 'next/image';
import Link from 'next/link';

import type { AppMessages } from '@/lib/i18n/messages/app';
import type { HistoryItem } from '@/lib/history/repository';

export type RecentAnalysesState =
  | Readonly<{ kind: 'ready'; items: readonly HistoryItem[] }>
  | Readonly<{ kind: 'unavailable' }>;

type RecentCopy = AppMessages['newAnalysis']['recent'];

export function RecentAnalyses({
  state,
  copy,
}: Readonly<{ state: RecentAnalysesState; copy: RecentCopy }>) {
  if (state.kind === 'unavailable') {
    return (
      <div className="panel-empty-state recent-analyses-state" role="status">
        <strong>{copy.unavailableTitle}</strong>
        <p>{copy.unavailableDescription}</p>
      </div>
    );
  }
  if (state.items.length === 0) {
    return (
      <div className="panel-empty-state recent-analyses-state">
        <strong>{copy.emptyTitle}</strong>
        <p>{copy.emptyDescription}</p>
      </div>
    );
  }
  return (
    <div className="recent-analysis-list">
      {state.items.map((item) => (
        <article
          className="recent-analysis-row"
          data-status={item.status.key}
          key={item.id}
        >
          <div
            className="recent-analysis-row__thumbnail"
            aria-label={
              item.thumbnailUrl ? undefined : copy.thumbnailUnavailable
            }
          >
            {item.thumbnailUrl ? (
              <Image alt="" fill sizes="112px" src={item.thumbnailUrl} />
            ) : (
              <span aria-hidden="true">◇</span>
            )}
          </div>
          <div className="recent-analysis-row__body">
            <Link href={item.href}>{item.title}</Link>
            <p>
              {[item.channel, item.analyzedAtLabel].filter(Boolean).join(' · ')}
            </p>
            <div className="recent-analysis-row__meta">
              {item.summaryPresetLabel ? (
                <span>{item.summaryPresetLabel}</span>
              ) : null}
              <span data-status={item.status.key}>{item.status.label}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
