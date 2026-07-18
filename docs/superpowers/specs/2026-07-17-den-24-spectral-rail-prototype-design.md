# DEN-24 Spectral Rail Prototype Design

## Goal

Turn `design/prototypes/spectral/index.html` into the standalone approved
Spectral Rail prototype for DEN-24. Preserve the existing New Analysis hero and
input-card composition while removing the alternative Optical Scan and
Knowledge Pulse concepts.

## Source of truth

- Linear issue DEN-24.
- `docs/design-system.md`.
- The Spectral Rail section currently present in
  `design/prototypes/spectral/index.html`.

## Composition

The page contains only the New Analysis hero and its transforming input card.
Idle state matches the existing prototype. After submission, the same card
expands into a balanced two-column processing workspace: stage copy and the
real stage list on the left, white master rail and four spectral artifact rails
on the right. Mobile stacks the stage content before the rails.

No prism, triangle, 3D scene, concept tabs, comparison metadata, or full-screen
overlay remains.

## Interaction states

The prototype models `idle`, `submitting`, `validating`, `transcript`,
`structuring`, `artifacts`, `complete`, and `error` explicitly. Prototype timers
advance these states only to demonstrate the interaction.

- Submission immediately disables duplicate activation and compresses the
  button.
- A white photon travels across the URL row, illuminating the text and border.
- The card expands after photon travel and reveals processing content.
- The white master rail appears before four staggered, thin artifact rails.
- Real stages advance without percentages; the active stage receives a quiet
  moving trace and completed stages use neutral checks.
- Completion briefly illuminates all rails, changes the copy to “Your artifacts
  are ready” / “Opening the result workspace,” and shows a restrained white
  wipe without navigating away in the standalone prototype.
- Recoverable error dims the rails, restores the editable URL, adds a restrained
  coral edge, and exposes a “Try again” action.

Prototype-only controls allow replaying the success sequence and previewing the
recoverable error state without pretending to be production UI.

## Responsive and accessibility behavior

Desktop and tablet use two columns where space permits. Mobile uses one column,
keeps rails horizontal, prevents horizontal scrolling, and preserves practical
touch targets. The submit interaction works with pointer and keyboard input,
focus remains visible, status changes use an accessible live region, and button
disabled states are explicit.

With `prefers-reduced-motion: reduce`, photon travel, rail extension, breathing,
and wipe motion are removed. The UI crossfades directly to a static processing
state with all rails visible and a static active-stage indicator.

## Verification

Verify idle, processing, completion, and error states at desktop and mobile
widths, plus keyboard activation and reduced-motion behavior. Confirm that the
prototype contains no prism, alternative concepts, fabricated percentages, or
horizontal page overflow.
