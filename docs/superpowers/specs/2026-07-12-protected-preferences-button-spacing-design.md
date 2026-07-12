# Protected preferences button spacing

## Scope

Add vertical separation between the explanatory paragraph and the **Review
preferences** link on the protected-session confirmation page.

## Design

- Add a page-specific class to the existing link.
- Apply `margin-top: 24px` using the existing spacing token where available.
- Do not change the shared `.ui-button` styles, typography, color, size, hover,
  focus, layout, or any approved reference screen.
- Preserve the same spacing across desktop and mobile because the requested
  separation is independent of viewport width.

## Verification

- Add a focused rendering assertion for the page-specific class.
- Run formatting, linting, type checking, tests, and the production build.
- Verify that the protected page renders and the margin is applied without
  changing other buttons.
