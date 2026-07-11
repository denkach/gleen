# GLE-002 Design Tokens and Core UI Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved Gleen token system and a reusable, accessible set of core React primitives without redesigning the approved references.

**Architecture:** Raw and semantic CSS custom properties in `globals.css` are the only visual source consumed by product-neutral components under `src/components/ui`. Complex keyboard and focus behavior is delegated to individually pinned Radix packages behind Gleen-owned wrapper APIs; a server-gated `/ui` route documents and verifies the system outside production.

**Tech Stack:** Next.js 16.2.10, React 19.2.7, TypeScript 5.9.3 strict mode, Tailwind CSS 4.3.2, Radix Dialog 1.1.19, Dropdown Menu 2.1.20, Tabs 1.1.17, Tooltip 1.2.12, Toast 1.2.19, Vitest 4.1.10, Testing Library 16.3.2, Playwright 1.61.1.

## Global Constraints

- Do not modify or reinterpret `design/reference-v3/` or `design/screenshots/`.
- Match `docs/design-system.md` and approved references; do not introduce a new visual direction.
- Keep the product dark-only; no light theme.
- Summary is amber, flashcards purple, timestamps cyan, and export lime.
- Spectral colors remain restrained accents, not large saturated surfaces.
- Do not add generic SaaS cards, gradient blobs, excessive glassmorphism, or hover-only behavior.
- All component styles consume shared semantic tokens; no one-off visual values without a documented approved-reference exception.
- Radix UI remains internal to Gleen wrappers; feature code must not import Radix directly.
- `/ui` is available only in development and non-production previews, has `noindex`, and returns 404 in production.
- Support desktop, 390 px mobile, keyboard navigation, visible focus, and `prefers-reduced-motion`.
- Do not implement the landing page, product feature screens, backend behavior, authentication, billing, YouTube processing, or Three.js.
- Explain every production dependency; add only the five individual Radix packages required by DEN-12.

---

## File Map

- `src/app/globals.css`: canonical raw tokens, semantic aliases, base focus/motion rules, and minimal preview layout utilities.
- `src/lib/cx.ts`: deterministic class-name joiner shared by primitives.
- `src/lib/cx.test.ts`: class helper contract.
- `src/styles/tokens.test.ts`: exact required CSS-token contract.
- `src/components/ui/button.tsx`: native Gleen button variants and loading state.
- `src/components/ui/input.tsx`: accessible labeled input composition.
- `src/components/ui/panel.tsx`: neutral structural surface.
- `src/components/ui/skeleton.tsx`: static/reduced-motion-safe loading shapes.
- `src/components/ui/static-primitives.test.tsx`: Button, Input, Panel, and Skeleton behavior.
- `src/components/ui/dialog.tsx`: Radix Dialog wrapper.
- `src/components/ui/tooltip.tsx`: Radix Tooltip wrapper and provider.
- `src/components/ui/overlay-primitives.test.tsx`: dialog and tooltip interaction tests.
- `src/components/ui/dropdown-menu.tsx`: Radix Dropdown Menu wrapper.
- `src/components/ui/tabs.tsx`: Radix Tabs wrapper with artifact accents.
- `src/components/ui/navigation-primitives.test.tsx`: dropdown and tabs keyboard behavior.
- `src/components/ui/toast.tsx`: Radix Toast provider, viewport, hook, variants, actions, and dismissal.
- `src/components/ui/toast.test.tsx`: announcement and dismissal behavior.
- `src/lib/ui-preview.ts`: server-side environment gate.
- `src/lib/ui-preview.test.ts`: production/preview/development gate contract.
- `src/app/ui/page.tsx`: server-gated noindex preview route.
- `src/app/ui/ui-preview.tsx`: interactive component gallery.
- `tests/e2e/ui-preview.spec.ts`: desktop, mobile, keyboard, focus, overflow, console, and reduced-motion checks.
- `playwright.production.config.ts`: production-server `/ui` 404 verification.
- `tests/e2e/ui-production.spec.ts`: production route gate check.
- `README.md`: component preview and dependency rationale.

### Task 1: Canonical tokens, class helper, and Radix dependencies

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/app/globals.css`
- Create: `src/lib/cx.ts`
- Create: `src/lib/cx.test.ts`
- Create: `src/styles/tokens.test.ts`

**Interfaces:**

- Produces: `cx(...values: Array<string | false | null | undefined>): string`.
- Produces CSS semantic names including `--color-background-deep`, `--color-surface-panel`, `--color-text-primary`, `--color-border-default`, `--color-artifact-summary`, `--radius-control`, `--shadow-panel`, `--motion-micro`, `--motion-interface`, and `--ease-prism`.

- [ ] **Step 1: Write the failing class-helper test**

Create `src/lib/cx.test.ts` asserting that `cx('button', false, undefined, 'button--primary', null)` returns `button button--primary`.

- [ ] **Step 2: Run RED for the missing helper**

Run: `npm test -- src/lib/cx.test.ts`

Expected: FAIL because `@/lib/cx` does not exist.

- [ ] **Step 3: Implement the minimal helper**

Create `src/lib/cx.ts` exporting `cx` as a filter(Boolean) plus join implementation with the exact signature in Interfaces.

- [ ] **Step 4: Run GREEN for the helper**

Run: `npm test -- src/lib/cx.test.ts`

Expected: 1 passing test.

- [ ] **Step 5: Write the failing token contract**

Create `src/styles/tokens.test.ts` using `readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')`. Assert exact presence of the approved background, surface, text, border, four artifact color, radius, shadow, motion-duration, and easing declarations from `docs/design-system.md`; also assert a `prefers-reduced-motion: reduce` rule exists and contains no `display: none`.

- [ ] **Step 6: Run token RED**

Run: `npm test -- src/styles/tokens.test.ts`

Expected: FAIL because the foundation CSS lacks the required token declarations.

- [ ] **Step 7: Implement canonical raw and semantic tokens**

Replace the two foundation variables in `globals.css` with the approved raw values from `docs/design-system.md`, semantic aliases, Tailwind `@theme inline` mappings, font stacks, spacing scale, the three approved radius bands, restrained panel shadow/glow tokens, exact motion timing bands, and exact prism easing. Preserve the existing neutral root placeholder layout. Add global box sizing, body minimum width/antialiasing, `:focus-visible`, and reduced-motion rules that stop decorative transitions without hiding content.

- [ ] **Step 8: Run token GREEN**

Run: `npm test -- src/styles/tokens.test.ts`

Expected: all token assertions pass.

- [ ] **Step 9: Add exact Radix dependencies**

Run:

```bash
npm install --save-exact @radix-ui/react-dialog@1.1.19 @radix-ui/react-dropdown-menu@2.1.20 @radix-ui/react-tabs@1.1.17 @radix-ui/react-tooltip@1.2.12 @radix-ui/react-toast@1.2.19
```

Expected: exit 0; `package.json` and lockfile contain exactly the five packages. Their production purpose is accessible focus, keyboard, overlay, positioning, and announcement behavior; Radix Themes is absent.

- [ ] **Step 10: Verify Task 1**

Run: `npm run format:check && npm run lint && npm run typecheck && npm test -- src/lib/cx.test.ts src/styles/tokens.test.ts`

Expected: all commands exit 0.

- [ ] **Step 11: Commit Task 1**

```bash
git add package.json package-lock.json src/app/globals.css src/lib/cx.ts src/lib/cx.test.ts src/styles/tokens.test.ts
git commit -m "feat: add DEN-12 design tokens"
```

### Task 2: Static primitives — Button, Input, Panel, Skeleton

**Files:**

- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/panel.tsx`
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/static-primitives.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**

- Produces: `ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>` with `variant?: 'primary' | 'ghost' | 'soft' | 'danger'`, `size?: 'sm' | 'default' | 'icon'`, `loading?: boolean`, and `loadingLabel?: string`.
- Produces: `InputProps extends InputHTMLAttributes<HTMLInputElement>` with required `label: string`, optional `hint`, `error`, and `leadingIcon: ReactNode`.
- Produces: `PanelProps extends HTMLAttributes<HTMLDivElement>` with `surface?: 'panel' | 'raised'` and `padding?: 'sm' | 'md' | 'lg'`.
- Produces: `SkeletonProps extends HTMLAttributes<HTMLDivElement>` with `shape?: 'rect' | 'text'` and optional `lines?: number` for text shape.

- [ ] **Step 1: Write failing static primitive tests**

Create tests that assert Button defaults to native `type="button"`, variants/sizes expose deterministic data attributes, disabled/loading is disabled and exposes the loading label, Input associates label/hint/error with `aria-describedby` and `aria-invalid`, Panel exposes surface/padding data attributes, and Skeleton is `aria-hidden="true"` and renders the requested number of text lines.

- [ ] **Step 2: Run RED**

Run: `npm test -- src/components/ui/static-primitives.test.tsx`

Expected: FAIL because the four modules do not exist.

- [ ] **Step 3: Implement Button and Input**

Use `forwardRef`, native prop spreading, `cx`, and constrained data attributes. Generate stable Input IDs with `useId`; join hint and error IDs without overwriting a caller-provided `aria-describedby`. Loading Button keeps its accessible name through `loadingLabel` and preserves visible child width without relying on motion.

- [ ] **Step 4: Implement Panel and Skeleton**

Panel remains a neutral `<div>` surface with no product semantics. Skeleton produces either one rectangular element or a wrapper with `lines` child spans, clamps invalid line counts to at least one, and remains `aria-hidden`.

- [ ] **Step 5: Add token-only component styles**

Add `.ui-button`, `.ui-input-field`, `.ui-panel`, and `.ui-skeleton` rules using only semantic custom properties. Implement approved radii, thin borders, restrained primary spectral hover edge, visible focus, disabled state, 44 px default touch target, static reduced-motion skeleton, and no large saturated artifact surfaces.

- [ ] **Step 6: Run GREEN and static verification**

Run: `npm test -- src/components/ui/static-primitives.test.tsx && npm run lint && npm run typecheck`

Expected: tests, lint, and typecheck pass.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/panel.tsx src/components/ui/skeleton.tsx src/components/ui/static-primitives.test.tsx src/app/globals.css
git commit -m "feat: add DEN-12 static UI primitives"
```

### Task 3: Overlay primitives — Dialog and Tooltip

**Files:**

- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/tooltip.tsx`
- Create: `src/components/ui/overlay-primitives.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**

- Produces Gleen exports `Dialog`, `DialogTrigger`, `DialogContent`, `DialogTitle`, `DialogDescription`, `DialogClose` wrapping the matching Radix parts.
- `DialogContent` requires `title: string`, accepts `description?: string`, `children: ReactNode`, and optional `initialFocusRef?: RefObject<HTMLElement | null>`.
- Produces `TooltipProvider`, `Tooltip`, `TooltipTrigger`, and `TooltipContent` with `TooltipContent` accepting `side?: 'top' | 'right' | 'bottom' | 'left'`.

- [ ] **Step 1: Write failing overlay interaction tests**

Test that opening Dialog moves focus inside, renders title/description, Escape closes it, and focus returns to the trigger. Test that Tooltip content appears when its trigger receives keyboard focus and the trigger retains its accessible name.

- [ ] **Step 2: Run RED**

Run: `npm test -- src/components/ui/overlay-primitives.test.tsx`

Expected: FAIL because dialog and tooltip wrappers do not exist.

- [ ] **Step 3: Implement Dialog wrapper**

Add `'use client'`; compose Radix Dialog behind Gleen exports. `DialogContent` renders portal, overlay, content, required visible title, optional description, and a labeled close button. Use `onOpenAutoFocus` to focus `initialFocusRef` when supplied while retaining Radix focus trap and return behavior.

- [ ] **Step 4: Implement Tooltip wrapper**

Add `'use client'`; keep Radix Provider defaults centralized with `delayDuration={350}` and `skipDelayDuration={150}`. Portal tooltip content with semantic styling hooks. The wrapper must not alter the trigger's accessible label.

- [ ] **Step 5: Add overlay styles**

Add token-only overlay, content, close, and tooltip rules. Dialog application motion uses the interface timing token and restrained opacity/translate; reduced motion removes translate and shortens duration. Use thin borders and dark surfaces, not glass-heavy panels.

- [ ] **Step 6: Run GREEN**

Run: `npm test -- src/components/ui/overlay-primitives.test.tsx && npm run lint && npm run typecheck`

Expected: all checks pass with dialog focus/Escape/return and tooltip focus tests green.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/components/ui/dialog.tsx src/components/ui/tooltip.tsx src/components/ui/overlay-primitives.test.tsx src/app/globals.css
git commit -m "feat: add DEN-12 overlay primitives"
```

### Task 4: Navigation primitives — Dropdown Menu and Tabs

**Files:**

- Create: `src/components/ui/dropdown-menu.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/navigation-primitives.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**

- Produces Gleen exports `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuLabel`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, and `DropdownMenuSeparator`.
- Produces `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent`; `TabsList` accepts `accent?: 'neutral' | 'summary' | 'flashcards' | 'timestamps' | 'export'`.

- [ ] **Step 1: Write failing navigation tests**

Test dropdown trigger opening, ArrowDown focus movement, Enter activation, disabled item protection, Escape closing, and trigger focus return. Test tabs ArrowRight/ArrowLeft activation, correct tab/tabpanel ARIA relationships, and all five accent values.

- [ ] **Step 2: Run RED**

Run: `npm test -- src/components/ui/navigation-primitives.test.tsx`

Expected: FAIL because the wrappers do not exist.

- [ ] **Step 3: Implement Dropdown Menu wrappers**

Use `'use client'`, `forwardRef`, portals, Radix state attributes, and Gleen class hooks. Preserve native Radix keyboard behavior. Checkbox items expose a visible text/check indicator so state is not color-only.

- [ ] **Step 4: Implement Tabs wrappers**

Use `'use client'`, `forwardRef`, automatic activation, horizontal orientation, scrollable `TabsList`, semantic accent data attribute, and Radix ARIA/state behavior. Content remains mounted only according to Radix defaults; do not hide it through animation setup.

- [ ] **Step 5: Add navigation styles**

Style dark menu surfaces, focus/disabled/checked states, active tab line, horizontal mobile overflow without page overflow, and restrained artifact accent aliases. Reduced motion removes animated indicator travel.

- [ ] **Step 6: Run GREEN**

Run: `npm test -- src/components/ui/navigation-primitives.test.tsx && npm run lint && npm run typecheck`

Expected: all checks pass.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/components/ui/dropdown-menu.tsx src/components/ui/tabs.tsx src/components/ui/navigation-primitives.test.tsx src/app/globals.css
git commit -m "feat: add DEN-12 navigation primitives"
```

### Task 5: Feedback primitive — Toast

**Files:**

- Create: `src/components/ui/toast.tsx`
- Create: `src/components/ui/toast.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**

- Produces `ToastProvider({ children }: { children: ReactNode })`.
- Produces `useToast(): { toast(input: { title: string; description?: string; variant?: 'neutral' | 'success' | 'error'; actionLabel?: string; onAction?: () => void; duration?: number }): void }`.
- Provider owns an ordered toast queue with stable IDs and renders the Radix viewport.

- [ ] **Step 1: Write failing toast tests**

Render a test consumer inside ToastProvider. Assert calling `toast()` renders title/description in an accessible live region, variant state is exposed, action invokes the callback, dismissal removes the toast, and the default duration is 5000 ms.

- [ ] **Step 2: Run RED**

Run: `npm test -- src/components/ui/toast.test.tsx`

Expected: FAIL because the toast module does not exist.

- [ ] **Step 3: Implement provider, queue, and hook**

Use `'use client'`, React context, an incrementing `useRef` ID, and immutable queue updates. Throw `useToast must be used within ToastProvider` outside the provider. Render Radix title, description, optional action with `altText`, close button, and viewport. Remove items through `onOpenChange(false)`.

- [ ] **Step 4: Add toast styles**

Use semantic neutral/success/error tokens, visible focus, restrained entry/exit movement, safe-area-aware viewport, readable action/dismiss targets, and static reduced-motion feedback. Success and error must include text/icon state rather than color alone.

- [ ] **Step 5: Run GREEN**

Run: `npm test -- src/components/ui/toast.test.tsx && npm run lint && npm run typecheck`

Expected: all checks pass.

- [ ] **Step 6: Commit Task 5**

```bash
git add src/components/ui/toast.tsx src/components/ui/toast.test.tsx src/app/globals.css
git commit -m "feat: add DEN-12 toast primitive"
```

### Task 6: Server-gated component preview route

**Files:**

- Create: `src/lib/ui-preview.ts`
- Create: `src/lib/ui-preview.test.ts`
- Create: `src/app/ui/page.tsx`
- Create: `src/app/ui/ui-preview.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**

- Produces `isUiPreviewEnabled(env: Pick<NodeJS.ProcessEnv, 'NODE_ENV' | 'VERCEL_ENV'>): boolean`.
- Gate semantics: explicit `VERCEL_ENV=production` is false; `preview` and `development` are true; without `VERCEL_ENV`, `NODE_ENV=production` is false and all other values are true.

- [ ] **Step 1: Write failing gate tests**

Create table-driven tests for Vercel production false, Vercel preview true even when NODE_ENV is production, Vercel development true, local NODE_ENV production false, and local development/test true.

- [ ] **Step 2: Run gate RED**

Run: `npm test -- src/lib/ui-preview.test.ts`

Expected: FAIL because `@/lib/ui-preview` does not exist.

- [ ] **Step 3: Implement the pure server gate**

Implement the exact precedence and return semantics in Interfaces without reading `window` or `NEXT_PUBLIC_*` variables.

- [ ] **Step 4: Run gate GREEN**

Run: `npm test -- src/lib/ui-preview.test.ts`

Expected: all five environment cases pass.

- [ ] **Step 5: Implement server route and metadata**

Create `src/app/ui/page.tsx` without `'use client'`. Export metadata with title `Gleen UI primitives` and `robots: { index: false, follow: false }`. Call `notFound()` when the gate is false; otherwise render `UiPreview` inside `TooltipProvider` and `ToastProvider` supplied by a small client composition in `ui-preview.tsx`.

- [ ] **Step 6: Build the product-neutral gallery**

Render labeled sections for tokens, every static variant/state, dialog, dropdown including disabled/checkbox items, all five tab accents, focus tooltip, toast variants, and skeletons. Add stable `data-testid` hooks only where Playwright cannot use role/name. Include a visible environment-only heading and reduced-motion match indicator. Do not compose a landing page or product screen.

- [ ] **Step 7: Add preview-only layout styles**

Use a restrained responsive grid, semantic tokens, max-width container, and mobile single-column fallback. The gallery must avoid generic three-card SaaS composition and horizontal page scrolling.

- [ ] **Step 8: Verify Task 6**

Run: `npm test -- src/lib/ui-preview.test.ts && npm run lint && npm run typecheck && NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 npm run build`

Expected: tests/static checks/build pass; production build emits `/ui` but runtime gate returns not-found.

- [ ] **Step 9: Commit Task 6**

```bash
git add src/lib/ui-preview.ts src/lib/ui-preview.test.ts src/app/ui/page.tsx src/app/ui/ui-preview.tsx src/app/globals.css
git commit -m "feat: add DEN-12 UI preview route"
```

### Task 7: Browser coverage and production route gate

**Files:**

- Create: `tests/e2e/ui-preview.spec.ts`
- Create: `tests/e2e/ui-production.spec.ts`
- Create: `playwright.production.config.ts`
- Modify: `package.json`

**Interfaces:**

- Produces npm script `test:e2e:production` running `playwright test --config=playwright.production.config.ts`.
- Development Playwright continues to use existing `playwright.config.ts` and `/ui` is enabled through its development server.
- Production config builds then starts Next on `127.0.0.1:3100` with `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3100`, base URL matching port 3100, and one Chromium project.

- [ ] **Step 1: Write the development browser tests**

Add tests for HTTP 200/noindex, no console/page errors, no horizontal overflow at 1440×900 and 390×844, visible focus on keyboard Tab, dialog focus containment/Escape/return, dropdown ArrowDown/Enter/Escape, tabs ArrowRight, tooltip on focus, toast show/action/dismiss, and reduced-motion media-query match with usable visible content.

- [ ] **Step 2: Run development browser RED**

Run: `npm run test:e2e -- tests/e2e/ui-preview.spec.ts`

Expected: at least one assertion fails until missing preview interaction hooks or behavior are corrected; if every assertion passes immediately, add a test for an unverified acceptance behavior rather than accepting a non-proving RED.

- [ ] **Step 3: Make minimal preview/testability corrections**

Change only accessible names or stable test hooks required by failing tests. Do not alter visual direction or weaken assertions.

- [ ] **Step 4: Run development browser GREEN**

Run: `npm run test:e2e -- tests/e2e/ui-preview.spec.ts`

Expected: all development preview tests pass in Chromium.

- [ ] **Step 5: Add production 404 test and config**

Create `ui-production.spec.ts` asserting `page.goto('/ui')` returns HTTP 404 and the preview heading is absent. Configure a production build/start web server on port 3100 and the new npm script. Do not set `VERCEL_ENV`, so local `NODE_ENV=production` disables the route.

- [ ] **Step 6: Run production gate verification**

Run: `npm run test:e2e:production`

Expected: 1 passing production 404 test.

- [ ] **Step 7: Run all browser checks**

Run: `npm run test:e2e && npm run test:e2e:production`

Expected: existing home smoke test, UI preview tests, and production 404 test all pass.

- [ ] **Step 8: Commit Task 7**

```bash
git add tests/e2e/ui-preview.spec.ts tests/e2e/ui-production.spec.ts playwright.production.config.ts package.json src/app/ui/ui-preview.tsx
git commit -m "test: cover DEN-12 UI primitives in browser"
```

### Task 8: Documentation and full verification

**Files:**

- Modify: `README.md`
- Verify all DEN-12 files.

**Interfaces:**

- Documents `/ui`, environment availability, keyboard/reduced-motion QA, and why the five Radix packages exist.

- [ ] **Step 1: Document the preview and dependency boundary**

Add a `UI primitives preview` section documenting development URL `http://localhost:3000/ui`, production 404 behavior, `npm run test:e2e:production`, keyboard/reduced-motion expectations, and that Radix supplies behavior only while Gleen owns public APIs and visuals. List the five packages and their accessibility purpose.

- [ ] **Step 2: Verify documentation commands**

Run a Node assertion that README contains `/ui`, `npm run test:e2e`, `npm run test:e2e:production`, `Radix`, `development`, `preview`, and `production`.

Expected: assertion prints `DEN-12 README verified`.

- [ ] **Step 3: Run formatting and static checks**

Run: `npm run format && npm run format:check && npm run lint && npm run typecheck`

Expected: all exit 0 with no lint warnings or type errors.

- [ ] **Step 4: Run unit and browser suites**

Run: `npm test && npm run test:e2e && npm run test:e2e:production`

Expected: every unit and Chromium test passes.

- [ ] **Step 5: Run production build**

Run: `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 npm run build`

Expected: production build exits 0.

- [ ] **Step 6: Perform real browser QA**

Start the development server and verify `/ui` at 1440×900 and 390×844 with normal and reduced motion. Capture screenshots outside tracked source, inspect focus visibility, keyboard flows, overflow, console errors, error overlays, long labels, disabled/loading states, and touch-target sizing. Compare primitives directly with the approved reference patterns; do not redesign them.

- [ ] **Step 7: Confirm design preservation and dependency scope**

Run:

```bash
git diff main...HEAD -- design/reference-v3 design/screenshots
npm ls --depth=0
git diff --check
git status --short
```

Expected: no approved design diff, only five new direct Radix production dependencies, no whitespace errors, and clean status after removing generated artifacts.

- [ ] **Step 8: Commit documentation**

```bash
git add README.md
git commit -m "docs: document DEN-12 UI primitives"
```

- [ ] **Step 9: Prepare handoff**

Summarize exact token groups, component APIs, dependencies and reasons, unit/E2E counts, desktop/mobile/reduced-motion browser evidence, changed files, and remaining risks. Do not mark DEN-12 Done until remote CI passes and the approved design directories remain unchanged.
