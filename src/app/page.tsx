import type { Metadata } from 'next';

import { ReferenceFacets } from '@/components/marketing/reference-facets';
import { ReferenceHeaderBehavior } from '@/components/marketing/reference-header';
import { LandingAnalysisForm } from '@/components/marketing/landing-analysis-form';
import { ReferenceMotion } from '@/components/marketing/reference-motion';
import {
  ReferenceFooter,
  ReferencePricing,
} from '@/components/marketing/reference-pricing-footer';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { getMarketingContent } from '@/data/marketing';
import {
  selectMessages,
  type MissingTranslationEvent,
} from '@/lib/i18n/catalog';
import { marketingMessages } from '@/lib/i18n/messages/marketing';
import { sharedMessages } from '@/lib/i18n/messages/shared';
import { getRequestLocale } from '@/lib/i18n/request-locale';

const Arrow = () => (
  <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);
function reportMissingMarketingTranslation(event: MissingTranslationEvent) {
  console.error(event);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = selectMessages(
    marketingMessages,
    locale,
    'marketing',
    reportMissingMarketingTranslation,
  );

  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
  };
}

export default async function HomePage() {
  const locale = await getRequestLocale();
  const copy = selectMessages(
    marketingMessages,
    locale,
    'marketing',
    reportMissingMarketingTranslation,
  );
  const sharedCopy = selectMessages(
    sharedMessages,
    locale,
    'shared',
    reportMissingMarketingTranslation,
  );
  const content = getMarketingContent(copy, locale);

  return (
    <div className="landing-reference">
      <header className="site-header">
        <div className="container header-inner">
          <a
            className="brand"
            href="#product"
            aria-label={copy.header.homeLabel}
          >
            <span className="brand-mark" />
            <span>Gleen</span>
          </a>
          <nav
            className="header-nav desktop-only"
            aria-label={copy.header.navigationLabel}
          >
            {content.navigation.map((link) => (
              <a href={link.href} key={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <LocaleSwitcher
              locale={locale}
              copy={sharedCopy}
              variant="landing"
            />
            <a className="btn btn-ghost btn-sm desktop-only" href="/sign-in">
              <span>{copy.header.signIn}</span>
            </a>
            <a className="btn btn-primary btn-sm" href="#product">
              <span>{copy.header.startFree}</span>
              <Arrow />
            </a>
            <button
              className="btn btn-icon btn-ghost mobile-only"
              type="button"
              aria-label={copy.header.openMenu}
            >
              <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <ReferenceHeaderBehavior />
      <main>
        <section className="hero" id="product">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">{copy.hero.eyebrow}</span>
              <h1 className="display-xl">
                {copy.hero.titleStart}
                <br />
                {copy.hero.titleEnd}
              </h1>
              <p className="body-lg">{copy.hero.description}</p>
              <LandingAnalysisForm copy={copy.hero} />
              <div className="hero-caption">
                <span className="ray" />
                <span>{copy.hero.caption}</span>
              </div>
            </div>
            <div className="prism-stage" aria-hidden="true">
              <div className="prism-haze" />
              <div className="prism-wrap">
                <span className="beam-in" />
                <svg className="prism-svg" viewBox="0 0 320 300">
                  <defs>
                    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#ffffff" stopOpacity=".55" />
                      <stop
                        offset=".34"
                        stopColor="#cfc8ff"
                        stopOpacity=".10"
                      />
                      <stop offset=".7" stopColor="#5be9e9" stopOpacity=".12" />
                      <stop offset="1" stopColor="#ffffff" stopOpacity=".03" />
                    </linearGradient>
                    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#fff" stopOpacity=".8" />
                      <stop offset=".5" stopColor="#c77dff" stopOpacity=".26" />
                      <stop offset="1" stopColor="#5be9e9" stopOpacity=".5" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="6" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path
                    d="M160 20 294 266 27 266Z"
                    fill="url(#glass)"
                    stroke="url(#edge)"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M160 20 160 266M27 266 222 142 294 266M160 20 222 142"
                    fill="none"
                    stroke="#fff"
                    strokeOpacity=".18"
                  />
                  <path
                    d="M58 210 222 142"
                    fill="none"
                    stroke="#fff"
                    strokeOpacity=".6"
                    filter="url(#glow)"
                  />
                  <circle
                    cx="222"
                    cy="142"
                    r="4"
                    fill="#fff"
                    filter="url(#glow)"
                  />
                </svg>
                <div className="spectrum">
                  <span className="ray" />
                  <span className="ray" />
                  <span className="ray" />
                  <span className="ray" />
                </div>
                <div className="artifact-float summary">
                  <div className="label">
                    <span className="dot" />
                    {copy.hero.summaryFloat}
                  </div>
                  <div className="mini-line" />
                  <div className="mini-line short" />
                </div>
                <div className="artifact-float flash">
                  <div className="label">
                    <span className="dot" />
                    {copy.hero.flashcardsFloat}
                  </div>
                  <div className="mini-line short" />
                  <div className="mini-line" />
                </div>
                <div className="artifact-float time">
                  <div className="label">
                    <span className="dot" />
                    00:14:32
                  </div>
                  <div className="mini-line" />
                  <div className="mini-line short" />
                </div>
                <div className="artifact-float export">
                  <div className="label">
                    <span className="dot" />
                    {copy.hero.exportFloat}
                  </div>
                  <div className="mini-line short" />
                </div>
              </div>
            </div>
          </div>
          <div className="scroll-cue">{copy.hero.scrollCue}</div>
        </section>
        <section className="section" id="how">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{copy.workflow.eyebrow}</span>
                <h2 className="title-lg">
                  {copy.workflow.titleStart}
                  <br />
                  {copy.workflow.titleEnd}
                </h2>
              </div>
              <p className="body-lg">{copy.workflow.description}</p>
            </div>
            <div className="process-scene">
              <div className="process-track" />
              <div className="process-prism" />
              <div className="process-steps">
                {content.workflow.map((step, index) => (
                  <article
                    className={`process-step${index < 3 ? ' active' : ''}`}
                    key={step.number}
                  >
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
        <ReferenceFacets copy={copy.facets} />
        <ReferencePricing content={content} copy={copy.pricing} />
      </main>
      <ReferenceFooter
        content={content}
        copy={copy.footer}
        homeLabel={copy.header.homeLabel}
      />
      <ReferenceMotion />
    </div>
  );
}
