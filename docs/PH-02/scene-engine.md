# [PH-02] Build Scene State Machine and Transition Engine

## Context

The experience orchestrator governs the entire app flow as a `useReducer`-driven linear state machine defined in DESIGN_DOC.md Section 4. It renders the active scene component inside an `AnimatePresence mode="wait"` transition boundary, ensuring outgoing scenes fully exit before incoming scenes enter. Each scene receives a single `onComplete` callback prop to signal advancement without direct state machine coupling. This Epic establishes the core rendering pipeline that all scene implementations (PH-03 through PH-05) mount into.

**Design Doc Reference:** Section 4 — Scene Architecture
**Phase:** `PH-02` — Scene Engine & Shared UI
**Blocks:** visual-effects (floating-hearts integration requires `experience.tsx` to exist)
**Blocked By:** `PH-01` — Foundation & Tooling

---

## Scope

### In Scope

- `src/components/experience.tsx`: `useReducer` state machine with `Scene` discriminated union, exhaustive scene-to-component mapping, `onComplete` dispatch handler
- `src/components/ui/scene-transition.tsx`: Reusable `AnimatePresence mode="wait"` wrapper enforcing sequential exit-before-enter transitions
- `src/app/page.tsx`: Replace placeholder content with `<Experience />` mount
- Placeholder scene stubs (labeled `motion.div` elements returning the scene name) so the state machine is testable prior to PH-03 scene implementations
- Named spring preset constant for default scene enter/exit animations

### Out of Scope

- Individual scene component implementations (Welcome, Quiz, Word Search, Poetry Canvas, Letter, The Ask — PH-03 through PH-05)
- Floating hearts ambient layer and confetti system (separate visual-effects Epic in PH-02)
- Haptic feedback wiring (scene-specific, handled in PH-03+)
- Scene-specific gradient backgrounds (each scene controls its own background in PH-03+)
- Safe area inset application on scene containers (PH-06)

---

## Technical Approach

### Architecture

- `experience.tsx` is marked `'use client'` — the sole client boundary for the app shell
- `page.tsx` remains a server component that imports and renders the client `Experience` component — no `'use client'` directive on `page.tsx`
- State modeled via `useReducer` with a discriminated union action type (`ExperienceAction`)
- Scene rendering via exhaustive `switch` on `state.currentScene` with `assertNever` default branch
- `scene-transition.tsx` wraps children in `AnimatePresence mode="wait"` — individual scene components control their own `motion.div` enter/exit variants via the `key` prop
- Placeholder scene stubs return `motion.div` elements keyed by scene name with a shared default spring enter/exit animation, enabling full state machine testing before scene implementations land

### Key Files

| File                                     | Action | Purpose                                                                       |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| `src/components/experience.tsx`          | Create | `useReducer` state machine, scene-to-component mapping, `onComplete` dispatch |
| `src/components/ui/scene-transition.tsx` | Create | `AnimatePresence mode="wait"` wrapper component                               |
| `src/app/page.tsx`                       | Modify | Replace placeholder with `<Experience />`                                     |

### Dependencies

| Package  | Version    | Import                                                   |
| -------- | ---------- | -------------------------------------------------------- |
| `motion` | `^12.34.0` | `import { AnimatePresence, motion } from "motion/react"` |
| `react`  | `^19.0.0`  | `import { useReducer, useCallback } from "react"`        |
| Internal | PH-01      | `import type { Scene } from "@/types"`                   |
| Internal | PH-01      | `import { SCENE_ORDER } from "@/types"`                  |

### Implementation Details

**State type system:**

```typescript
type ExperienceState = {
  readonly currentScene: Scene;
};

type ExperienceAction = { readonly type: "ADVANCE" };
```

**Reducer function — enforces linear forward-only progression:**

```typescript
function experienceReducer(
  state: ExperienceState,
  action: ExperienceAction,
): ExperienceState {
  switch (action.type) {
    case "ADVANCE": {
      const currentIndex = SCENE_ORDER.indexOf(state.currentScene);
      const nextIndex = currentIndex + 1;
      if (nextIndex >= SCENE_ORDER.length) return state;
      return { currentScene: SCENE_ORDER[nextIndex] };
    }
  }
}
```

Initial state: `{ currentScene: "welcome" }`

**Scene component props interface (shared across all scenes):**

```typescript
type SceneProps = {
  readonly onComplete: () => void;
};
```

**Placeholder scene stubs** render a `motion.div` keyed by scene name with default spring-based fade + vertical slide:

```typescript
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0, transition: { type: "spring", ...SPRING_SCENE } }}
exit={{ opacity: 0, y: -20, transition: { type: "spring", ...SPRING_SCENE } }}
```

**Spring preset:**

[BLOCKER: DESIGN_DOC.md Section 4 describes scene transitions qualitatively ("Fade out -> slide up", "Slow dissolve", "Gentle fade") but does not specify exact `stiffness` / `damping` values for scene-level enter/exit transitions. The following values are functional placeholders pending device validation.]

```typescript
const SPRING_SCENE = { stiffness: 300, damping: 30 } as const;
```

**SceneTransition component API:**

```typescript
type SceneTransitionProps = {
  readonly children: React.ReactNode;
};
```

Renders `<AnimatePresence mode="wait">{children}</AnimatePresence>`. The `mode="wait"` prop is governance-critical per DESIGN_DOC.md Section 4 — outgoing scene must fully exit before incoming scene enters. The `key` prop on each scene's `motion.div` wrapper drives the exit/enter lifecycle.

**page.tsx modification:**

```typescript
import { Experience } from "@/components/experience";

export default function Page() {
  return <Experience />;
}
```

---

## Stories

### Story 1: Render Initial Scene on App Load

**As a** user opening the app,
**I want** the Welcome scene to appear immediately,
**So that** the experience begins without delay or loading states.

**Acceptance Criteria:**

```gherkin
Given the app is loaded in the iOS WebView
When the page renders
Then experience.tsx initializes with currentScene: "welcome"
And the Welcome placeholder motion.div is visible with its scene label
And the browser console shows zero errors
```

### Story 2: Advance Scene on Complete Callback

**As a** user completing a scene interaction,
**I want** the app to transition to the next scene,
**So that** the experience progresses linearly.

**Acceptance Criteria:**

```gherkin
Given the current scene is "welcome"
When the onComplete callback fires
Then the reducer dispatches "ADVANCE"
And currentScene updates to "quiz"
And the Welcome placeholder exits before the Quiz placeholder enters
```

```gherkin
Given the current scene is "the-ask" (final scene)
When the onComplete callback fires
Then the state remains unchanged
And no crash or navigation occurs
```

### Story 3: Enforce Sequential Exit/Enter Transitions

**As a** user watching scene changes,
**I want** the outgoing scene to fully exit before the incoming scene appears,
**So that** transitions feel polished and intentional.

**Acceptance Criteria:**

```gherkin
Given scene-transition.tsx wraps the rendered scene
When a scene transition occurs
Then AnimatePresence operates in mode="wait"
And the exiting motion.div completes its exit animation (opacity to 0, y to -20)
And only after exit completion does the entering motion.div begin (opacity 0 to 1, y 20 to 0)
And the enter/exit animations use spring physics with SPRING_SCENE preset
```

### Story 4: Exhaustive Scene Rendering

**As a** developer adding scene components in PH-03 through PH-05,
**I want** the state machine to have a placeholder for every `Scene` value,
**So that** no scene value results in a blank screen or runtime error.

**Acceptance Criteria:**

```gherkin
Given the Scene type has 6 values: welcome, quiz, word-search, poetry-canvas, letter, the-ask
When the scene-to-component switch evaluates any valid Scene value
Then a corresponding placeholder motion.div renders with the scene name as text
And the switch default branch calls assertNever to catch unhandled values at compile time
```

### Story 5: Mount Experience in Page Root

**As a** developer running the app,
**I want** `page.tsx` to render `<Experience />`,
**So that** the scene engine is the entry point for the entire app.

**Acceptance Criteria:**

```gherkin
Given page.tsx is a server component (no 'use client' directive)
When the page renders
Then it imports and renders Experience from @/components/experience
And experience.tsx contains the 'use client' directive
And the app renders without hydration errors
```

### Story 6: Full Scene Progression Through All Six Scenes

**As a** developer verifying the state machine,
**I want** to trigger `onComplete` six times and observe the full scene sequence,
**So that** the linear progression matches DESIGN_DOC.md Section 4.

**Acceptance Criteria:**

```gherkin
Given the app starts at "welcome"
When onComplete is triggered 5 times sequentially
Then the scene progresses through: welcome -> quiz -> word-search -> poetry-canvas -> letter -> the-ask
And each transition uses AnimatePresence mode="wait" with spring-based enter/exit
And the 6th onComplete call on "the-ask" produces no state change
```

---

## Exit Criteria

- [ ] `pnpm build` produces clean static export with zero errors
- [ ] `npx biome check .` passes with zero diagnostics
- [ ] `experience.tsx` renders the correct placeholder component for each of the 6 `Scene` values
- [ ] `experience.tsx` advances via `onComplete` callback through the full scene order: welcome -> quiz -> word-search -> poetry-canvas -> letter -> the-ask
- [ ] Scene transitions use `AnimatePresence mode="wait"` — outgoing scene exits before incoming enters
- [ ] All motion animations use spring physics (no `duration`/`ease` on transform properties)
- [ ] `page.tsx` contains no `'use client'` directive
- [ ] `experience.tsx` contains `'use client'` directive
- [ ] Scene-to-component switch uses `assertNever` default branch
- [ ] No `any` types in any file
- [ ] No unused variables or imports
- [ ] TypeScript compiles under strict mode with zero errors
