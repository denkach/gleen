# DEN-19 History toolbar icon alignment

## Goal

Match the approved History toolbar reference by rendering the Filters icon as a complete funnel and centering the Filters, Sort, List, and Grid icon boxes within their existing controls.

## Root cause

The current toolbar symbols are approximated with clipped borders and CSS
gradients. The Filters pseudo-element clips the border of a rectangle into a
polygon, which cannot produce the complete outlined funnel shown in the
approved references. The List approximation omits the three leading bullets,
and Grid uses filled gradient squares instead of the approved outlined cells.

An attempted formatting-context correction proved to be a visual no-op:
pseudo-elements that participate in the flex controls are already blockified.
Forced snapshot recapture confirmed that `display: block` and fixed flex
behavior do not change the toolbar pixels.

## Design

- Preserve the existing toolbar structure, control dimensions, spacing,
  colors, states, and accessible labels.
- Replace the four CSS approximations with local inline SVG components; do not
  add an icon dependency.
- Use one shared `18px × 18px` icon box with `display: block` and
  `flex: 0 0 auto`.
- Draw every icon with `fill="none"`, `stroke="currentColor"`,
  `strokeWidth="1.5"`, rounded line caps, and rounded joins.
- Render a complete outlined funnel for Filters.
- Render three leading bullets and three horizontal strokes for List.
- Render four outlined cells for Grid.
- Render a symmetric downward chevron for Sort.
- Mark every decorative SVG `aria-hidden="true"` and `focusable="false"` so
  the existing button labels remain the only accessible names.
- Let the existing flex controls center the fixed SVG boxes.
- Keep the Grid control disabled and the List control active.
- Apply the correction consistently across desktop, tablet, and mobile breakpoints.

## Verification

- Add component tests that require the correct SVG icon in Filters, Sort, List,
  and Grid controls without changing accessible names.
- Add a CSS contract test for the shared `18px × 18px` non-shrinking icon box.
- Run the focused CSS and History component tests.
- Run formatting, linting, and type checking.
- Force-refresh the affected History visual baselines from the corrected
  rendering. Inspect binary diffs and commit only snapshots whose toolbar
  pixels changed.
- Verify the approved desktop History fixture in a browser.
- Confirm the mobile toolbar remains centered and free of horizontal overflow.

## Scope

Only History toolbar icon geometry is in scope. Search behavior, filtering
behavior, sorting, grid availability, toolbar dimensions, and other History
styling remain unchanged.
