---
name: mobile-native
description: Enforce iOS-native fidelity and Capacitor best practices for all layout, interaction, and input code. Use when writing or modifying any component layout, touch interaction, scroll container, text input, or viewport-related code in .tsx or .css files. Strips browser defaults to treat WebKit purely as a rendering surface, not a document viewer.
---

# Mobile Native

Strip every browser default that betrays the web origin. The WebView is a rendering surface — not Safari. All layout and interaction code MUST comply with these standards.

## The App Test

> If it scrolls like a webpage, selects like a webpage, or highlights like a webpage — it is a failure.

Every interactive element must feel physically connected to the user's finger. No phantom highlights, no rubber-banding, no text selection handles on UI chrome.

## Viewport Configuration

### Meta Tag (Non-Negotiable)

The root `layout.tsx` MUST include `viewport-fit=cover` in the viewport metadata export:

```typescript
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};
```

### Dynamic Viewport Units

Use `dvh` exclusively. Never `vh`.

| Banned Unit    | Replacement | Reason                                                     |
| -------------- | ----------- | ---------------------------------------------------------- |
| `100vh`        | `100dvh`    | `vh` ignores iOS dynamic toolbar, causing content overflow |
| `min-h-screen` | `min-h-dvh` | Tailwind's `screen` maps to `100vh`                        |
| `h-screen`     | `h-dvh`     | Same issue                                                 |
| `max-h-screen` | `max-h-dvh` | Same issue                                                 |

`dvh` adapts to the visible viewport as the Safari toolbar shows/hides. `vh` does not.

## Safe Area Insets — Respect the Notch

### Capacitor Prerequisite

`capacitor.config.ts` MUST set `ios.contentInset: "always"` (already configured in this project). This enables edge-to-edge rendering, making safe area padding the app's responsibility.

### CSS Environment Variables

Use `env()` with fallbacks for safe area insets:

```css
padding-top: env(safe-area-inset-top, 0px);
padding-bottom: env(safe-area-inset-bottom, 0px);
padding-left: env(safe-area-inset-left, 0px);
padding-right: env(safe-area-inset-right, 0px);
```

### Safe Area Container Pattern

Every full-screen scene MUST wrap content in a safe area container. Use Tailwind arbitrary values for `env()`:

```tsx
function SafeAreaContainer({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}): React.ReactNode {
  return (
    <div
      className={clsx(
        "flex min-h-dvh flex-col",
        "pt-[env(safe-area-inset-top,0px)]",
        "pb-[env(safe-area-inset-bottom,0px)]",
        "pl-[env(safe-area-inset-left,0px)]",
        "pr-[env(safe-area-inset-right,0px)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
```

### Bottom Interactive Elements

Buttons, CTAs, or navigation near the bottom edge MUST add extra bottom padding to clear the Home Indicator:

```tsx
<div className="pb-[max(env(safe-area-inset-bottom,0px),1.5rem)]">
  <button type="button">Continue</button>
</div>
```

## Browser Sanitization — Global CSS

### Mandatory Resets

Add these to `globals.css` inside a `@layer base {}` block:

```css
@layer base {
  *,
  *::before,
  *::after {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
  }

  html {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    overscroll-behavior: none;
  }

  body {
    position: fixed;
    inset: 0;
    overflow: hidden;
    overscroll-behavior: none;
    user-select: none;
    -webkit-user-select: none;
  }
}
```

### Property Rationale

| Property                                       | Purpose                                                        |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `-webkit-tap-highlight-color: transparent`     | Removes blue/gray flash on tap                                 |
| `-webkit-touch-callout: none`                  | Disables long-press callout (copy/lookup/share)                |
| `overscroll-behavior: none`                    | Kills rubber-band bounce at scroll boundaries                  |
| `position: fixed` + `overflow: hidden` on body | Prevents body scroll entirely — scroll containers are explicit |
| `user-select: none`                            | Disables text selection globally (opt-in per element)          |
| `-webkit-text-size-adjust: 100%`               | Prevents font inflation on orientation change                  |

## Text Selection — Opt-In Only

Default is `user-select: none` (set globally on `body`). Only specific content receives selection capability:

| Content Type                 | Selection         | Implementation                    |
| ---------------------------- | ----------------- | --------------------------------- |
| UI labels, buttons, headings | `none` (default)  | No action needed                  |
| Letter body (Scene 4)        | `text`            | Add `select-text` class           |
| Poetry input (Scene 3)       | `text` (implicit) | `<textarea>` / `<input>` inherits |
| Error messages, toasts       | `none`            | Default                           |

Apply selectively:

```tsx
{
  /* Letter content — allow selection for copy */
}
<p className="select-text">Letter paragraph here</p>;
```

## Scroll Management — Explicit Containers

### No Body Scroll

The `body` is `position: fixed` and `overflow: hidden`. All scrollable regions are explicit inner containers.

### Scrollable Region Pattern

```tsx
<div className="flex-1 overflow-y-auto overscroll-none">
  {/* Scrollable content */}
</div>
```

### Rules

- Every scene occupies the full viewport — no document-level scrolling.
- If a scene needs internal scroll (e.g., Letter), wrap the scrollable region in a container with `overflow-y-auto` and `overscroll-none`.
- Never set `overflow: auto` or `overflow: scroll` on `html` or `body`.

## Haptic Feedback — If You Tap It, It Clicks Back

### Mandatory Haptics

Every tappable element MUST trigger haptic feedback. No silent interactions.

| Interaction                           | Haptic Call                                | Rationale             |
| ------------------------------------- | ------------------------------------------ | --------------------- |
| Navigation tap (e.g., "Tap to start") | `haptic.light()`                           | Acknowledgment        |
| Option selection (quiz answers)       | `haptic.light()`                           | Selection feedback    |
| Correct answer                        | `haptic.success()`                         | Reward                |
| Wrong answer                          | `haptic.error()`                           | Playful correction    |
| Word found (drag complete)            | `haptic.medium()`                          | Satisfying discovery  |
| Hidden message reveal                 | `haptic.pattern(3, 100)`                   | Building excitement   |
| Poem submit                           | `haptic.light()`                           | Gentle acknowledgment |
| "No" button press                     | `haptic.heavy()`                           | Dramatic comedy       |
| "Yes" button press                    | `haptic.success()` then `haptic.vibrate()` | Full celebration      |

### Abstraction Enforcement

Import ONLY from `@/lib/haptics`. Direct imports from `@capacitor/haptics` in components are FORBIDDEN.

```typescript
// FORBIDDEN in components
import { Haptics } from "@capacitor/haptics";

// REQUIRED
import { haptic } from "@/lib/haptics";
```

### Event Handler Pattern

Haptics fire synchronously with the interaction — never deferred, never in `useEffect`.

```tsx
function handleTap(): void {
  haptic.light();
  onComplete();
}

<button type="button" onClick={handleTap}>
  Tap to start
</button>;
```

## Input Styling — No iOS Defaults

### Global Input Reset

Add to `globals.css` inside `@layer base {}`:

```css
@layer base {
  input,
  textarea,
  select {
    appearance: none;
    -webkit-appearance: none;
    border-radius: 0;
  }

  input:focus,
  textarea:focus {
    outline: none;
  }
}
```

### Zoom Prevention

iOS Safari zooms the viewport when focusing inputs with `font-size` below 16px. All text inputs MUST use `text-base` (16px) or larger.

```tsx
{
  /* BAD — triggers iOS zoom */
}
<input className="text-sm" />;

{
  /* GOOD — no zoom */
}
<input className="text-base" />;
```

### Poetry Canvas Input (Scene 3)

The textarea must feel like paper, not a form field:

```tsx
<textarea
  className={clsx(
    "w-full resize-none bg-transparent",
    "text-[22px] leading-relaxed",
    "placeholder:text-text-muted/50",
    "caret-current",
    "select-text",
  )}
  autoComplete="off"
  autoCorrect="off"
  spellCheck={false}
/>
```

## Touch Target Sizing

All interactive elements MUST meet Apple HIG minimum of 44x44pt:

```tsx
{
  /* Minimum touch target */
}
<button type="button" className="min-h-11 min-w-11">
  {/* content */}
</button>;
```

For icon-only buttons, add transparent padding to expand the hit area:

```tsx
<button type="button" className="p-3">
  <Icon className="h-5 w-5" />
</button>
```

## Prohibitions

These patterns are **banned**. Their presence in layout or interaction code is a merge blocker.

| Banned Pattern                                    | Use Instead                       |
| ------------------------------------------------- | --------------------------------- |
| `alert()`, `confirm()`, `prompt()`                | Custom UI components              |
| `100vh`, `h-screen`, `min-h-screen`               | `100dvh`, `h-dvh`, `min-h-dvh`    |
| `overflow: auto` on `body` or `html`              | Explicit scroll containers        |
| Direct `@capacitor/haptics` imports in components | `@/lib/haptics` abstraction       |
| `font-size` below 16px on inputs                  | `text-base` minimum               |
| Missing haptic on tappable elements               | Add appropriate `haptic.*()` call |
| `user-select: auto` on UI chrome                  | Default `none` covers this        |
| `-webkit-overflow-scrolling: touch` (deprecated)  | `overscroll-behavior: none`       |
| `window.scrollTo`, `document.body.scrollTop`      | Scroll container refs             |
| Inline `onclick` without `type="button"`          | Always set `type="button"`        |

## Validation Checklist

Before declaring layout or interaction code complete:

- [ ] Viewport metadata includes `viewportFit: "cover"` and `userScalable: false`
- [ ] All height units use `dvh` — zero instances of `vh` or `screen`
- [ ] Safe area insets applied via `env()` on scene containers
- [ ] Global CSS includes tap highlight, callout, overscroll, and selection resets
- [ ] Body is `position: fixed` with `overflow: hidden`
- [ ] All scrollable regions are explicit inner containers with `overscroll-none`
- [ ] Every tappable element fires haptic feedback
- [ ] Haptics imported from `@/lib/haptics` only
- [ ] All inputs reset with `appearance: none` and `border-radius: 0`
- [ ] All text inputs use `text-base` (16px) or larger
- [ ] Touch targets meet 44x44pt minimum
- [ ] No `alert()`, `confirm()`, or `prompt()` calls
- [ ] Text selection is `none` by default, `text` only on readable content
