# DEN-22 localized workflow card height design

## Problem

The four marketing workflow cards currently size themselves from translated
content. At the same viewport, English cards range from 154–174 px while
Ukrainian and Russian cards can reach 199 px because longer headings and body
copy wrap. The different top edges disrupt the approved process rhythm and make
some locales appear visually larger than others.

## Approved design

- Give every workflow card a shared minimum block size of 200 px at standard
  text scaling.
- Make all four cards equal in outer height within each locale and viewport;
  they may share a height above 200 px when localized copy or accessibility
  scaling needs more room. Keep the row anchored to the bottom of the process
  scene.
- Keep the existing font sizes, padding, copy, spectral states, and motion.
- Use a minimum rather than a fixed height so browser text zoom and unusually
  large accessibility fonts can expand a card instead of clipping content.
- Apply the same minimum on desktop, tablet, and mobile. Mobile cards remain a
  single-column stack.
- Do not add locale-specific selectors, font scaling, truncation, line clamps,
  hidden overflow, or shortened translations.

## Responsive behavior

- Desktop: all four cards share one visually level 200 px-or-taller row.
- Tablet: all four cards use the same 200 px-or-taller outer height for the
  active locale and viewport.
- Mobile: all four cards share the same 200 px-or-taller outer height and may
  grow when localized content or accessibility scaling requires it.

## Accessibility

Content must remain fully visible at browser text zoom. The minimum-height
contract intentionally permits growth rather than clipping. Focus behavior,
reading order, reduced motion, and semantic heading structure are unchanged.

## Verification

- Add a failing style contract for the shared 200 px minimum, desktop row
  stretching, and bottom row alignment.
- Verify all four card heights are equal and at least 200 px, and that text is
  not clipped, for `uk`, `ru`, `en`, `es`, and `de` at desktop, tablet, and
  mobile viewports.
- The focused viewport set is `1440x900` desktop, `900x768` tablet (inside the
  `max-width: 980px` two-column breakpoint), and `390x844` mobile. It is
  intentionally separate from the shared localization viewport fixture.
- Run the affected marketing/style tests, formatting, lint, type checking,
  production build, and focused browser coverage.
