import type { MarketingContent } from '@/data/marketing';
import type { MarketingMessages } from '@/lib/i18n/messages/marketing';

type ReferencePricingProps = Readonly<{
  content: MarketingContent;
  copy: MarketingMessages['pricing'];
}>;

export function ReferencePricing({ content, copy }: ReferencePricingProps) {
  return (
    <section className="section" id="pricing">
      <div className="container narrow">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h2 className="title-lg">{copy.title}</h2>
          </div>
          <p className="body-lg">{copy.description}</p>
        </div>
        <div className="pricing-grid">
          {content.pricing.map((plan) => (
            <article
              className={`plan-card${plan.recommended ? ' recommended' : ''}`}
              key={plan.name}
            >
              <span className="plan-label">{plan.label}</span>
              <h3>{plan.name}</h3>
              <p className="body-md">{plan.description}</p>
              <div className="plan-price">
                <strong>{plan.price}</strong>
                <span>{plan.period}</span>
              </div>
              <div className="plan-features">
                {Object.values(plan.features).map((feature) => (
                  <div className="plan-feature" key={feature}>
                    {feature}
                  </div>
                ))}
              </div>
              <a
                className={`btn ${plan.recommended ? 'btn-primary' : 'btn-ghost'}`}
                href={plan.ctaHref}
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

type ReferenceFooterProps = Readonly<{
  content: MarketingContent;
  copy: MarketingMessages['footer'];
  homeLabel: string;
}>;

export function ReferenceFooter({
  content,
  copy,
  homeLabel,
}: ReferenceFooterProps) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <a className="brand" href="#product" aria-label={homeLabel}>
              <span className="brand-mark" />
              <span>Gleen</span>
            </a>
            <p className="body-md footer-copy">{copy.intro}</p>
          </div>
          {content.footerGroups.map((group) => (
            <div key={group.title}>
              <div className="footer-title">{group.title}</div>
              <div className="footer-links">
                {group.links.map((link) => (
                  <a href={link.href} key={link.label}>
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>{copy.rightsReserved}</span>
          <span>{copy.legalWarning}</span>
        </div>
      </div>
    </footer>
  );
}
