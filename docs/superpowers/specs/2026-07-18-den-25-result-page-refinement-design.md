# DEN-25 Result Page Refinement Design

**Issue:** DEN-25 — GLE-015 — Refine result Overview and mobile video navigation

**Status:** Approved in conversation on 2026-07-18

**Branch:** `den-25-result-page`

## Sources of truth

Implementation must reconcile these sources in this order:

1. this approved DEN-25 design specification;
2. the current Linear issue DEN-25 and the explicitly approved scope additions recorded below;
3. `design/prototypes/analyze-page/gleen-new-issue.html` as the pixel-level visual and interaction reference;
4. `design/prototypes/analyze-page/2026-07-18-gleen-result-page.md`;
5. `docs/product.md`, `docs/design-system.md`, `docs/architecture.md`, and `docs/roadmap.md`;
6. existing production behavior and tests from DEN-17 and DEN-18.

The standalone HTML is not production architecture. Its layout, hierarchy, styling, responsive composition, and interaction character are authoritative, but its hard-coded content and simulated JavaScript are not.

## Decision

Evolve the existing React `ResultWorkspace` in place. Preserve its routes, repository boundaries, normalization, autosave, partial-result behavior, artifact editing, exports, and YouTube integration. Decompose the page into focused components and extend the data contracts needed for the approved features.

Do not rebuild the page as a monolithic conversion of the standalone HTML and do not introduce a parallel V2 result route.

## Visual fidelity contract

The production page must copy the approved prototype one-to-one. This is not a redesign.

The implementation must preserve the prototype's:

- desktop geometry, column proportions, spacing, radii, typography, borders, and surface hierarchy;
- player/header composition and custom control placement;
- artifact tabs and semantic accent treatment;
- Overview, Summary, Flashcards, Timestamps, Transcript, and Export composition;
- restrained optical depth and Quiet Luxury + Prism character;
- responsive behavior and mobile information hierarchy;
- interaction timing and restrained application motion.

The implementation must not reinterpret approved screens, introduce new visual motifs, add generic SaaS cards, enlarge spectral effects, place a prism over the video, add rainbow borders, or create game-like HUD controls.

Permitted deviations are limited to:

- real dynamic content replacing prototype fixtures;
- the DEN-25 Overview modules replacing duplicated Summary content;
- the approved mobile mini-player, bottom navigation, More sheet, and Chapters sheet;
- truthful loading, partial, empty, failed, disconnected, and unavailable states;
- accessibility corrections needed for semantics, focus, contrast, touch targets, or reduced motion;
- responsive accommodation for long content, localization, safe areas, zoom, and supported viewport sizes.

When a dynamic value changes intrinsic size, preserve the prototype's hierarchy and use truncation, wrapping, or reserved space rather than changing the composition.

## Scope

DEN-25 includes the original Linear requirements plus these user-approved additions from the prototype:

- transcript type filters;
- speaker labels;
- transcript auto-scroll control;
- selectable export contents and live preview;
- persistent Favorite;
- public, revocable, read-only Share;
- custom player playback-speed control;
- fully functional custom player controls shown by the prototype.

All existing result features remain in scope and must not regress.

## Information architecture and component boundaries

`ResultWorkspace` remains the coordinator for the selected artifact and active analysis. Responsibilities are separated as follows; names may adapt to established conventions.

- `ResultWorkspace`
  - coordinates analysis identity, selected artifact, draft artifacts, and shared providers;
- `ResultHeader`
  - title, source identity, Favorite, Share, download, and status actions;
- `ResultOverview`
  - result statement, metrics, continuation, artifact links, and recommendation;
- `ArtifactLinkCard`
  - semantic artifact state/count navigation;
- `ResultTabs`
  - tablet/desktop tab semantics and selection;
- `MobileResultNavigation`
  - primary destinations and More trigger;
- `MoreArtifactSheet`
  - Transcript and Export navigation on mobile;
- `VideoPlayerProvider`
  - the single reactive playback state and controller;
- `VideoPlayer`
  - the sole YouTube IFrame instance and custom controls;
- `MobileMiniPlayer`
  - a view/controller over the same player state, never a second media instance;
- `ChapterRail`
  - desktop chapter navigation;
- `ChapterSheet`
  - mobile chapter navigation;
- `usePlayerVisibility`
  - primary-player visibility through `IntersectionObserver`;
- `useResultScrollMemory`
  - panel-aware scroll storage/restoration keyed by analysis and artifact;
- `useArtifactSwipe`
  - guarded mobile-only gesture navigation;
- existing artifact components
  - keep editing, autosave, seeking, study, search, and export responsibilities isolated.

Heavy hidden artifact panels should not all remain mounted solely to preserve scroll. Persist the small state that must survive navigation and mount content on demand when practical.

## Desktop result workspace

The existing application sidebar and top bar remain unchanged. The result content matches the prototype's two-column workspace:

- left: source heading, custom video player, chapter rail, and metadata;
- right: result heading, artifact tabs, and the active artifact;
- the player column remains available while long content is read;
- the player image has no large prism overlay;
- artifact colors remain amber, purple, cyan, neutral transcript, and lime export;
- the active tab uses the restrained prototype accent treatment.

The prototype desktop geometry is mandatory: fixed application shell, compact workspace padding, approximately `1.04fr / 0.96fr` content columns, narrow inter-column gap, and the prototype's maximum content width. The prototype's `1180`, `860`, and `620` responsive transitions are the implementation baseline. Existing shared breakpoint tokens may be used only when they produce the same reference output; they must not alter the approved composition.

### Player

Use one YouTube IFrame API instance with native controls hidden only after the custom controls are ready. The controller/state exposes:

- current time and duration;
- buffered/progress state when available;
- playing/paused/ended state;
- current chapter;
- playback rate and supported rates;
- volume and mute state;
- captions availability/state when the API exposes them reliably;
- seek, play, pause, rate, volume, mute, captions, and fullscreen commands.

Controls visible in the prototype must work. A capability that is genuinely unavailable for a video is hidden or disabled with an explanation; no dead control is rendered. Keyboard commands and accessible names mirror the visible actions.

Playback position is throttled and saved for the authenticated owner. Restoring the analysis seeks to the saved position after the player is ready without resetting the selected artifact.

### Chapters

The timestamp artifact is the source for chapters/key moments. The active chapter is derived from current playback time. Desktop shows the prototype chapter rail. Selecting a chapter seeks the player, updates all chapter indicators, and follows the prototype's playback behavior.

## Artifact designs

### Overview

Overview is a concise navigation and status hub, not a second Summary. It contains:

1. a one-sentence result statement derived from real Summary data;
2. useful metrics for duration, summary sections, flashcards, key moments, transcript words, and only explainable confidence when available;
3. Continue Watching with current chapter, saved position, progress, and action;
4. whole-card links for Summary, Flashcards, Timestamps, Transcript, and Export with truthful counts/progress/state;
5. one deterministic recommended next step.

Recommendation precedence is explainable:

1. resume an active unfinished flashcard session;
2. return to a previously used transcript when that is the last meaningful study action;
3. start Flashcards after Summary has been visited and cards are untouched;
4. otherwise Start with Summary.

Unavailable data is not displayed as a false zero. A processing artifact may appear with a truthful processing state; failed/unrequested artifacts are disabled or omitted according to available explanatory space.

### Summary

Summary remains the only detailed reading surface. It uses the prototype's sentence summary and expandable section treatment while preserving:

- structured detailed content;
- supporting quotes when real source data exists;
- linked source timestamps;
- Copy actions;
- editing and autosave.

Editable controls should visually read as content until focused or placed in an explicit edit state. No generated quote or timestamp may be fabricated to fill the prototype.

### Flashcards

Match the prototype's deck progress, central flip card, navigation, and Again/Hard/Got it controls. Preserve artifact editing/autosave without letting edit controls dominate study mode.

Study ratings are persisted per analysis, card position, and artifact revision. A regenerated/replaced artifact must not apply stale ratings to unrelated cards. Overview shows the truthful reviewed count.

### Timestamps

Match the prototype's vertical moments timeline with active state, thumbnail when available, timestamp, title, description, and derived duration. Selecting a moment seeks and plays without forcing the document to the player. Preserve editing and autosave.

### Transcript

Match the prototype's search, type filters, active segment, controls, and footer toggles. The transcript supports:

- text search combined with the selected type filter;
- All, Key insight, Question, Example, and Story filters;
- Copy and Download;
- optional speaker labels;
- opt-in/out auto-scroll;
- active segment synchronization;
- seek/play from a transcript segment without page jump.

Transcript schema v2 adds an optional `speakerLabel` and a `segmentType` of `insight | question | example | story | other`. Segment types may be produced by a structured enrichment step and must fall back to `other` when classification is absent. Speaker names are accepted only from reliable source metadata. Do not infer a named person from transcript prose. When reliable speaker metadata is absent, use neutral labels only if the source can distinguish speakers; otherwise disable speaker labels with honest copy.

Auto-scroll follows the active segment only while Transcript is active, auto-scroll is enabled, and the user is not actively scrolling/selecting text. It uses instant movement under reduced motion.

### Export

Match the prototype's destination cards, inclusion controls, preview, and final action. Supported destinations preserve current product behavior:

- Markdown copy/download;
- Obsidian download;
- NotebookLM source package download;
- Notion only when a real integration is connected; otherwise show Connection required.

The existing serializer gains an explicit selection model. Live preview and downloaded/copied output use the same serializer invocation so they cannot diverge. Empty selection disables export and explains why.

## Mobile and tablet behavior

Tablet stacks the workspace according to the prototype responsive hierarchy and retains the normal tab row.

At mobile breakpoints:

- the full player appears in the normal top document position;
- the desktop tab row is replaced with bottom navigation for Overview, Summary, Flashcards, Timestamps, and More;
- More opens an accessible bottom sheet for Transcript and Export;
- the chapter rail leaves the main flow and Chapters opens in a dedicated sheet;
- safe-area padding prevents overlap with browser/device UI;
- every touch target is at least 44 by 44 CSS pixels.

`IntersectionObserver` determines when the full player is sufficiently outside the viewport. A single mini-player then appears above mobile navigation with thumbnail/frame, current chapter/title, time, play/pause, Chapters, and Expand. It consumes the shared player state and never creates another iframe.

Expand restores/scrolls to the full player without changing the artifact. Timestamp/chapter actions seek without scrolling to the player. Orientation changes may not create duplicate mini-players.

Both sheets provide dialog semantics, drag handle, explicit close action, focus trap, Escape handling, inert background, focus restoration, and body-scroll locking without a page jump.

Each artifact stores its own reading position, keyed by analysis ID. Restoration occurs after destination content renders and clamps stale values. Positions clear when the active analysis changes. The selected artifact is route-addressable so reload and Back/Forward remain understandable.

Guarded horizontal swipe is mobile-only. It requires a meaningful horizontal threshold, rejects predominantly vertical motion, and ignores protected targets including sliders, text selection, flashcards, sheets, inputs, and horizontally scrollable regions. Navigation is never swipe-only.

## Data and persistence

The normalized presentation layer exposes actual Overview data equivalent to:

```ts
type ResultOverviewData = {
  outcome: string;
  durationSeconds: number;
  summarySectionCount: number | null;
  flashcardCount: number | null;
  reviewedFlashcardCount: number | null;
  keyMomentCount: number | null;
  transcriptWordCount: number | null;
  currentTimeSeconds: number;
  currentChapter: {
    id: string;
    title: string;
    startSeconds: number;
    endSeconds?: number;
    thumbnailUrl?: string;
  } | null;
  availableExports: string[];
};
```

Null represents unavailable/not-yet-known data and is distinct from a real zero.

Authenticated per-analysis user state stores at minimum:

- Favorite;
- last playback position;
- last selected artifact / meaningful study action;
- flashcard review state tied to artifact revision.

Scroll memory and ephemeral UI toggles may remain in route-aware client/session storage when they do not need cross-device persistence. Server-only secrets and ownership checks stay outside client components.

Supabase schema changes require migrations, ownership RLS, validation, and tests. No user-controlled owner identifier is trusted by a Server Action.

## Public sharing

Share creates a cryptographically unpredictable, revocable, read-only public link. The public result surface is a presentation of allowed result data, not access to the owner's private result route.

- only the owner may create, inspect, or revoke a share;
- a public request resolves a bearer token through a server-only boundary;
- the response excludes owner email/profile, user preferences, drafts, private IDs in rendered UI, billing, and personal progress;
- editing, Favorite, private recommendations, and autosave are unavailable publicly;
- only ready, explicitly allowed artifact data and safe source metadata are exposed;
- revoked, missing, or malformed tokens return the same neutral unavailable experience;
- tokens are never included in analytics payloads or logs intentionally;
- cache behavior must not serve a revoked/private result incorrectly.

## State, errors, and edge cases

Support processing, ready, partial, unavailable, malformed, failed, disconnected, and network-error states without fabricating completeness. Important behavior includes:

- Favorite uses optimistic UI, rolls back on failure, and announces the outcome;
- playback saves are throttled and retry safely;
- a missing current chapter does not disable the rest of Overview;
- unavailable transcript data disables dependent filters/speaker controls truthfully;
- failed/zero-card generation is not represented as a completed empty deck;
- disconnected export integrations cannot report success;
- very long titles, 3+ hour times, long localized labels, and mobile rotation preserve core controls;
- bfcache restore re-synchronizes observer/player UI without duplicate instances;
- network interruption does not discard an editable draft silently.

## Localization

All new interface labels, status copy, errors, accessible names, and sheet text use the product i18n layer. Generated analysis content remains in its generated/source language. Components must tolerate long translations without replacing the prototype hierarchy.

## Accessibility and motion

- correct landmarks and heading hierarchy;
- valid tab semantics on desktop/tablet;
- current-destination semantics for mobile navigation;
- dialog semantics for sheets;
- visible design-system focus states;
- accessible names and state for custom player controls;
- progress communicated with text/state as well as color;
- WCAG AA text contrast;
- keyboard operation for player, tabs, artifact cards, sheets, flashcards, and export;
- no excessive live-region announcements from playback changes;
- `prefers-reduced-motion` removes card flip, smooth scrolling, sheet/miniplayer motion, and other nonessential transitions while preserving state clarity.

Common application transitions remain approximately 160–240 ms and favor opacity/transform. Motion must remain restrained and functional.

## Analytics

Add or preserve these events:

- `result_overview_artifact_opened`;
- `result_continue_watching_clicked`;
- `result_mobile_miniplayer_shown`;
- `result_mobile_miniplayer_expanded`;
- `result_chapter_sheet_opened`;
- `result_chapter_selected`;
- `result_mobile_tab_changed`;
- Favorite, Share create/copy/revoke, transcript filter, auto-scroll, rate-change, and export actions where the product analytics boundary supports them.

Properties are limited to anonymous analysis/share identifiers, artifact type, destination type, rate, and action/state enums. Do not send video titles, generated content, transcript text, summary text, speaker labels, search queries, owner identity, or share tokens.

## Performance

- use `IntersectionObserver`, not continuous scroll polling, for primary-player visibility;
- maintain one media instance;
- avoid mounting every heavy hidden artifact solely for navigation state;
- throttle playback persistence and analytics;
- lazy-load thumbnails below the fold;
- reserve mini-player/navigation space to avoid layout shift;
- avoid render loops from 250 ms player polling by isolating subscribed state;
- verify representative mobile CPU throttling.

## Verification strategy

### Unit and component coverage

- Overview never renders detailed Summary sections;
- artifact cards expose truthful counts and states;
- recommendation rules are deterministic;
- full and mini-player consume one state/controller;
- playback position and flashcard progress persistence;
- transcript search/type-filter composition and speaker fallback;
- auto-scroll pause/disable behavior;
- export selection, preview, and serialized output equivalence;
- Favorite optimistic success/failure;
- Share ownership, public projection, and revocation;
- independent scroll memory and clamping;
- swipe guards;
- partial data never becomes a false zero;
- public view never exposes editing/private actions.

### Browser coverage

Playwright must cover at least:

1. desktop navigation from Overview;
2. functional custom player controls and rate change;
3. Favorite persistence;
4. public Share creation, anonymous read-only open, and revocation;
5. mobile player leaving viewport and exactly one mini-player appearing;
6. timestamp seek without page jump;
7. chapter sheet selection and close;
8. Transcript → Flashcards → Transcript scroll restoration;
9. More sheet navigation to Transcript and Export;
10. transcript filters, speaker state, and auto-scroll;
11. export selection/preview/download equivalence;
12. orientation change without duplicate mini-player;
13. keyboard navigation, focus trapping, and Escape;
14. reduced-motion behavior;
15. 200% zoom smoke test;
16. partial, failed, malformed, disconnected, and network-error states.

Verify 320×568, 375×667, 390×844, 430×932, 768×1024, 1440×900, and 1920×1080. Capture visual regressions for the DEN-25 reference states and compare them directly with the prototype.

Before completion run formatting, linting, strict type checking, unit/integration tests, production build, desktop/mobile browser verification, reduced-motion verification, and visual comparison.

## Rollout and migration

1. introduce backward-compatible schema/presentation changes;
2. add user-state and public-share persistence with RLS;
3. extend player state without creating a second iframe;
4. implement the pixel-faithful desktop surface using existing artifact behavior;
5. implement DEN-25 mobile navigation, sheets, scroll memory, and gestures;
6. add public read-only projection/route;
7. complete regression, accessibility, and visual verification;
8. deploy to staging and smoke-test real Supabase/YouTube/model integrations before merge.

Existing artifacts remain readable. Transcript v1 content normalizes with `other` types and no speaker labels until enriched/regenerated. No destructive backfill is required for old results.

## Risks and mitigations

- **Scope exceeds the original five-point estimate.** Keep one DEN-25 outcome but implement in reviewable internal slices; do not hide the added data/security work.
- **Prototype fidelity conflicts with dynamic content.** Treat the prototype hierarchy and measurements as fixed; solve overflow through reserved space, truncation, and responsive rules.
- **YouTube capability variance.** Render only supported custom controls and preserve an accessible fallback.
- **Speaker hallucination.** Accept reliable source metadata only; never infer named speakers from prose.
- **Public data exposure.** Use a dedicated server-side public projection, ownership-checked share management, revocation, and RLS tests.
- **State/render churn.** Isolate player subscriptions, persist throttled values, and avoid keeping all heavy panels mounted.
- **Regression risk.** Preserve DEN-18 contracts and require the existing result suite plus the new DEN-25 coverage.

## Definition of done

- the production result page matches the approved HTML prototype one-to-one at reference viewports;
- DEN-25 Overview and mobile requirements are complete;
- all explicitly approved additional prototype functions are functional;
- existing Summary, Flashcards, Timestamps, Transcript, Export, autosave, seeking, partial-result, and reduced-motion behavior does not regress;
- public Share is safe, anonymous, read-only, and revocable;
- desktop, tablet, mobile, keyboard, touch, reduced-motion, zoom, and visual checks pass;
- staging smoke tests pass with real integrations;
- screenshots are reviewed against the prototype;
- product owner confirms the result workspace before DEN-25 is marked Done.
