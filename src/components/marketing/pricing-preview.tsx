import { pricingPlans } from '@/data/pricing';

export function PricingPreview() {
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
          {pricingPlans.map((plan) => (
            <article
              aria-label={`${plan.name} plan`}
              className={`plan-card${plan.recommended ? ' recommended' : ''}`}
              key={plan.name}
            >
              <span className="plan-label">{plan.label}</span>
              <h3>{plan.name}</h3>
              <p>{plan.description}</p>
              <div className="plan-price">
                <strong>{plan.price}</strong>
                <span>{plan.period}</span>
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
                href={plan.ctaHref}
              >
                {plan.cta}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
