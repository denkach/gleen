# Codex setup

## Local Codex

Launch Codex from the repository root so it receives the correct project context.

```bash
cd gleen
codex
```

First commands:

```text
/init
/status
```

This repository already contains an `AGENTS.md`. Preserve it and extend it deliberately rather than replacing it with generic instructions.

## First read-only prompt

```text
Study this repository, but do not modify anything yet.

Read:
- AGENTS.md
- docs/product.md
- docs/design-system.md
- docs/architecture.md
- docs/roadmap.md
- design/reference-v3/index.html

Then explain:
1. What Gleen is.
2. Which visual rules are non-negotiable.
3. Which architecture decisions are still open.
4. How you would split the first implementation milestone.
5. Which risks or contradictions you found.

Do not create files or install dependencies.
```

## GitHub and Codex Cloud

Recommended order:

1. initialize Git;
2. create a private GitHub repository;
3. push the baseline commit;
4. connect the repository to Codex Cloud;
5. create an environment;
6. validate a read-only cloud task;
7. connect Codex to Linear.

## UI implementation prompt

```text
Implement only the scope of the current Linear issue.

Read AGENTS.md and all linked design documentation.
Use design/reference-v3 as the approved visual reference.
Do not redesign the screen.
Match layout, typography, spacing, colors, and motion.
Verify desktop, tablet, mobile, keyboard navigation, and reduced motion.
Do not modify unrelated files.
```
