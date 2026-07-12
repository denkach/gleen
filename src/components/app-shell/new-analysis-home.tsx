import Link from 'next/link';

import { AppIcon } from './app-icon';

export function NewAnalysisHome() {
  return (
    <>
      <section className="analysis-hero" aria-labelledby="new-analysis-title">
        <span className="eyebrow">New analysis</span>
        <h1 id="new-analysis-title">Turn a video into something useful.</h1>
        <form
          className="beam-form app-beam-form"
          aria-describedby="intake-status"
        >
          <AppIcon name="link" className="link-icon" />
          <input
            aria-label="YouTube URL"
            type="url"
            placeholder="Paste a YouTube link"
            disabled
          />
          <button className="btn btn-primary" type="button" disabled>
            <span>Analyze video</span>
            <AppIcon name="arrow" />
          </button>
        </form>
        <p className="advanced-link" id="intake-status">
          <AppIcon name="settings" /> Video intake arrives in the next step.
        </p>
      </section>

      <div className="dashboard-grid">
        <section className="panel" aria-labelledby="recent-analyses-title">
          <header className="panel-head">
            <h2 id="recent-analyses-title">Recent analyses</h2>
            <Link href="/app/history">View history →</Link>
          </header>
          <div className="panel-empty-state">
            <strong>No analyses yet</strong>
            <p>Your completed analyses will appear here.</p>
          </div>
        </section>

        <aside className="panel" aria-labelledby="monthly-metrics-title">
          <header className="panel-head">
            <h2 id="monthly-metrics-title">This month</h2>
            <Link href="/app/subscription">Manage plan</Link>
          </header>
          <div className="metric-stack">
            <p>
              Usage and study metrics become available after your first
              analysis.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
