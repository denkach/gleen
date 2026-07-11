# GLE-003 Public Landing Page and Motion System

## Purpose

Implement the approved Gleen landing page as a responsive, accessible production interface through a faithful componentized port of `design/reference-v3/index.html`.

This issue does not authorize redesign. Structure, copy, proportions, spectral treatment, responsive behavior, and motion must remain traceable to the approved reference and screenshots.

## Sources of Truth

1. DEN-13 in Linear.
2. `AGENTS.md`.
3. `docs/design-system.md`.
4. `design/reference-v3/index.html`.
5. `design/screenshots/landing-initial.png`.
6. `design/screenshots/landing-transform.png`.
7. Existing DEN-12 tokens and UI primitives.

Files under `design/reference-v3/` and `design/screenshots/` remain byte-for-byte unchanged.

## Scope

- Fixed public header and responsive navigation.
- Hero copy, BeamInput, and approved SVG prism scene.
- BeamInput demo transformation sequence without backend processing.
- Scroll-driven how-it-works scene.
- Four artifact facet sections.
- Data-driven pricing preview.
- Approved footer.
- Desktop, tablet, and mobile fallbacks.
- Full-motion and reduced-motion modes.
- SEO metadata and accessible semantic structure.

## Explicitly Out of Scope

- Real YouTube validation beyond local URL-shape validation.
- Metadata retrieval, transcript processing, AI generation, jobs, or persistence.
- Authentication and account creation.
- Stripe checkout or billing behavior.
- React Three Fiber or a redesigned 3D prism.
- FAQ and a separate final CTA, because no approved visual reference exists for those sections.
- Product application screens.

The approved hero BeamInput is the primary CTA. The approved pricing-to-footer sequence is the final page composition until additional visuals are approved.

## Implementation Strategy

Use a faithful componentized port rather than a visual reinterpretation. Approved prototype selectors and visual relationships may be renamed into focused component classes, but the rendered hierarchy and geometry must remain equivalent.

The landing page remains mostly server-rendered. Client boundaries are limited to:

- mobile navigation state;
- BeamInput demo state;
- marketing motion orchestration;
- fine-pointer custom cursor.

The page must render complete, readable content before client hydration. JavaScript enhances motion and interaction; it does not reveal otherwise hidden essential content.

## Component Architecture

```text
src/components/marketing/
  site-header.tsx
  mobile-menu.tsx
  beam-input.tsx
  prism-scene.tsx
  hero.tsx
  process-scene.tsx
  artifact-facets.tsx
  pricing-preview.tsx
  site-footer.tsx
  motion-controller.tsx

src/data/
  marketing.ts
  pricing.ts
```

`src/app/page.tsx` composes the page as a Server Component. Marketing copy, navigation, artifacts, workflow steps, plans, and footer links are typed data rather than duplicated inside visual components.

Prices, currencies, plan limits, and feature lists must not be embedded directly in JSX. The initial data module may reproduce approved prototype values for visual parity, but components remain data-driven and the values are explicitly demo configuration rather than billing truth.

## Visual Fidelity

### Page Atmosphere

- Dark-only Prism design language.
- Approximately 90% restrained dark field and 10% spectral accents.
- Thin optical lines, subtle grain, restrained haze and glows, and minimal shadows.
- No large gradient blobs, generic SaaS cards, excessive glassmorphism, or new motifs.

All visual constants must use existing DEN-12 semantic tokens or new named marketing tokens copied directly from the approved reference. No unexplained one-off colors, radii, shadows, spacing, or animation timings are allowed.

### Typography

Use self-hosted package assets for:

- Space Grotesk as the display face matching the approved prototype;
- Inter as body text;
- JetBrains Mono for metadata.

Fonts must be bundled locally and configured through `next/font/local` or package-provided local files. Production rendering must not depend on runtime Google Fonts requests. Fallback stacks remain available.

### Header

- Fixed 78 px desktop header with transparent initial state.
- Dark blurred surface and thin border after scroll.
- Approved centered desktop navigation and right-aligned language/sign-in/start actions.
- Mobile header height and menu button match the reference.
- Header links target existing landing sections.

Sign-in, start, and language actions are honest placeholders in this issue: they navigate only to existing public anchors or expose clearly non-production demo behavior. No dead-looking button may silently pretend an account flow exists.

### Hero

- Approved eyebrow, editorial headline, supporting copy, BeamInput, caption, prism composition, and scroll cue.
- Desktop uses the approved two-column balance.
- Tablet retains hierarchy while simplifying spatial effects.
- Mobile becomes a vertical sequence with stacked BeamInput and lighter prism scene.

### Prism

Use the approved SVG prism and CSS visual layers. Do not add React Three Fiber.

The prism supports:

- restrained breathing haze;
- floating prism motion;
- incoming beam pulse;
- sequential spectral rays;
- staged artifact emission;
- one short flash during BeamInput demo submission;
- fine-pointer parallax only where the reference uses it.

The prism is decorative and hidden from assistive technology. Text outside the SVG communicates the product meaning.

### Workflow and Facets

The process scene reproduces the approved optical track, prism, four stages, and sequential illumination. Four facet sections retain the exact semantic order and colors:

1. Summary — amber.
2. Flashcards — purple.
3. Timestamps — cyan.
4. Export — lime.

Facet demos remain illustrative and non-functional. They must not suggest saved data, real playback, real export, or generated content.

### Pricing and Footer

Pricing cards reproduce the approved structure while consuming typed demo data. The UI must clearly avoid initiating checkout. The footer reproduces approved link groups, languages, copyright treatment, and AI-content caution.

FAQ and a separate final CTA are omitted because they have no approved reference.

## BeamInput Demo Contract

BeamInput performs only a local visual demonstration.

States:

1. `idle` — accepts a URL.
2. `invalid` — displays an accessible validation error.
3. `refracting` — disables repeat submission, changes label to `Refracting…`, and starts the approved prism sequence.
4. `complete` — briefly exposes an accessible completion status before returning to idle.

Accepted input must be an absolute HTTP(S) URL whose hostname is `youtube.com`, a subdomain of `youtube.com`, or `youtu.be`. This is local shape validation only and does not claim the video exists or is supported.

The demo:

- never sends a network request;
- never consumes credits;
- never stores the URL;
- never navigates to a fake result;
- cannot be submitted repeatedly while active;
- remains understandable without animation.

The client state machine emits semantic state/data attributes consumed by the prism scene. Motion callbacks must not be the only mechanism that returns the form to a usable state.

## Motion Architecture

### CSS Motion

CSS handles:

- prism breathing and float;
- incoming beam pulse;
- spectral ray emission;
- artifact float and emission;
- button spectral hover;
- form flash;
- facet demo micro-motion;
- copy feedback and restrained UI transitions.

### GSAP and ScrollTrigger

GSAP is limited to the marketing motion controller and scroll-linked scenes:

- process-track progress;
- process-step sequential illumination;
- active facet selection;
- reveal sequencing where CSS/IntersectionObserver alone cannot match the approved timing.

GSAP and ScrollTrigger are production dependencies justified by deterministic scroll synchronization. They must be dynamically imported inside the client motion controller, registered once, scoped to component refs, and fully reverted during cleanup.

Application UI primitives and non-marketing components must not depend on GSAP.

### Custom Cursor

The approved optical cursor is enabled only when all conditions are true:

- desktop marketing page;
- `(pointer: fine)`;
- no reduced-motion preference;
- JavaScript is active.

The native cursor remains usable. The optical layer is decorative, ignores pointer events, and is removed on cleanup.

### Reduced Motion

When `prefers-reduced-motion: reduce` matches:

- GSAP scroll effects are not initialized;
- reveals and emitted artifacts immediately use their final visible state;
- decorative float, breathing, scan, shimmer, parallax, magnetic, and cursor motion stop;
- BeamInput state and completion feedback remain available without flashes or delayed visual dependency;
- scrolling is not forced smooth;
- no content is hidden.

The prototype-only `?motion=1` override and fixed motion-debug badge are not shipped as public production UI.

## Responsive Contract

### 1440×900

- Approved header geometry and 1440 px content system.
- Two-column hero with editorial headline and prism balance.
- Four-column workflow scene.
- Alternating facet layouts and three-column pricing.

### 1024×768

- Desktop/tablet header transition without clipped actions.
- Hero may stack when required by the approved 980 px breakpoint behavior.
- Workflow uses two-column stages.
- Facets stack copy and demo while retaining hierarchy.
- Effects are simplified where necessary for performance and legibility.

### 390×844

- Mobile header/menu.
- Vertical hero and full-width BeamInput button.
- No custom cursor or parallax.
- Vertical workflow stages.
- Compact, readable facet demos.
- One-column pricing and responsive footer.
- No horizontal page scrolling or hover-only control.

Touch targets are at least 44×44 px on coarse pointers while approved compact fine-pointer geometry may remain smaller.

## Accessibility

- Semantic header, nav, main, sections, headings, form, and footer.
- Skip link targeting main content.
- Visible focus through DEN-12 tokens.
- Mobile menu uses the existing accessible Dialog primitive for focus trap, Escape, and focus return.
- BeamInput has a visible or screen-reader label, associated error, `aria-invalid`, and live status.
- Current/refracting states are communicated with text, not color or motion alone.
- Decorative prism, rays, grain, and cursor are hidden from screen readers.
- No autoplay audio.
- No action relies only on hover.

## SEO and Metadata

The root page defines:

- approved title and product description;
- canonical URL derived from validated application configuration;
- Open Graph and Twitter metadata using approved copy;
- robots indexing enabled;
- semantic section IDs matching navigation anchors.

Structured data is added only when its values are truthful and available. Fake reviews, customers, logos, or claims are prohibited.

## Error and Edge States

- Empty BeamInput produces a required-field message.
- Invalid/non-YouTube URLs produce a precise format message without starting motion.
- Repeated submission during `refracting` is ignored by disabled form controls.
- GSAP import failure leaves the static page fully readable and logs no uncaught error.
- JavaScript-disabled rendering contains all essential marketing copy and navigation anchors.
- Mobile menu close/navigation always restores body scrolling and focus.
- Long translated copy wraps without horizontal overflow.

## Testing

### Unit and Component Tests

- marketing data schemas and ordering;
- BeamInput URL validation and state transitions;
- no network request during demo;
- duplicate submission prevention;
- mobile menu open, keyboard behavior, Escape, and focus return;
- pricing renders from data rather than inline JSX;
- reduced-motion initialization decisions;
- GSAP setup/cleanup boundary through injected or isolated controller helpers.

### Browser Tests

At 1440×900, 1024×768, and 390×844:

- exact section presence and order;
- header scroll state and navigation;
- BeamInput invalid and successful demo flows;
- prism state sequence;
- process illumination during scroll;
- facet activation and artifact colors;
- mobile menu keyboard flow;
- no horizontal overflow;
- no console or page errors;
- no blocked interaction during animation;
- reduced-motion final-state visibility and usability;
- no audio elements or autoplay media.

### Visual Verification

Capture full-page and hero screenshots and compare them directly with:

- `design/screenshots/landing-initial.png`;
- `design/screenshots/landing-transform.png`;
- live `design/reference-v3/index.html` at matching viewports.

Visual review must check geometry, typography, copy, colors, borders, glow restraint, mobile stacking, and motion start/end states. Automated screenshots support review but do not replace human comparison.

## Performance

- Server-render all static content.
- Keep client boundaries narrow.
- Dynamically import GSAP only on the landing page.
- Avoid React state updates on every scroll frame; GSAP or CSS variables own frame updates.
- Use passive pointer/scroll listeners and requestAnimationFrame throttling where custom listeners remain.
- Avoid layout properties in high-frequency animation; prefer transform, opacity, and CSS custom properties.
- Prevent layout shift by reserving prism and demo geometry.

## Dependencies

New production dependencies:

- `gsap` for ScrollTrigger-backed marketing scroll synchronization;
- self-hosted font packages for Space Grotesk, Inter, and JetBrains Mono.

No React Three Fiber or Three.js dependency is added. Every package version is pinned and documented in the implementation plan and README.

## Delivery Risks

- The approved prototype is a monolithic HTML/CSS/JS file; componentization must not alter rendered geometry.
- Self-hosted font metrics can shift line breaks; screenshot comparison is required before approval.
- ScrollTrigger lifecycle must be fully cleaned up across Fast Refresh and navigation.
- Motion complexity can affect low-powered mobile devices; mobile fallbacks and reduced motion are mandatory.
- Pricing data is visual demo configuration, not billing truth.
- The separate FAQ/final CTA scope remains unresolved until approved visuals exist.

## Acceptance Mapping

- Matches references: direct screenshot and live-reference comparison at all three target viewports.
- No reinterpretation: faithful componentized port with traceable approved tokens and structure.
- Responsive: explicit 1440×900, 1024×768, and 390×844 browser tests.
- Smooth/non-blocking animation: transform/opacity animation, no React scroll-frame loop, interaction tests during motion.
- Reduced motion: no GSAP initialization and immediate visible end states.
- No autoplay audio: DOM assertion and source review.
- Production readiness: formatting, lint, typecheck, unit/component tests, Playwright, production build, and clean approved-design diff.
