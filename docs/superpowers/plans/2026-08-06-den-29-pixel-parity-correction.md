# DEN-29 pixel-parity correction plan

1. Replace the DEN-29 visual baselines with the four approved prototype PNGs and update the Subscription visual cases to the prototype viewport and locale. Run them and confirm failure.
2. Add route-scoped account-page shell behavior: prototype desktop dimensions, mobile route title, and the four-item application bottom navigation.
3. Refine Settings markup/styles and deterministic authenticated fixture values until both Settings golden comparisons pass.
4. Refine Subscription recovery markup/styles and its dedicated fixture values until both Subscription golden comparisons pass without changing other billing screens.
5. Add or update focused unit/style assertions for route scoping, mobile navigation, and reduced motion.
6. Run formatting, lint, type checking, focused tests, the production build, and browser checks at desktop, tablet, mobile, and reduced motion.
7. Commit and push the correction, update the draft PR, deploy staging, verify the deployed pages, then return DEN-29 to Done only after verification passes.
