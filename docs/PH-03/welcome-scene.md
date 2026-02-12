# [PH-03] Implement Welcome Scene

## Context

Scene 0 is the first screen Carolina sees — a full-screen teal-to-violet gradient with an animated waving otter, a personalized greeting, and a "tap anywhere" interaction that gates entry into the experience. This establishes the visual tone and confirms the haptic feedback pipeline works end-to-end before handing off to the quiz.

**Design Doc Reference:** Section 5 — Scene 0 (Welcome), Section 6 — Visual Design System, Section 7 — Haptics Strategy
**Phase:** `PH-03` — Welcome & Quiz Scenes
**Blocks:** None
**Blocked By:** `PH-02` (Scene Engine & Shared UI — provides `experience.tsx`, `OtterSprite`, `SceneTransition`)

---

## Scope

### In Scope

- `src/components/scenes/welcome.tsx` — full Welcome scene component
- Modify `src/components/experience.tsx` — replace `StubScene` for the `"welcome"` case with the real `Welcome` component
- Full-screen gradient background using `--color-welcome-start` / `--color-welcome-end` tokens
- `OtterSprite` integration with 3 wave frames at 4fps
- Title text "Hi Carolina" with 0.3s delayed fade-in
- Subtitle text "Tap anywhere to begin" with 1.5s delayed fade-in and ambient pulse
- Tap-anywhere interaction firing `haptic.light()` and calling `onComplete`
- Scene exit animation (fade out + slide up) compatible with `AnimatePresence mode="wait"`

### Out of Scope

- Quiz scene (separate Epic: `quiz-scene.md`)
- Floating hearts layer (Scene 0 has 0 particles per DESIGN_DOC Section 6)
- Otter asset generation or optimization (PH-06)
- Modifications to `SceneTransition`, `OtterSprite`, or any PH-02 shared UI component
- Safe area inset adjustments (PH-06)

---

## Technical Approach

### Architecture

Single scene component receiving `onComplete` from the `Experience` orchestrator. No internal state management required — the Welcome scene is stateless (tap triggers an event, no branching logic). The component renders a `motion.div` root element with `key="welcome"` for `AnimatePresence` lifecycle tracking.

Layout uses a centered flex column with three animated children: otter sprite, title heading, and subtitle paragraph. The entire container is the tap target.

### Key Files

| File | Action | Purpose |
|------|--------|---------|
| `src/components/scenes/welcome.tsx` | Create | Welcome scene component with gradient, otter, title, subtitle, and tap handler |
| `src/components/experience.tsx` | Modify | Import `Welcome` and replace `StubScene` in the `"welcome"` switch case |

### Dependencies

| Package | Version | Import |
|---------|---------|--------|
| `motion` | `^12.34.0` | `import { motion } from "motion/react"` |
| `@/components/ui/otter-sprite` | PH-02 | `import { OtterSprite } from "@/components/ui/otter-sprite"` |
| `@/lib/haptics` | PH-01 | `import { haptic } from "@/lib/haptics"` |

### Implementation Details

**Component Props:**

```typescript
type WelcomeProps = {
  readonly onComplete: () => void;
};
```

**Gradient Background:**

Full-screen container using Tailwind v4 gradient utilities with scene color tokens defined in `globals.css`:

```
bg-linear-to-b from-welcome-start to-welcome-end
```

Container must use `min-h-dvh` (not `min-h-screen`) per mobile-native requirements.

**Otter Sprite Configuration:**

```typescript
const WELCOME_OTTER_FRAMES = [
  "/otters/otter-wave-1.png",
  "/otters/otter-wave-2.png",
  "/otters/otter-wave-3.png",
] as const;

const WELCOME_OTTER_FPS = 4;
```

Source: DESIGN_DOC.md Section 5, Scene 0 — "cycling through 3 wave frames at 4fps."

The `OtterSprite` component (PH-02) internally applies `spring({ stiffness: 200, damping: 20 })` scale-in from 0.8 to 1.0 per DESIGN_DOC.md Section 5, Scene 0 animation spec.

**Title Animation:**

- Text: "Hi Carolina"
- Font: Inter 700 (Tailwind `font-bold`), size 36px (Tailwind `text-4xl`) per DESIGN_DOC.md Section 6 Typography (Headings: Inter 700, 28-36px)
- Color: white (`text-white`)
- Entry: `initial={{ opacity: 0 }}` / `animate={{ opacity: 1 }}` with `transition={{ delay: 0.3 }}`
- Source: DESIGN_DOC.md Section 5, Scene 0 — "Title fades in below [...] fadeIn with 0.3s delay"

**Subtitle Animation:**

- Text: "Tap anywhere to begin"
- Font: Inter 400 (Tailwind `font-normal`), size 18px (Tailwind `text-lg`) per DESIGN_DOC.md Section 6 Typography (Body: Inter 400, 16-18px)
- Color: white with reduced opacity (`text-white/70`)
- Entry: `initial={{ opacity: 0 }}` / `animate={{ opacity: 1 }}` with `transition={{ delay: 1.5 }}`
- Ambient pulse: after fade-in, loop an opacity oscillation between 0.7 and 1.0. Opacity is a GPU-accelerated property — `duration`-based transitions are permitted on non-transform properties per motion-engineering standards.
- Source: DESIGN_DOC.md Section 5, Scene 0 — "Subtitle after 1.5s delay [...] gentle pulse animation"

**Tap Handler:**

The entire `motion.div` container is the tap target. On click/tap:

1. Fire `haptic.light()` — DESIGN_DOC.md Section 7: "Tap to start → ImpactStyle.Light"
2. Call `onComplete()` to advance the state machine

The handler must fire haptics in the event handler (not in an animation callback) per motion-engineering standards.

```typescript
function handleTap(): void {
  haptic.light();
  onComplete();
}
```

**Scene Exit Animation:**

Per DESIGN_DOC.md Section 4, Scene Transitions table:
- Welcome → Quiz: "Fade out → slide up"

```typescript
exit={{ opacity: 0, y: -20 }}
```

Exit transition uses the scene spring preset from `experience.tsx` (`stiffness: 300, damping: 30`). Define a named constant:

```typescript
const SPRING_SCENE = { type: "spring" as const, stiffness: 300, damping: 30 };
```

**Scene Entry Animation:**

```typescript
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
```

Entry uses the same `SPRING_SCENE` preset for symmetry.

---

## Stories

### Story 1: Render Welcome gradient background

**As a** user,
**I want** to see a full-screen teal-to-violet gradient on launch,
**So that** the experience immediately establishes a polished visual tone.

**Acceptance Criteria:**

```gherkin
Given the app loads and the scene state machine initializes to "welcome"
When the Welcome scene renders
Then the viewport displays a vertical linear gradient from --color-welcome-start (#0d9488) to --color-welcome-end (#7c3aed) filling the full dvh height with no visible browser chrome or white flash
```

### Story 2: Display animated otter wave sprite

**As a** user,
**I want** to see a centered otter waving at me when the app loads,
**So that** the mascot character is introduced with playful personality.

**Acceptance Criteria:**

```gherkin
Given the Welcome scene has rendered
When the OtterSprite mounts
Then the otter scales in from 0.8 to 1.0 using spring({ stiffness: 200, damping: 20 })
And the sprite cycles through otter-wave-1.png, otter-wave-2.png, otter-wave-3.png at 4 frames per second
And the otter is horizontally centered in the viewport
```

### Story 3: Fade in title with 0.3s delay

**As a** user,
**I want** to see "Hi Carolina" appear shortly after the otter,
**So that** the greeting feels personally timed rather than instant.

**Acceptance Criteria:**

```gherkin
Given the Welcome scene has rendered
When 0.3 seconds have elapsed
Then the title "Hi Carolina" fades from opacity 0 to opacity 1
And the title renders in Inter font-weight 700 at 36px (text-4xl) in white
And the title appears below the otter sprite in the visual hierarchy
```

### Story 4: Fade in subtitle with 1.5s delay and ambient pulse

**As a** user,
**I want** to see "Tap anywhere to begin" appear after a pause with a gentle pulse,
**So that** I understand the interaction model and feel invited to proceed.

**Acceptance Criteria:**

```gherkin
Given the Welcome scene has rendered
When 1.5 seconds have elapsed
Then the subtitle "Tap anywhere to begin" fades from opacity 0 to opacity 1
And after the fade-in completes the subtitle continuously oscillates opacity between 0.7 and 1.0
And the subtitle renders in Inter font-weight 400 at 18px (text-lg) in white with reduced opacity
```

### Story 5: Tap anywhere fires haptic and advances to Quiz

**As a** user,
**I want** tapping anywhere on the Welcome screen to produce tactile feedback and move to the next scene,
**So that** the interaction feels responsive and native.

**Acceptance Criteria:**

```gherkin
Given the Welcome scene is fully rendered with otter, title, and subtitle visible
When the user taps anywhere on the screen
Then haptic.light() fires (ImpactStyle.Light on native, silent no-op in browser)
And onComplete() is called triggering the state machine to advance to "quiz"
And the Welcome scene exits with opacity fading to 0 and y translating to -20 using spring({ stiffness: 300, damping: 30 })
```

### Story 6: Wire Welcome component into Experience orchestrator

**As a** developer,
**I want** the Experience orchestrator to render the real Welcome component instead of StubScene,
**So that** the welcome scene is functional in the live app.

**Acceptance Criteria:**

```gherkin
Given experience.tsx contains a switch case for "welcome" currently rendering StubScene
When the Welcome component is imported and wired in
Then the "welcome" case renders <Welcome key="welcome" onComplete={handleComplete} />
And the app loads directly into the functional Welcome scene with gradient, otter, title, and subtitle
And no StubScene reference remains for the "welcome" case
```

---

## Exit Criteria

- [ ] `pnpm build` produces clean static export with zero errors
- [ ] `npx biome check .` passes with zero diagnostics
- [ ] Welcome scene renders full-screen teal→violet gradient using `--color-welcome-start` / `--color-welcome-end` tokens
- [ ] Otter sprite cycles 3 wave frames at 4fps with spring scale-in entrance
- [ ] Title "Hi Carolina" fades in after 0.3s delay in Inter 700/36px white
- [ ] Subtitle "Tap anywhere to begin" fades in after 1.5s delay with ambient opacity pulse
- [ ] Tap anywhere fires `haptic.light()` and triggers scene advancement
- [ ] Scene exit animates with `opacity: 0, y: -20` using spring transition
- [ ] `experience.tsx` renders `<Welcome>` component for the `"welcome"` state (no StubScene)
- [ ] No `any` types, no unused imports, no unused variables
- [ ] All otter assets referenced via `/otters/` path prefix
- [ ] Container uses `min-h-dvh` — zero instances of `vh` or `min-h-screen`
- [ ] Haptic fires in event handler, not in animation callback
- [ ] Component file stays under 200 lines
