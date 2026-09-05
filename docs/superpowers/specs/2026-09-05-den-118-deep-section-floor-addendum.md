# DEN-118 Deep Long-Form Section Floor Addendum

## Decision

For Deep summaries of videos from 45 minutes up to 90 minutes, 14–18 sections
is a successful-output requirement rather than a soft target. The current
12-section result proved that changing the policy range alone is insufficient:
the idea map and final quality boundary can still accept fewer chapters.

## Generation behavior

- The idea-map pass requests at least 14 distinct, grounded chapter candidates.
- Composition targets 14–18 chapters and may combine overlapping candidates,
  but must retain enough grounded distinctions to remain inside the range.
- A result below 14 or above 18 fails structural validation.
- The one existing bounded repair receives the missing-range finding together
  with coverage and duplication findings.
- Repaired output is validated again against range, grounding, coverage, and
  duplication requirements.
- If the bounded repair still cannot produce 14–18 valid sections, the Summary
  artifact fails safely and remains retryable; an undersized result is not
  published as successful.

The generator must not reach the floor by repeating a thesis, splitting one
idea into cosmetic fragments, or adding claims absent from the transcript.
Sections can distinguish argument, evidence, example, exception, consequence,
or practical conclusion when these are separately grounded in the source.

## Compatibility and scope

Compact, Balanced, videos below 45 minutes, and videos at or above 90 minutes
retain their current policy. Existing stored summaries are not rewritten. The
change affects new generation and explicitly retried Summary artifacts only.

## Verification

Tests cover the 2,700-second lower boundary, the representative 2,883-second
video, and the 5,399-second upper boundary. They prove that 12- and 13-section
Deep results cannot pass, 14 and 18 pass when otherwise valid, and 19 fails.
Generator tests prove the bounded repair path and terminal retryable failure.
Full format, lint, type, unit/integration, build, and long-form browser fixture
gates remain required.
