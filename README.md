# Gleen

Gleen is an AI platform that transforms a YouTube video into reusable knowledge artifacts:

- structured summary;
- interactive flashcards;
- clickable timestamps;
- transcript;
- exports to Obsidian, Notion, and NotebookLM.

## Repository status

This archive is a project foundation and context package. It intentionally contains no application implementation yet.

## Start here

1. Read `AGENTS.md`.
2. Read `docs/product.md`.
3. Read `docs/design-system.md`.
4. Review the approved visual prototype in `design/reference-v3/index.html`.
5. Create a private GitHub repository.
6. Initialize Git and make the baseline commit.
7. Launch Codex from the repository root.
8. Start with `linear/templates/GLE-001-repository-foundation.md`.

## Local design preview

From the repository root:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/design/reference-v3/
```

## Recommended workflow

```text
ChatGPT: product, UX, visual design, design review
Linear: planning and issue tracking
Codex: implementation, tests, debugging, pull requests
GitHub: source control, CI, reviews, releases
```
