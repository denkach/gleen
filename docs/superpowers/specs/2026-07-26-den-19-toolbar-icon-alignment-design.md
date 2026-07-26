# DEN-19 History toolbar icon alignment

## Goal

Match the approved History toolbar reference by rendering the Filters icon as a complete funnel and centering the Filters, Sort, List, and Grid icon boxes within their existing controls.

## Root cause

The toolbar icons are CSS pseudo-elements with declared dimensions but no explicit display box. As inline pseudo-elements, their width and height can collapse, which clips the funnel outline and offsets the gradient-drawn view icons.

## Design

- Preserve the existing toolbar structure, control dimensions, spacing, colors, states, and accessible labels.
- Keep the current restrained CSS-drawn icons; do not add a new icon dependency or change the DOM to inline SVG.
- Give each toolbar pseudo-icon an explicit fixed box with block layout and non-shrinking flex behavior.
- Let the existing flex controls center those fixed boxes.
- Keep the Grid control disabled and the List control active.
- Apply the correction consistently across desktop, tablet, and mobile breakpoints.

## Verification

- Add a CSS contract test that fails if the Filters, Sort, or view-mode pseudo-icons lose their explicit display box or fixed flex behavior.
- Run the focused CSS and History component tests.
- Run formatting, linting, and type checking.
- Verify the approved desktop History fixture in a browser and update its visual snapshot only if the corrected icon pixels require it.
- Confirm the mobile toolbar remains centered and free of horizontal overflow.

## Scope

Only History toolbar icon geometry is in scope. Search behavior, filtering behavior, sorting, grid availability, toolbar dimensions, and other History styling remain unchanged.
