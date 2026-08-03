import type { MarketingMessages } from '@/lib/i18n/messages/marketing';

const WindowDots = () => (
  <div className="window-dots">
    <i />
    <i />
    <i />
  </div>
);
const FacetArrow = () => (
  <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

type ReferenceFacetsProps = Readonly<{
  copy: MarketingMessages['facets'];
}>;

export function ReferenceFacets({ copy }: ReferenceFacetsProps) {
  return (
    <section className="section" id="facets">
      <div className="container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h2 className="title-lg">
              {copy.titleStart}
              <br />
              {copy.titleEnd}
            </h2>
          </div>
          <p className="body-lg">{copy.description}</p>
        </div>
        <div className="facets">
          <article className="facet-panel amber">
            <div className="facet-copy">
              <div className="facet-kicker">{copy.summary.kicker}</div>
              <h3 className="title-lg">{copy.summary.title}</h3>
              <p>{copy.summary.body}</p>
              <a className="btn btn-ghost" href="#product">
                <span>{copy.summary.cta}</span>
                <FacetArrow />
              </a>
            </div>
            <div className="facet-demo">
              <div className="demo-window">
                <div className="demo-topbar">
                  <WindowDots />
                  <span>{copy.summary.demoTopbar}</span>
                </div>
                <div className="summary-demo">
                  <div className="demo-heading">
                    <h4>{copy.summary.demoTitle}</h4>
                    <span className="timestamp-link">00:03:18</span>
                  </div>
                  <p className="body-md">{copy.summary.demoBody}</p>
                  <div className="summary-line" />
                  <div className="summary-line" />
                  <div className="summary-line line-78" />
                  <div className="summary-section-card">
                    <div className="section-row">
                      <strong>{copy.summary.demoSectionTitle}</strong>
                      <span>−</span>
                    </div>
                    <p className="body-md">
                      {copy.summary.demoBefore}{' '}
                      <span className="highlight-text">
                        {copy.summary.demoHighlight}
                      </span>{' '}
                      {copy.summary.demoAfter}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>
          <article className="facet-panel purple">
            <div className="facet-copy">
              <div className="facet-kicker">{copy.flashcards.kicker}</div>
              <h3 className="title-lg">{copy.flashcards.title}</h3>
              <p>{copy.flashcards.body}</p>
              <a className="btn btn-ghost" href="#product">
                <span>{copy.flashcards.cta}</span>
                <FacetArrow />
              </a>
            </div>
            <div className="facet-demo">
              <div className="flashcard-stack">
                <article className="flashcard">
                  <span className="card-meta">{copy.flashcards.demoMeta}</span>
                  <div className="question">{copy.flashcards.demoQuestion}</div>
                  <div className="card-footer">
                    <span>{copy.flashcards.demoReveal}</span>
                    <span>{copy.flashcards.demoSource}</span>
                  </div>
                </article>
                <article className="flashcard" />
                <article className="flashcard" />
              </div>
            </div>
          </article>
          <article className="facet-panel cyan">
            <div className="facet-copy">
              <div className="facet-kicker">{copy.timestamps.kicker}</div>
              <h3 className="title-lg">{copy.timestamps.title}</h3>
              <p>{copy.timestamps.body}</p>
              <a className="btn btn-ghost" href="#product">
                <span>{copy.timestamps.cta}</span>
                <FacetArrow />
              </a>
            </div>
            <div className="facet-demo">
              <div className="demo-window">
                <div className="demo-topbar">
                  <WindowDots />
                  <span>{copy.timestamps.demoTopbar}</span>
                </div>
                <div className="timeline-demo">
                  <div className="timeline-item">
                    <span className="time">00:02:10</span>
                    <span className="timeline-axis" />
                    <div>
                      <strong>{copy.timestamps.firstTitle}</strong>
                      <p>{copy.timestamps.firstBody}</p>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <span className="time">00:14:32</span>
                    <span className="timeline-axis" />
                    <div>
                      <strong>{copy.timestamps.secondTitle}</strong>
                      <p>{copy.timestamps.secondBody}</p>
                      <div className="timeline-preview" />
                    </div>
                  </div>
                  <div className="timeline-item">
                    <span className="time">00:28:06</span>
                    <span className="timeline-axis" />
                    <div>
                      <strong>{copy.timestamps.thirdTitle}</strong>
                      <p>{copy.timestamps.thirdBody}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
          <article className="facet-panel lime">
            <div className="facet-copy">
              <div className="facet-kicker">{copy.export.kicker}</div>
              <h3 className="title-lg">{copy.export.title}</h3>
              <p>{copy.export.body}</p>
              <a className="btn btn-ghost" href="#product">
                <span>{copy.export.cta}</span>
                <FacetArrow />
              </a>
            </div>
            <div className="facet-demo">
              <div className="demo-window">
                <div className="demo-topbar">
                  <WindowDots />
                  <span>{copy.export.demoTopbar}</span>
                </div>
                <div className="export-demo">
                  <div className="export-doc">
                    <h4>{copy.export.demoTitle}</h4>
                    <div className="mini-line" />
                    <div className="mini-line line-84" />
                    <div className="mini-line line-94" />
                    <div className="mini-line line-66" />
                  </div>
                  <div className="export-targets">
                    <div className="export-target">
                      <span className="export-logo">N</span>
                      <span>Notion</span>
                    </div>
                    <div className="export-target">
                      <span className="export-logo">O</span>
                      <span>Obsidian</span>
                    </div>
                    <div className="export-target">
                      <span className="export-logo">LM</span>
                      <span>NotebookLM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
