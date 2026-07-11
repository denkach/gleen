import type { ArtifactId } from '@/data/marketing';
import { marketingContent } from '@/data/marketing';

const previewCopy: Record<ArtifactId, readonly string[]> = {
  summary: ['The central idea', 'Why retrieval works', '00:03:18'],
  flashcards: [
    'Card 04 / 18',
    'What makes retrieval practice more effective than rereading?',
    'Source 00:14:32',
  ],
  timestamps: [
    '00:02:10 Passive exposure',
    '00:14:32 Desirable difficulty',
    '00:28:06 A practical routine',
  ],
  export: ['Learning through retrieval', 'Notion', 'Obsidian', 'NotebookLM'],
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
              className={`facet-panel ${facet.id}`}
              data-facet={facet.id}
              key={facet.id}
            >
              <div className="facet-copy">
                <div className="facet-kicker">{facet.kicker}</div>
                <h3 className="title-lg">{facet.title}</h3>
                <p>{facet.body}</p>
                <a className="btn btn-ghost" href="#product">
                  {facet.cta}
                </a>
              </div>
              <div className="facet-demo" aria-hidden="true">
                <div className="demo-window">
                  <div className="demo-topbar">
                    <span>{facet.id.toUpperCase()} / DEMO</span>
                  </div>
                  <div className="demo-content">
                    {previewCopy[facet.id].map((line) => (
                      <div className="demo-line" key={line}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
