# [PH-06] Harden UI for Native Fidelity and Validate Scene Progression

## Context

The app must be indistinguishable from a native Swift implementation per CLAUDE.md Section 7.3. While `globals.css` already contains comprehensive browser resets (tap highlight, callout, overscroll, selection, body lock, input zoom prevention), three scene components reference undefined safe area utility classes (`pt-safe-top`, `pb-safe-bottom`) that produce no padding on device. The remaining three scenes lack safe area padding entirely. This Epic defines the missing utilities, applies safe area insets uniformly, verifies zero browser artifacts survive on iOS, and validates the complete 6-scene progression on Simulator.

**Design Doc Reference:** Section 5 — Scene Specifications, Section 6 — Visual Design System, Section 8 — Capacitor Configuration
**Phase:** `PH-06` — Mobile Polish & Native Build
**Blocks:** None
**Blocked By:** `configure-capacitor-native-shell` (iOS project must exist for Simulator validation)

---

## Scope

### In Scope

- Define safe area inset Tailwind v4 utilities (`pt-safe-top`, `pb-safe-bottom`) in `src/app/globals.css` using `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`
- Apply safe area padding to all 6 scene containers — currently only `poetry-canvas.tsx`, `letter.tsx`, and `the-ask.tsx` reference these classes; `welcome.tsx`, `quiz.tsx`, and `word-search.tsx` must be updated
- Verify focus rings (`focus-visible:`) appear only on keyboard navigation, not on touch/tap interaction
- Verify zero browser artifacts on iOS Simulator: no tap highlights, no callout menus, no text selection handles on UI chrome, no rubber-band overscroll on scene containers, no unintended input field chrome
- Verify all scene containers use `min-h-dvh` or `h-dvh` — zero instances of `vh` or Tailwind `screen` units
- Verify all tappable elements meet 44×44pt minimum touch target (Apple HIG) and fire appropriate haptic feedback via `@/lib/haptics`
- Verify all `<button>` elements have `type="button"` attribute
- Execute full 6-scene progression on iOS Simulator: Welcome → Quiz (all 5 correct) → Word Search (all 7 words + hidden message) → Poetry Canvas (submit text) → Letter (read through) → The Ask (test "No" degradation + "Yes" celebration)

### Out of Scope

- Scene logic changes (all scene behavior is complete from PH-03/04/05)
- Animation timing or spring value adjustments (PH-07 performance audit)
- Capacitor native shell configuration (covered in `configure-capacitor-native-shell`)
- Otter asset compression (covered in `optimize-otter-assets`)
- SMS deep link testing on physical device (requires real device, PH-07 scope)

---

## Technical Approach

### Architecture

Safe area insets are enabled by the `viewportFit: "cover"` meta viewport setting already present in `src/app/layout.tsx`. This causes the WebView to extend content behind the status bar and home indicator, making `env(safe-area-inset-*)` values available in CSS. Tailwind CSS v4 supports custom utilities via the `@utility` directive in `globals.css`, which is the correct mechanism for defining `pt-safe-top` and `pb-safe-bottom`.

The audit is verification-first: most compliance is already achieved. The primary code changes are (1) defining 2 missing utility classes and (2) adding safe area classes to 3 scene containers.

### Key Files

| File                                      | Action | Purpose                                                              |
| ----------------------------------------- | ------ | -------------------------------------------------------------------- |
| `src/app/globals.css`                     | Modify | Add `@utility pt-safe-top` and `@utility pb-safe-bottom` definitions |
| `src/components/scenes/welcome.tsx`       | Modify | Add `pt-safe-top pb-safe-bottom` to scene container                  |
| `src/components/scenes/quiz.tsx`          | Modify | Add `pt-safe-top pb-safe-bottom` to scene container                  |
| `src/components/scenes/word-search.tsx`   | Modify | Add `pt-safe-top pb-safe-bottom` to scene container                  |
| `src/components/scenes/poetry-canvas.tsx` | Verify | Confirm `pt-safe-top pb-safe-bottom` already present                 |
| `src/components/scenes/letter.tsx`        | Verify | Confirm `pt-safe-top pb-safe-bottom` already present                 |
| `src/components/scenes/the-ask.tsx`       | Verify | Confirm `pt-safe-top pb-safe-bottom` already present                 |

### Dependencies

| Package       | Version  | Import                                                    |
| ------------- | -------- | --------------------------------------------------------- |
| `tailwindcss` | `^4.0.0` | CSS framework — `@utility` directive for custom utilities |

### Implementation Details

**Safe Area Utility Definitions in `globals.css`:**

Add after the existing browser reset rules:

```css
@utility pt-safe-top {
  padding-top: env(safe-area-inset-top);
}

@utility pb-safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

These utilities produce zero padding on devices without a notch/Dynamic Island (the `env()` values resolve to `0px`), so they are safe to apply universally.

**Scene Container Pattern:**

Each scene's root `motion.div` must include both utilities:

```tsx
<motion.div
  key="scene-name"
  className="... min-h-dvh pt-safe-top pb-safe-bottom ..."
  // ...
>
```

**Current Compliance Matrix (from codebase audit):**

| Check                                      | Status   | Notes                                                   |
| ------------------------------------------ | -------- | ------------------------------------------------------- |
| `-webkit-tap-highlight-color: transparent` | Pass     | Applied globally via `*` selector                       |
| `-webkit-touch-callout: none`              | Pass     | Applied globally via `*` selector                       |
| `overscroll-behavior: none`                | Pass     | Applied on `html` element                               |
| `user-select: none`                        | Pass     | Applied on `body`, re-enabled on `input`/`textarea`     |
| Body `position: fixed`                     | Pass     | Prevents body scroll                                    |
| Input `font-size: 16px`                    | Pass     | Prevents iOS zoom on focus                              |
| All buttons `type="button"`                | Pass     | All 8+ button instances verified                        |
| All buttons `min-h-11` (44px)              | Pass     | All interactive elements meet HIG                       |
| All haptics via `@/lib/haptics`            | Pass     | Zero direct `@capacitor/haptics` imports in components  |
| All containers `dvh` units                 | Pass     | Zero `vh` or `screen` instances                         |
| `focus-visible:` on interactives           | Pass     | All buttons have focus-visible ring styles              |
| Safe area utilities defined                | **Fail** | `pt-safe-top`, `pb-safe-bottom` not defined in CSS      |
| Safe area applied to all scenes            | **Fail** | Missing on `welcome.tsx`, `quiz.tsx`, `word-search.tsx` |

---

## Stories

### Story 1: Define safe area inset utilities in Tailwind CSS

**As a** developer,
**I want** `pt-safe-top` and `pb-safe-bottom` Tailwind utilities defined in `globals.css`,
**So that** scene containers can apply safe area padding via class names.

**Acceptance Criteria:**

```gherkin
Given globals.css contains @utility pt-safe-top and @utility pb-safe-bottom definitions
When a component applies className="pt-safe-top pb-safe-bottom"
Then padding-top equals env(safe-area-inset-top) on the rendered element
And padding-bottom equals env(safe-area-inset-bottom) on the rendered element
And pnpm build succeeds without CSS parsing errors
And npx biome check . passes with zero diagnostics
```

### Story 2: Apply safe area padding to all scene containers

**As a** user,
**I want** content to never overlap with the Dynamic Island or home indicator,
**So that** every scene is fully visible and usable on iPhone 15/16 Pro.

**Acceptance Criteria:**

```gherkin
Given all 6 scene root containers include pt-safe-top and pb-safe-bottom classes
When the app renders any scene on an iPhone 15 Pro or iPhone 16 Pro Simulator
Then no text or interactive element is obscured by the Dynamic Island area
And no text or interactive element is obscured by the home indicator bar
And padding adjusts correctly when the device has no notch (env() resolves to 0px)
```

### Story 3: Verify zero browser artifacts on iOS Simulator

**As a** user,
**I want** the app to look and feel native with no browser-like behaviors,
**So that** the experience is indistinguishable from a native Swift app.

**Acceptance Criteria:**

```gherkin
Given the app is running on iOS Simulator
When I tap any button or interactive element
Then no orange/blue tap highlight rectangle appears

When I long-press any text element
Then no callout menu (Copy/Look Up/Share) appears
And no text selection handles appear

When I scroll or swipe within any scene
Then no rubber-band overscroll effect occurs on the scene container
And no pull-to-refresh gesture is triggered

When I tap into the Poetry Canvas textarea
Then no browser-default input chrome (shadows, borders, outlines) appears beyond the intentional styling
And the keyboard does not push content off-screen
```

### Story 4: Verify touch targets and haptic feedback wiring

**As a** user,
**I want** every tappable element to be easy to hit and provide tactile feedback,
**So that** interactions feel responsive and satisfying.

**Acceptance Criteria:**

```gherkin
Given every button and interactive element has a minimum rendered size of 44x44pt
When I tap a button on the Welcome scene
Then haptic.light() fires on the tap event

When I tap a correct quiz answer
Then haptic.success() fires on selection

When I tap a wrong quiz answer
Then haptic.error() fires on selection

When I complete a word selection in Word Search
Then haptic.medium() fires for valid words

When I tap Submit on Poetry Canvas
Then haptic.light() fires on the tap event

When I tap "No" on The Ask scene
Then haptic.heavy() fires on each press

When I tap "Yes" on The Ask scene
Then haptic.success() and haptic.vibrate() fire
```

### Story 5: Verify dvh viewport units on all scene containers

**As a** developer,
**I want** zero instances of `vh` or Tailwind `screen` units in the codebase,
**So that** scene containers size correctly on iOS devices with dynamic toolbars.

**Acceptance Criteria:**

```gherkin
Given a grep search for "100vh", "h-screen", or "min-h-screen" in src/
When the search completes
Then zero matches are found
And every scene container uses min-h-dvh or h-dvh for height
```

### Story 6: Validate full 6-scene progression on iOS Simulator

**As a** user,
**I want** to complete the entire app experience without crashes or visual breaks,
**So that** the Valentine's Day experience delivers flawlessly.

**Acceptance Criteria:**

```gherkin
Given the app is running on iPhone 15 Pro Simulator
When I tap anywhere on the Welcome scene
Then the app transitions to the Quiz scene without layout breaks

When I answer all 5 quiz questions correctly
Then the app transitions to the Word Search scene

When I find all 7 words and the hidden message reveals
Then the app transitions to the Poetry Canvas scene

When I type text and submit on Poetry Canvas
Then the response displays and Continue appears after 2s
And tapping Continue transitions to the Letter scene

When I read through the Letter and tap Continue
Then the app transitions to The Ask scene

When I tap "Yes" on The Ask scene
Then confetti fires, otter swaps to party mode, and the SMS CTA appears
And no crashes, console errors, or unrecoverable states occur during the entire progression
```

---

## Exit Criteria

- [ ] `pt-safe-top` and `pb-safe-bottom` utilities defined in `src/app/globals.css` using `@utility` directive
- [ ] All 6 scene containers include `pt-safe-top pb-safe-bottom` in their root `className`
- [ ] `pnpm build` passes with zero errors after CSS changes
- [ ] `npx biome check .` passes with zero diagnostics
- [ ] Zero browser artifacts visible on iOS Simulator (no tap highlights, callout menus, text selection handles, rubber-band overscroll)
- [ ] All interactive elements meet 44×44pt minimum touch target
- [ ] All interactive elements fire appropriate haptic feedback via `@/lib/haptics`
- [ ] Zero instances of `vh` or `screen` units in `src/` directory
- [ ] All `<button>` elements have `type="button"` attribute
- [ ] Full 6-scene progression completes on iPhone 15 Pro Simulator without crashes, layout breaks, or unrecoverable states
