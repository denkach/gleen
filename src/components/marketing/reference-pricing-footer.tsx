import type { MarketingContent } from '@/data/marketing';
import type { MarketingMessages } from '@/lib/i18n/messages/marketing';

import type { Locale } from '@/lib/i18n/locales';
import { FooterLanguages } from './footer-languages';

import type { AvailableBillingPlan } from '@/lib/billing/domain';
import { formatCurrency } from '@/lib/i18n/format';
import { billingMessages } from '@/lib/i18n/messages/billing';

type ReferencePricingProps = Readonly<{
  plans: readonly AvailableBillingPlan[];
  copy: MarketingMessages['pricing'];
  locale: Locale;
  signedIn: boolean;
  startFree: string;
}>;

export function ReferencePricing({
  plans,
  locale,
  signedIn,
  startFree,
  copy,
}: ReferencePricingProps) {
  const billing = billingMessages[locale].subscription;
  const memberLink = (path: string) =>
    signedIn ? path : `/sign-in?next=${encodeURIComponent(path)}`;
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
        {plans.length === 0 ? (
          <div className="pricing-fallback">
            <p role="status">{billing.error.title}</p>
            <a className="btn btn-ghost" href={memberLink('/app/subscription')}>
              {billing.availablePlans}
            </a>
            {!signedIn && (
              <a className="btn btn-primary" href="/sign-up">
                {startFree}
              </a>
            )}
          </div>
        ) : (
          <div className="pricing-grid">
            {plans.map(({ plan, prices }) => {
              const monthly = prices.find(
                (price) => price.interval === 'month',
              );
              const free = plan.slug === 'free';
              const href = free
                ? signedIn
                  ? '/app'
                  : '/sign-up'
                : monthly && plan.purchasable
                  ? memberLink(
                      `/app/subscription/checkout?plan=${plan.slug}&interval=month`,
                    )
                  : null;
              return (
                <article className="plan-card" key={plan.slug}>
                  <h3>{plan.displayName}</h3>
                  <p className="body-md">{plan.description}</p>
                  <div className="plan-price">
                    <strong>
                      {monthly
                        ? formatCurrency({ ...monthly, locale })
                        : free
                          ? '0'
                          : billing.unavailablePrice}
                    </strong>
                    {(monthly || free) && <span>{billing.perMonth}</span>}
                  </div>
                  <div className="plan-features">
                    {plan.features.map((feature) => (
                      <div className="plan-feature" key={feature}>
                        {feature}
                      </div>
                    ))}
                  </div>
                  {href ? (
                    <a className="btn btn-ghost" href={href}>
                      {free && !signedIn
                        ? startFree
                        : billing.actions.choose(plan.displayName)}
                    </a>
                  ) : (
                    <span className="plan-availability">
                      {billing.actions.unavailable}
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

type ReferenceFooterProps = Readonly<{
  content: MarketingContent;
  copy: MarketingMessages['footer'];
  homeLabel: string;
  locale: Locale;
  localeError: string;
}>;

export function ReferenceFooter({
  content,
  copy,
  homeLabel,
  locale,
  localeError,
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
          <div>
            <div className="footer-title">{copy.product}</div>
            <div className="footer-links">
              {content.footerLinks.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div>
            <div className="footer-title">{copy.language}</div>
            <FooterLanguages
              locale={locale}
              label={copy.language}
              error={localeError}
            />
          </div>
        </div>
        <div className="footer-bottom">
          <span>{copy.rightsReserved}</span>
          <span>{copy.legalWarning}</span>
        </div>
      </div>
    </footer>
  );
}
