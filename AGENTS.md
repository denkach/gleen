# Gleen repository instructions

## Product

Gleen transforms a YouTube video into reusable knowledge artifacts:

- structured summary;
- flashcards;
- timestamps;
- transcript;
- exports to Obsidian, Notion, and NotebookLM.

The sources of truth are:

- `docs/product.md`
- `docs/design-system.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- the current Linear issue

The approved visual references are located in:

- `design/reference-v3/`
- `design/screenshots/`

## Design rules

- Preserve the dark-only “The Prism” design language.
- Do not reinterpret approved screens without explicit instruction.
- Use shared design tokens instead of one-off colors or values.
- Summary uses amber.
- Flashcards use purple.
- Timestamps use cyan.
- Export uses lime.
- Spectral accents must remain restrained.
- Do not create generic SaaS cards, large gradient blobs, or excessive glassmorphism.
- All UI changes must support desktop, tablet, mobile, keyboard navigation, and `prefers-reduced-motion`.
- Marketing motion may be expressive.
- Application motion must remain restrained and functional.
- For implementation tasks based on approved visuals, do not redesign. Match the reference.

## Engineering rules

- Use TypeScript in strict mode.
- Use Next.js App Router and React.
- Use Tailwind CSS with CSS variables for design tokens.
- Keep server-only secrets outside client components.
- Never commit `.env` files or credentials.
- Do not add a production dependency without explaining why it is needed.
- Prefer small, focused modules and components.
- Do not modify unrelated files.
- Do not silently change product behavior.
- Do not hard-code plans, prices, usage limits, languages, or currencies into visual components.
- Keep generated content, billing, authentication, and processing concerns separated.

## Working process

Before implementation:

1. Read the relevant Linear issue.
2. Read all referenced documentation and design files.
3. Inspect the affected code before proposing changes.
4. State the implementation plan.
5. Identify assumptions, dependencies, and risks.
6. Keep work within the issue scope.

After implementation:

1. Run formatting.
2. Run linting.
3. Run type checking.
4. Run unit and integration tests.
5. Run the production build.
6. Verify the affected flow in a browser.
7. Check desktop and mobile layouts.
8. Check reduced-motion behavior.
9. Summarize changed files, tests, and remaining risks.

## Git and Linear

- One Linear issue should normally correspond to one focused branch and pull request.
- Include the Linear issue ID in the branch or PR title.
- Do not combine unrelated issues into one PR.
- Do not mark work complete until tests and browser verification pass.
- Use Conventional Commits where practical.
