---
name: motion-engineering
description: Physics-based, 60fps animation engineering for Motion v12+ (Framer Motion) with React 19 and Capacitor iOS. Use when creating or modifying any animation, transition, gesture handler, or interactive element in .tsx files. Enforces spring physics over duration-based tweens, GPU-accelerated properties only, mandatory AnimatePresence exit handling, and haptics synchronization.
---

# Motion Engineering

Physics-first animation standards. If it moves, it uses springs. All animations target 60fps on iOS hardware.

## Core Mandate: Springs Over Durations

Duration-based animations (`duration`, `ease`, `linear`) are **banned** for interactive UI elements. Spring physics produce natural, responsive motion that adapts to interruption. Reserve `type: "tween"` exclusively for opacity fades and sequential text reveals where overshoot is undesirable.

```typescript
// BANNED: Duration-based motion for interactive elements
<motion.button
  animate={{ scale: 1 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
/>

// REQUIRED: Spring physics for interactive elements
<motion.button
  animate={{ scale: 1 }}
  transition={{ type: "spring", stiffness: 500, damping: 30 }}
/>
```

### Tween Exception: Opacity-Only Fades

Tween is permitted only for pure opacity transitions and sequential text reveals. Springs on opacity produce oscillation artifacts (flicker). Any transition animating `x`, `y`, `scale`, or `rotate` MUST use springs.

```typescript
// PERMITTED: Tween for opacity-only
<motion.p
  animate={{ opacity: 1 }}
  transition={{ type: "tween", duration: 0.8, ease: "easeOut" }}
/>

// BANNED: Tween for transform properties
<motion.div
  animate={{ x: 100, opacity: 1 }}
  transition={{ duration: 0.4 }}
/>
```

## Spring Presets

Define spring configurations as named constants. No inline magic numbers. Every spring MUST use explicit `stiffness`, `damping`, and optionally `mass`.

```typescript
import type { Spring } from "motion/react";

/**
 * Standard spring presets for consistent animation feel across scenes.
 *
 * Motion defaults (stiffness: 100, damping: 10, mass: 1) are intentionally
 * NOT used — they produce sluggish motion on iOS. These presets are derived
 * from Apple Fluid Interface guidelines and DESIGN_DOC.md specifications.
 */
const SPRING = {
  /** Fast settle (~200ms), minimal overshoot. Buttons, option cards, taps. */
  snappy: {
    type: "spring",
    stiffness: 500,
    damping: 30,
    mass: 1,
  },
  /** 2-3 visible bounces. Correct answers, celebrations, otter reactions. */
  bouncy: {
    type: "spring",
    stiffness: 400,
    damping: 10,
    mass: 1,
  },
  /** Smooth ~400ms settle, no overshoot. Scene transitions, page swaps. */
  gentle: {
    type: "spring",
    stiffness: 120,
    damping: 20,
    mass: 1,
  },
  /** Fast with visible recoil. "No" button press, dramatic effects. */
  heavy: {
    type: "spring",
    stiffness: 600,
    damping: 15,
    mass: 1.5,
  },
  /** Slow, dreamlike oscillation. Floating hearts, ambient particles. */
  floaty: {
    type: "spring",
    stiffness: 50,
    damping: 8,
    mass: 2,
  },
  /** DESIGN_DOC.md Scene 0 otter entrance. */
  otterEntrance: {
    type: "spring",
    stiffness: 200,
    damping: 20,
    mass: 1,
  },
} as const satisfies Record<string, Spring>;
```

### Preset Selection Guide

| Interaction Type               | Preset          | Rationale                   |
| ------------------------------ | --------------- | --------------------------- |
| Button tap, option select      | `snappy`        | Immediate tactile response  |
| Correct answer, word found     | `bouncy`        | Playful reward feedback     |
| Scene transition               | `gentle`        | Smooth, non-jarring swap    |
| "No" button press, error shake | `heavy`         | Dramatic comedy effect      |
| Floating hearts, ambient       | `floaty`        | Dreamy background layer     |
| Otter scale-in (Scene 0)       | `otterEntrance` | Per DESIGN_DOC.md Section 5 |

## Prohibitions

| Banned Pattern                                | Use Instead                       |
| --------------------------------------------- | --------------------------------- |
| `duration` on transform animations            | `type: "spring"` with preset      |
| `ease: "linear"` on UI elements               | Spring physics                    |
| `ease: "easeInOut"` on UI elements            | Spring physics                    |
| Inline `{ stiffness: 400, damping: 10 }`      | Named `SPRING.*` preset           |
| `will-change: transform` in CSS/JSX           | Motion handles this automatically |
| Animating `width`, `height`, `top`, `left`    | Use `x`, `y`, `scale`, `opacity`  |
| `margin`, `padding`, `border-width` animation | Use `transform` equivalents       |
| `React.forwardRef` with motion elements       | `ref` as regular prop (React 19)  |
| `useAnimation()` (deprecated)                 | `useAnimationControls()`          |
| `import from "framer-motion"`                 | `import from "motion/react"`      |

## GPU-Accelerated Properties Only

Animate exclusively GPU-composited properties for 60fps. Layout-triggering properties cause frame drops.

### Safe to Animate (compositor-only)

- `x`, `y` (translateX/Y)
- `scale`, `scaleX`, `scaleY`
- `rotate`, `rotateX`, `rotateY`, `rotateZ`
- `opacity`
- `filter` (blur, brightness)
- `clipPath`

### Banned from Animation (triggers layout reflow)

- `width`, `height`
- `top`, `right`, `bottom`, `left`
- `margin`, `padding`
- `border-width`
- `font-size`, `line-height`

```typescript
// BANNED: Layout-triggering animation
<motion.div animate={{ width: "100%", marginTop: 20 }} />

// REQUIRED: GPU-accelerated equivalent
<motion.div animate={{ scaleX: 1, y: 0, opacity: 1 }} />
```

### `will-change` Rule

Do NOT add `will-change: transform` manually. Motion promotes elements to GPU layers during animation and demotes them after. Permanent `will-change` wastes GPU memory across dozens of elements.

## AnimatePresence: Exit Animation Mandate

Every component that conditionally renders MUST handle its exit animation via `AnimatePresence`. Unmounting without exit creates visual "pop" artifacts.

### Mode Selection

| Mode               | Behavior                                | Use Case                                      |
| ------------------ | --------------------------------------- | --------------------------------------------- |
| `mode="wait"`      | Exit completes before enter begins      | Scene transitions (REQUIRED)                  |
| `mode="popLayout"` | Exit element removed from flow via FLIP | List reordering, navigation with layout shift |
| `mode="sync"`      | Enter and exit run simultaneously       | Crossfade overlays                            |

### Scene Transition Pattern

Scene transitions MUST use `mode="wait"` per DESIGN_DOC.md Section 4.

```typescript
import { AnimatePresence, motion, MotionConfig } from "motion/react";

const SCENE_VARIANTS = {
  enter: { opacity: 0, y: 30 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -30 },
} as const;

function SceneTransition({
  children,
  sceneKey,
}: {
  readonly children: React.ReactNode;
  readonly sceneKey: string;
}): React.ReactNode {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={sceneKey}
        variants={SCENE_VARIANTS}
        initial="enter"
        animate="center"
        exit="exit"
        transition={SPRING.gentle}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

### Exit Animation Rules

1. Every `AnimatePresence` child MUST be a `motion.*` element
2. Every `AnimatePresence` child MUST have a unique `key` that changes on swap
3. Every conditional `motion.*` element MUST define an `exit` prop
4. Exit animations MUST complete cleanly — no dangling state after unmount

## MotionConfig: Shared Transition Context

Wrap scene roots in `MotionConfig` to set default transitions. Child `motion.*` elements inherit the transition unless they override.

```typescript
function WelcomeScene(): React.ReactNode {
  return (
    <MotionConfig transition={SPRING.otterEntrance}>
      {/* All motion children use otterEntrance spring by default */}
    </MotionConfig>
  );
}
```

### `reducedMotion` Accessibility

Set `reducedMotion="user"` on the root `MotionConfig` to respect `prefers-reduced-motion`. This replaces springs with instant transitions for accessibility.

```typescript
<MotionConfig reducedMotion="user" transition={SPRING.gentle}>
  {/* ... */}
</MotionConfig>
```

## Gesture Standards

### Scale Ranges

Gestures MUST use subtle scale values. Exaggerated scales (< 0.8 or > 1.2) feel cartoonish.

| Gesture              | Scale                               | Notes                                       |
| -------------------- | ----------------------------------- | ------------------------------------------- |
| `whileTap`           | `0.95` – `0.97`                     | Subtle press-in, Apple HIG-aligned          |
| `whileHover`         | `1.02` – `1.05`                     | Gentle lift (irrelevant for touch-only iOS) |
| Correct answer pulse | `1.0 → 1.05 → 1.0`                  | Keyframe sequence                           |
| Wrong answer         | Shake `x: [0, -10, 10, -10, 10, 0]` | 400ms, no scale                             |

### Button Press Pattern

```typescript
function InteractiveButton({
  children,
  onPress,
}: {
  readonly children: React.ReactNode;
  readonly onPress: () => void;
}): React.ReactNode {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      transition={SPRING.snappy}
      onTap={onPress}
    >
      {children}
    </motion.button>
  );
}
```

### Drag (Word Search Selection)

Motion's `drag` is for repositioning elements. For the word search drag-to-select mechanic, use pointer events (`onPointerDown`, `onPointerMove`, `onPointerUp`) with Motion for visual feedback only.

```typescript
// Word search cell — pointer events for selection, motion for feedback
<motion.div
  whileTap={{ scale: 0.97, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
  transition={SPRING.snappy}
  onPointerDown={handleCellPointerDown}
  onPointerEnter={handleCellPointerEnter}
/>
```

## Layout Animations

### `layout` Prop Values

| Value               | Animates          | Use When                              |
| ------------------- | ----------------- | ------------------------------------- |
| `layout={true}`     | Position and size | Element moves AND resizes             |
| `layout="position"` | Position only     | Element moves, size change is instant |
| `layout="size"`     | Size only         | Element resizes, position is instant  |

### `layoutId`: Shared Element Transitions

Connect two separate `motion` elements across renders. When one unmounts and another with the same `layoutId` mounts, Motion animates between positions.

```typescript
// Tab indicator sliding between tabs
{tabs.map((tab) => (
  <button key={tab.id} onClick={() => setActive(tab.id)} type="button">
    {tab.label}
    {active === tab.id ? (
      <motion.div layoutId="tab-indicator" className="..." />
    ) : null}
  </button>
))}
```

### Layout Animation Rules

1. Prefer `layout="position"` over `layout={true}` to avoid text distortion during size transitions
2. Set `borderRadius` and `boxShadow` as inline `style` — CSS values distort during FLIP correction
3. Use `LayoutGroup` to namespace `layoutId` when the same component renders multiple times
4. Apply `layout` selectively — every `layout`-enabled element measures on every render

## Staggered Children

Use `variants` with `staggerChildren` for sequential entrance. Do NOT manually calculate delays with `index * delay`.

```typescript
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
} as const;

function QuizOptions({
  options,
}: {
  readonly options: readonly Option[];
}): React.ReactNode {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {options.map((option) => (
        <motion.button
          key={option.id}
          variants={itemVariants}
          transition={SPRING.snappy}
          type="button"
        >
          {option.label}
        </motion.button>
      ))}
    </motion.div>
  );
}
```

## Haptics Synchronization

### Timing Rule

Haptic feedback MUST fire within the same event loop tick as the triggering interaction. Fire haptics in the event handler, not in `onAnimationComplete`.

```typescript
// CORRECT: Immediate haptic on interaction
function handleOptionTap(optionId: string): void {
  haptic.light();
  selectOption(optionId);
}

// INCORRECT: Haptic delayed until animation finishes
<motion.button
  onAnimationComplete={() => haptic.light()}
/>
```

### Exception: Celebration Haptics

For reward feedback (correct answer, word found), fire haptics in the event handler for the success determination, not tied to animation timing.

```typescript
function handleAnswerSubmit(answerId: string): void {
  const isCorrect = checkAnswer(answerId);
  if (isCorrect) {
    haptic.success();
  } else {
    haptic.error();
  }
  setAnswerState({ answerId, isCorrect });
}
```

### Haptic Pattern Synchronization

For multi-pulse patterns (hidden message reveal: 3 pulses at 100ms), fire the pattern concurrently with the animation — do not block one on the other.

```typescript
function revealHiddenMessage(): void {
  controls.start("reveal");
  void haptic.pattern(3, 100);
}
```

## Import Pattern

All Motion imports MUST use the `motion/react` entry point.

```typescript
import {
  motion,
  AnimatePresence,
  MotionConfig,
  LayoutGroup,
  useAnimationControls,
  useMotionValue,
  useTransform,
  useSpring,
  useInView,
  useReducedMotion,
} from "motion/react";
```

## Validation Checklist

Before declaring animation work complete:

- [ ] Zero `duration`/`ease` props on transform animations (springs only)
- [ ] All spring values reference named `SPRING.*` presets (no inline magic numbers)
- [ ] All animated properties are GPU-accelerated (`x`, `y`, `scale`, `opacity`, `rotate`)
- [ ] Zero layout-triggering animations (`width`, `height`, `top`, `left`, `margin`)
- [ ] All conditional renders wrapped in `AnimatePresence` with `exit` props
- [ ] Scene transitions use `AnimatePresence mode="wait"`
- [ ] `whileTap` scale between 0.95 and 0.97
- [ ] No manual `will-change` declarations
- [ ] Haptics fire in event handlers, not `onAnimationComplete`
- [ ] Staggered children use `variants` + `staggerChildren`, not manual delays
- [ ] Imports use `motion/react`, not `framer-motion`
- [ ] `MotionConfig` wraps scene roots with appropriate defaults
- [ ] `reducedMotion="user"` set on root `MotionConfig`
- [ ] 60fps verified — no dropped frames during transitions
