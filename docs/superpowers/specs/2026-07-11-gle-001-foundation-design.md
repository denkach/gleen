# GLE-001 Frontend Foundation Design

## Purpose

Establish a production-ready, reproducible frontend foundation for Gleen without implementing product features or reinterpreting the approved design.

## Scope

- Initialize one Next.js application in the repository root using the App Router.
- Use npm and commit `package-lock.json`.
- Enable strict TypeScript.
- Configure Tailwind CSS with a minimal CSS-variable foundation.
- Configure ESLint and Prettier.
- Validate `NEXT_PUBLIC_APP_URL` at startup and build time.
- Add a Vitest and Testing Library unit-test foundation.
- Add a Playwright browser smoke-test foundation.
- Add GitHub Actions checks for formatting, linting, type checking, unit tests, browser smoke testing, and the production build.
- Document local setup and verification commands in the root README.

## Explicitly Out of Scope

- Production landing-page implementation.
- Authentication, database, billing, YouTube processing, AI generation, and integrations.
- Three.js or production prism work.
- Product-specific UI components beyond a neutral home-route placeholder.
- Any change to `design/reference-v3/` or `design/screenshots/`.
- Full design-token and component work assigned to DEN-12.

## Architecture

The repository will contain a single Next.js App Router application rooted at `src/app`. Configuration remains at the repository root. This avoids premature workspace or backend structure while preserving a clear path to add server and worker boundaries in later issues.

The root route will be a semantic, neutral placeholder whose only purpose is to prove that the application renders. It will not copy, redesign, or partially implement the approved landing page.

## Tooling

- Package manager: npm.
- Framework: Next.js App Router and React.
- Language: TypeScript with `strict: true`.
- Styling: Tailwind CSS and CSS custom properties.
- Unit tests: Vitest, jsdom, and Testing Library.
- Browser tests: Playwright with Chromium.
- Static checks: ESLint, TypeScript, and Prettier.
- CI: GitHub Actions on pull requests and pushes to `main`.

Dependency versions will be selected as a mutually compatible set during implementation and locked by `package-lock.json`. No production dependency will be added without a scope-specific reason.

## Environment Contract

`NEXT_PUBLIC_APP_URL` is the only required application variable in this issue. `.env.example` documents its local value. Environment validation must fail with a clear message when the variable is absent or is not an absolute HTTP(S) URL. No secrets or provider variables are introduced.

## Testing and Verification

The unit smoke test renders the root page and asserts its primary heading. The Playwright smoke test starts the production-like application through the configured web server and verifies that `/` loads successfully and exposes the expected heading.

The delivery checks are:

1. Formatting check.
2. ESLint.
3. Type checking.
4. Unit tests.
5. Playwright smoke test.
6. Production build.
7. Manual browser verification at desktop and mobile viewport widths.

The placeholder contains no motion. Reduced-motion verification therefore confirms that the route remains unchanged and usable when the preference is enabled.

## Error Handling

Configuration errors must fail early with actionable messages. Test and CI commands must return non-zero exit codes on failure. The placeholder route does not introduce runtime data fetching or user-facing failure states.

## Constraints and Risks

- Existing documentation and approved design assets must remain untouched except for the root README setup instructions explicitly required by DEN-11.
- Tailwind configuration must stay minimal so DEN-12 can establish the complete token system without migration work.
- Browser tests require a Playwright browser binary; setup and CI must install Chromium explicitly.
- Environment validation must work consistently in development, tests, and production builds without exposing server-only secrets.

## Acceptance Mapping

- Development server: npm script and documented local setup.
- Production build: dedicated npm script and CI step.
- Lint and type checking: separate npm scripts and CI steps.
- Unit tests: Vitest smoke test.
- Browser verification: Playwright home-route smoke test.
- Environment documentation: maintained `.env.example` and README instructions.
- Secret safety: no real credentials or new secret variables.
- Design preservation: no modifications under the approved design directories.
