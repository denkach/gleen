# DEN-25 Single Player Overlay Implementation Plan

1. Add a failing SourcePanel/PlayerControls component test for the poster-first
   lifecycle and pause-after-start behavior.
2. Track whether playback has started in SourcePanel using the shared player
   snapshot, resetting the state when the player lifecycle key changes.
3. Keep the poster above the iframe until playback starts, then unmount it.
4. Run focused component tests and the result-workspace browser tests.
5. Run formatting, linting, type checking, the full test suite, production
   build, desktop/mobile browser verification, and reduced-motion verification.
