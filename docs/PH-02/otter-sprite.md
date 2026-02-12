# [PH-02] Implement Otter Sprite Animator

## Context

The otter mascot ("Ottie") is the emotional throughline of the entire app. Per DESIGN_DOC.md Section 5, each scene displays the otter in a different state — waving, thinking, celebrating, peeking, or crying — using static PNG assets cycled at configurable frame rates. The `otter-sprite.tsx` component is a reusable primitive that accepts an array of image paths and an FPS value, cycles through them with a timer, and applies a spring-based scale-in entrance animation sourced from DESIGN_DOC.md Section 5 Scene 0 (`stiffness: 200, damping: 20`, scale `0.8` to `1.0`). Every scene in PH-03 through PH-05 consumes this component with different asset sets.

**Design Doc Reference:** Section 5 — Scene Specifications (Scene 0 animation spec); Section 11 — Asset Manifest
**Phase:** `PH-02` — Scene Engine & Shared UI
**Blocks:** None
**Blocked By:** `PH-01` — Foundation & Tooling

---

## Scope

### In Scope

- `src/components/ui/otter-sprite.tsx`: Reusable image-cycling component with configurable `frames` (readonly string array of `/otters/*.png` paths), `fps` (number), and `alt` (string) props
- Spring-based scale-in entrance animation: `spring({ stiffness: 200, damping: 20 })`, scale from `0.8` to `1.0` (DESIGN_DOC.md Section 5, Scene 0)
- Frame cycling via `useEffect` interval at `1000 / fps` milliseconds
- Image preloading to prevent flicker during frame transitions
- Single-frame support (an array with one path renders statically without an interval timer)

### Out of Scope

- Specific scene-level otter positioning and sizing (each scene controls layout via `className` prop)
- Otter asset generation or optimization (PH-06)
- Otter state transitions triggered by user interactions (scene-specific logic in PH-03+)
- Haptic feedback synchronized with otter state changes (scene-specific in PH-03+)
- Otter swap animations between different poses within a scene (handled by the consuming scene component re-rendering with different `frames` props)

---

## Technical Approach

### Architecture

- Single-responsibility component: accept frames, cycle through them, animate entrance
- Frame cycling managed by `useEffect` with `setInterval` at `1000 / fps` interval
- Current frame index stored via `useState`, wrapping modulo `frames.length`
- Images rendered via `<img>` tag with `draggable={false}` — not `next/image` (static export serves local files directly)
- Entrance animation: `motion.div` wrapper with `initial={{ scale: 0.8, opacity: 0 }}` and `animate={{ scale: 1, opacity: 1 }}` using the named `SPRING_OTTER_ENTRANCE` preset
- For single-frame use (e.g., `otter-celebrate.png` alone), no interval timer is created — the `useEffect` returns early when `frames.length <= 1`

### Key Files

| File                                 | Action | Purpose                                                  |
| ------------------------------------ | ------ | -------------------------------------------------------- |
| `src/components/ui/otter-sprite.tsx` | Create | Reusable frame-cycling otter sprite with spring entrance |

### Dependencies

| Package  | Version    | Import                                        |
| -------- | ---------- | --------------------------------------------- |
| `motion` | `^12.34.0` | `import { motion } from "motion/react"`       |
| `react`  | `^19.0.0`  | `import { useState, useEffect } from "react"` |

### Implementation Details

**Component props:**

```typescript
type OtterSpriteProps = {
  readonly frames: readonly string[];
  readonly fps: number;
  readonly alt: string;
  readonly className?: string;
};
```

**Spring preset (sourced from DESIGN_DOC.md Section 5, Scene 0):**

```typescript
const SPRING_OTTER_ENTRANCE = { stiffness: 200, damping: 20 } as const;
```

**Frame cycling logic:**

```typescript
const [frameIndex, setFrameIndex] = useState(0);

useEffect(() => {
  if (frames.length <= 1) return;
  const interval = setInterval(() => {
    setFrameIndex((prev) => (prev + 1) % frames.length);
  }, 1000 / fps);
  return () => clearInterval(interval);
}, [frames.length, fps]);
```

**Motion wrapper:**

```typescript
<motion.div
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: "spring", ...SPRING_OTTER_ENTRANCE }}
  className={className}
>
  <img
    src={frames[frameIndex]}
    alt={alt}
    draggable={false}
  />
</motion.div>
```

**Image preloading — prevents flicker during frame transitions:**

```typescript
useEffect(() => {
  for (const src of frames) {
    const img = new Image();
    img.src = src;
  }
}, [frames]);
```

**Usage examples from DESIGN_DOC.md asset manifest:**

Scene 0 — Welcome (3-frame cycle at 4fps):

```typescript
<OtterSprite
  frames={["/otters/otter-wave-1.png", "/otters/otter-wave-2.png", "/otters/otter-wave-3.png"]}
  fps={4}
  alt="Ottie waving hello"
  className="w-48 h-48"
/>
```

Scene 1 — Quiz idle (single-frame, no cycling):

```typescript
<OtterSprite
  frames={["/otters/otter-thinking.png"]}
  fps={1}
  alt="Ottie thinking"
  className="w-32 h-32"
/>
```

---

## Stories

### Story 1: Cycle Through Otter Frames at Specified FPS

**As a** user viewing a scene with an animated otter,
**I want** the otter image to cycle through its frames at the configured speed,
**So that** the otter appears to animate naturally.

**Acceptance Criteria:**

```gherkin
Given an OtterSprite with frames ["/otters/otter-wave-1.png", "/otters/otter-wave-2.png", "/otters/otter-wave-3.png"] and fps 4
When the component mounts
Then the displayed image changes every 250ms (1000 / 4)
And the frame sequence wraps from frame 3 back to frame 1
And the cycling continues until the component unmounts
```

### Story 2: Animate Entrance with Spring Scale-In

**As a** user entering a scene,
**I want** the otter to scale in smoothly from small to full size,
**So that** the otter's appearance feels playful and alive.

**Acceptance Criteria:**

```gherkin
Given an OtterSprite component mounts
When the entrance animation plays
Then the otter scales from 0.8 to 1.0 using spring({ stiffness: 200, damping: 20 })
And the opacity transitions from 0 to 1 simultaneously
And the animation uses GPU-accelerated properties only (scale, opacity)
And no duration or ease values are used on the transform animation
```

### Story 3: Handle Single-Frame Otter Display

**As a** developer rendering a static otter pose (e.g., `otter-celebrate.png`),
**I want** the component to display the single image without cycling artifacts,
**So that** the same component works for both animated and static otters.

**Acceptance Criteria:**

```gherkin
Given an OtterSprite with frames ["/otters/otter-celebrate.png"] and fps 1
When the component mounts
Then the single image displays without flickering
And no setInterval timer is created
And the spring entrance animation still plays normally
```

### Story 4: Preload All Frame Images

**As a** user viewing the otter animation,
**I want** all frames to be preloaded before cycling begins,
**So that** there is no visible pop-in or loading delay between frames.

**Acceptance Criteria:**

```gherkin
Given an OtterSprite with 3 frame paths
When the component mounts
Then all 3 images are preloaded via new Image() constructor
And frame transitions display immediately without blank or loading states
```

### Story 5: Clean Up Timer on Unmount

**As a** developer managing component lifecycle,
**I want** the frame cycling interval to be cleared on unmount,
**So that** there are no memory leaks or state updates on unmounted components.

**Acceptance Criteria:**

```gherkin
Given an OtterSprite is currently cycling frames with a setInterval timer
When the component unmounts (e.g., during a scene transition)
Then the setInterval timer is cleared via the useEffect cleanup function
And no setState calls occur after unmount
```

### Story 6: Reference Otter Assets from Asset Manifest

**As a** developer consuming the OtterSprite component,
**I want** all image paths to reference the `/otters/` directory,
**So that** assets align with the DESIGN_DOC.md Section 11 manifest.

**Acceptance Criteria:**

```gherkin
Given the 12 otter assets defined in DESIGN_DOC.md Section 11
When any scene renders an OtterSprite
Then all frame paths follow the pattern "/otters/<asset-name>.png"
And no raw asset paths outside public/otters/ are used
```

---

## Exit Criteria

- [ ] `pnpm build` produces clean static export with zero errors
- [ ] `npx biome check .` passes with zero diagnostics
- [ ] `otter-sprite.tsx` cycles through provided image paths at specified FPS with correct interval timing
- [ ] Spring scale-in animation uses `stiffness: 200`, `damping: 20` per DESIGN_DOC.md Section 5 Scene 0
- [ ] Scale animates from `0.8` to `1.0`, opacity from `0` to `1` (GPU-accelerated properties only)
- [ ] Single-frame arrays render without cycling timer or flickering
- [ ] All frame images are preloaded on mount via `new Image()`
- [ ] Interval timer is cleaned up on unmount via `useEffect` return
- [ ] No `any` types in the file
- [ ] No unused variables or imports
- [ ] No layout-triggering animations (only `scale` and `opacity` animated)
- [ ] Images use `draggable={false}` to prevent drag artifacts
- [ ] TypeScript compiles under strict mode with zero errors
