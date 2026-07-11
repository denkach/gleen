# GLE-001 Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a reproducible Next.js frontend foundation that satisfies every DEN-11 acceptance criterion without implementing product UI or changing approved design assets.

**Architecture:** A single npm-managed Next.js App Router application lives in the repository root with application code under `src/app`. Configuration is explicit and minimal; environment validation is isolated in `src/env.ts`, and unit and browser smoke tests verify the neutral root route.

**Tech Stack:** Node.js 22, npm, Next.js 16.2.10, React 19.2.7, TypeScript 7.0.2 in strict mode, Tailwind CSS 4.3.2, ESLint 10.7.0, Prettier 3.9.5, Vitest 4.1.10, Testing Library, Playwright 1.61.1, GitHub Actions.

## Global Constraints

- Do not modify `design/reference-v3/` or `design/screenshots/`.
- Do not redesign or partially implement the approved landing page.
- Use npm and commit `package-lock.json`.
- Keep Tailwind tokens minimal; full design-system work belongs to DEN-12.
- Do not add authentication, database, billing, YouTube processing, AI, integrations, or Three.js.
- Keep `NEXT_PUBLIC_APP_URL` as the only required environment variable.
- Use TypeScript strict mode.
- Run formatting, linting, type checking, unit tests, Playwright, production build, and browser verification before completion.

---

## File Map

- `package.json`: pinned runtime and development dependencies plus all required npm scripts.
- `package-lock.json`: reproducible npm dependency graph.
- `next.config.ts`: validates environment configuration before Next.js starts or builds.
- `tsconfig.json`: strict compiler and Next.js path-alias configuration.
- `next-env.d.ts`: Next.js TypeScript declarations.
- `postcss.config.mjs`: Tailwind CSS v4 PostCSS integration.
- `eslint.config.mjs`: Next.js flat ESLint configuration.
- `.prettierrc.json`: repository formatting policy.
- `.prettierignore`: generated and approved-reference exclusions.
- `src/env.ts`: pure environment validation boundary.
- `src/env.test.ts`: environment validation behavior.
- `src/app/layout.tsx`: minimal root HTML layout.
- `src/app/page.tsx`: neutral foundation placeholder.
- `src/app/globals.css`: minimal dark base and CSS-variable/Tailwind setup.
- `src/app/page.test.tsx`: unit rendering smoke test.
- `vitest.config.ts`: jsdom and test setup configuration.
- `vitest.setup.ts`: Testing Library DOM matchers and cleanup.
- `playwright.config.ts`: Chromium project and local web server.
- `tests/e2e/home.spec.ts`: home-route browser smoke test.
- `.github/workflows/ci.yml`: CI verification pipeline.
- `README.md`: local setup, scripts, and verification instructions.

### Task 1: Package and compiler foundation

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

**Interfaces:**
- Consumes: Node.js `>=20.9.0` and npm.
- Produces: npm scripts `dev`, `build`, `start`, `format`, `format:check`, `lint`, `typecheck`, `test`, `test:watch`, and `test:e2e`.

- [ ] **Step 1: Create the package manifest with pinned direct dependencies**

Use `package.json` with `private: true` and `engines.node: ">=20.9.0"`. Pin runtime dependencies to `next@16.2.10`, `react@19.2.7`, and `react-dom@19.2.7`. Pin development dependencies to `typescript@7.0.2`, `@types/node@26.1.1`, `@types/react@19.2.17`, `@types/react-dom@19.2.3`, `tailwindcss@4.3.2`, `@tailwindcss/postcss@4.3.2`, `eslint@10.7.0`, `eslint-config-next@16.2.10`, `prettier@3.9.5`, `vitest@4.1.10`, `jsdom@29.1.1`, `@testing-library/react@16.3.2`, `@testing-library/jest-dom@6.9.1`, and `@playwright/test@1.61.1`. Define the scripts listed in the Interfaces block.

- [ ] **Step 2: Install the declared dependencies**

Run: `npm install`

Expected: exit 0 and a new `package-lock.json` using lockfile version 3.

- [ ] **Step 3: Add strict compiler and tool configuration**

Set `tsconfig.json` to `strict: true`, `noEmit: true`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, Next.js plugin support, and alias `@/*` to `./src/*`. Add the standard generated `next-env.d.ts`. Configure Tailwind through `@tailwindcss/postcss`. Configure ESLint with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` flat presets. Configure Prettier for two spaces, semicolons, single quotes, trailing commas, and LF endings. Configure Vitest for jsdom, globals, `vitest.setup.ts`, CSS support, and alias `@` to `src`; in setup, import `@testing-library/jest-dom/vitest` and run Testing Library cleanup after each test.

- [ ] **Step 4: Protect generated and approved-reference files from formatting**

Add `.prettierignore` entries for `.next`, `node_modules`, coverage and Playwright output, `design/reference-v3/**`, `design/screenshots/**`, and `package-lock.json`.

- [ ] **Step 5: Verify the configuration files parse**

Run: `npm exec prettier -- --check package.json tsconfig.json .prettierrc.json`

Expected: exit 0 with all three files reported as formatted.

- [ ] **Step 6: Commit the package and compiler foundation**

```bash
git add package.json package-lock.json tsconfig.json next-env.d.ts postcss.config.mjs eslint.config.mjs .prettierrc.json .prettierignore vitest.config.ts vitest.setup.ts
git commit -m "chore: initialize DEN-11 frontend tooling"
```

### Task 2: Environment validation

**Files:**
- Create: `src/env.test.ts`
- Create: `src/env.ts`
- Create: `next.config.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `NodeJS.ProcessEnv`.
- Produces: `validatePublicEnv(input: NodeJS.ProcessEnv): Readonly<{ NEXT_PUBLIC_APP_URL: string }>`.

- [ ] **Step 1: Write failing environment tests**

Create `src/env.test.ts` with three tests: a valid absolute `http://localhost:3000` URL is returned unchanged; a missing value throws `NEXT_PUBLIC_APP_URL is required`; and a relative or non-HTTP URL throws `NEXT_PUBLIC_APP_URL must be an absolute HTTP(S) URL`.

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- src/env.test.ts`

Expected: FAIL because `@/env` does not exist.

- [ ] **Step 3: Implement the minimal validator**

Create `src/env.ts`. Read and trim `input.NEXT_PUBLIC_APP_URL`, throw the required missing-value message, parse with `new URL`, allow only `http:` and `https:`, and return `Object.freeze({ NEXT_PUBLIC_APP_URL: value })`. Convert URL parsing failures to the required actionable validation message.

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `npm test -- src/env.test.ts`

Expected: 3 passing tests and exit 0.

- [ ] **Step 5: Connect validation to Next.js startup**

Create `next.config.ts`, call `validatePublicEnv(process.env)` at module evaluation, and export an empty typed `NextConfig`. Keep `.env.example` limited to `NEXT_PUBLIC_APP_URL=http://localhost:3000` plus its existing secret-safety comment.

- [ ] **Step 6: Verify missing configuration fails early**

Run: `env -u NEXT_PUBLIC_APP_URL npm run build`

Expected: non-zero exit with `NEXT_PUBLIC_APP_URL is required`. This failure is intentional.

- [ ] **Step 7: Commit environment validation**

```bash
git add src/env.ts src/env.test.ts next.config.ts .env.example
git commit -m "feat: validate DEN-11 public environment"
```

### Task 3: Neutral App Router route

**Files:**
- Create: `src/app/page.test.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Delete: `src/.gitkeep`

**Interfaces:**
- Consumes: Next.js App Router and global CSS.
- Produces: default `HomePage()` and `RootLayout({ children }: Readonly<{ children: React.ReactNode }>)`.

- [ ] **Step 1: Write the failing route smoke test**

Create `src/app/page.test.tsx`, render `HomePage`, and assert that a level-one heading named `Gleen frontend foundation` is visible.

- [ ] **Step 2: Run the route test and verify RED**

Run: `npm test -- src/app/page.test.tsx`

Expected: FAIL because `src/app/page.tsx` does not exist.

- [ ] **Step 3: Implement the minimal root route and layout**

Create a semantic page containing one `<main>`, the required `<h1>`, and a short sentence stating that product implementation begins in later issues. Create the root layout with English metadata title `Gleen` and description `Watch less. Understand more.`. Do not reproduce the landing-page composition or prism artwork.

- [ ] **Step 4: Add minimal global styling and Tailwind import**

In `globals.css`, import Tailwind, declare only `--background: #0a0a0f` and `--foreground: #f4f2ff`, map them through `@theme inline`, and add minimal body, main, heading, and paragraph rules required for a readable centered placeholder. Do not add artifact tokens or marketing motion.

- [ ] **Step 5: Run the route test and verify GREEN**

Run: `npm test -- src/app/page.test.tsx`

Expected: 1 passing test and exit 0.

- [ ] **Step 6: Verify type checking and linting**

Run: `NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run typecheck && NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run lint`

Expected: both commands exit 0 without warnings.

- [ ] **Step 7: Commit the root route**

```bash
git add src/app src/.gitkeep
git commit -m "feat: add DEN-11 application shell"
```

### Task 4: Playwright browser smoke test

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `npm run dev`, `NEXT_PUBLIC_APP_URL`, and the root route.
- Produces: Chromium smoke-test project with base URL `http://127.0.0.1:3000`.

- [ ] **Step 1: Write the browser smoke test**

Create `tests/e2e/home.spec.ts` that opens `/`, asserts a successful document response, checks the page title `Gleen`, and verifies the level-one heading `Gleen frontend foundation`.

- [ ] **Step 2: Run Playwright and verify the infrastructure failure**

Run: `npm run test:e2e`

Expected: FAIL before browser installation with Playwright's missing browser executable message. If Chromium is already cached, temporarily set `PLAYWRIGHT_BROWSERS_PATH` to an empty temporary directory to verify this expected failure.

- [ ] **Step 3: Configure Playwright and install Chromium**

Configure one Chromium project, `testDir: './tests/e2e'`, retries only in CI, trace on first retry, and a web server command `npm run dev -- --hostname 127.0.0.1` with `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000`. Run: `npx playwright install chromium`.

- [ ] **Step 4: Run the smoke test and verify GREEN**

Run: `npm run test:e2e`

Expected: 1 passing test and exit 0.

- [ ] **Step 5: Commit browser testing**

```bash
git add playwright.config.ts tests/e2e/home.spec.ts
git commit -m "test: add DEN-11 browser smoke coverage"
```

### Task 5: Continuous integration

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: committed npm scripts and lockfile.
- Produces: CI checks on pushes to `main` and pull requests.

- [ ] **Step 1: Add the GitHub Actions workflow**

Use `actions/checkout@v4` and `actions/setup-node@v4` with Node 22 and npm caching. Set `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000` at job scope. Run `npm ci`, formatting, lint, typecheck, unit tests, production build, `npx playwright install --with-deps chromium`, and Playwright tests in that order. Set least privilege `contents: read` and a 20-minute timeout.

- [ ] **Step 2: Validate workflow syntax locally**

Run: `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/ci.yml'); puts 'valid yaml'"`

Expected: `valid yaml` and exit 0.

- [ ] **Step 3: Verify every CI script exists**

Run: `node -e "const s=require('./package.json').scripts; for (const n of ['format:check','lint','typecheck','test','build','test:e2e']) if (!s[n]) throw new Error(n); console.log('all scripts present')"`

Expected: `all scripts present` and exit 0.

- [ ] **Step 4: Commit CI**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: verify DEN-11 frontend foundation"
```

### Task 6: Developer documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: npm scripts and environment contract.
- Produces: reproducible setup and verification instructions.

- [ ] **Step 1: Update repository status and setup instructions**

Replace the statement that no application exists with an accurate foundation status. Document prerequisites, `npm install`, copying `.env.example` to `.env.local`, `npm run dev`, the local app URL, every verification script, Playwright Chromium installation, and the separate static design-reference preview command. State explicitly that approved design assets are not implementation scratch files.

- [ ] **Step 2: Verify documented commands match package scripts**

Run: `node -e "const fs=require('fs');const p=require('./package.json').scripts;const r=fs.readFileSync('README.md','utf8');for(const n of ['dev','build','format:check','lint','typecheck','test','test:e2e'])if(!r.includes('npm run '+n))throw new Error(n);console.log('README scripts verified')"`

Expected: `README scripts verified` and exit 0.

- [ ] **Step 3: Commit documentation**

```bash
git add README.md
git commit -m "docs: document DEN-11 frontend workflow"
```

### Task 7: Full verification and browser QA

**Files:**
- Verify only; modify files only when a failing check identifies an in-scope defect.

**Interfaces:**
- Consumes: all DEN-11 deliverables.
- Produces: fresh evidence for every acceptance criterion.

- [ ] **Step 1: Run formatting and static checks**

Run: `npm run format && npm run format:check && NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 npm run lint && NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 npm run typecheck`

Expected: exit 0 for every command, no lint warnings, and no TypeScript errors.

- [ ] **Step 2: Run unit and browser tests**

Run: `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 npm test && npm run test:e2e`

Expected: all unit tests pass and the Chromium smoke test passes.

- [ ] **Step 3: Run the production build**

Run: `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 npm run build`

Expected: exit 0 and a successfully generated `/` route.

- [ ] **Step 4: Verify the development server**

Run: `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 npm run dev -- --hostname 127.0.0.1`

Expected: Next.js reports ready and `curl -I http://127.0.0.1:3000/` returns HTTP 200.

- [ ] **Step 5: Perform browser QA**

Open `/` at 1440×900 and 390×844. Confirm the heading and explanatory copy are readable with no horizontal overflow or console errors. Enable reduced motion and confirm content remains present and usable. This is a foundation placeholder, so compare only functionality and responsiveness; do not compare it as a redesign of approved landing visuals.

- [ ] **Step 6: Confirm approved design assets are unchanged**

Run: `git diff main...HEAD -- design/reference-v3 design/screenshots`

Expected: no output.

- [ ] **Step 7: Review the final change set**

Run: `git status --short && git diff --check && git log --oneline main..HEAD`

Expected: clean status, no whitespace errors, and focused DEN-11 commits only.

- [ ] **Step 8: Prepare handoff**

Summarize changed files, exact verification results, browser viewport checks, reduced-motion behavior, dependencies and their reasons, and remaining risks. Do not mark DEN-11 complete until CI, browser verification, and production build all pass.
