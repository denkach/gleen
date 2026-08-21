# DEN-29 pixel-parity correction

## Goal

Correct the settings page and subscription recovery state so their desktop and mobile rendering matches the four approved images in `design/prototypes/gleen-account-pages-cb-v1/gleen-account-pages-cb-v1/` rather than merely reusing their visual direction.

## Source of truth

The original `desktop-settings.png`, `mobile-settings.png`, `desktop-subscription.png`, and `mobile-subscription.png` files are immutable golden references. Their dimensions, shell geometry, typography, spacing, navigation, copy, fixture values, and responsive behavior define acceptance.

## Scope

- Apply the prototype shell geometry only to Settings and Subscription so unrelated application screens retain their approved layouts.
- Match Settings content, language selectors, sidebar note, and mobile stacking.
- Match the Subscription error card, sans-serif heading, actions, metadata, and mobile navigation.
- Make deterministic visual fixtures use the Russian locale, `DC` identity, and 24 remaining analyses shown in the reference.
- Preserve keyboard behavior and reduced-motion support.

## Acceptance

- Playwright captures at 1600×1000 and 390×1249 for Settings compare against the original Settings PNGs.
- Playwright captures at 1600×1000 and 390×853 for Subscription error compare against the original Subscription PNGs.
- No horizontal overflow at the reference sizes or tablet width.
- Existing non-DEN-29 billing visuals and behavior remain unchanged.

## Risks

- Global shell selectors could regress unrelated pages; all geometry overrides must be route-scoped.
- Font rasterization can create small platform differences; structure and sizing must use the prototype values and the repository's available Inter-compatible font stack.
- The prototype contains deterministic account data that must stay in test fixtures, never production visual components.
