# Mobile BeamInput alignment

## Scope

Correct only the mobile layout of the landing-page BeamInput at viewports up to
720px. Desktop and tablet geometry, product behavior, motion, and approved
reference files remain unchanged.

## Design

- Position the link icon at `top: 31px` so it is vertically centered within
  the 48px input row instead of the complete two-row form.
- Inset the action button by 6px on each horizontal side. Its rendered width is
  therefore 12px narrower than the input row.
- Preserve the existing button height, typography, colors, radius, hover,
  keyboard focus, and reduced-motion behavior.

## Verification

- Add a mobile browser regression test for the icon position and button inset.
- Verify the hero visually at 390x844.
- Run formatting, linting, type checking, unit tests, production build, and the
  browser test suites before publishing.

