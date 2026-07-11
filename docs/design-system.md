# Gleen design system

## Core metaphor

A video is a white beam. Gleen is the prism. The prism separates one input into useful outputs.

The interface should feel dark, cinematic, precise, quiet, premium, and luminous.

Approximately 90% of the screen should remain dark and restrained. Spectral color should occupy roughly 10% of the visual field.

## Color tokens

```css
--background-deep: #0A0A0F;
--background-elevated: #111018;
--surface-panel: #16161F;
--surface-raised: #1B1A25;
--surface-hover: #201F2B;

--text-primary: #F4F2FF;
--text-secondary: #9A98AD;
--text-muted: #696779;

--artifact-summary: #FFB454;
--artifact-flashcards: #C77DFF;
--artifact-timestamps: #5BE9E9;
--artifact-export: #A8E063;

--border-default: rgba(255,255,255,0.06);
--border-hover: rgba(255,255,255,0.12);
--border-strong: rgba(255,255,255,0.18);
```

Use artifact colors as edge light, focus, active state, fine lines, progress traces, and restrained tints. Do not use them as large saturated surfaces.

## Typography

- Display: Clash Display, Söhne, or equivalent characterful grotesk.
- Body: Geist or Inter.
- Mono: JetBrains Mono.

Hero desktop size: approximately 88–120px.

Use dramatic contrast between large editorial headlines and tiny precise mono metadata.

## Radius

- controls: 8–10px;
- inputs and standard panels: 12–16px;
- large feature panels: 20–24px.

Do not make every element a pill.

## Surfaces

Use:

- subtle grain;
- thin optical-axis lines;
- low-opacity haze;
- restrained glows;
- thin borders;
- minimal shadow.

Avoid generic glassmorphism.

## Motion

### Timing levels

- micro feedback: 140–180ms;
- interface transitions: 220–360ms;
- narrative motion: 600–1000ms.

Preferred easing:

```css
cubic-bezier(0.16, 1, 0.3, 1)
```

### Required behaviors

- reveal from blur and glow into sharp focus;
- spectral edge split on primary button hover;
- subtle breathing prism;
- moving navigation ray;
- short light pulse after copy;
- processing stages illuminate sequentially;
- export content flows toward destination;
- custom cursor only on desktop marketing pages;
- no autoplay audio.

### Motion boundaries

Marketing may use expressive GSAP, Three.js, and scroll-linked scenes.

Authenticated application motion must be calmer, shorter, and functional.

All motion must support `prefers-reduced-motion`.

## Responsive behavior

### Desktop

- 12-column marketing grid;
- maximum content width around 1400–1500px;
- sidebar application shell;
- sticky result player.

### Tablet

- simplify 3D effects;
- collapsible sidebar;
- preserve two-column result layout where practical.

### Mobile

- no custom cursor;
- no cursor parallax;
- replace horizontal scroll scenes with vertical sequences;
- lightweight prism fallback;
- top video player;
- sticky artifact tabs;
- bottom app navigation;
- no hover-only actions;
- no horizontal scrolling.

## Accessibility

- WCAG AA contrast;
- semantic headings;
- keyboard navigation;
- visible focus;
- skip link;
- screen-reader status announcements;
- modal focus trapping;
- labels and accessible errors;
- touch-friendly targets;
- no meaning communicated by color alone.

## Anti-patterns

Do not use:

- generic three-card SaaS composition;
- large random gradient blobs;
- rainbow everywhere;
- excessive glassmorphism;
- fake testimonials or logos;
- full-screen saturated artifact colors;
- heavy 3D in every application screen;
- hover-only functionality;
- dead buttons;
- light theme.

## Approved reference

The approved motion prototype is stored at:

`design/reference-v3/index.html`

For implementation tasks, match the approved reference rather than redesigning it.
