# DEN-25 Single Player Overlay Design

## Problem

The custom result player mounts a YouTube iframe above the source thumbnail as
soon as the custom controls initialize. Before playback, YouTube paints its own
red play badge inside the iframe. Gleen then paints its custom center play
control above it, producing two overlapping play symbols.

## Approved behavior

- Keep the existing custom center play control and the custom transport bar.
- Keep YouTube native controls disabled.
- Display the existing source thumbnail as an opaque poster above the iframe
  until the shared player state reports that playback has started.
- Keep the custom center play control above that poster so the first user
  gesture still starts the shared player controller.
- Remove the poster after the first playing state and do not restore it when the
  user subsequently pauses.
- Reset the poster when the source video or player lifecycle changes.
- Preserve saved playback position, mini-player synchronization, fullscreen,
  keyboard labels, mobile layout, and reduced-motion behavior.

## Boundaries

This DEN-25 correction changes only the player presentation. Mobile landing
authentication/navigation is tracked in DEN-26. Provider retries and truthful
partial-result errors are tracked in DEN-27.

## Verification

- Component test: the poster covers the initialized iframe before first play.
- Component test: the poster is removed after the shared player enters playing
  state and remains absent after pause.
- Existing controller, fullscreen, mobile mini-player, and result-workspace
  tests continue to pass.
- Browser check on desktop and mobile confirms exactly one center play symbol.
- Reduced-motion mode shows the same deterministic state without added motion.
