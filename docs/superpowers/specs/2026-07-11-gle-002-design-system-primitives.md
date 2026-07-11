# GLE-002 Design Tokens and Core UI Primitives

## Purpose

Represent the approved Gleen visual system as reusable design tokens and accessible React primitives without redesigning or reinterpreting the approved references.

## Sources of Truth

Implementation must follow these sources in order:

1. The DEN-12 Linear issue.
2. `AGENTS.md`.
3. `docs/design-system.md`.
4. `design/reference-v3/index.html`.
5. `design/screenshots/`.

The implementation may componentize and name approved patterns, but it must not introduce a new visual direction. Files under `design/reference-v3/` and `design/screenshots/` remain unchanged.

## Scope

- Canonical color, typography, spacing, radius, shadow, and motion tokens.
- Semantic Tailwind mappings backed by CSS custom properties.
- Reusable Button, Input, Panel, Dialog, Dropdown Menu, Tabs, Tooltip, Toast, and Skeleton primitives.
- Visible focus, keyboard behavior, touch targets, responsive behavior, and reduced-motion handling.
- A non-product `/ui` component preview route for development and preview environments.
- Unit interaction tests and Playwright browser coverage for core behavior.

## Explicitly Out of Scope

- The production landing page.
- Product-specific application screens or feature components.
- Authentication, billing, processing, integrations, or backend behavior.
- Three.js or production prism implementation.
- New branding, layouts, color meanings, or visual motifs.
- Storybook or a separate documentation application.

## Architecture

Gleen owns every public component API and every visual rule. Radix UI is an internal headless behavior layer for complex interactions; feature code must import Gleen components rather than Radix packages directly.

Components live under `src/components/ui/`, grouped by primitive. Each folder contains the component, its styles when component-specific CSS is required, and focused tests. Small shared helpers may live under `src/lib/` only when at least two primitives need them.

The design system has three layers:

1. Raw approved tokens reproduce source values.
2. Semantic aliases describe usage such as background, text, border, focus, danger, and artifact identity.
3. Components consume semantic aliases and expose constrained variants.

Components must not contain one-off hex, `rgba()`, radius, shadow, spacing, or timing values unless the value exists in the approved references and is documented as a deliberate exception.

## Token System

### Color

Canonical tokens include:

- deep and elevated backgrounds;
- panel, raised, and hover surfaces;
- primary, secondary, and muted text;
- default, hover, and strong borders;
- summary amber;
- flashcards purple;
- timestamps cyan;
- export lime;
- danger and focus semantics.

Artifact colors remain restrained accents for edge light, focus, active states, fine lines, progress traces, and subtle tints. They are not large saturated surfaces.

### Typography

- Display: a production-licensed characterful grotesk matching the approved Space Grotesk-style reference.
- Body: Geist with an Inter/system fallback.
- Mono: JetBrains Mono with platform monospace fallbacks.

Font loading must use the Next.js font system or locally licensed assets. The implementation must not silently fetch an unapproved runtime font or invent new typography.

### Geometry and Effects

- Control radii: 8–10 px.
- Input and standard panel radii: 12–16 px.
- Large panel radii: 20–24 px.
- Shadows, haze, grain, and glows remain restrained and tokenized.
- Pills are reserved for controls whose meaning or compact geometry requires them.

### Motion

- Micro feedback: 140–180 ms.
- Interface transitions: 220–360 ms.
- Narrative motion is tokenized but not exercised by application primitives.
- Preferred easing: `cubic-bezier(0.16, 1, 0.3, 1)`.

With `prefers-reduced-motion: reduce`, decorative transforms and shimmer stop, state changes remain visible, and content never depends on animation to appear.

## Component Contracts

### Button

Variants are `primary`, `ghost`, `soft`, and `danger`; sizes are `sm`, `default`, and `icon`. Buttons support native button props, disabled state, visible focus, and an optional loading state with an accessible label. Primary hover may use the approved restrained spectral edge split.

### Input

Input composition supports a visible label, optional hint, optional leading icon, invalid state, and accessible error association. Native input props remain available. Error meaning is not communicated by color alone.

### Panel

Panel is a neutral structural surface rather than a generic SaaS card. It supports standard and raised surfaces plus restrained padding/radius options. Product-specific content and artifact semantics stay outside the primitive.

### Dialog

Dialog uses Radix Dialog internally. It provides overlay, content, title, description, close control, focus trap, Escape handling, outside-interaction behavior, initial focus, and focus return. Reduced motion removes decorative entrance transforms without bypassing focus management.

### Dropdown Menu

Dropdown Menu uses Radix Dropdown Menu internally. It supports items, checkbox items, separators, labels, disabled state, arrow-key navigation, Enter/Space activation, Escape, and focus return. No action is hover-only.

### Tabs

Tabs use Radix Tabs internally. They support keyboard arrow navigation, semantic activation, responsive horizontal overflow, and an optional artifact accent: neutral, summary, flashcards, timestamps, or export. Accent colors supplement text and state indicators rather than replacing them.

### Tooltip

Tooltip uses Radix Tooltip internally and appears on hover and keyboard focus. Tooltip content may clarify an action but cannot contain information required to complete it. Touch interfaces retain an accessible label and do not depend on tooltip visibility.

### Toast

Toast uses Radix Toast internally. Variants are neutral, success, and error. Toasts provide accessible announcements, optional action and dismissal, and enough duration for comprehension. Copy feedback may use the approved short light pulse; reduced motion uses a static state.

### Skeleton

Skeleton exposes rectangular and text-line shapes. Default motion is a restrained low-contrast shimmer. Reduced-motion mode renders a static surface. Skeletons are `aria-hidden` when adjacent status text communicates loading.

## Preview Route

`/ui` is a component verification gallery, not a product page. It includes every variant and state, interactive keyboard fixtures, long-content examples, and a reduced-motion status indicator.

The route must:

- include `noindex` metadata;
- be available in development and non-production preview environments;
- call `notFound()` in production;
- work at desktop and mobile widths;
- use only approved tokens and primitives;
- avoid inventing product screen layouts.

The environment gate is server-side and must not expose a client-only production bypass.

## Dependencies

Use individual Radix packages only for primitives required by this issue:

- Dialog;
- Dropdown Menu;
- Tabs;
- Tooltip;
- Toast.

Radix is justified as an accessibility and interaction dependency. Radix Themes is not used. Public application code consumes Gleen wrappers so the internal headless library can be replaced without changing feature APIs.

No styling framework or general component library is added.

## Accessibility and Responsive Behavior

- WCAG AA contrast for text and actionable controls.
- Semantic elements and accessible names.
- Visible `:focus-visible` treatment.
- Keyboard activation and navigation for every interactive primitive.
- Modal focus containment and return.
- Touch-friendly targets and no hover-only actions.
- No meaning communicated by color alone.
- No horizontal page scrolling at 390 px width.
- Reduced motion keeps all states and content usable.

## Error and Edge States

- Disabled and loading buttons remain non-interactive and clearly announced.
- Invalid inputs associate the error message through `aria-describedby` and `aria-invalid`.
- Dialog content requires an accessible title; descriptions may be optional only when an equivalent accessible description is supplied.
- Empty dropdown and tabs compositions are prevented or produce a development-time warning through documented component contracts rather than silently broken UI.
- Toast actions remain keyboard reachable and dismissal never traps focus.
- Long labels and translated text wrap or truncate only where the approved pattern requires it.

## Testing and Verification

Unit tests cover:

- variant and size contracts;
- disabled and loading behavior;
- label, hint, and error associations;
- dialog Escape, focus trap, and focus return;
- dropdown and tabs keyboard navigation;
- tooltip focus behavior;
- toast announcement and dismissal;
- reduced-motion class or media-query behavior where DOM assertions are meaningful.

Playwright covers `/ui` at 1440×900 and 390×844, including keyboard-only flows, focus visibility, dialog focus containment, dropdown/tabs navigation, toast interaction, no horizontal overflow, console errors, and reduced motion.

Production verification confirms `/ui` returns 404. The normal formatting, lint, type-check, unit-test, Playwright, and production-build commands must pass. A final git diff must confirm no changes to the approved design directories.

## Delivery Risks

- Radix package APIs must remain contained inside Gleen wrappers.
- Font licensing and asset availability must be confirmed before choosing production font files; system fallbacks are acceptable until approved assets exist.
- The preview route must not become a public production surface.
- Visual similarity must be checked against the references at real viewport sizes; snapshot tests alone are insufficient.
- Adding all primitives in one issue is moderately broad, so implementation should use independently reviewable token, static-component, overlay, navigation, feedback, and preview/testing tasks.

## Acceptance Mapping

- Tokens match `docs/design-system.md`: canonical raw values and semantic aliases are verified in CSS and tests.
- No one-off values: component styles consume semantic tokens; exceptions require documentation.
- Keyboard and visible focus: unit interaction tests and Playwright keyboard flows.
- Mobile and reduced motion: 390×844 plus reduced-motion browser verification.
- Reusable across surfaces: product-neutral APIs with no marketing- or application-specific content.
