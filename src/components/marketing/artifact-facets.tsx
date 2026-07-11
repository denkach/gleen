import type { ArtifactId } from '@/data/marketing';
import { marketingContent } from '@/data/marketing';

function Window({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="demo-window">
      <div className="demo-topbar">
        <div className="window-dots">
          <i />
          <i />
          <i />
        </div>
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

function FacetDemo({ id }: Readonly<{ id: ArtifactId }>) {
  if (id === 'summary')
    return (
      <Window label="SUMMARY / AUTO-SAVED">
        <div className="summary-demo">
          <div className="demo-heading">
            <h4>The central idea</h4>
            <span className="timestamp-link">00:03:18</span>
          </div>
          <p className="body-md">
            The speaker argues that durable learning depends on active retrieval
            rather than passive exposure.
          </p>
          <div className="summary-line" />
          <div className="summary-line" />
          <div className="summary-line summary-line--78" />
          <div className="summary-section-card">
            <div className="section-row">
              <strong>Why retrieval works</strong>
              <span>−</span>
            </div>
            <p className="body-md">
              A <span className="highlight-text">desirable difficulty</span>{' '}
              strengthens access pathways and makes future recall more reliable.
            </p>
          </div>
        </div>
      </Window>
    );
  if (id === 'flashcards')
    return (
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
    );
  if (id === 'timestamps')
    return (
      <Window label="TIMELINE / 12 CHAPTERS">
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
      </Window>
    );
  return (
    <Window label="EXPORT / READY">
      <div className="export-demo">
        <div className="export-doc">
          <h4>Learning through retrieval</h4>
          <div className="mini-line" />
          <div className="mini-line export-line--84" />
          <div className="mini-line export-line--94" />
          <div className="mini-line export-line--66" />
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
    </Window>
  );
}

const colorClass: Record<ArtifactId, string> = {
  summary: 'amber',
  flashcards: 'purple',
  timestamps: 'cyan',
  export: 'lime',
};

export function ArtifactFacets() {
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
          {marketingContent.facets.map((facet) => (
            <article
              className={`facet-panel ${colorClass[facet.id]}`}
              data-facet={facet.id}
              key={facet.id}
            >
              <div className="facet-copy">
                <div className="facet-kicker">{facet.kicker}</div>
                <h3 className="title-lg">{facet.title}</h3>
                <p>{facet.body}</p>
                <a className="btn btn-ghost" href="#product">
                  <span>{facet.cta}</span>
                </a>
              </div>
              <div className="facet-demo">
                <FacetDemo id={facet.id} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
