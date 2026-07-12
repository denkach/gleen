# GLE-005 Authenticated Application Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the responsive authenticated `/app` shell and truthful New analysis home from the approved motion prototype without implementing later video, history, billing, or settings domains.

**Architecture:** A protected Server Component layout resolves the Supabase user into a serializable identity model, then renders one client-side shell that derives active navigation from the pathname. Route children own the New analysis and destination-state content; shared navigation, usage, responsive chrome, icons, and motion live in focused application-shell modules.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict mode, Supabase SSR, CSS variables, Vitest, Testing Library, Playwright.

## Global Constraints

- Match `/Users/niga/Downloads/gleen-motion-prototype-v2/app.html`, `styles.css`, `app.js`, and `icons.svg`; do not redesign.
- Never modify `/Users/niga/Downloads/gleen-motion-prototype-v2/`, `design/reference-v3/`, or `design/screenshots/`.
- Do not hard-code fixture identity, plans, usage limits, reset dates, analysis counts, study progress, exports, prices, languages, or currencies.
- Keep YouTube submission, saved analyses, processing, billing, and complete destination pages out of DEN-15.
- Use existing CSS variables and UI primitives; add no production dependency.
- Preserve desktop, tablet, mobile, keyboard, touch, visible focus, safe-area, and `prefers-reduced-motion` behavior.

---

### Task 1: Define shell navigation, identity, and usage view models

**Files:**

- Create: `src/lib/app-shell.ts`
- Create: `src/lib/app-shell.test.ts`

**Interfaces:**

- Consumes: Supabase `User`-shaped metadata (`email`, `user_metadata`).
- Produces: `AppIdentity`, `AppUsage`, `AppNavigationItem`, `appNavigation`, `deriveAppIdentity(user)`, `isAppNavigationItemActive(pathname, item)`, and `unavailableUsage`.

- [ ] **Step 1: Write failing model tests**

Create `src/lib/app-shell.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  appNavigation,
  deriveAppIdentity,
  isAppNavigationItemActive,
  unavailableUsage,
} from './app-shell';

describe('application shell model', () => {
  it('derives verified identity without prototype fixtures', () => {
    expect(
      deriveAppIdentity({
        email: 'alex@example.com',
        user_metadata: { full_name: 'Alex Koval' },
      }),
    ).toEqual({
      displayName: 'Alex Koval',
      email: 'alex@example.com',
      initials: 'AK',
    });

    expect(
      deriveAppIdentity({ email: 'signal@example.com', user_metadata: {} }),
    ).toEqual({
      displayName: 'signal',
      email: 'signal@example.com',
      initials: 'SI',
    });
  });

  it('defines the approved navigation order and route-aware active state', () => {
    expect(appNavigation.map(({ label, href }) => [label, href])).toEqual([
      ['New analysis', '/app'],
      ['History', '/app/history'],
      ['Subscription', '/app/subscription'],
      ['Settings', '/app/settings/profile'],
    ]);
    expect(isAppNavigationItemActive('/app', appNavigation[0])).toBe(true);
    expect(isAppNavigationItemActive('/app/history', appNavigation[0])).toBe(
      false,
    );
    expect(isAppNavigationItemActive('/app/history', appNavigation[1])).toBe(
      true,
    );
    expect(
      isAppNavigationItemActive('/app/settings/security', appNavigation[3]),
    ).toBe(true);
  });

  it('uses a truthful usage state with no invented plan values', () => {
    expect(unavailableUsage).toEqual({
      status: 'unavailable',
      label: 'Usage available with billing',
    });
    expect(JSON.stringify(unavailableUsage)).not.toMatch(/18|25|Prism|August/);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm test -- src/lib/app-shell.test.ts
```

Expected: FAIL because `src/lib/app-shell.ts` does not exist.

- [ ] **Step 3: Implement the minimal typed models**

Create `src/lib/app-shell.ts`:

```ts
export type AppIdentity = Readonly<{
  displayName: string;
  email: string;
  initials: string;
}>;

export type AppUsage = Readonly<{
  status: 'unavailable';
  label: string;
}>;

export type AppNavigationItem = Readonly<{
  label: 'New analysis' | 'History' | 'Subscription' | 'Settings';
  mobileLabel: 'New' | 'History' | 'Plan' | 'Profile';
  href: string;
  icon: 'plus' | 'history' | 'credit' | 'settings';
  match: 'exact' | 'prefix';
}>;

export const appNavigation: readonly AppNavigationItem[] = [
  {
    label: 'New analysis',
    mobileLabel: 'New',
    href: '/app',
    icon: 'plus',
    match: 'exact',
  },
  {
    label: 'History',
    mobileLabel: 'History',
    href: '/app/history',
    icon: 'history',
    match: 'prefix',
  },
  {
    label: 'Subscription',
    mobileLabel: 'Plan',
    href: '/app/subscription',
    icon: 'credit',
    match: 'prefix',
  },
  {
    label: 'Settings',
    mobileLabel: 'Profile',
    href: '/app/settings/profile',
    icon: 'settings',
    match: 'prefix',
  },
] as const;

export const unavailableUsage: AppUsage = Object.freeze({
  status: 'unavailable',
  label: 'Usage available with billing',
});

type IdentitySource = Readonly<{
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}>;

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length > 1
      ? `${words[0][0]}${words[words.length - 1][0]}`
      : words[0]?.slice(0, 2) || 'GL';
  return initials.toLocaleUpperCase('en');
}

export function deriveAppIdentity(user: IdentitySource): AppIdentity {
  const email = user.email?.trim() || 'Account';
  const metadata = user.user_metadata ?? {};
  const candidate = [metadata.full_name, metadata.name].find(
    (value): value is string =>
      typeof value === 'string' && value.trim() !== '',
  );
  const displayName = candidate?.trim() || email.split('@')[0] || 'Account';
  return { displayName, email, initials: initialsFor(displayName) };
}

export function isAppNavigationItemActive(
  pathname: string,
  item: AppNavigationItem,
): boolean {
  return item.match === 'exact'
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
```

- [ ] **Step 4: Run model tests and verify GREEN**

Run `npm test -- src/lib/app-shell.test.ts`.

Expected: 3 tests pass.

- [ ] **Step 5: Commit the model**

```bash
git add src/lib/app-shell.ts src/lib/app-shell.test.ts
git commit -m "feat(DEN-15): define app shell models"
```

---

### Task 2: Add protected `/app` routing and post-onboarding redirect

**Files:**

- Create: `src/app/app/layout.tsx`
- Create: `src/app/app/layout.test.tsx`
- Modify: `src/lib/onboarding/actions.ts`
- Create: `src/lib/onboarding/actions.test.ts`
- Replace: `src/app/protected/page.tsx`
- Create: `src/app/protected/page.test.tsx`
- Modify: `proxy.ts`
- Modify: `src/lib/auth/protection.test.ts`

**Interfaces:**

- Consumes: `createServerSupabaseClient()`, `deriveAppIdentity(user)`, `unavailableUsage`.
- Produces: protected `/app` layout props for `AppShell`, onboarding redirect `/app`, and `/protected` compatibility redirect `/app`.

- [ ] **Step 1: Write failing route-boundary tests**

Add tests that mock `@/lib/supabase/server` and `next/navigation`:

```tsx
it('redirects an unauthenticated app request to session expiry', async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  await AppLayout({ children: <p>Child</p> });
  expect(redirect).toHaveBeenCalledWith('/session-expired');
});

it('renders the shell with a derived authenticated identity', async () => {
  getUser.mockResolvedValue({
    data: {
      user: {
        email: 'alex@example.com',
        user_metadata: { full_name: 'Alex Koval' },
      },
    },
  });
  render(await AppLayout({ children: <p>Child</p> }));
  expect(screen.getByText('Alex Koval')).toBeInTheDocument();
  expect(screen.getByText('Child')).toBeInTheDocument();
});
```

In `src/lib/onboarding/actions.test.ts`, mock the authenticated Supabase client
and storage boundary so a successful step-three submission returns
`redirectTo: '/app'`. In `src/app/protected/page.test.tsx`, assert the
compatibility page calls `redirect('/app')`. Extend protection tests so
`/app/history` without a user redirects to `/sign-in?next=%2Fapp%2Fhistory`.

- [ ] **Step 2: Run route tests and verify RED**

Run:

```bash
npm test -- src/app/app/layout.test.tsx src/app/protected/page.test.tsx src/lib/onboarding/actions.test.ts src/lib/auth/protection.test.ts
```

Expected: FAIL because the `/app` layout and new redirect behavior do not exist.

- [ ] **Step 3: Implement the protected layout and redirects**

Create `src/app/app/layout.tsx` as a Server Component:

```tsx
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import { deriveAppIdentity, unavailableUsage } from '@/lib/app-shell';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/session-expired');

  return (
    <AppShell identity={deriveAppIdentity(user)} usage={unavailableUsage}>
      {children}
    </AppShell>
  );
}
```

Use a minimal temporary `AppShell` stub only long enough for this task's tests:

```tsx
export function AppShell({ children, identity }: AppShellProps) {
  return (
    <div>
      <span>{identity.displayName}</span>
      {children}
    </div>
  );
}
```

Change the completed onboarding result to `redirectTo: '/app'`, replace the
old protected page with `redirect('/app')`, and add `/app/:path*` to the proxy
matcher.

- [ ] **Step 4: Run route tests and verify GREEN**

Run the command from Step 2.

Expected: all selected tests pass.

- [ ] **Step 5: Commit the route boundary**

```bash
git add src/app/app src/app/protected src/components/app-shell src/lib/onboarding/actions.ts src/lib/onboarding/actions.test.ts src/lib/auth/protection.test.ts proxy.ts
git commit -m "feat(DEN-15): protect authenticated app routes"
```

---

### Task 3: Port the exact responsive application shell

**Files:**

- Copy: `/Users/niga/Downloads/gleen-motion-prototype-v2/icons.svg` to `public/app-icons.svg`
- Create: `src/components/app-shell/app-icon.tsx`
- Replace: `src/components/app-shell/app-shell.tsx`
- Create: `src/components/app-shell/app-shell.test.tsx`
- Create: `src/styles/app-shell-reference.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**

- Consumes: `AppIdentity`, `AppUsage`, `appNavigation`, pathname from `usePathname()`.
- Produces: `AppShell`, `AppIcon`, desktop/sidebar/topbar and mobile/topbar/bottom navigation.

- [ ] **Step 1: Write failing shell contract tests**

Mock `usePathname()` and render `AppShell` with a stable identity. Assert:

```tsx
expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
  'href',
  '#app-content',
);
expect(
  screen.getByRole('navigation', { name: 'Application navigation' }),
).toBeInTheDocument();
expect(
  screen.getByRole('navigation', { name: 'Mobile navigation' }),
).toBeInTheDocument();
expect(screen.getAllByRole('link', { name: 'History' })[0]).toHaveAttribute(
  'aria-current',
  'page',
);
expect(screen.getByText('Alex Koval')).toBeInTheDocument();
expect(screen.getByText('alex@example.com')).toBeInTheDocument();
expect(
  screen.queryByText(/18|25|Prism plan|August 01/),
).not.toBeInTheDocument();
expect(
  screen.getAllByText('Usage available with billing').length,
).toBeGreaterThan(0);
expect(screen.getByRole('main')).toHaveAttribute('id', 'app-content');
```

Read `app-shell-reference.css` and assert the exact reference contracts:

```ts
expect(css).toMatch(/\.app-shell\s*{[^}]*grid-template-columns:\s*242px 1fr/);
expect(css).toMatch(
  /@media\s*\(max-width:\s*980px\)[\s\S]*?grid-template-columns:\s*82px 1fr/,
);
expect(css).toMatch(
  /@media\s*\(max-width:\s*720px\)[\s\S]*?\.bottom-nav\s*{[^}]*position:\s*fixed/,
);
expect(css).toContain('padding-bottom: env(safe-area-inset-bottom);');
expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
```

- [ ] **Step 2: Run shell tests and verify RED**

Run `npm test -- src/components/app-shell/app-shell.test.tsx`.

Expected: FAIL against the temporary stub.

- [ ] **Step 3: Copy the approved icon sprite and implement `AppIcon`**

Copy the read-only reference asset:

```bash
cp /Users/niga/Downloads/gleen-motion-prototype-v2/icons.svg public/app-icons.svg
```

Create `AppIcon`:

```tsx
export function AppIcon({ name, className }: AppIconProps) {
  return (
    <svg className={cx('app-icon', className)} aria-hidden="true">
      <use href={`/app-icons.svg#${name}`} />
    </svg>
  );
}
```

- [ ] **Step 4: Implement the shared shell hierarchy**

Build the exact semantic hierarchy from `app.html`:

```tsx
<div className="app-shell">
  <a className="skip-link" href="#app-content">
    Skip to content
  </a>
  <aside className="sidebar">...</aside>
  <div className="app-main">
    <header className="mobile-topbar">...</header>
    <header className="app-topbar">...</header>
    <main className="app-content" id="app-content" tabIndex={-1}>
      {children}
    </main>
  </div>
  <nav className="bottom-nav" aria-label="Mobile navigation">
    ...
  </nav>
</div>
```

Render the same `appNavigation` items in desktop and mobile variants. Active
links receive class `active` and `aria-current="page"`. Notifications, language,
and Support render as disabled buttons with an accessible `Unavailable in this
version` description. The user chip links to `/app/settings/profile`.

- [ ] **Step 5: Port only shell CSS from the reference**

Create `src/styles/app-shell-reference.css`, mapping prototype values to existing
tokens. Preserve these reference breakpoints and dimensions exactly:

- desktop: `242px` sidebar, `70px` topbar;
- tablet at `980px`: `82px` icon rail;
- mobile at `720px`: `62px` topbar and fixed `67px` bottom navigation;
- content: desktop `46px 42px 70px`, mobile `26px 14px 40px` plus safe-area
  clearance;
- active edge ray and visible background;
- coarse-pointer minimum target `44px`;
- reduced-motion removes sidebar and active-ray animation.

Import the stylesheet from `src/app/layout.tsx` after the current shared styles.

- [ ] **Step 6: Run shell tests and verify GREEN**

Run `npm test -- src/components/app-shell/app-shell.test.tsx src/lib/app-shell.test.ts`.

Expected: all selected tests pass.

- [ ] **Step 7: Commit the shared shell**

```bash
git add public/app-icons.svg src/components/app-shell src/styles/app-shell-reference.css src/app/layout.tsx
git commit -m "feat(DEN-15): port responsive app shell"
```

---

### Task 4: Implement the truthful New analysis home

**Files:**

- Create: `src/app/app/page.tsx`
- Create: `src/components/app-shell/new-analysis-home.tsx`
- Create: `src/components/app-shell/new-analysis-home.test.tsx`
- Modify: `src/styles/app-shell-reference.css`

**Interfaces:**

- Consumes: shared shell panel/button/input styles and `/app/history`, `/app/subscription` links.
- Produces: `NewAnalysisHome` with unavailable intake, empty recent analyses, and unavailable metrics.

- [ ] **Step 1: Write failing New analysis tests**

Assert the reference copy and truthful states:

```tsx
render(<NewAnalysisHome />);
expect(
  screen.getByRole('heading', {
    level: 1,
    name: 'Turn a video into something useful.',
  }),
).toBeInTheDocument();
expect(screen.getByLabelText('YouTube URL')).toBeDisabled();
expect(screen.getByRole('button', { name: 'Analyze video' })).toBeDisabled();
expect(
  screen.getByText('Video intake arrives in the next step.'),
).toBeInTheDocument();
expect(
  screen.getByRole('heading', { name: 'Recent analyses' }),
).toBeInTheDocument();
expect(screen.getByText('No analyses yet')).toBeInTheDocument();
expect(
  screen.queryByText('How to Learn Anything Faster'),
).not.toBeInTheDocument();
expect(screen.queryByText(/18|62%|11|Prism/)).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the test and verify RED**

Run `npm test -- src/components/app-shell/new-analysis-home.test.tsx`.

Expected: FAIL because `NewAnalysisHome` does not exist.

- [ ] **Step 3: Implement the exact reference composition with empty states**

Create a component with:

```tsx
<>
  <section className="analysis-hero" aria-labelledby="new-analysis-title">
    <span className="eyebrow">New analysis</span>
    <h1 id="new-analysis-title">Turn a video into something useful.</h1>
    <form className="beam-form app-beam-form" aria-describedby="intake-status">
      <AppIcon name="link" className="link-icon" />
      <input
        aria-label="YouTube URL"
        type="url"
        placeholder="Paste a YouTube link"
        disabled
      />
      <button className="btn btn-primary" type="button" disabled>
        <span>Analyze video</span>
        <AppIcon name="arrow" />
      </button>
    </form>
    <p className="advanced-link" id="intake-status">
      <AppIcon name="settings" /> Video intake arrives in the next step.
    </p>
  </section>
  <div className="dashboard-grid">
    <section className="panel">...No analyses yet...</section>
    <aside className="panel">
      ...Usage and study metrics become available after your first analysis...
    </aside>
  </div>
</>
```

`src/app/app/page.tsx` returns `<NewAnalysisHome />` and exports metadata title
`New analysis — Gleen`.

- [ ] **Step 4: Port the reference analysis/panel geometry**

Add the exact `.analysis-hero`, `.app-beam-form`, `.advanced-link`,
`.dashboard-grid`, `.panel`, `.panel-head`, and `.metric-stack` geometry from
`app.html`/`styles.css`. Replace fixture-row styling with restrained empty-state
content while preserving panel size and responsive stacking.

- [ ] **Step 5: Run New analysis and shell tests**

Run:

```bash
npm test -- src/components/app-shell/new-analysis-home.test.tsx src/components/app-shell/app-shell.test.tsx
```

Expected: all selected tests pass.

- [ ] **Step 6: Commit New analysis**

```bash
git add src/app/app/page.tsx src/components/app-shell/new-analysis-home.tsx src/components/app-shell/new-analysis-home.test.tsx src/styles/app-shell-reference.css
git commit -m "feat(DEN-15): add new analysis home state"
```

---

### Task 5: Add destination, loading, and unavailable states

**Files:**

- Create: `src/components/app-shell/destination-state.tsx`
- Create: `src/components/app-shell/destination-state.test.tsx`
- Create: `src/app/app/history/page.tsx`
- Create: `src/app/app/subscription/page.tsx`
- Create: `src/app/app/settings/profile/page.tsx`
- Create: `src/app/app/loading.tsx`
- Create: `src/app/app/loading.test.tsx`
- Modify: `src/styles/app-shell-reference.css`

**Interfaces:**

- Consumes: shared shell panel, page-head, button, and Skeleton primitives.
- Produces: `DestinationState` and shell-shaped loading UI.

- [ ] **Step 1: Write failing destination and loading tests**

Test the reusable destination contract with each route's exact props:

```tsx
it.each([
  ['Your library', 'History', 'Saved analyses arrive in DEN-19.'],
  ['Your plan', 'Subscription', 'Usage and billing arrive in DEN-20.'],
  ['Your account', 'Settings', 'Account controls are being prepared.'],
])('renders %s destination truthfully', (eyebrow, title, description) => {
  render(
    <DestinationState
      eyebrow={eyebrow}
      title={title}
      description={description}
    />,
  );
  expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  expect(screen.getByText(description)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'New analysis' })).toHaveAttribute(
    'href',
    '/app',
  );
});
```

Render `loading.tsx` and assert it has `role="status"`, text `Loading workspace`,
and shell-aligned skeleton classes without fixture text.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm test -- src/components/app-shell/destination-state.test.tsx src/app/app/loading.test.tsx
```

Expected: FAIL because the destination and loading components do not exist.

- [ ] **Step 3: Implement `DestinationState` and routes**

Create:

```tsx
export function DestinationState({ eyebrow, title, description }: Props) {
  return (
    <section className="destination-state" aria-labelledby="destination-title">
      <div className="page-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1 id="destination-title">{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <div className="panel destination-panel">
        <p>This workspace is ready for the next product stage.</p>
        <Link className="ui-button" href="/app">
          New analysis
        </Link>
      </div>
    </section>
  );
}
```

Pass the exact truthful copy required by each route. Do not render search,
billing, integration, security, or destructive controls.

- [ ] **Step 4: Implement shell-shaped loading**

Use the existing `Skeleton` component inside `.app-loading` with a visible
screen-reader status. Reserve heading, hero, and two panel shapes. Do not animate
under reduced motion.

- [ ] **Step 5: Run selected tests and verify GREEN**

Run the command from Step 2.

Expected: all selected tests pass.

- [ ] **Step 6: Commit destination states**

```bash
git add src/app/app/history src/app/app/subscription src/app/app/settings src/app/app/loading.tsx src/app/app/loading.test.tsx src/components/app-shell/destination-state.tsx src/components/app-shell/destination-state.test.tsx src/styles/app-shell-reference.css
git commit -m "feat(DEN-15): add app shell destination states"
```

---

### Task 6: Add browser coverage and complete verification

**Files:**

- Create: `tests/e2e/app-shell.spec.ts`
- Create: `src/app/app-shell-fixture/page.tsx`
- Create: `src/app/app-shell-fixture/page.test.tsx`
- Modify: `tests/e2e/ui-production.spec.ts`
- Modify: `README.md` with `/app` route and DEN-15 development notes.

**Interfaces:**

- Consumes: completed `/app` shell and existing Playwright configuration.
- Produces: desktop/tablet/mobile, active navigation, keyboard, safe-area, and reduced-motion evidence.

- [ ] **Step 1: Add a deterministic development-only shell fixture**

Create `/app-shell-fixture` using the existing `isUiPreviewEnabled()` boundary.
When disabled, call `notFound()` before rendering. When enabled, render the real
`AppShell` and `NewAnalysisHome` with this explicit non-runtime fixture:

```tsx
const fixtureIdentity = {
  displayName: 'Test User',
  email: 'test@example.com',
  initials: 'TU',
} as const;

export default function AppShellFixturePage() {
  if (!isUiPreviewEnabled()) notFound();
  return (
    <AppShell identity={fixtureIdentity} usage={unavailableUsage}>
      <NewAnalysisHome />
    </AppShell>
  );
}
```

Unit-test both the enabled render and disabled `notFound()` branch. Extend
`tests/e2e/ui-production.spec.ts` to require an exact 404 for
`/app-shell-fixture`, matching the existing `/ui` protection.

- [ ] **Step 2: Write failing Playwright scenarios**

Cover:

```ts
for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
] as const) {
  test(`matches the approved app shell at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/app-shell-fixture');
    await expect(
      page.getByRole('heading', {
        name: 'Turn a video into something useful.',
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
```

Also assert:

- desktop sidebar width `242px`;
- tablet sidebar width `82px`;
- mobile sidebar hidden, topbar visible, bottom navigation fixed;
- bottom navigation has safe-area padding and does not cover content;
- New is active with `aria-current="page"` and an edge/background indicator;
- Tab reaches the skip link and moves focus to main content;
- all coarse-pointer navigation targets are at least `44px`;
- reduced motion removes sidebar/active-ray animation without hiding content;
- browser console has zero errors.

- [ ] **Step 3: Run Playwright and verify RED, then complete the smallest fixture support**

Run:

```bash
CI=1 npm run test:e2e -- tests/e2e/app-shell.spec.ts
```

Expected first run: FAIL before the deterministic fixture exists. Add only the
guarded fixture route specified in Step 1, then rerun until all app-shell
scenarios pass.

- [ ] **Step 4: Update README**

Document:

- `/app` and its child routes;
- Supabase session requirement;
- later-issue boundaries for intake, history, billing, and settings;
- how the deterministic browser fixture returns 404 in production.

- [ ] **Step 5: Run full automated verification**

Ensure the worktree has ignored local Supabase environment values without
committing them:

```bash
cp ../../.env.local .env.local
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:e2e:production
```

Expected:

- formatting, lint, TypeScript, and build exit 0;
- all unit/integration tests pass with zero failures;
- all development E2E tests pass at desktop, tablet, mobile, keyboard, and
  reduced-motion scenarios;
- production E2E confirms development-only fixture routes return exact 404s.

- [ ] **Step 6: Perform authenticated browser verification**

Start `npm run dev`, sign in through the already configured Google provider,
and verify `/app`, `/app/history`, `/app/subscription`, and
`/app/settings/profile` using the real session. Confirm the onboarding redirect,
desktop/tablet/mobile layouts, keyboard navigation, touch targets, active route
states, empty/loading behavior, and reduced motion. Compare directly with
`app.html` and do not approve visual deviations as redesign.

- [ ] **Step 7: Commit verification**

```bash
git add src/app/app-shell-fixture tests/e2e/app-shell.spec.ts tests/e2e/ui-production.spec.ts README.md
git commit -m "test(DEN-15): verify authenticated app shell"
```

---

## Completion gate

Before marking DEN-15 complete:

- inspect `git diff main...HEAD` for scope and accidental reference changes;
- confirm no fixture identity, usage, plans, limits, prices, or metrics exist in
  runtime components;
- confirm the external prototype and approved repository references are
  unchanged;
- run the entire verification sequence fresh;
- request code review;
- publish one focused DEN-15 branch/PR;
- mark Linear Done only after CI and browser verification pass.
