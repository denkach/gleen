# GLE-014 Analyze-to-Processing Prism Animation Design

## Goal

Implement DEN-24 as the visual processing layer of DEN-16. Clicking **Analyze
video** must transform the approved New Analysis input into the exact dark,
optical processing composition defined by
`design/prototypes/analyze-processing/index.html`, without redesigning the New
Analysis screen or fabricating production processing progress.

## Sources of truth

- Linear DEN-24 and its recorded state-driver decision.
- `design/prototypes/analyze-processing/index.html` for the exact processing
  composition, geometry, type, motion, responsive behavior, and copy hierarchy.
- `design/reference-v3/index.html`, `design/screenshots/`, and
  `/Users/niga/Downloads/gleen-motion-prototype-v2/` for the broader approved
  Prism language.
- `docs/design-system.md` and existing application design tokens.
- The current DEN-16 intake form, action state, error handling, and artifact
  configuration.

All approved references remain read-only. Exact reference geometry wins over a
generic component-library interpretation.

## Non-negotiable visual rule

Do not redesign the prototype. Port its composition to React and the existing
application shell:

- the same idle input-to-processing card transformation;
- the same photon, shell flash, compact prism, incoming beam, spectral rays,
  status copy, step list, traces, and completion treatment;
- the same restrained dark surfaces, typography hierarchy, radii, spacing,
  opacity, and mobile stacking;
- the same approximate 1.8-second opening narrative on desktop;
- the existing New Analysis page and surrounding dashboard panels remain in
  place.

Values must map to shared design tokens. Tokenization may not visibly reinterpret
the reference.

## Artifact correction

The static prototype always labels Summary, Flashcards, Timestamps, and Export.
Production must instead render the artifacts selected for the submitted intake.

- Supported generated artifacts are Summary, Flashcards, Timestamps, and
  Transcript.
- Only selected artifacts receive rays and labels.
- Flashcards appear only when selected.
- Transcript replaces Export when Transcript is selected.
- Export is not an intake artifact and never appears in this processing split.
- Ray colors use the existing artifact token when defined. Transcript uses the
  restrained neutral/white optical treatment already present in the prototype;
  no new saturated artifact color is invented.

This is a data correction, not a redesign. Ray origin, spread, length, timing,
weight, and label placement retain the reference composition and adapt only to
the number of selected artifacts.

## State architecture

Define a presentation-only state model:

```ts
export type AnalysisVisualState =
  | 'idle'
  | 'submitting'
  | 'validating'
  | 'transcript'
  | 'structuring'
  | 'artifacts'
  | 'complete'
  | 'error';
```

`AnalyzeProcessingVisual` is a controlled component. It never owns production
stage timers and never infers a server stage from elapsed time. Its inputs are:

```ts
type AnalyzeProcessingVisualProps = Readonly<{
  state: AnalysisVisualState;
  selectedArtifacts: readonly Artifact[];
  submittedUrl: string;
  errorMessage?: string;
  onRetry?: () => void;
}>;
```

The visual maps state to classes, step status, copy, and accessible announcements.
State transitions remain outside the component.

## Production and fixture drivers

### Production

DEN-16 exposes only real coarse lifecycle information from the current Server
Action. Production therefore uses:

```text
idle → submitting → complete | error
```

`submitting` uses honest combined copy such as **Checking video and transcript…**.
It may run the reference opening narrative and calm long-running loop, but it
must not mark validating, transcript, structuring, or artifacts steps complete
without a real event. DEN-16 success navigates to the truthful intake readiness
route; it does not claim that generated artifacts already exist.

### Development fixture and visual demo

A development-only driver may advance the full sequence:

```text
idle → submitting → validating → transcript → structuring → artifacts → complete
```

Timers are allowed only inside development fixtures, automated visual tests, and
the demo. The fixture driver must be impossible to import or execute in a
production build. It exists to complete and verify the DEN-24 visual now.

### Required future integration

When the persistent processing pipeline is implemented, its real events replace
the fixture driver for `validating`, `transcript`, `structuring`, `artifacts`,
and `complete`. The presentation component and approved visual must not be
redesigned during that integration. This requirement is also recorded in Linear
DEN-24.

## Interaction sequence

On keyboard or pointer submission:

1. Disable duplicate submission immediately.
2. Apply the reference button press feedback and spectral hover/active edge.
3. Move the white photon through the URL channel and play the restrained shell
   flash.
4. Fade and blur the URL row using transform, opacity, and filter as in the
   prototype.
5. Expand the same shell into the processing composition with minimal layout
   shift.
6. Reveal the compact prism, incoming white beam, selected artifact rays, and
   their labels.
7. Enter the calm controlled-state view: breathing prism and active-stage trace.

The production action may resolve before the full narrative completes. In that
case navigation waits only for the remainder of the opening narrative, capped so
the visual never delays success beyond approximately 1.8 seconds from submission.
Errors interrupt the narrative immediately because actionable feedback is more
important than completing decorative motion.

## Stage presentation

The visual stage list retains the prototype wording:

- Validating video;
- Finding transcript;
- Structuring key ideas;
- Creating knowledge artifacts.

An application-provided state controls which step is active or done. There is no
percentage. In production DEN-16, unavailable granular stages remain visibly
pending rather than advancing on timers. Screen-reader copy announces only the
honest production combined status.

## Completion and navigation

The dev fixture reproduces the prototype completion overlay and pulse. In current
DEN-16 production, successful intake navigation goes to `/app/video/[id]` after
the opening transition and uses readiness language, not **Your knowledge
artifacts are ready**. The full artifacts-ready completion copy becomes
production-active only when the real processing pipeline supplies `complete`.

## Error behavior

Recoverable errors:

- stop photon, flash, trace, and breathing emphasis;
- preserve the submitted URL and selected configuration;
- reuse the reference processing card for safe error copy;
- provide a visible **Try again** action;
- return to the real submission flow on retry;
- never expose provider bodies, keys, transcript content, or internal errors.

The visual does not replace the existing stable DEN-16 error mapping.

## Motion implementation

Prefer CSS transforms, opacity, filter, and state classes. GSAP is not required
for this application interaction because the reference sequence is bounded and
the component must remain directly controlled by application state. No new
production dependency is needed.

Motion limits:

- button feedback: 140–180 ms;
- shell transition: reference 550–750 ms easing;
- opening narrative: approximately 1.8 seconds maximum on desktop;
- long-running loop: calm prism breath and active trace only;
- no autoplay sound, aggressive flashes, large saturated fields, cursor effects,
  or full-screen loading overlay.

## Responsive behavior

### Desktop and tablet

Retain the prototype two-column processing panel and its optical proportions.
The card may grow vertically while surrounding dashboard geometry remains stable.
Verify 1440×900, 1024×768, and the 980px collapsed rail.

### Mobile

Use the prototype mobile composition:

- single-column shell;
- optic above status copy;
- lighter, shorter rays;
- hidden artifact endpoint labels when they cannot fit;
- no horizontal overflow;
- all actions clear the fixed bottom navigation and satisfy 44px touch targets.

Do not invent a different mobile card.

## Reduced motion

With `prefers-reduced-motion: reduce`:

- remove photon travel, shell flash, breathing, ray growth, and moving trace;
- switch immediately between idle and the controlled processing/error layout;
- preserve prism, selected artifact labels, stage text, URL, errors, and actions;
- do not delay navigation for the decorative opening narrative.

## Accessibility

- Native form submission and keyboard activation remain intact.
- Duplicate submissions are disabled immediately.
- Status and error copy use `role="status"`/`aria-live` without announcing
  decorative elements.
- Prism, beam, photon, flash, and rays are `aria-hidden`.
- Stage names remain text, not color-only status.
- Focus remains predictable through submission, error, Try again, and navigation.
- Contrast and touch targets follow the existing application rules.

## Component boundaries

- `analysis-visual-state.ts`: state and stage mapping with no React or timers.
- `analyze-processing-visual.tsx`: controlled reference composition.
- `analyze-processing-fixture.tsx`: development-only full fake sequence.
- `new-analysis-form.tsx`: owns real action submission, URL/configuration, retry,
  and production coarse-state mapping.
- `app-shell-reference.css`: exact tokenized prototype styles and responsive/
  reduced-motion variants.

Keep modules focused; do not fold the processing visual, fixture driver, and
Server Action orchestration into one component.

## Testing and verification

Automated coverage must prove:

- state-to-step mapping has no internal production timer;
- production never fabricates granular stages;
- fixture full sequence is development-only and unavailable in production;
- button disables immediately and keyboard submission works;
- photon/flash/prism/rays form the opening sequence;
- only selected artifacts render rays/labels and Export never renders;
- unselected Flashcards never appear;
- recoverable errors preserve URL/configuration and Try again works;
- success respects the opening cap without claiming generated artifacts;
- exact desktop/tablet/mobile geometry has no horizontal overflow;
- mobile actions clear bottom navigation and meet touch targets;
- reduced motion removes decorative motion without hiding state or actions;
- production fixture routes return 404;
- existing DEN-16 intake, duplicate, re-analysis, and readiness tests remain
  green.

Before completion run format, lint, typecheck, unit/integration tests, production
build, development E2E, production E2E, and visual browser verification against
the prototype at desktop and mobile widths.

## Scope boundaries

DEN-24 does not add YouTube integration, transcript acquisition, generated
artifact processing, persistent jobs, progress events, billing, credit writes,
or a result workspace. It consumes current DEN-16 state and supplies a visual
contract for the future processing pipeline.

## Risks

- The prototype file currently exists as an untracked file in the main checkout
  and must be added to the DEN-24 branch without altering its contents.
- Production cannot truthfully show granular processing stages until pipeline
  events exist; the fixture/production driver boundary must remain enforced.
- The prototype's static Export and Flashcards rays conflict with per-intake
  selection; dynamic selected-artifact labels are the only approved data-level
  deviation.
- CSS copied without token mapping can drift from the application system; visual
  regression checks must compare the rendered result, not merely selectors.
