# [PH-03] Implement Quiz Scene

## Context

Scene 1 is a 5-question trivia game that tests Carolina's knowledge of the relationship in a playful, low-stakes format. The quiz engine manages question sequencing, option shuffling, answer validation (including Q2's dual-correct timezone edge case), otter reaction swaps, and a progression indicator. Correct answers reward with celebration haptics and visual feedback; wrong answers use comedic shake animations and a retry mechanic. This is the first scene with complex interactive state, requiring `useReducer` for the interdependent question/answer/status lifecycle.

**Design Doc Reference:** Section 5 — Scene 1 (Quiz), Section 6 — Visual Design System, Section 7 — Haptics Strategy
**Phase:** `PH-03` — Welcome & Quiz Scenes
**Blocks:** None
**Blocked By:** `PH-02` (Scene Engine & Shared UI — provides `experience.tsx`, `OtterSprite`, `SceneTransition`)

---

## Scope

### In Scope

- `src/components/scenes/quiz.tsx` — full Quiz scene component with `useReducer` state machine
- Modify `src/components/experience.tsx` — replace `StubScene` for the `"quiz"` case with the real `Quiz` component
- 5-question sequential engine consuming `QUIZ_QUESTIONS` from `@/lib/constants`
- 4 shuffled option cards per question (Q2 randomly selects 1 of 2 correct options to display)
- Progress dots indicator (5 dots, filling sequentially)
- Otter reaction swaps: thinking (idle), celebrate (correct), confused (wrong)
- Correct answer: green glow + scale pulse + `haptic.success()` + 1.2s auto-advance
- Wrong answer: shake animation + red + "Babe... really?" message + `haptic.error()` + immediate retry
- Scene exit animation compatible with `AnimatePresence mode="wait"`

### Out of Scope

- Welcome scene (separate Epic: `welcome-scene.md`)
- Floating hearts layer (Scene 0-2 have 0 particles per DESIGN_DOC Section 6)
- Quiz question data definition (already in `src/lib/constants.ts` from PH-01)
- Type definitions for `QuizQuestion` / `QuizOption` (already in `src/types/index.ts` from PH-01)
- Modifications to `OtterSprite`, `SceneTransition`, or any PH-02 shared UI
- Word search scene or any subsequent scene implementation

---

## Technical Approach

### Architecture

The Quiz scene uses a `useReducer`-driven state machine to manage the interdependent question index, answer status, and completion tracking. A custom `useQuizState` hook encapsulates the reducer and derived state, keeping the component focused on rendering.

The component renders a `motion.div` root with `key="quiz"` for `AnimatePresence`. Layout: progress dots at top, question card in center with options below, otter sprite in bottom-right corner.

Each question transition re-renders the card via `AnimatePresence` with a unique `key={questionIndex}`, enabling slide-in/slide-out animations between questions.

### Key Files

| File | Action | Purpose |
|------|--------|---------|
| `src/components/scenes/quiz.tsx` | Create | Quiz scene with state machine, question cards, option buttons, progress dots, otter reactions |
| `src/components/experience.tsx` | Modify | Import `Quiz` and replace `StubScene` in the `"quiz"` switch case |

### Dependencies

| Package | Version | Import |
|---------|---------|--------|
| `motion` | `^12.34.0` | `import { motion, AnimatePresence } from "motion/react"` |
| `react` | `^19.0.0` | `import { useCallback, useMemo, useReducer } from "react"` |
| `@/components/ui/otter-sprite` | PH-02 | `import { OtterSprite } from "@/components/ui/otter-sprite"` |
| `@/lib/haptics` | PH-01 | `import { haptic } from "@/lib/haptics"` |
| `@/lib/constants` | PH-01 | `import { QUIZ_QUESTIONS } from "@/lib/constants"` |
| `@/types` | PH-01 | `import type { QuizOption } from "@/types"` |

### Implementation Details

**State Machine (useReducer):**

```typescript
type QuizAnswerStatus = "idle" | "correct" | "wrong";

type QuizState = {
  readonly questionIndex: number;
  readonly completedCount: number;
  readonly answerStatus: QuizAnswerStatus;
};

type QuizAction =
  | { readonly type: "ANSWER_CORRECT" }
  | { readonly type: "ANSWER_WRONG" }
  | { readonly type: "ADVANCE" }
  | { readonly type: "RETRY" };
```

Transitions:
- `ANSWER_CORRECT`: sets `answerStatus` to `"correct"`, increments `completedCount`
- `ANSWER_WRONG`: sets `answerStatus` to `"wrong"`
- `ADVANCE`: increments `questionIndex`, resets `answerStatus` to `"idle"`
- `RETRY`: resets `answerStatus` to `"idle"` (same question, re-shuffled options)

All switch branches must include `assertNever` default for exhaustive checking.

**Option Shuffling & Q2 Logic:**

Each question's options must be shuffled on every render of that question. For Q2 (`allowMultipleCorrect: true`, 5 options with 2 correct):

1. Separate options into `correct` (2 items) and `wrong` (3 items)
2. Randomly select 1 correct option
3. Combine selected correct + all wrong = 4 options
4. Shuffle the 4 options using Fisher-Yates

For all other questions (4 options, 1 correct): shuffle all 4 directly.

This ensures exactly 4 tappable cards per question per DESIGN_DOC.md Section 5, Scene 1: "Options rendered as 4 tappable cards, shuffled each render."

Shuffling MUST occur via `useMemo` keyed to `questionIndex` and `answerStatus === "idle"` (re-shuffle on retry).

**Gradient Background:**

Same palette as Welcome (Scenes 0-1 share Cool/Playful colors per DESIGN_DOC Section 6):

```
bg-linear-to-b from-welcome-start to-welcome-end
```

Container uses `min-h-dvh` per mobile-native standards.

**Progress Dots:**

5 circular dots at the top of the screen. Each dot transitions from unfilled to filled when its corresponding question is answered correctly.

- Unfilled: `bg-white/30`, 8px diameter
- Filled: `bg-white`, 8px diameter, spring scale-in from 0.8 to 1.0
- Spring preset: `{ stiffness: 400, damping: 25 }` — snappy micro-interaction for dot fill feedback
- Gap between dots: 8px (Tailwind `gap-2`)

**Otter Reactions:**

Otter renders in the bottom-right corner of the viewport. Single-frame `OtterSprite` (fps=1) swapping based on `answerStatus`:

| Status | Asset | Source |
|--------|-------|--------|
| `"idle"` | `/otters/otter-thinking.png` | DESIGN_DOC.md Section 5, Scene 1: "otter-thinking.png (idle)" |
| `"correct"` | `/otters/otter-celebrate.png` | DESIGN_DOC.md Section 5, Scene 1: "otter-celebrate.png (correct)" |
| `"wrong"` | `/otters/otter-confused.png` | DESIGN_DOC.md Section 5, Scene 1: "otter-confused.png (wrong)" |

OtterSprite receives a single-element `frames` array; `fps` can be set to any value (no cycling occurs with 1 frame). Otter container positioned in the bottom-right corner (`absolute bottom-4 right-4`), consistent with Scene 2's otter placement.

**Question Card Animation:**

Each question card slides in from the right when the question index advances. Wrapped in a nested `AnimatePresence` with `key={questionIndex}` to trigger exit/enter on question change.

- Entry: `initial={{ x: 300, opacity: 0 }}` / `animate={{ x: 0, opacity: 1 }}`
- Exit: `exit={{ x: -300, opacity: 0 }}`
- Spring preset: `{ type: "spring", stiffness: 300, damping: 28 }` — responsive card entrance with minimal overshoot

**Option Card Stagger:**

4 option cards stagger in sequentially with 50ms delay between each:

- Source: DESIGN_DOC.md Section 5, Scene 1 — "Options: stagger in (50ms each)"
- Implementation: each option `motion.button` receives `transition={{ delay: index * 0.05 }}`
- Entry: `initial={{ opacity: 0, y: 10 }}` / `animate={{ opacity: 1, y: 0 }}`

**Correct Answer Feedback:**

Per DESIGN_DOC.md Section 5, Scene 1:

1. Card scale pulse: `animate={{ scale: [1, 1.05, 1] }}` — source: "Correct answer: scale pulse 1.0 → 1.05 → 1.0 with green glow"
2. Green glow: `ring-2 ring-green-400/60 bg-green-500/20` applied on correct state
3. Haptic: `haptic.success()` — DESIGN_DOC.md Section 7: "Correct answer → NotificationStyle.Success"
4. Auto-advance: `setTimeout` dispatching `ADVANCE` after 1200ms — source: "auto-advance after 1.2s"
5. Otter swaps to `otter-celebrate.png`

Haptic fires in the answer selection handler (not in animation callback).

**Wrong Answer Feedback:**

Per DESIGN_DOC.md Section 5, Scene 1:

1. Card shake: `animate={{ x: [0, -10, 10, -10, 10, 0] }}` over 400ms — source: "Wrong answer: x: [0, -10, 10, -10, 10, 0] shake over 400ms"
2. Red card: `ring-2 ring-red-400/60 bg-red-500/20` applied on wrong state
3. Message: "Babe... really?" text displayed below the selected card — source: "message appears ('Babe... really?')"
4. Haptic: `haptic.error()` — DESIGN_DOC.md Section 7: "Wrong answer → NotificationStyle.Error"
5. Otter swaps to `otter-confused.png`
6. Retry: user taps a different option, which dispatches `RETRY` then validates the new selection

The shake animation uses `transition={{ duration: 0.4 }}` — this is permitted because `x` keyframe sequences with explicit values define a tween path, not a spring-compatible motion. The 400ms duration is sourced directly from DESIGN_DOC.md.

**Answer Selection Handler:**

```typescript
function handleAnswer(option: QuizOption): void {
  if (state.answerStatus !== "idle" && state.answerStatus !== "wrong") return;
  if (option.isCorrect) {
    haptic.success();
    dispatch({ type: "ANSWER_CORRECT" });
    // Auto-advance after 1.2s
    setTimeout(() => {
      if (state.completedCount + 1 >= QUIZ_QUESTIONS.length) {
        onComplete();
      } else {
        dispatch({ type: "ADVANCE" });
      }
    }, 1200);
  } else {
    haptic.error();
    dispatch({ type: "ANSWER_WRONG" });
  }
}
```

Haptics fire immediately in the event handler per motion-engineering standards.

**Option Button Requirements:**

- Each option is a `<button type="button">` (mandatory per mobile-native standards)
- Minimum touch target: 44x44pt per Apple HIG (CLAUDE.md Section 7.2)
- `focus-visible:` ring on keyboard focus (CLAUDE.md Section 5.2)
- Font: Inter 500, 16px per DESIGN_DOC.md Section 6 (Quiz options: Inter 500, 16px)
- Tailwind: `font-medium text-base`

**Scene Exit Animation:**

Per DESIGN_DOC.md Section 4, Scene Transitions table:
- Quiz → Word Search: "Otter celebrate → fade"

```typescript
exit={{ opacity: 0 }}
transition={SPRING_SCENE}
```

The exit is a simple fade since the otter celebrate reaction already plays during the final correct answer feedback.

**Scene Entry Animation:**

```typescript
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
```

---

## Stories

### Story 1: Render quiz layout with gradient and progress dots

**As a** user,
**I want** to see the quiz screen with a progress indicator showing 5 dots,
**So that** I know how many questions remain and feel oriented in the experience.

**Acceptance Criteria:**

```gherkin
Given the state machine advances to "quiz" after tapping Welcome
When the Quiz scene renders
Then the viewport displays a vertical linear gradient from --color-welcome-start (#0d9488) to --color-welcome-end (#7c3aed)
And 5 progress dots render at the top of the screen with the first dot unfilled and all others unfilled
And the quiz container fills the full dvh height with no layout shift
```

### Story 2: Display question card with shuffled options

**As a** user,
**I want** each question to show 4 shuffled answer cards,
**So that** the answer positions are randomized and I cannot memorize positions.

**Acceptance Criteria:**

```gherkin
Given the Quiz scene is rendering question 1
When the question card mounts
Then the question text "When is Dinesh's birthday?" displays in the card
And 4 option buttons render below the question in shuffled order
And each option button meets the 44x44pt minimum touch target
And each option button renders in Inter font-weight 500 at 16px
And the question card slides in from x: 300 with spring physics
And option cards stagger in with 50ms delay between each
```

### Story 3: Handle correct answer with celebration feedback

**As a** user,
**I want** correct answers to trigger satisfying visual and haptic feedback,
**So that** getting the right answer feels rewarding.

**Acceptance Criteria:**

```gherkin
Given question 1 is displayed with "April 17" as one of the shuffled options
When the user taps "April 17"
Then haptic.success() fires immediately in the tap handler
And the tapped card animates scale: [1, 1.05, 1] with a green glow (ring-green-400/60)
And the otter sprite swaps to /otters/otter-celebrate.png
And the corresponding progress dot fills from bg-white/30 to bg-white
And after 1200ms the quiz auto-advances to question 2
And the outgoing question card exits to x: -300 with opacity 0
And the incoming question card enters from x: 300 with spring physics
```

### Story 4: Handle wrong answer with shake and retry

**As a** user,
**I want** wrong answers to produce playful negative feedback while letting me try again,
**So that** mistakes feel comedic rather than punishing.

**Acceptance Criteria:**

```gherkin
Given question 1 is displayed
When the user taps an incorrect option
Then haptic.error() fires immediately in the tap handler
And the tapped card shakes with x: [0, -10, 10, -10, 10, 0] over 400ms
And the tapped card turns red (ring-red-400/60, bg-red-500/20)
And the text "Babe... really?" appears on screen
And the otter sprite swaps to /otters/otter-confused.png
And the user can tap a different option immediately to retry
And the quiz does not advance — the same question remains active
```

### Story 5: Handle Q2 dual-correct option display

**As a** user,
**I want** question 2 to randomly show either "January 25" or "January 26" as the correct answer,
**So that** the quiz always displays exactly 4 options and both dates are accepted.

**Acceptance Criteria:**

```gherkin
Given question 2 has allowMultipleCorrect: true with 5 options (2 correct, 3 wrong)
When the question card renders
Then exactly 4 option cards display: 1 randomly-selected correct date + 3 wrong options
And the displayed correct option (either "January 25" or "January 26") validates as correct on tap
And the 4 options are shuffled in random order
```

### Story 6: Display otter reactions for idle, correct, and wrong states

**As a** user,
**I want** the otter to react differently based on whether I answered correctly or incorrectly,
**So that** the mascot feels responsive and alive.

**Acceptance Criteria:**

```gherkin
Given the Quiz scene is active
When the answer status is "idle" (no answer selected yet)
Then the otter displays /otters/otter-thinking.png in the bottom-right corner

When the answer status changes to "correct"
Then the otter swaps to /otters/otter-celebrate.png with a spring scale entrance

When the answer status changes to "wrong"
Then the otter swaps to /otters/otter-confused.png with a spring scale entrance
```

### Story 7: Complete all 5 questions and trigger scene transition

**As a** user,
**I want** answering all 5 questions correctly to advance me to the next scene,
**So that** the quiz has a clear end point and the experience progresses.

**Acceptance Criteria:**

```gherkin
Given the user has answered questions 1 through 4 correctly
And question 5 is displayed
When the user taps the correct answer for question 5
Then the correct answer feedback plays (green glow, scale pulse, haptic.success(), otter celebrate)
And all 5 progress dots are filled
And after 1200ms onComplete() fires to advance the state machine to "word-search"
And the Quiz scene exits with opacity fading to 0
```

### Story 8: Wire Quiz component into Experience orchestrator

**As a** developer,
**I want** the Experience orchestrator to render the real Quiz component instead of StubScene,
**So that** the quiz scene is functional in the live app.

**Acceptance Criteria:**

```gherkin
Given experience.tsx contains a switch case for "quiz" currently rendering StubScene
When the Quiz component is imported and wired in
Then the "quiz" case renders <Quiz key="quiz" onComplete={handleComplete} />
And advancing from Welcome correctly transitions into the functional Quiz scene
And no StubScene reference remains for the "quiz" case
```

---

## Exit Criteria

- [ ] `pnpm build` produces clean static export with zero errors
- [ ] `npx biome check .` passes with zero diagnostics
- [ ] Quiz renders 5 questions sequentially with 4 shuffled option cards per question
- [ ] Correct answer: card glows green with scale pulse `[1, 1.05, 1]`, otter swaps to celebrate, `haptic.success()` fires, auto-advances after 1.2s
- [ ] Wrong answer: card shakes `x: [0, -10, 10, -10, 10, 0]` over 400ms, turns red, shows "Babe... really?", otter swaps to confused, `haptic.error()` fires, immediate retry allowed
- [ ] Q2 displays exactly 4 options by randomly selecting 1 of 2 correct dates + 3 wrong options
- [ ] Both "January 25" and "January 26" validate as correct for Q2
- [ ] Progress dots fill sequentially (5 dots total) as questions are answered correctly
- [ ] All 5 correct answers trigger `onComplete()` to advance to next scene
- [ ] Otter displays `otter-thinking.png` (idle), `otter-celebrate.png` (correct), `otter-confused.png` (wrong) in correct states
- [ ] `experience.tsx` renders `<Quiz>` component for the `"quiz"` state (no StubScene)
- [ ] State managed via `useReducer` with discriminated union actions — no `useState` spaghetti
- [ ] No `any` types, no unused imports, no unused variables
- [ ] All otter assets referenced via `/otters/` path prefix
- [ ] All option buttons use `type="button"` and meet 44x44pt minimum touch target
- [ ] All interactive elements have `focus-visible:` state
- [ ] Container uses `min-h-dvh` — zero instances of `vh` or `min-h-screen`
- [ ] Haptics fire in event handlers, not in animation callbacks
- [ ] Component file stays under 200 lines (extract hook if needed)
