const WindowDots = () => (
  <div className="window-dots">
    <i />
    <i />
    <i />
  </div>
);

export function ReferenceFacets() {
  return (
    <section className="section" id="facets">
      <div className="container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Four facets</span>
            <h2 className="title-lg">
              Not a transcript dump.
              <br />A usable workspace.
            </h2>
          </div>
          <p className="body-lg">
            Every artifact has its own interaction model and spectral identity,
            while the whole experience remains restrained and consistent.
          </p>
        </div>
        <div className="facets">
          <article className="facet-panel amber">
            <div className="facet-copy">
              <div className="facet-kicker">Structured summary</div>
              <h3 className="title-lg">See the shape of the argument.</h3>
              <p>
                Expandable chapters, highlighted key ideas, actionable
                conclusions, and direct links back to the exact moment in the
                video.
              </p>
              <a className="btn btn-ghost" href="#product">
                <span>Explore the summary</span>
              </a>
            </div>
            <div className="facet-demo">
              <div className="demo-window">
                <div className="demo-topbar">
                  <WindowDots />
                  <span>SUMMARY / AUTO-SAVED</span>
                </div>
                <div className="summary-demo">
                  <div className="demo-heading">
                    <h4>The central idea</h4>
                    <span className="timestamp-link">00:03:18</span>
                  </div>
                  <p className="body-md">
                    The speaker argues that durable learning depends on active
                    retrieval rather than passive exposure.
                  </p>
                  <div className="summary-line" />
                  <div className="summary-line" />
                  <div className="summary-line line-78" />
                  <div className="summary-section-card">
                    <div className="section-row">
                      <strong>Why retrieval works</strong>
                      <span>−</span>
                    </div>
                    <p className="body-md">
                      A{' '}
                      <span className="highlight-text">
                        desirable difficulty
                      </span>{' '}
                      strengthens access pathways and makes future recall more
                      reliable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>
          <article className="facet-panel purple">
            <div className="facet-copy">
              <div className="facet-kicker">Interactive flashcards</div>
              <h3 className="title-lg">Turn insight into memory.</h3>
              <p>
                Study the video’s most important concepts in a focused deck.
                Flip, rate, edit, and jump directly to the source.
              </p>
              <a className="btn btn-ghost" href="#product">
                <span>Open study mode</span>
              </a>
            </div>
            <div className="facet-demo">
              <div className="flashcard-stack">
                <article className="flashcard">
                  <span className="card-meta">Card 04 / 18</span>
                  <div className="question">
                    What makes retrieval practice more effective than rereading?
                  </div>
                  <div className="card-footer">
                    <span>Tap to reveal</span>
                    <span>Source 00:14:32</span>
                  </div>
                </article>
                <article className="flashcard" />
                <article className="flashcard" />
              </div>
            </div>
          </article>
          <article className="facet-panel cyan">
            <div className="facet-copy">
              <div className="facet-kicker">Clickable timestamps</div>
              <h3 className="title-lg">Move through meaning, not minutes.</h3>
              <p>
                A source-linked timeline lets you revisit the right passage
                instantly instead of scrubbing through the entire video.
              </p>
              <a className="btn btn-ghost" href="#product">
                <span>See the timeline</span>
              </a>
            </div>
            <div className="facet-demo">
              <div className="demo-window">
                <div className="demo-topbar">
                  <WindowDots />
                  <span>TIMELINE / 12 CHAPTERS</span>
                </div>
                <div className="timeline-demo">
                  <div className="timeline-item">
                    <span className="time">00:02:10</span>
                    <span className="timeline-axis" />
                    <div>
                      <strong>Passive exposure</strong>
                      <p>Why familiarity can be mistaken for understanding.</p>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <span className="time">00:14:32</span>
                    <span className="timeline-axis" />
                    <div>
                      <strong>Desirable difficulty</strong>
                      <p>How effort changes the strength of memory.</p>
                      <div className="timeline-preview" />
                    </div>
                  </div>
                  <div className="timeline-item">
                    <span className="time">00:28:06</span>
                    <span className="timeline-axis" />
                    <div>
                      <strong>A practical routine</strong>
                      <p>A three-step learning loop for everyday use.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
          <article className="facet-panel lime">
            <div className="facet-copy">
              <div className="facet-kicker">Export-ready knowledge</div>
              <h3 className="title-lg">
                Let the result flow into your system.
              </h3>
              <p>
                Choose the destination and keep the structure. Export
                transparently to Notion, Obsidian, NotebookLM, or clean
                Markdown.
              </p>
              <a className="btn btn-ghost" href="#product">
                <span>Preview exports</span>
              </a>
            </div>
            <div className="facet-demo">
              <div className="demo-window">
                <div className="demo-topbar">
                  <WindowDots />
                  <span>EXPORT / READY</span>
                </div>
                <div className="export-demo">
                  <div className="export-doc">
                    <h4>Learning through retrieval</h4>
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
