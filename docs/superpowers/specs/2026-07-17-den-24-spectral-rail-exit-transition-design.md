# DEN-24 Spectral Rail exit transition

## Goal

Make the production analysis motion readable without delaying the user excessively, and replace the abrupt result navigation with a clear visual handoff.

## Approved timing

The normal-motion flow lasts approximately four seconds after submission:

1. Processing and sequential rail reveal occupy the first three seconds. The UI remains truthful: no granular production stage is marked active unless backend state supports it.
2. The completed result copy appears for approximately 400 milliseconds.
3. A 600 millisecond optical wipe and restrained shell fade provide the exit transition.
4. Navigation occurs after the exit transition finishes.

If the server action takes longer than the minimum processing interval, completion begins as soon as the result becomes available. The UI never delays or fabricates backend progress beyond the approved visual minimum.

## Visual behavior

- Preserve the four fixed Spectral Rails and their approved amber, purple, cyan, and lime colors.
- Use the existing completion wipe as the transition cue.
- Add a restrained exit state to the existing shell; do not add a modal, full-screen overlay, prism, or new decorative object.
- Keep the completion copy: “Your artifacts are ready” and “Opening the result workspace”.

## Accessibility and failure behavior

- With `prefers-reduced-motion: reduce`, navigate immediately after the result is available; do not add the four-second decorative minimum.
- Errors cancel pending completion and navigation timers and leave retry available.
- Unmounting cancels every scheduled timer.

## Verification

- Unit tests cover the processing minimum, completion hold, exit phase, navigation timing, reduced motion, error cancellation, and unmount cleanup.
- Browser tests verify the visible completion-to-exit handoff and unchanged desktop, tablet, mobile, and reduced-motion behavior.
