const plans = [
  {
    label: 'Free',
    name: 'Explore',
    description: 'For trying Gleen on a few important videos.',
    price: '€0',
    features: [
      '3 video analyses',
      'All four artifact types',
      'Markdown export',
      'Saved history',
    ],
    cta: 'Start free',
    recommended: false,
  },
  {
    label: 'Prism · Best fit',
    name: 'Build a habit',
    description: 'For students, researchers, and continuous learners.',
    price: '€12',
    features: [
      '25 video analyses',
      'Longer videos',
      'Notion and Obsidian export',
      'Priority processing',
    ],
    cta: 'Choose Prism',
    recommended: true,
  },
  {
    label: 'Spectrum',
    name: 'Go deeper',
    description: 'For intensive knowledge work and larger libraries.',
    price: '€29',
    features: [
      '100 video analyses',
      'Advanced exports',
      'Highest processing priority',
      'Extended history controls',
    ],
    cta: 'Choose Spectrum',
    recommended: false,
  },
] as const;

export function ReferencePricing() {
  return (
    <section className="section" id="pricing">
      <div className="container narrow">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Simple plans</span>
            <h2 className="title-lg">Choose how much light you need.</h2>
          </div>
          <p className="body-lg">
            Start free, keep every result in history, and upgrade only when your
            workflow demands more capacity.
          </p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan) => (
            <article
              className={`plan-card${plan.recommended ? ' recommended' : ''}`}
              key={plan.name}
            >
              <span className="plan-label">{plan.label}</span>
              <h3>{plan.name}</h3>
              <p className="body-md">{plan.description}</p>
              <div className="plan-price">
                <strong>{plan.price}</strong>
                <span>/ month</span>
              </div>
              <div className="plan-features">
                {plan.features.map((feature) => (
                  <div className="plan-feature" key={feature}>
                    {feature}
                  </div>
                ))}
              </div>
              <a
                className={`btn ${plan.recommended ? 'btn-primary' : 'btn-ghost'}`}
                href="#product"
              >
                <span>{plan.cta}</span>
                {plan.recommended && (
                  <svg
                    className="icon icon-sm"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                )}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ReferenceFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <a className="brand" href="#product" aria-label="Gleen home">
              <span className="brand-mark" />
              <span>Gleen</span>
            </a>
            <p className="body-md footer-copy">
              One video enters. A spectrum of usable knowledge comes out.
            </p>
          </div>
          <div>
            <div className="footer-title">Product</div>
            <div className="footer-links">
              <a href="#facets">Artifacts</a>
              <a href="#how">How it works</a>
              <a href="#pricing">Pricing</a>
              <a href="#product">Open app</a>
            </div>
          </div>
          <div>
            <div className="footer-title">Company</div>
            <div className="footer-links">
              <a href="#product">Privacy</a>
              <a href="#product">Terms</a>
              <a href="#product">Cookies</a>
              <a href="#product">Contact</a>
            </div>
          </div>
          <div>
            <div className="footer-title">Language</div>
            <div className="footer-links">
              <a href="#product">English</a>
              <a href="#product">Українська</a>
              <a href="#product">Русский</a>
              <a href="#product">Español</a>
              <a href="#product">Deutsch</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Gleen. All rights reserved.</span>
          <span>
            AI-generated content should be checked against the original source.
          </span>
        </div>
      </div>
    </footer>
  );
}
