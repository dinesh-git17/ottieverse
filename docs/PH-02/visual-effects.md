# [PH-02] Build Canvas-Based Visual Effect Systems

## Context

Two canvas-based particle systems provide the app's visual flair: a floating hearts ambient layer and a confetti explosion. Per DESIGN_DOC.md Section 6, the floating hearts system gradually intensifies across the scene progression — zero particles in Scenes 0-2, 3-5 subtle hearts in Scene 3, 8-10 in Scene 4, and 20+ at full density in Scene 5. The confetti system (DESIGN_DOC.md Section 5, Scene 5) fires 200+ particles on an imperative trigger with a 3-second duration and automatic cleanup. Both systems render as `pointer-events: none` canvas overlays that never intercept user interaction.

**Design Doc Reference:** Section 6 — Visual Design System (Ambient Layer); Section 5 — Scene Specifications (Scene 5 confetti)
**Phase:** `PH-02` — Scene Engine & Shared UI
**Blocks:** None
**Blocked By:** scene-engine (`experience.tsx` must exist before floating-hearts can be wired as a top-level overlay)

---

## Scope

### In Scope

- `src/components/ui/floating-hearts.tsx`: Canvas-based ambient heart particle system with scene-gated density
  - Density map per DESIGN_DOC.md Section 6: Scenes 0-2 = 0 hearts, Scene 3 = 3-5, Scene 4 = 8-10, Scene 5 = 20+
  - Hearts float upward with gentle sinusoidal horizontal drift and gradual opacity fade
  - Canvas overlay with `pointer-events: none` and `position: fixed`
  - Scene 5 uses mixed particle sizes per DESIGN_DOC.md Section 6 ("mixed sizes")
- `src/components/ui/confetti.tsx`: Canvas-based confetti explosion system
  - Imperative trigger via `useImperativeHandle` exposing a `fire()` method
  - 200+ particles on trigger per DESIGN_DOC.md Section 5 Scene 5
  - 3-second duration with auto-cleanup per DESIGN_DOC.md Section 5 Scene 5
  - Canvas overlay with `pointer-events: none` and `position: fixed`
- Integration: `experience.tsx` renders `<FloatingHearts scene={currentScene} />` as a top-level overlay after the scene-engine Epic is complete

### Out of Scope

- Third-party particle libraries or physics engines (pure canvas 2D rendering)
- WebGL or GPU compute shader particles (canvas 2D sufficient for target counts)
- Confetti trigger wiring from Scene 5 "Yes" button (PH-05 responsibility)
- Floating hearts integration into the app — limited to component creation; wiring into `experience.tsx` happens as a follow-up modification after the scene-engine Epic lands

---

## Technical Approach

### Architecture

- Both components use the HTML5 Canvas 2D API with `requestAnimationFrame` loops
- Particle state stored in plain mutable arrays — no React state for individual particles (performance-critical: avoid re-renders for 200+ particles at 60fps)
- Canvas dimensions match viewport via initial `window.innerWidth` / `window.innerHeight` measurement, updated on resize
- Both components render a `<canvas>` element with `pointer-events: none` and `position: fixed` covering the full viewport
- Floating hearts runs a continuous RAF loop gated by particle count (zero particles = no loop active)
- Confetti uses an imperative pattern: parent holds a ref, calls `ref.current.fire()`, and the component manages the full particle lifecycle internally

### Key Files

| File                                    | Action | Purpose                                               |
| --------------------------------------- | ------ | ----------------------------------------------------- |
| `src/components/ui/floating-hearts.tsx` | Create | Ambient heart particle canvas overlay                 |
| `src/components/ui/confetti.tsx`        | Create | Imperative confetti explosion canvas overlay          |
| `src/components/experience.tsx`         | Modify | Add `<FloatingHearts scene={currentScene} />` overlay |

### Dependencies

| Package  | Version   | Import                                                                                  |
| -------- | --------- | --------------------------------------------------------------------------------------- |
| `react`  | `^19.0.0` | `import { useRef, useEffect, useCallback, useState, useImperativeHandle } from "react"` |
| Internal | PH-01     | `import type { Scene } from "@/types"`                                                  |

### Implementation Details

#### Floating Hearts

**Component props:**

```typescript
type FloatingHeartsProps = {
  readonly scene: Scene;
};
```

**Density mapping (from DESIGN_DOC.md Section 6 Ambient Layer):**

```typescript
const HEART_DENSITY: Record<Scene, readonly [min: number, max: number]> = {
  welcome: [0, 0],
  quiz: [0, 0],
  "word-search": [0, 0],
  "poetry-canvas": [3, 5],
  letter: [8, 10],
  "the-ask": [20, 25],
} as const;
```

**Internal particle structure (not exported):**

```typescript
type HeartParticle = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  drift: number;
  phase: number;
};
```

**Particle behavior:**

- Spawn at random `x` positions at the bottom of the viewport
- Float upward at individual speeds (0.3-0.8 px/frame baseline)
- Drift horizontally via `Math.sin(phase)` with phase incrementing per frame
- When a particle exits the top of the viewport, it respawns at the bottom with new random properties
- Particle sizes: Scenes 3-4 use small uniform hearts (8-12px); Scene 5 uses mixed sizes (8-20px) per DESIGN_DOC.md Section 6 "mixed sizes"

**Heart rendering — canvas path:**

Hearts drawn via two quadratic bezier curves forming the classic heart shape. Each heart is filled with a semi-transparent warm color.

[BLOCKER: DESIGN_DOC.md Section 6 does not specify exact color values for floating heart particles. Implementing with warm pink/red/rose tones derived from the scene palette CSS custom properties: `--color-ask-start: #fda4af` (rose-300), `--color-poetry-end: #f43f5e` (rose-500). Must validate on device.]

**Animation loop lifecycle:**

- When scene changes and density is 0 (Scenes 0-2): no RAF loop runs, canvas is clear
- When scene changes and density increases: particles spawn gradually (staggered, not all at once) and RAF loop starts
- When scene changes and density decreases: existing particles fade out before new density takes effect
- On unmount: RAF loop is cancelled via `cancelAnimationFrame`

#### Confetti

**Imperative handle type:**

```typescript
type ConfettiHandle = {
  readonly fire: () => void;
};
```

**Component props (React 19 ref-as-prop pattern):**

```typescript
type ConfettiProps = {
  readonly ref?: React.Ref<ConfettiHandle>;
};
```

**Internal particle structure (not exported):**

```typescript
type ConfettiParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  opacity: number;
};
```

**Physics constants:**

```typescript
const CONFETTI_GRAVITY = 0.15;
const CONFETTI_PARTICLE_COUNT = 220;
const CONFETTI_DURATION_MS = 3000;
```

**Particle behavior on `fire()`:**

- Generate 220 particles (exceeds 200+ requirement) at the center-top area of the viewport
- Each particle receives random velocity (`vx`: -8 to 8, `vy`: -12 to -3), rotation speed, color from a festive palette, and size (6-10px)
- Per frame: `vy += CONFETTI_GRAVITY` (gravity), `x += vx`, `y += vy`, `rotation += rotationSpeed`, opacity fades linearly over the final 1s
- After 3 seconds elapsed since `fire()`, the RAF loop stops and the canvas clears

[BLOCKER: DESIGN_DOC.md Section 5 does not specify exact confetti particle colors. Implementing with a festive multi-color palette (rose, amber, teal, violet, gold) derived from the scene gradient tokens. Must validate on device.]

**Canvas rendering per particle:**

```typescript
ctx.save();
ctx.translate(p.x, p.y);
ctx.rotate(p.rotation);
ctx.globalAlpha = p.opacity;
ctx.fillStyle = p.color;
ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
ctx.restore();
```

**Integration into experience.tsx:**

After the scene-engine Epic is complete, `experience.tsx` adds the floating-hearts overlay as a sibling after the `SceneTransition` wrapper:

```typescript
<FloatingHearts scene={state.currentScene} />
```

Positioned `fixed` to fill the viewport, rendered above scene content but below any modal UI.

---

## Stories

### Story 1: Render Zero Hearts in Early Scenes

**As a** user in Scenes 0-2 (Welcome, Quiz, Word Search),
**I want** no floating hearts visible,
**So that** the ambient effect does not distract from gameplay.

**Acceptance Criteria:**

```gherkin
Given the current scene is "welcome" or "quiz" or "word-search"
When FloatingHearts receives the scene prop
Then zero heart particles are drawn on the canvas
And no requestAnimationFrame loop is running
And the canvas element exists in the DOM with pointer-events: none
```

### Story 2: Gradually Increase Heart Density Across Scenes

**As a** user progressing from Scene 3 to Scene 5,
**I want** the floating hearts to gradually intensify,
**So that** the emotional tone builds toward the climax.

**Acceptance Criteria:**

```gherkin
Given the current scene is "poetry-canvas"
When FloatingHearts renders
Then 3-5 small hearts float upward with slow drift and subtle opacity

Given the current scene is "letter"
When FloatingHearts renders
Then 8-10 hearts float upward with slightly increased visibility

Given the current scene is "the-ask"
When FloatingHearts renders
Then 20+ hearts of mixed sizes fill the viewport at full visual density
```

### Story 3: Hearts Float Upward with Natural Drift

**As a** user observing the ambient layer,
**I want** hearts to float upward with gentle horizontal sway,
**So that** the motion feels organic and calming.

**Acceptance Criteria:**

```gherkin
Given floating hearts are active (Scene 3 or later)
When the requestAnimationFrame loop runs
Then each heart moves upward at its individual speed
And each heart drifts horizontally using sinusoidal motion
And hearts that exit the top of the viewport respawn at the bottom with new random properties
And the animation maintains 60fps with the target particle count
```

### Story 4: Fire Confetti Explosion on Imperative Trigger

**As a** developer triggering the confetti from Scene 5,
**I want** to call `confettiRef.current.fire()` imperatively,
**So that** the celebration fires at the exact moment of the "Yes" press.

**Acceptance Criteria:**

```gherkin
Given a Confetti component is mounted with a ref
When the parent calls ref.current.fire()
Then 200+ confetti particles spawn from the center-top area of the viewport
And particles fan outward with random velocities
And particles experience gravity (vy increases each frame), rotation, and gradual opacity fade
And the canvas overlay has pointer-events: none
```

### Story 5: Auto-Cleanup Confetti After 3 Seconds

**As a** user watching the confetti celebration,
**I want** the confetti to resolve and clean up automatically,
**So that** the celebration has a defined duration and the canvas does not persist particles indefinitely.

**Acceptance Criteria:**

```gherkin
Given confetti has been fired via ref.current.fire()
When 3 seconds have elapsed
Then all particles have fallen below the viewport or faded to zero opacity
And the requestAnimationFrame loop stops
And the canvas is cleared
```

### Story 6: Canvas Overlays Never Block User Interaction

**As a** user interacting with scene elements,
**I want** the canvas particle layers to never intercept my taps or gestures,
**So that** buttons, drag interactions, and all other interactive UI remain fully functional beneath the effects.

**Acceptance Criteria:**

```gherkin
Given FloatingHearts or Confetti canvas is rendered as a viewport overlay
When the user taps or drags on the screen
Then the tap or drag passes through the canvas to the underlying scene elements
And the canvas element has pointer-events: none in its inline styles
And the canvas element has position: fixed covering the full viewport
```

### Story 7: Clean Up Animation Loops on Unmount

**As a** developer managing component lifecycle,
**I want** all RAF loops and timers to be cancelled when the components unmount,
**So that** there are no orphaned animation frames or memory leaks.

**Acceptance Criteria:**

```gherkin
Given FloatingHearts or Confetti is running a requestAnimationFrame loop
When the component unmounts
Then cancelAnimationFrame is called with the active frame ID
And no canvas draw calls occur after unmount
```

---

## Exit Criteria

- [ ] `pnpm build` produces clean static export with zero errors
- [ ] `npx biome check .` passes with zero diagnostics
- [ ] `floating-hearts.tsx` renders 0 hearts for scenes "welcome", "quiz", "word-search" per DESIGN_DOC.md Section 6
- [ ] `floating-hearts.tsx` renders 3-5 hearts for "poetry-canvas", 8-10 for "letter", 20+ for "the-ask" per DESIGN_DOC.md Section 6
- [ ] `floating-hearts.tsx` uses mixed particle sizes in Scene 5 per DESIGN_DOC.md Section 6
- [ ] `confetti.tsx` fires 200+ particles on imperative `fire()` trigger per DESIGN_DOC.md Section 5
- [ ] `confetti.tsx` auto-cleans up after 3-second duration per DESIGN_DOC.md Section 5
- [ ] Both canvas overlays use `pointer-events: none` and never intercept user interaction
- [ ] Both canvas overlays use `position: fixed` covering the full viewport
- [ ] Animation loops use `requestAnimationFrame` and clean up via `cancelAnimationFrame` on unmount
- [ ] `experience.tsx` renders `<FloatingHearts scene={currentScene} />` as a top-level overlay
- [ ] Canvas rendering maintains 60fps with target particle counts
- [ ] No `any` types in any file
- [ ] No unused variables or imports
- [ ] TypeScript compiles under strict mode with zero errors
