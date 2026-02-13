# [PH-04] Build Word Search Scene Orchestrator

## Context

The word search scene is the third interactive experience in the app (Scene 2 in the state machine). It composes the grid generator, drag selection hook, and grid renderer into a complete game flow: the user finds 7 hidden words, then witnesses a hidden message reveal sequence before auto-advancing. This orchestrator manages game state via `useReducer`, wires otter reactions, renders the word list with cross-off, and executes the "BE MY VALENTINE" reveal animation with synchronized haptics.

**Design Doc Reference:** Section 5 — Scene 2 (Word Search), Section 6 — Visual Design System (Scene 2 palette), Section 7 — Haptics Strategy
**Phase:** `PH-04` — Word Search Scene
**Blocks:** None
**Blocked By:** `grid-generator` (Epic 1), `drag-select-and-grid` (Epic 2), `PH-02` (scene engine, OtterSprite), `PH-03` (upstream scene flow)

---

## Scope

### In Scope

- `src/components/scenes/word-search.tsx` — scene component with game state machine, word list, otter integration, and hidden message reveal
- `useReducer`-based game state: `playing` → `revealing` → `complete` (discriminated union)
- Word list display below the grid with visual cross-off on found words
- Otter sprite integration: `otter-peeking.png` idle state, swap to `otter-excited.png` on each word found
- Word validation: compare drag selection against unfound word placements
- Haptic feedback wiring: `haptic.medium()` on word found, `haptic.pattern(3, 100)` on hidden message reveal
- Hidden message reveal sequence: 1000ms pause → sequential cell pulse → "BE MY VALENTINE" text → haptic pattern → 3000ms hold → `onComplete()`
- Scene entry/exit animations with spring physics via `motion.div`
- Integration into `experience.tsx` (replace stub scene with real component)

### Out of Scope

- Grid generation algorithm (delivered in `grid-generator` Epic)
- Drag selection hook and grid renderer internals (delivered in `drag-select-and-grid` Epic)
- Floating hearts particles (density is `[0, 0]` for Scene 2 — no particles rendered)
- Confetti system (not used in this scene)
- Modifications to shared UI components (`otter-sprite.tsx`, `scene-transition.tsx`)
- Poetry Canvas scene or any downstream scenes
- Safe area insets (handled by root layout)

---

## Technical Approach

### Architecture

The scene component is a composition layer. Game logic lives in a `useReducer` with a discriminated union state. Word validation is a pure function comparing selected cells against `GeneratedGrid.wordPlacements`. The reveal sequence is a choreographed timeline using `setTimeout` and `motion` stagger animations. The component receives `onComplete: () => void` from the experience orchestrator and calls it after the reveal sequence completes.

**Component Hierarchy:**

```
WordSearch (scene orchestrator)
├── motion.div (scene wrapper with entry/exit)
│   ├── Grid (from ./word-search/grid.tsx)
│   ├── WordList (inline sub-component, word names + cross-off)
│   ├── OtterSprite (from @/components/ui/otter-sprite)
│   └── HiddenMessageOverlay (inline, "BE MY VALENTINE" text reveal)
```

### Key Files

| File                                    | Action | Purpose                                                          |
| --------------------------------------- | ------ | ---------------------------------------------------------------- |
| `src/components/scenes/word-search.tsx` | Create | Scene orchestrator with game state, word list, reveal sequence   |
| `src/components/experience.tsx`         | Modify | Replace word-search stub import with real `WordSearch` component |

### Dependencies

| Package  | Version  | Import                                                   |
| -------- | -------- | -------------------------------------------------------- |
| `motion` | `12.34+` | `import { motion, AnimatePresence } from "motion/react"` |
| `clsx`   | —        | `import { clsx } from "clsx"`                            |

### Imports from Existing Modules

| Module                          | Import                                          | Purpose                                                             |
| ------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| `@/types`                       | `Scene`                                         | Scene type for typing                                               |
| `@/lib/haptics`                 | `haptic`                                        | `haptic.medium()` on word found, `haptic.pattern(3, 100)` on reveal |
| `@/lib/constants`               | `WORD_SEARCH_CONFIG`                            | Grid configuration input                                            |
| `@/components/ui/otter-sprite`  | `OtterSprite`                                   | Animated otter with frame swapping                                  |
| `./word-search/generator`       | `generateGrid`, `GeneratedGrid`, `CellPosition` | Grid data generation                                                |
| `./word-search/use-drag-select` | `useDragSelect`, `DragPhase`                    | Pointer interaction hook                                            |
| `./word-search/grid`            | `Grid`, `FoundWord`                             | Grid renderer component                                             |

### Implementation Details

**Game State Machine (useReducer):**

```typescript
type WordSearchPhase =
  | { readonly type: "playing"; readonly foundWords: readonly FoundWord[] }
  | { readonly type: "revealing"; readonly foundWords: readonly FoundWord[] }
  | { readonly type: "complete"; readonly foundWords: readonly FoundWord[] };

type WordSearchAction =
  | { readonly type: "WORD_FOUND"; readonly foundWord: FoundWord }
  | { readonly type: "START_REVEAL" }
  | { readonly type: "COMPLETE" };
```

State transitions:

- `playing` + `WORD_FOUND` → remains `playing` with word appended to `foundWords` (until 7th word)
- `playing` + `START_REVEAL` → `revealing` (dispatched after 7th word found + 1000ms delay)
- `revealing` + `COMPLETE` → `complete` (dispatched after reveal animation + 3000ms hold)

**Word Validation Logic:**

When `useDragSelect` signals pointer-up with a selection:

1. Extract the selected `CellPosition[]` from the drag phase
2. For each unfound word in `GeneratedGrid.wordPlacements`:
   - Compare selected cells against `WordPlacement.cells` (exact match in either forward or reverse order)
3. If a match is found:
   - Dispatch `WORD_FOUND` with the word and its highlight color (from `WORD_HIGHLIGHT_COLORS`, indexed by discovery order)
   - Fire `haptic.medium()` in the pointer-up event handler (not in an animation callback)
   - Swap otter to `otter-excited.png` frames temporarily (revert to `otter-peeking.png` after 1500ms)
4. If no match: reset drag state, no haptic, no penalty

**Reveal Sequence Timeline (after 7th word found):**

| Time           | Action                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| +0ms           | 7th word highlight persists, otter swaps to excited                                                                            |
| +1000ms        | Dispatch `START_REVEAL`, begin hidden message cell pulse animation                                                             |
| +1000ms–2500ms | Hidden message cells pulse sequentially with stagger (each cell: scale 1→1.15→1, opacity boost, ~100ms stagger per cell)       |
| +2500ms        | "BE MY VALENTINE" text fades in above grid (Playfair Display 700/24px, `--color-ask-start` to `--color-ask-end` gradient text) |
| +2500ms        | `haptic.pattern(3, 100)` fires (3x `ImpactStyle.Light` at 100ms intervals)                                                     |
| +5500ms        | Call `onComplete()` to advance to Poetry Canvas scene                                                                          |

**Otter Integration:**

- Idle: `OtterSprite` with single frame `["/otters/otter-peeking.png"]`, `fps={1}`, positioned bottom-right
- Word found: swap `frames` prop to `["/otters/otter-excited.png"]` for 1500ms, then revert
- The otter does NOT animate during the reveal sequence (stays as peeking)

**Word List Display:**

- Rendered below the grid as a horizontal flex-wrap list
- Each word: Inter 500/14px, uppercase
- Unfound: `text-white/60`
- Found: `line-through text-white/30` with the word's highlight color as an underline or left-border accent
- Words listed in config order: DINN, OTTIE, FOREVER, TORONTO, CRIMINAL, LOVE, BEBE

**Scene Entry/Exit Animation:**

Spring presets (following PH-03 inline convention):

```typescript
const SPRING_SCENE = { type: "spring" as const, stiffness: 300, damping: 30 };
```

Entry:

```typescript
initial={{ opacity: 0, y: 40 }}
animate={{ opacity: 1, y: 0, transition: SPRING_SCENE }}
```

Exit (transition to Poetry Canvas — "Scale reveal → fade" per Design Doc Section 4):

```typescript
exit={{ opacity: 0, scale: 0.95, transition: SPRING_SCENE }}
```

**Scene Background:**

`bg-linear-to-b from-search-start to-search-end` — resolves to `--color-search-start` (#831843) → `--color-search-end` (#f43f5e) via globals.css `@theme` tokens.

**experience.tsx Modification:**

Replace the word-search stub import:

- Remove `StubScene` usage for the `"word-search"` case
- Import `WordSearch` from `@/components/scenes/word-search`
- Render `<WordSearch onComplete={handleComplete} />` keyed with `"word-search"`

**Grid Initialization:**

Call `generateGrid(WORD_SEARCH_CONFIG)` once using `useMemo` (or `useRef` for stable identity) at component mount. The grid is computed once and never regenerated during the scene lifetime.

---

## Stories

### Story 1: Render Complete Word Search Scene Layout

**As a** user,
**I want** to see a word search grid with a word list and otter companion,
**So that** I understand the game and can begin finding words.

**Acceptance Criteria:**

```gherkin
Given the scene state machine advances to "word-search"
When the WordSearch scene mounts
Then the background renders a vertical gradient from --color-search-start to --color-search-end
And a 10x10 letter grid renders centered in the viewport
And a word list renders below the grid showing all 7 words
And an otter sprite renders in the bottom-right showing otter-peeking.png
And the scene animates in with spring-based opacity and y-translate
```

### Story 2: Validate and Highlight Found Words

**As a** user,
**I want** to drag across letters to find words and see them highlighted,
**So that** I get satisfying feedback for each discovery.

**Acceptance Criteria:**

```gherkin
Given the grid is rendered and I am in the "playing" phase
When I drag across cells that spell "DINN" in the correct direction and release
Then the word "DINN" stays highlighted with a unique warm-palette color (bg-rose-400/40)
And haptic.medium() fires on pointer release
And the otter sprite swaps to otter-excited.png for 1500ms then reverts to otter-peeking.png
And "DINN" in the word list shows a line-through style

Given I drag across cells that do not match any unfound word
When I release
Then the highlight fades, no haptic fires, and the word list is unchanged
```

### Story 3: Cross Off Found Words in Word List

**As a** user,
**I want** to see found words crossed off the list,
**So that** I can track which words remain.

**Acceptance Criteria:**

```gherkin
Given 3 of 7 words have been found
When I look at the word list
Then the 3 found words display with line-through styling and reduced opacity (text-white/30)
And the 4 remaining words display at normal opacity (text-white/60) without line-through
And the word order matches the config order regardless of discovery order
```

### Story 4: Trigger Hidden Message Reveal After All Words Found

**As a** user,
**I want** to see "BE MY VALENTINE" revealed after finding all 7 words,
**So that** I experience the hidden surprise.

**Acceptance Criteria:**

```gherkin
Given I have found 6 of 7 words
When I find the 7th word
Then the word highlights and haptic.medium() fires as normal
And after a 1000ms pause, the game phase transitions to "revealing"
And the 13 hidden message cells pulse sequentially with stagger animation (~100ms per cell)
And "BE MY VALENTINE" text fades in above the grid in Playfair Display 700
And haptic.pattern(3, 100) fires (3 light pulses at 100ms intervals)
```

### Story 5: Auto-Advance to Next Scene After Reveal

**As a** user,
**I want** the scene to automatically advance after the hidden message reveal,
**So that** the experience flows forward without manual input.

**Acceptance Criteria:**

```gherkin
Given the hidden message reveal animation has completed
And "BE MY VALENTINE" text is visible
When 3000ms elapses after the reveal completes
Then onComplete() is called
And the scene exits with scale-down + fade animation (opacity: 0, scale: 0.95)
And the experience orchestrator advances to "poetry-canvas"
```

### Story 6: Wire Otter Reactions to Game Events

**As a** user,
**I want** the otter to react to my word discoveries,
**So that** the experience feels alive and responsive.

**Acceptance Criteria:**

```gherkin
Given the scene is in "playing" phase with otter showing otter-peeking.png
When I find a valid word
Then the otter sprite immediately swaps to otter-excited.png
And the otter reverts to otter-peeking.png after 1500ms

Given the scene is in "revealing" phase
When the hidden message animation plays
Then the otter remains showing otter-peeking.png (no additional reaction)
```

### Story 7: Integrate with Experience State Machine

**As a** developer,
**I want** the word search scene to plug into the experience orchestrator,
**So that** the linear scene progression works end-to-end.

**Acceptance Criteria:**

```gherkin
Given experience.tsx renders the scene matching currentScene
When currentScene is "word-search"
Then the WordSearch component renders with an onComplete callback
And the component has a unique motion key "word-search" for AnimatePresence

Given the WordSearch scene calls onComplete
When the experience reducer processes ADVANCE
Then currentScene updates to "poetry-canvas"
And the word search scene exits before the poetry canvas enters (mode="wait")
```

---

## Exit Criteria

- [ ] `src/components/scenes/word-search.tsx` exports `WordSearch` component accepting `{ readonly onComplete: () => void }`
- [ ] `src/components/experience.tsx` imports and renders `WordSearch` for the `"word-search"` scene (stub removed)
- [ ] Game state uses `useReducer` with discriminated union: `playing` → `revealing` → `complete`
- [ ] All 7 words are findable via drag selection; each found word fires `haptic.medium()` on the pointer event (not animation callback)
- [ ] Found words persist with unique warm-palette highlight colors and cross off in the word list
- [ ] Invalid selections fade with no haptic and no penalty
- [ ] Otter swaps to `otter-excited.png` on word found, reverts after 1500ms
- [ ] Hidden message reveal fires after 1000ms pause following 7th word: sequential cell pulse → "BE MY VALENTINE" text → `haptic.pattern(3, 100)`
- [ ] Scene auto-advances 3000ms after reveal completes via `onComplete()`
- [ ] Scene entry animation uses spring physics (`stiffness: 300, damping: 30`) with `opacity` and `y` (GPU-accelerated)
- [ ] Scene exit animation uses spring physics with `opacity` and `scale` (GPU-accelerated)
- [ ] Background gradient uses `from-search-start to-search-end` Tailwind tokens
- [ ] No `any` types in the module
- [ ] All exported symbols have TSDoc comments
- [ ] Component file does not exceed 200 lines (logic in custom hooks, sub-components extracted as needed)
- [ ] `npx biome check src/components/scenes/word-search.tsx` passes with zero diagnostics
- [ ] `pnpm build` succeeds with zero errors
- [ ] Grid renders without layout shift or lag on iOS Safari WebView
