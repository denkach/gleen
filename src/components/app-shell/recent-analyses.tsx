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
  artifacts,
}: Readonly<{
  state: RecentAnalysesState;
  copy: RecentCopy;
  artifacts: AppMessages['newAnalysis']['artifacts'];
}>) {
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
        <Link
          className="recent-analysis-row"
          data-status={item.status.key}
          href={item.href}
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
            {item.durationLabel ? (
              <span className="recent-analysis-row__duration">
                {item.durationLabel}
              </span>
            ) : null}
          </div>
          <div className="recent-analysis-row__body">
            <strong>{item.title}</strong>
            <p>
              {[item.channel, item.analyzedAtLabel].filter(Boolean).join(' · ')}
            </p>
            <div className="recent-analysis-row__meta">
              {item.summaryPresetLabel ? (
                <span>
                  <i aria-hidden="true" />
                  {item.summaryPresetLabel}
                </span>
              ) : null}
              {item.selectedArtifacts.map((artifact) => (
                <span key={artifact}>
                  <i aria-hidden="true" />
                  {artifacts[artifact]}
                </span>
              ))}
            </div>
          </div>
          <span
            className="recent-analysis-row__status"
            data-status={item.status.key}
          >
            {item.status.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
