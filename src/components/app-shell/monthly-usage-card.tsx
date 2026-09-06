import type { CSSProperties } from 'react';
import Link from 'next/link';

import type { AppMessages } from '@/lib/i18n/messages/app';
import type { MonthlyUsageState } from '@/lib/billing/monthly-usage';

export function MonthlyUsageCard({
  state,
  copy,
}: Readonly<{
  state: MonthlyUsageState;
  copy: AppMessages['newAnalysis']['monthly'];
}>) {
  if (state.kind === 'unavailable') {
    return (
      <aside
        className="panel new-analysis-panel monthly-usage-card"
        aria-labelledby="monthly-metrics-title"
      >
        <header className="new-analysis-panel__head monthly-usage-card__empty-head">
          <h2 id="monthly-metrics-title">{copy.title}</h2>
          <Link href="/app/subscription">{copy.managePlan}</Link>
        </header>
        <div className="metric-stack">
          <p>{copy.empty}</p>
        </div>
      </aside>
    );
  }

  const peak = Math.max(1, ...state.points.map((point) => point.count));

  return (
    <aside
      className="panel new-analysis-panel monthly-usage-card"
      aria-labelledby="monthly-metrics-title"
    >
      <h2 className="app-visually-hidden" id="monthly-metrics-title">
        {copy.title}
      </h2>
      <div className="monthly-usage-card__top">
        <div>
          <div className="monthly-usage-card__count">
            {state.used} <span>/ {state.limit}</span>
          </div>
          <div className="monthly-usage-card__label">{copy.used}</div>
        </div>
        <Link className="monthly-usage-card__manage" href="/app/subscription">
          {copy.managePlan}
        </Link>
      </div>
      <div className="monthly-usage-chart" aria-label={copy.chartLabel}>
        {state.points.map((point, index) => (
          <button
            aria-label={`${point.dateLabel}: ${point.countLabel}`}
            className="monthly-usage-chart__bar"
            data-accent={index >= state.points.length - 3 ? 'cyan' : 'purple'}
            data-empty={point.count === 0 ? 'true' : undefined}
            key={point.key}
            style={
              {
                '--monthly-usage-height': `${(point.count / peak) * 100}%`,
                '--monthly-usage-delay': `${index * 0.03}s`,
              } as CSSProperties
            }
            type="button"
          >
            <span className="monthly-usage-chart__tooltip" role="tooltip">
              <small>{point.dateLabel}</small>
              <strong>{point.countLabel}</strong>
            </span>
          </button>
        ))}
      </div>
      <div className="monthly-usage-chart__weeks" aria-hidden="true">
        <span>W1</span>
        <span>W2</span>
        <span>W3</span>
        <span>W4</span>
      </div>
      {state.trend ? (
        <div
          className="monthly-usage-card__trend"
          data-direction={state.trend.direction}
        >
          <strong>
            {state.trend.direction === 'up'
              ? '↗'
              : state.trend.direction === 'down'
                ? '↘'
                : '→'}{' '}
            {state.trend.value}
          </strong>
          <span>{state.trend.label}</span>
        </div>
      ) : (
        <div className="monthly-usage-card__trend" data-direction="flat">
          <strong>→</strong>
          <span>{copy.noComparison}</span>
        </div>
      )}
      <Link className="monthly-usage-card__upgrade" href="/app/subscription">
        <span>{state.canUpgrade ? copy.upgradePlan : copy.managePlan}</span>
        <span aria-hidden="true">→</span>
      </Link>
      <p className="monthly-usage-card__note">
        {state.canUpgrade ? copy.upgradeNote : copy.manageNote}
      </p>
    </aside>
  );
}
