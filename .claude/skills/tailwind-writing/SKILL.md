---
name: tailwind-writing
description: Enforce FAANG-grade, accessible Tailwind CSS v4 markup for all styling operations. Use when writing or modifying any JSX className, globals.css, or component styling. Prevents generic AI aesthetics and enforces Linear/Apple-tier visual polish with strict v4 syntax, semantic design tokens, and accessibility compliance.
---

# Tailwind Writing

Generate production-grade Tailwind CSS v4 markup. All styling output MUST comply with these standards. Zero tolerance for generic, inconsistent, or inaccessible UI.

## Tailwind v4 Fundamentals

### CSS-First Configuration

Tailwind v4 uses native CSS for configuration. No `tailwind.config.js` unless legacy compatibility demands it.

```css
/* globals.css — single entry point */
@import "tailwindcss";

@theme {
  /* Scene-specific design tokens from DESIGN_DOC.md Section 6 */
  --color-welcome-start: #0d9488;
  --color-welcome-end: #7c3aed;
  --color-search-start: #7c3aed;
  --color-search-end: #e11d48;
  --color-poetry-start: #f59e0b;
  --color-poetry-end: #f43f5e;
  --color-letter-start: #881337;
  --color-letter-end: #1e1b4b;
  --color-ask-start: #fda4af;
  --color-ask-end: #fbbf24;

  /* Semantic surface tokens */
  --color-surface: #ffffff;
  --color-surface-elevated: #f8fafc;
  --color-surface-overlay: oklch(0 0 0 / 0.6);

  /* Semantic text tokens */
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-text-inverse: #f8fafc;

  /* Semantic border tokens */
  --color-border-default: #e2e8f0;
  --color-border-subtle: #f1f5f9;
  --color-border-focus: #3b82f6;

  /* Easing curves — intentional, never default */
  --ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Directives Reference

| Directive                | Purpose                                      | Use When                                |
| ------------------------ | -------------------------------------------- | --------------------------------------- |
| `@import "tailwindcss"`  | Load Tailwind                                | Once in `globals.css`                   |
| `@theme { }`             | Define design tokens as CSS variables        | Defining project colors, fonts, spacing |
| `@utility name { }`      | Create custom utilities with variant support | Need a reusable utility not in Tailwind |
| `@variant name { }`      | Apply Tailwind variants in custom CSS        | Styling third-party elements            |
| `@custom-variant`        | Create project-specific variants             | `data-state`, theme modes               |
| `@layer base/components` | Scope custom CSS to Tailwind layers          | Base resets, component defaults         |

### Functions

```css
/* Adjust color opacity */
color: --alpha(var(--color-welcome-start) / 50%);

/* Use spacing scale in CSS */
margin: --spacing(4);

/* Spacing math in arbitrary values */
<div class="py-[calc(--spacing(4)-1px)]">
```

## Prohibitions

These patterns are **banned**. Their presence is a merge blocker.

| Banned Pattern                                    | Use Instead                                                |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `@apply` in CSS files                             | Compose utilities in JSX                                   |
| Arbitrary pixel values (`p-[17px]`, `w-[13px]`)   | Spacing scale (`p-4`, `w-3`) or design token               |
| Hardcoded hex in `className` (`bg-[#ff0000]`)     | Semantic token (`bg-welcome-start`) or Tailwind palette    |
| Missing `focus-visible:` on interactables         | Add `focus-visible:ring-2 focus-visible:ring-border-focus` |
| Missing `prefers-reduced-motion` handling         | Add `motion-safe:` / `motion-reduce:` prefixes             |
| Excessive shadows (`shadow-2xl` on everything)    | Intentional depth: `shadow-sm` cards, `shadow-lg` modals   |
| Rainbow gradients without spec reference          | Gradients MUST match DESIGN_DOC.md scene palette           |
| `text-[color]` without contrast check             | Minimum 4.5:1 ratio (WCAG AA)                              |
| Inline `style={{ }}` for Tailwind-solvable styles | Tailwind utilities                                         |
| `!important` or `!` prefix utilities              | Fix specificity at the source                              |
| `dark:` variants in this project                  | App is single-theme per DESIGN_DOC.md                      |
| Unsorted class strings                            | Enforce consistent ordering                                |

## Class Composition

### Conditional Classes

Use `clsx` for conditional class composition. Avoid ternary string concatenation.

```tsx
// BAD: Fragile string interpolation
<button className={`px-4 py-2 ${isActive ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700"}`}>

// GOOD: Structured composition with clsx
import { clsx } from "clsx";

<button className={clsx(
  "rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2",
  isActive
    ? "bg-blue-500 text-white shadow-sm"
    : "bg-gray-100 text-text-secondary hover:bg-gray-200"
)}>
```

### Data State Patterns

Use `data-[state=*]:` for interactive state styling (Radix/Shadcn convention).

```tsx
<div
  data-state={isOpen ? "open" : "closed"}
  className={clsx(
    "overflow-hidden transition-all duration-200 ease-snappy",
    "data-[state=open]:opacity-100",
    "data-[state=closed]:opacity-0 data-[state=closed]:h-0"
  )}
>
```

### Group and Peer Modifiers

```tsx
<div className="group relative">
  <button className="peer">Toggle</button>
  <div
    className={clsx(
      "absolute mt-2 rounded-lg bg-surface-elevated shadow-lg",
      "opacity-0 transition-opacity duration-150",
      "group-hover:opacity-100",
      "peer-focus-visible:opacity-100",
    )}
  />
</div>
```

## Mobile-First Responsive

Write mobile styles first. Add breakpoint prefixes for larger screens only.

```tsx
// BAD: Desktop-first
<div className="flex-row sm:flex-col">

// GOOD: Mobile-first
<div className="flex flex-col sm:flex-row">
```

### Container Queries

Use `@container` for component-level responsive design. Prefer over viewport breakpoints for reusable components.

```tsx
<div className="@container">
  <div
    className={clsx(
      "flex flex-col gap-3",
      "@sm:flex-row @sm:items-center @sm:gap-4",
    )}
  >
    <h3 className="text-base font-semibold @md:text-lg">Title</h3>
    <p className="text-sm text-text-secondary">Description</p>
  </div>
</div>
```

## Typography

### Scale Discipline

Use Tailwind's type scale. No arbitrary font sizes unless matching DESIGN_DOC.md specs exactly.

| Element         | Classes                                                        | Notes                      |
| --------------- | -------------------------------------------------------------- | -------------------------- |
| Page heading    | `text-3xl font-bold tracking-tight`                            | 28-36px range              |
| Section heading | `text-xl font-semibold`                                        | Pairs with body            |
| Body text       | `text-base leading-relaxed`                                    | 16-18px, 1.625 line-height |
| Caption/meta    | `text-sm text-text-secondary`                                  | De-emphasized              |
| Overline        | `text-xs font-medium uppercase tracking-wider text-text-muted` | Labels                     |

### Letter Spacing

Tighter on large text, wider on small uppercase text. Never apply tracking to body copy.

```tsx
<h1 className="text-4xl font-bold tracking-tight">Scene Title</h1>
<span className="text-xs font-medium uppercase tracking-wider text-text-muted">Label</span>
```

### Font Weight Hierarchy

Use no more than 3 weights per view: one bold (700), one medium (500), one regular (400). Overusing weights dilutes visual hierarchy.

## Spacing & Layout

### Consistent Spacing Scale

Adhere to Tailwind's 4px base unit. Avoid arbitrary values.

| Use Case           | Spacing | Class              |
| ------------------ | ------- | ------------------ |
| Inline element gap | 4-8px   | `gap-1` to `gap-2` |
| Component padding  | 12-24px | `p-3` to `p-6`     |
| Section spacing    | 32-64px | `py-8` to `py-16`  |
| Page margins       | 16-24px | `px-4` to `px-6`   |

### Whitespace Philosophy

Generous whitespace signals quality. Cramped layouts signal amateur design.

```tsx
// BAD: Cramped
<div className="p-2 gap-1">

// GOOD: Breathable
<div className="p-6 gap-4">
```

### Centering

```tsx
/* Flex center */
<div className="flex items-center justify-center">

/* Grid center (single child) */
<div className="grid place-items-center">

/* Full viewport center */
<div className="grid min-h-dvh place-items-center">
```

Use `min-h-dvh` (dynamic viewport height) for mobile, never `min-h-screen`.

## Borders & Shadows

### Subtle Borders

Borders define structure. Use `border-border-subtle` (nearly invisible) for cards, `border-border-default` for interactive elements.

```tsx
<div className={clsx(
  "rounded-2xl border border-border-subtle",
  "bg-surface-elevated",
  "shadow-sm"
)}>
```

### Shadow Hierarchy

| Depth    | Class       | Use Case                  |
| -------- | ----------- | ------------------------- |
| Flat     | No shadow   | Inline elements           |
| Raised   | `shadow-sm` | Cards, options            |
| Floating | `shadow-lg` | Modals, dropdowns         |
| Dramatic | `shadow-xl` | Hero elements (sparingly) |

Never stack multiple shadow utilities. One shadow per element.

### Glassmorphism (Tasteful)

```tsx
<div className={clsx(
  "rounded-2xl border border-white/10",
  "bg-white/5 backdrop-blur-xl",
  "shadow-lg shadow-black/5"
)}>
```

Reserve for overlays and elevated surfaces. Never on body-level containers.

## Color

### Semantic-Only Color References

All colors MUST use either:

1. Tailwind palette names (`bg-rose-500`)
2. Semantic tokens defined in `@theme` (`bg-surface`, `text-text-primary`)
3. Scene palette tokens from DESIGN_DOC.md (`bg-welcome-start`)

Never use raw hex or arbitrary OKLCH values in `className`.

### Gradient Construction

```tsx
/* Scene gradient — tokens from DESIGN_DOC.md */
<div className="bg-gradient-to-br from-welcome-start to-welcome-end">

/* Subtle overlay gradient */
<div className="bg-gradient-to-b from-transparent via-transparent to-black/20">
```

### Opacity

Use Tailwind opacity modifier syntax, not separate `opacity-*` utilities.

```tsx
// BAD
<div className="bg-black opacity-50">

// GOOD
<div className="bg-black/50">
```

## Accessibility

### Focus States (Mandatory)

Every interactive element (`<button>`, `<a>`, `<input>`, clickable `<div>`) MUST have a visible `focus-visible` ring.

```tsx
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2";

<button className={clsx(
  "rounded-lg px-4 py-2",
  FOCUS_RING
)}>
```

### Reduced Motion

Wrap all transition and animation utilities with `motion-safe:`.

```tsx
<div className={clsx(
  "motion-safe:transition-all motion-safe:duration-200",
  "motion-reduce:transition-none"
)}>
```

Exception: `opacity` transitions are safe for `prefers-reduced-motion` users and do not require the prefix.

### Touch Targets

Minimum 44x44px for all touch targets on mobile (Apple HIG requirement).

```tsx
<button className="min-h-11 min-w-11 p-3">
```

### Contrast Requirements

- Body text on backgrounds: minimum 4.5:1 ratio (WCAG AA)
- Large text (18px+ bold or 24px+ regular): minimum 3:1
- Non-text UI elements: minimum 3:1

## Component Templates

### Premium Card

```tsx
function Card({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}): React.ReactNode {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-border-subtle",
        "bg-surface-elevated p-6",
        "shadow-sm",
        "motion-safe:transition-shadow motion-safe:duration-200",
        "hover:shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
```

### Interactive Option (Quiz Pattern)

```tsx
function QuizOption({
  label,
  isCorrect,
  isSelected,
  onSelect,
}: {
  readonly label: string;
  readonly isCorrect: boolean | null;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}): React.ReactNode {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-state={isSelected ? (isCorrect ? "correct" : "incorrect") : "idle"}
      className={clsx(
        "w-full rounded-xl border px-5 py-4 text-left text-base font-medium",
        "motion-safe:transition-all motion-safe:duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        "data-[state=idle]:border-border-default data-[state=idle]:bg-surface",
        "data-[state=idle]:hover:border-border-focus data-[state=idle]:hover:bg-blue-50/50",
        "data-[state=correct]:border-emerald-400 data-[state=correct]:bg-emerald-50",
        "data-[state=correct]:text-emerald-900",
        "data-[state=incorrect]:border-red-400 data-[state=incorrect]:bg-red-50",
        "data-[state=incorrect]:text-red-900",
      )}
    >
      {label}
    </button>
  );
}
```

### Scene Container (Full Viewport)

```tsx
function SceneContainer({
  children,
  gradient,
}: {
  readonly children: React.ReactNode;
  readonly gradient: "welcome" | "search" | "poetry" | "letter" | "ask";
}): React.ReactNode {
  const gradientMap = {
    welcome: "from-welcome-start to-welcome-end",
    search: "from-search-start to-search-end",
    poetry: "from-poetry-start to-poetry-end",
    letter: "from-letter-start to-letter-end",
    ask: "from-ask-start to-ask-end",
  } as const;

  return (
    <div
      className={clsx(
        "grid min-h-dvh place-items-center bg-gradient-to-br p-6",
        gradientMap[gradient],
      )}
    >
      {children}
    </div>
  );
}
```

## Anti-Slop Rules

These markers identify low-quality, machine-generated UI. Their presence triggers rejection.

1. **Uniform border-radius everywhere** — Vary `rounded-lg`, `rounded-xl`, `rounded-2xl` by element purpose
2. **Excessive gradients** — One gradient per scene (the background). Cards and buttons use flat colors
3. **Shadow on everything** — Shadow implies elevation. Flat elements get no shadow
4. **Generic gray palette** — Use the scene-specific color palette from DESIGN_DOC.md
5. **Identical spacing** — Vary spacing by hierarchy: tighter inside components, generous between sections
6. **Decorative borders on text** — Borders are structural, not decorative
7. **Multiple font families in one view** — Maximum 2 families per screen (Inter + Playfair Display per spec)
8. **Centering everything** — Left-align body text. Center only headings and single-focus elements
9. **Opacity as a design crutch** — If you need `opacity-50` on text, use `text-text-muted` instead
10. **Hover effects on non-interactive elements** — `hover:` only on elements with click handlers

## Validation Checklist

Before declaring styling output complete:

- [ ] All colors reference semantic tokens or Tailwind palette — no raw hex in `className`
- [ ] All interactive elements have `focus-visible:ring-*` states
- [ ] All animations wrapped in `motion-safe:` where appropriate
- [ ] All touch targets meet 44x44px minimum
- [ ] All gradients match DESIGN_DOC.md scene palette
- [ ] No `@apply` in CSS files
- [ ] No arbitrary pixel values where Tailwind scale suffices
- [ ] No `!important` or `!` prefix utilities
- [ ] Class strings use `clsx` for conditionals, not template interpolation
- [ ] Typography uses maximum 3 weights per view
- [ ] `min-h-dvh` used instead of `min-h-screen` for mobile
- [ ] Spacing follows 4px base unit scale
