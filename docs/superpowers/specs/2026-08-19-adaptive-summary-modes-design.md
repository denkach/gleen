# DEN-118 Adaptive Summary Modes Design

## Purpose

Gleen will replace the current `balanced` / `detailed` summary choice with three adaptive modes: Compact, Balanced, and Deep. Every mode must preserve important claims and caveats. The modes control compression and explanatory depth, not whether the system is allowed to omit high-importance ideas.

The same change removes repeated Summary paragraphs. New generations must keep a short section thesis distinct from its explanation, while legacy results with identical fields render without duplicate prose.

## Scope

- Store a default summary mode in account preferences.
- Allow a per-analysis override in New Analysis.
- Carry the selected mode through intake persistence, history, duplicate detection, processing, and presentation.
- Adapt generation strategy to transcript complexity.
- Prevent exact and near-duplicate section prose.
- Preserve old analyses and map the existing `detailed` value to Deep.
- Localize labels and descriptions for Ukrainian, Russian, English, Spanish, and German.

The work does not change billing limits, supported languages, transcript acquisition, flashcard generation, or the visual structure of the result workspace beyond removing repeated prose.

## User experience

### Modes

| Mode | User promise | Composition behavior |
| --- | --- | --- |
| Compact | The shortest useful version without losing the main conclusions or material caveats. | Concise outcome, compressed sections, examples included only when needed to understand a conclusion. |
| Balanced | A complete everyday summary. This is the default. | Conclusions, arguments, important context, representative examples, and caveats. |
| Deep | A thorough study-ready explanation. | Full argument structure, causal links, significant examples, exceptions, and practical implications. |

The interface will describe depth rather than promise a fixed word count. A long information-dense video may produce a longer Compact summary than a short sparse video produces in Deep mode.

### Selection and persistence

- Preferences owns the account default.
- New Analysis initializes from that default and permits an override.
- The submitted value is frozen into the intake configuration.
- Reopening an analysis shows the mode used for that analysis.
- Reanalyzing may select a different mode.
- The selected mode remains part of the duplicate fingerprint.

## Canonical data model

The canonical application type becomes:

```ts
type SummaryMode = 'compact' | 'balanced' | 'deep';
```

A forward migration will update the profile and analysis-intake constraints. Existing `detailed` rows will be migrated to `deep`; existing `balanced` rows remain unchanged. Repository read boundaries will temporarily accept `detailed` and normalize it to `deep`, so deployments remain safe while application and database versions overlap.

The migration must preserve existing duplicate behavior. Historical intakes retain their identity, while a compatibility function treats legacy `detailed` as the semantic Deep mode when comparing or reusing analyses. New fingerprints use only canonical values.

## Adaptive generation architecture

### Transcript signals

Before summary generation, a deterministic classifier derives non-content telemetry from the normalized transcript:

- video duration;
- transcript word and segment counts;
- segment density over time;
- number of detected topic boundaries already available from transcript enrichment;
- requested mode.

The classifier does not call a model and does not log transcript text. Its thresholds live in a focused policy module and are covered by table-driven tests.

### One-pass route

Short or low-complexity transcripts use the current structured generation path with a mode-specific contract. The prompt states:

- required coverage priorities;
- section-count range as guidance rather than a rigid quota;
- the distinction between `summary` and `details`;
- grounding and source-offset requirements;
- that important caveats must survive compression.

### Two-pass route

Long or information-dense transcripts, and Deep requests above the policy threshold, use two structured calls:

1. **Idea map:** extract grounded candidate ideas with importance, topic, supporting offsets, caveats, and relationships.
2. **Composition:** build the requested summary from the idea map and transcript evidence.

Every high-importance idea must be represented by the outcome or a section. Medium-importance ideas are selected according to the requested mode. The composer receives explicit coverage identifiers so coverage can be checked without fuzzy comparison of free text.

If the idea-map call fails with a retryable provider error, normal workflow retry policy applies. The pipeline does not silently downgrade a Deep request to a cheaper mode. A final failure remains an honest partial-result or artifact-failure state.

### Quality validation

After composition, a deterministic validator checks:

- schema validity;
- grounded quotes and offsets using the existing rules;
- presence of all required high-importance idea identifiers on the two-pass route;
- normalized equality or high token overlap between a section thesis and details;
- repeated adjacent sections;
- mode-aware structural bounds.

Exact duplicate detail text is rejected for new generations. Near-duplicate text receives one bounded repair generation using the original evidence and validation findings. If repair fails, the artifact follows the existing retry/failure policy rather than publishing knowingly repetitive content.

Provider metadata for each pass records model, request ID, token usage, latency, route, and repair count. Logs and analytics must not contain transcript or generated text.

## Presentation compatibility

V3 summaries render the thesis in the disclosure header and the explanation inside the expanded body. When normalized thesis and explanation are equal or substantially identical, the body omits the repeated explanation but retains quote, timestamp, edit, and copy actions.

Legacy V1 and V2 summaries currently populate title, summary, and details from one key point. The compatibility presentation will show that key point once. Saving a legacy result must not fabricate distinct prose or corrupt the original schema.

Editing remains backward compatible. For V3, thesis and details remain separate data. For legacy schemas, existing serialization behavior remains until a separately approved content migration exists.

## Localization

All five locales receive:

- Compact, Balanced, and Deep labels;
- short native-language descriptions of the modes;
- history/readiness labels;
- validation and generation failure copy where exposed.

Internal mode values remain locale-neutral. No provider prompt relies on translated UI labels.

## Error handling and observability

- Invalid stored values fall back through the compatibility parser, not the UI.
- Provider failures use existing safe error codes and retry semantics.
- Coverage and duplicate validation failures are observable as structured codes.
- Two-pass and repair usage is visible in server-only metadata for cost and latency review.
- Users never see provider diagnostics, prompt text, or raw exceptions.

## Testing

### Unit and integration

- Parse canonical and legacy mode values.
- Migrate database constraints and `detailed` rows safely.
- Preserve duplicate identity across compatibility mapping.
- Verify deterministic adaptive-route thresholds.
- Verify mode-specific prompt contracts.
- Require high-importance coverage on two-pass generation.
- Reject exact and near-duplicate thesis/details.
- Preserve grounding validation and safe provider metadata.
- Render legacy repeated content once.
- Verify all five locale catalogs have identical keys.

### Browser

- Change the account default and see it initialize New Analysis.
- Override the mode for one analysis without changing the account default.
- Submit each mode and reopen it from History.
- Verify repeated legacy text appears once on desktop and mobile.
- Verify keyboard, reduced-motion, and localized layouts.

### Completion gates

Formatting, linting, strict type checking, full unit/integration tests, database contract tests, production build, and affected browser flows must pass. Browser verification includes desktop and mobile and confirms no horizontal overflow.

## Rollout and risks

The database migration is additive-first: broaden accepted values, migrate old data, deploy tolerant readers, then stop emitting `detailed`. Rollback must continue reading canonical rows; therefore the preceding application version cannot be restored after the constraint migration unless it includes the tolerant parser.

Two-pass generation increases latency and provider cost. Adaptive routing, per-pass metadata, and one bounded repair prevent uncontrolled call multiplication. Thresholds are server-owned configuration and can be tuned without changing the user-facing meaning of the modes.

The claim that important information is preserved is implemented as coverage of the extracted idea map, not as an unverifiable promise that a model captured every fact in a transcript.
