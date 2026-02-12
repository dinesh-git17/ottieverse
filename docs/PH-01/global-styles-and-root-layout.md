# [PH-01] Configure Global Styles and Root Layout

## Context

The application renders as a full-screen native iOS experience via Capacitor. Before any scene or component can be built, the WebView must be stripped of browser defaults and configured as a pure rendering surface. This Epic establishes the CSS reset layer, Tailwind v4 design token system, font stack, and root layout metadata that every downstream phase depends on.

**Design Doc Reference:** Section 6 — Visual Design System, Section 8 — Capacitor Configuration
**Phase:** `PH-01` — Foundation & Tooling
**Blocks:** None (parallel with other PH-01 Epics)
**Blocked By:** None (root phase)

---

## Scope

### In Scope

- `src/app/globals.css` — Tailwind v4 import, browser reset rules, CSS custom properties for scene color palette
- `src/app/layout.tsx` — Replace Geist fonts with Inter (400/500/700), Caveat (400), Playfair Display (400/700) via `next/font/google`; set app metadata; configure viewport for safe area coverage
- Browser reset rules: `-webkit-tap-highlight-color: transparent`, `-webkit-touch-callout: none`, `overscroll-behavior: none`, `user-select: none`, body `position: fixed` with `dvh` viewport height
- CSS custom properties for all scene gradients defined in DESIGN_DOC.md Section 6

### Out of Scope

- Scene components or any rendering beyond the root layout shell
- Component-level styling (handled per-scene in PH-02+)
- Capacitor native project configuration (`ios/` directory — PH-06)
- `tailwind.config.ts` modifications (CSS-first approach; `@theme` overrides go in `globals.css`)

---

## Technical Approach

### Architecture

The root layout is a server component that loads fonts, sets metadata, and renders `{children}`. All browser-default suppression lives in `globals.css` as bare element selectors targeting `html`, `body`, `*`, and input elements. Scene color tokens are defined as CSS custom properties under a `@theme` block so Tailwind utilities can reference them.

### Key Files

| File | Action | Purpose |
|------|--------|---------|
| `src/app/globals.css` | Modify | Add Tailwind import, browser resets, scene color custom properties |
| `src/app/layout.tsx` | Modify | Replace Geist fonts with Inter/Caveat/Playfair Display, update metadata, configure viewport |

### Dependencies

| Package | Version | Import |
|---------|---------|--------|
| `next` | `^16.1.0` | `next/font/google` |
| `tailwindcss` | `^4.0.0` | `@import "tailwindcss"` in CSS |

### Implementation Details

**globals.css structure:**

```css
@import "tailwindcss";

@theme {
  /* Scene 0-1: Cool / Playful */
  --color-welcome-start: #0d9488;
  --color-welcome-end: #7c3aed;

  /* Scene 2: Warm / Engaged */
  --color-search-start: #7c3aed;
  --color-search-end: #e11d48;

  /* Scene 3: Soft / Creative */
  --color-poetry-start: #f59e0b;
  --color-poetry-end: #f43f5e;

  /* Scene 4: Deep / Emotional */
  --color-letter-start: #881337;
  --color-letter-end: #1e1b4b;

  /* Scene 5: Bright / Celebration */
  --color-ask-start: #fda4af;
  --color-ask-end: #fbbf24;
}

/* Browser reset — strip WebView to rendering surface */
*,
*::before,
*::after {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

html {
  overscroll-behavior: none;
  -webkit-text-size-adjust: 100%;
}

body {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

input,
textarea {
  font-size: 16px; /* prevent iOS zoom on focus */
  user-select: text;
  -webkit-user-select: text;
}
```

**layout.tsx font loading:**

```typescript
import { Inter, Caveat, Playfair_Display } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-inter",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-caveat",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair",
  display: "swap",
});
```

**Viewport meta (in metadata export or `<head>`):**

```typescript
export const metadata: Metadata = {
  title: "OttieVerse",
  description: "A surprise for Carolina",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};
```

Note: Next.js 16 may use the `viewport` export instead of embedding it in `metadata`. Verify against `next` v16.1 API before implementation.

---

## Stories

### Story 1: Strip browser defaults from WebView

**As a** developer,
**I want** all browser-default behaviors suppressed in `globals.css`,
**So that** the WebView behaves as a native rendering surface with no tap highlights, callout menus, overscroll bounce, or text selection on UI chrome.

**Acceptance Criteria:**

```gherkin
Given the app is loaded in iOS Safari WebView
When the user taps any element
Then no blue/gray tap highlight rectangle appears

Given the app is loaded in iOS Safari WebView
When the user long-presses any non-input element
Then no callout menu or copy/paste menu appears

Given the app is rendered in the WebView
When the user overscrolls at the top or bottom of the viewport
Then no rubber-band bounce effect occurs

Given the app is rendered in the WebView
When the user attempts to select UI text (labels, buttons, headings)
Then no text selection handles or highlight appears
```

### Story 2: Configure scene color design tokens

**As a** developer,
**I want** all scene gradient colors defined as CSS custom properties in a `@theme` block,
**So that** Tailwind utilities can reference semantic color tokens (`bg-welcome-start`, `text-ask-end`) instead of hardcoded hex values.

**Acceptance Criteria:**

```gherkin
Given globals.css contains a @theme block
When a component uses className="bg-welcome-start"
Then the element renders with background color #0d9488

Given globals.css contains all 10 scene color tokens
When inspecting the computed CSS custom properties on :root
Then --color-welcome-start, --color-welcome-end, --color-search-start, --color-search-end, --color-poetry-start, --color-poetry-end, --color-letter-start, --color-letter-end, --color-ask-start, --color-ask-end are all present with correct hex values per DESIGN_DOC.md Section 6
```

### Story 3: Load Inter, Caveat, and Playfair Display fonts

**As a** developer,
**I want** three Google Fonts loaded via `next/font/google` with correct weights and CSS variables,
**So that** all typography across scenes matches the DESIGN_DOC.md Section 6 Typography table.

**Acceptance Criteria:**

```gherkin
Given layout.tsx imports Inter from next/font/google
When the app renders
Then Inter is available at weights 400, 500, and 700 via --font-inter CSS variable

Given layout.tsx imports Caveat from next/font/google
When the app renders
Then Caveat is available at weight 400 via --font-caveat CSS variable

Given layout.tsx imports Playfair_Display from next/font/google
When the app renders
Then Playfair Display is available at weights 400 and 700 via --font-playfair CSS variable

Given all three font variables are set on the <body> element
When the browser loads the page
Then font-display is "swap" for all three fonts to prevent FOIT
```

### Story 4: Set app metadata and viewport configuration

**As a** developer,
**I want** layout.tsx to export correct metadata and viewport settings for a Capacitor iOS app,
**So that** the app title, description, and viewport-fit=cover are configured for edge-to-edge rendering with safe area support.

**Acceptance Criteria:**

```gherkin
Given layout.tsx exports a metadata object
When the HTML is generated
Then <title> is "OttieVerse" and meta description is present

Given the viewport is configured with viewport-fit=cover
When the app runs on an iPhone with a notch or Dynamic Island
Then the WebView extends behind the status bar and home indicator areas
Then CSS env(safe-area-inset-*) values are available for layout calculations
```

### Story 5: Lock body to fixed full-viewport layout

**As a** developer,
**I want** the `<body>` element positioned as `fixed` with `100dvh` height and `overflow: hidden`,
**So that** the document never scrolls and the viewport is treated as a fixed canvas for scene rendering.

**Acceptance Criteria:**

```gherkin
Given body has position: fixed and height: 100dvh
When the user attempts to scroll the page on iOS
Then no scroll occurs and the viewport remains locked

Given body uses dvh units instead of vh
When the iOS Safari toolbar expands or collapses
Then the body height matches the actual visible viewport without layout shift
```

---

## Exit Criteria

- [ ] `pnpm build` produces clean static export with zero errors
- [ ] `npx biome check .` passes with zero diagnostics
- [ ] `globals.css` contains `-webkit-tap-highlight-color: transparent` rule
- [ ] `globals.css` contains `-webkit-touch-callout: none` rule
- [ ] `globals.css` contains `overscroll-behavior: none` rule
- [ ] `globals.css` contains `user-select: none` on body
- [ ] `globals.css` contains body `position: fixed` with `height: 100dvh`
- [ ] `globals.css` contains `@theme` block with all 10 scene color tokens matching DESIGN_DOC.md Section 6
- [ ] `globals.css` contains input/textarea `font-size: 16px` to prevent iOS zoom
- [ ] All three fonts load via `next/font/google` with correct weights (Inter 400/500/700, Caveat 400, Playfair Display 400/700)
- [ ] Font CSS variables (`--font-inter`, `--font-caveat`, `--font-playfair`) are applied to `<body>`
- [ ] Metadata title is "OttieVerse"
- [ ] Viewport is configured with `viewport-fit=cover`
- [ ] No Geist font references remain in the codebase
