# Home Sign-in Link Fix

## Problem

The desktop `Sign in` action in the marketing header links to `#product`, so it scrolls within the landing page instead of opening account access.

## Design

Change only the desktop header `Sign in` destination from `#product` to `/sign-in`. Preserve the existing button styling, responsive behavior, landing-page layout, and authentication flow. The existing sign-in page remains responsible for Google, magic-link, and password authentication.

## Verification

Add an end-to-end assertion that the landing-page `Sign in` link points to `/sign-in` and navigates to the approved sign-in screen. Run the focused test first to demonstrate the regression, then rerun it after the fix. Finally, verify the link in the browser at desktop size.

## Scope and risk

No OAuth configuration, server actions, visual design, mobile navigation, or other landing-page calls to action are changed. The primary risk is accidentally changing another header action; the focused assertion prevents that regression.
