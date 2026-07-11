import { marketingContent } from '@/data/marketing';

export function ProcessScene() {
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">The prism workflow</span>
            <h2 className="title-lg">
              One link enters.
              <br />
              Knowledge comes out.
            </h2>
          </div>
          <p className="body-lg">
            Gleen follows the signal from source to structure. Each stage stays
            visible, precise, and recoverable—without hiding behind a fake
            progress bar.
          </p>
        </div>
        <div className="process-scene">
          <div className="process-track" />
          <div className="process-prism" />
          <div className="process-steps">
            {marketingContent.workflow.map((step) => (
              <article className="process-step" key={step.number}>
                <span className="num">
                  {step.number} / {step.phase}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
