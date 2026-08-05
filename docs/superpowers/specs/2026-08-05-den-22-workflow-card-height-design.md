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
- Make cards in the same grid row stretch to the row's tallest item while the
  row remains anchored to the bottom of the process scene.
- Keep the existing font sizes, padding, copy, spectral states, and motion.
- Use a minimum rather than a fixed height so browser text zoom and unusually
  large accessibility fonts can expand a card instead of clipping content.
- Apply the same minimum on desktop, tablet, and mobile. Mobile cards remain a
  single-column stack.
- Do not add locale-specific selectors, font scaling, truncation, line clamps,
  hidden overflow, or shortened translations.

## Responsive behavior

- Desktop: all four cards share one visually level 200 px-or-taller row.
- Tablet: both two-card rows use equal-height cards; the 200 px minimum keeps
  the rows stable across all five locales.
- Mobile: each card keeps the 200 px minimum and may grow only when content or
  accessibility scaling requires it.

## Accessibility

Content must remain fully visible at browser text zoom. The minimum-height
contract intentionally permits growth rather than clipping. Focus behavior,
reading order, reduced motion, and semantic heading structure are unchanged.

## Verification

- Add a failing style contract for the shared 200 px minimum, desktop row
  stretching, and bottom row alignment.
- Verify all four card heights and text overflow for `uk`, `ru`, `en`, `es`,
  and `de` at desktop, tablet, and mobile viewports.
- Run the affected marketing/style tests, formatting, lint, type checking,
  production build, and focused browser coverage.
