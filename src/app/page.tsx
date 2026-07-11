import { ReferenceFacets } from '@/components/marketing/reference-facets';
import { ReferenceHeaderBehavior } from '@/components/marketing/reference-header';

const Arrow = () => (
  <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);
const LinkIcon = () => (
  <svg className="icon link-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
    <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
  </svg>
);

export default function HomePage() {
  return (
    <div className="landing-reference">
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#product" aria-label="Gleen home">
            <span className="brand-mark" />
            <span>Gleen</span>
          </a>
          <nav
            className="header-nav desktop-only"
            aria-label="Primary navigation"
          >
            <a href="#product">Product</a>
            <a href="#how">How it works</a>
            <a href="#facets">Examples</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="header-actions">
            <button className="btn btn-ghost btn-sm language-btn" type="button">
              EN{' '}
              <svg
                className="icon icon-sm"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
            <a className="btn btn-ghost btn-sm desktop-only" href="#product">
              <span>Sign in</span>
            </a>
            <a className="btn btn-primary btn-sm" href="#product">
              <span>Start free</span>
              <Arrow />
            </a>
            <button
              className="btn btn-icon btn-ghost mobile-only"
              type="button"
              aria-label="Open menu"
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
              <span className="eyebrow">One video / four useful outputs</span>
              <h1 className="display-xl">
                Watch less.
                <br />
                Understand more.
              </h1>
              <p className="body-lg">
                Turn any YouTube video into a structured summary, smart
                flashcards, precise timestamps, and export-ready knowledge.
              </p>
              <form className="beam-form" aria-label="Analyze a YouTube video">
                <label className="sr-only" htmlFor="youtube-url">
                  YouTube URL
                </label>
                <LinkIcon />
                <input
                  id="youtube-url"
                  type="url"
                  placeholder="Paste a YouTube link"
                  defaultValue="https://youtube.com/watch?v=knowledge"
                />
                <button className="btn btn-primary" type="submit">
                  <span>Transform video</span>
                  <Arrow />
                </button>
              </form>
              <div className="hero-caption">
                <span className="ray" />
                <span>
                  No card required · Try an example · Your first analysis is
                  free
                </span>
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
                    Summary
                  </div>
                  <div className="mini-line" />
                  <div className="mini-line short" />
                </div>
                <div className="artifact-float flash">
                  <div className="label">
                    <span className="dot" />
                    Flashcards
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
                    Export ready
                  </div>
                  <div className="mini-line short" />
                </div>
              </div>
            </div>
          </div>
          <div className="scroll-cue">Move through the spectrum</div>
        </section>
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
                Gleen follows the signal from source to structure. Each stage
                stays visible, precise, and recoverable—without hiding behind a
                fake progress bar.
              </p>
            </div>
            <div className="process-scene">
              <div className="process-track" />
              <div className="process-prism" />
              <div className="process-steps">
                <article className="process-step active">
                  <span className="num">01 / INPUT</span>
                  <h3>Paste a link</h3>
                  <p>
                    Gleen validates the source and checks your saved analyses
                    first.
                  </p>
                </article>
                <article className="process-step active">
                  <span className="num">02 / SIGNAL</span>
                  <h3>Read the video</h3>
                  <p>
                    Transcript, metadata, chapters, and source language are
                    mapped.
                  </p>
                </article>
                <article className="process-step active">
                  <span className="num">03 / REFRACTION</span>
                  <h3>Separate ideas</h3>
                  <p>
                    Key arguments become structured, source-linked knowledge.
                  </p>
                </article>
                <article className="process-step">
                  <span className="num">04 / OUTPUT</span>
                  <h3>Use the result</h3>
                  <p>
                    Study, revisit, export, and continue without paying twice.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </section>
        <ReferenceFacets />
      </main>
    </div>
  );
}
