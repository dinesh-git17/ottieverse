# [PH-04] Implement Drag Selection Hook and Grid Renderer

## Context

The word search interaction model requires continuous touch/pointer tracking across a 10x10 grid with direction locking after the second cell. This Epic delivers two tightly coupled modules: a `useDragSelect` hook for pointer event state management and a `Grid` component for visual rendering with selection overlays and found-word persistence. The hook produces selection state; the grid consumes and renders it.

**Design Doc Reference:** Section 5 — Scene 2 (Word Search), Drag Mechanic
**Phase:** `PH-04` — Word Search Scene
**Blocks:** `word-search-scene`
**Blocked By:** `grid-generator` (Epic 1 of PH-04), `PH-02` (shared UI primitives)

---

## Scope

### In Scope

- `src/components/word-search/use-drag-select.ts` — custom hook for pointer event tracking with direction lock
- `src/components/word-search/grid.tsx` — 10x10 grid renderer with cell layout, active selection overlay, and found-word highlight persistence
- Direction locking logic: horizontal, vertical, or diagonal, locked after 2nd cell contact
- Active selection visualization with colored highlight line following the pointer
- Found-word persistence with unique warm-palette colors per word
- Invalid selection handling (highlight fades on release, no penalty, no haptic)
- Touch target sizing for iOS (cells meet minimum tappable area)

### Out of Scope

- Grid generation algorithm (delivered in `grid-generator` Epic)
- Word validation logic (scene orchestrator determines valid/invalid)
- Otter sprite rendering and reactions
- Word list display and cross-off UI
- Hidden message reveal animation
- Scene-level layout, gradient background, and transitions
- Haptic feedback firing (scene orchestrator responsibility)

---

## Technical Approach

### Architecture

The `useDragSelect` hook encapsulates all pointer event state via `useReducer` with a discriminated union action type. The `Grid` component is a pure rendering layer — it receives grid data, drag state, and found-word data as props and renders the visual representation. No business logic in the component; all interaction state flows through the hook.

### Key Files

| File                                            | Action | Purpose                                         |
| ----------------------------------------------- | ------ | ----------------------------------------------- |
| `src/components/word-search/use-drag-select.ts` | Create | Pointer event tracking hook with direction lock |
| `src/components/word-search/grid.tsx`           | Create | 10x10 grid renderer with selection overlays     |

### Dependencies

| Package  | Version  | Import                                  |
| -------- | -------- | --------------------------------------- |
| `motion` | `12.34+` | `import { motion } from "motion/react"` |
| `clsx`   | —        | `import { clsx } from "clsx"`           |

### Imports from Existing Modules

| Module        | Import                                                       | Purpose                            |
| ------------- | ------------------------------------------------------------ | ---------------------------------- |
| `@/types`     | `WordSearchDirection`                                        | Direction type for lock constraint |
| `./generator` | `GridCell`, `CellPosition`, `WordPlacement`, `GeneratedGrid` | Grid data types                    |

### Implementation Details

**`useDragSelect` Hook — State Machine:**

```typescript
type DragPhase =
  | { readonly type: "idle" }
  | {
      readonly type: "selecting";
      readonly cells: readonly CellPosition[];
      readonly direction: WordSearchDirection | null;
    }
  | {
      readonly type: "released";
      readonly cells: readonly CellPosition[];
      readonly direction: WordSearchDirection;
    };

type DragAction =
  | { readonly type: "POINTER_DOWN"; readonly cell: CellPosition }
  | { readonly type: "POINTER_ENTER"; readonly cell: CellPosition }
  | { readonly type: "POINTER_UP" }
  | { readonly type: "RESET" };
```

**Direction Lock Algorithm:**

When the 2nd cell is entered during a drag:

1. Compute delta: `dRow = cell.row - start.row`, `dCol = cell.col - start.col`
2. If `dRow === 0` and `dCol !== 0` → `"horizontal"`
3. If `dRow !== 0` and `dCol === 0` → `"vertical"`
4. If `Math.abs(dRow) === Math.abs(dCol)` → `"diagonal"`
5. Otherwise → reject cell (does not align to any valid direction)
6. Once locked, subsequent cells must follow the locked direction vector exactly

**Cell Projection (after direction lock):**

After direction is locked, the hook computes which cell the pointer is "closest to" along the locked axis:

- Horizontal: only column changes, row stays fixed at start row
- Vertical: only row changes, column stays fixed at start column
- Diagonal: both row and column change by equal amounts from start

All intermediate cells between start and current endpoint are included in the selection (contiguous line).

**Hook Return Type:**

```typescript
type UseDragSelectReturn = {
  readonly dragPhase: DragPhase;
  readonly handlers: {
    readonly onPointerDown: (cell: CellPosition) => void;
    readonly onPointerEnter: (cell: CellPosition) => void;
    readonly onPointerUp: () => void;
  };
  readonly reset: () => void;
};

function useDragSelect(): UseDragSelectReturn;
```

**`Grid` Component — Props:**

```typescript
type FoundWord = {
  readonly word: string;
  readonly cells: readonly CellPosition[];
  readonly colorClass: string;
};

type GridProps = {
  readonly grid: GeneratedGrid;
  readonly dragPhase: DragPhase;
  readonly foundWords: readonly FoundWord[];
  readonly revealedCells: readonly CellPosition[];
  readonly onPointerDown: (cell: CellPosition) => void;
  readonly onPointerEnter: (cell: CellPosition) => void;
  readonly onPointerUp: () => void;
};
```

**Grid Layout:**

- CSS Grid: `grid-cols-10` with `aspect-square` cells
- Container: `w-full max-w-[min(85dvw,400px)]` to fit mobile viewport
- Cell size: auto-calculated from container width / 10 (must exceed 44x44pt effective area on standard iOS devices)
- Each cell renders the letter centered in Inter 500/14px

**Selection Overlay Rendering:**

- Active selection cells: semi-transparent highlight (`bg-rose-400/30`) positioned absolutely within each cell
- Found-word cells: persistent highlight using the word's assigned `colorClass`
- Overlap handling: if a cell belongs to multiple found words, the most recently found word's color takes precedence

**Warm Palette Color Assignments:**

7 unique warm-hue colors at 40% opacity for found-word highlights, assigned in discovery order:

```typescript
const WORD_HIGHLIGHT_COLORS = [
  "bg-rose-400/40",
  "bg-amber-400/40",
  "bg-orange-400/40",
  "bg-pink-400/40",
  "bg-fuchsia-400/40",
  "bg-red-400/40",
  "bg-yellow-400/40",
] as const;
```

**Spring Presets (inline, following PH-03 convention):**

```typescript
const SPRING_CELL = { type: "spring" as const, stiffness: 400, damping: 25 };
```

Used for cell scale feedback on pointer contact (`whileTap={{ scale: 0.95 }}`).

**Pointer Event Strategy:**

- Use `onPointerDown`, `onPointerMove` (via `onPointerEnter` on cells), and `onPointerUp`
- Set `touch-action: none` on the grid container to prevent browser scroll interference
- Use `pointer-events: auto` on cells, `pointer-events: none` on overlay elements

---

## Stories

### Story 1: Start Selection on Pointer Down

**As a** user,
**I want** to begin selecting letters by touching a grid cell,
**So that** I can start finding words.

**Acceptance Criteria:**

```gherkin
Given the grid is rendered with 100 letter cells
When I press down on any cell
Then the cell highlights with a semi-transparent warm color
And the drag state transitions from "idle" to "selecting" with that cell as the first selected cell
And no direction is locked yet
```

### Story 2: Lock Direction After Second Cell

**As a** user,
**I want** the selection direction to lock after I touch a second cell,
**So that** I can only select in a straight line (horizontal, vertical, or diagonal).

**Acceptance Criteria:**

```gherkin
Given I have started a selection on cell (3, 2)
When I drag to cell (3, 3)
Then the direction locks to "horizontal"
And only cells along row 3 are selectable for the remainder of this drag

Given I have started a selection on cell (3, 2)
When I drag to cell (4, 3)
Then the direction locks to "diagonal"
And only cells along the (1,1) vector from (3,2) are selectable

Given I have started a selection on cell (3, 2)
When I drag to cell (5, 4) which does not align to any valid direction from start
Then the cell is rejected and the selection remains at the start cell only
```

### Story 3: Render Active Selection Highlight

**As a** user,
**I want** to see a colored line following my finger as I drag across cells,
**So that** I know which letters I am selecting.

**Acceptance Criteria:**

```gherkin
Given a drag is in progress with direction locked to "horizontal"
When I drag from cell (3, 2) to cell (3, 6)
Then cells (3,2), (3,3), (3,4), (3,5), (3,6) all show the active selection highlight
And the highlight color is a semi-transparent warm tone (bg-rose-400/30)
And all intermediate cells between start and endpoint are included
```

### Story 4: Persist Found-Word Highlights with Unique Colors

**As a** user,
**I want** each found word to stay highlighted with a unique color,
**So that** I can see which words I have already found on the grid.

**Acceptance Criteria:**

```gherkin
Given I have found the word "DINN" (first word found)
When the word is validated as correct
Then the cells spelling "DINN" display a persistent highlight in bg-rose-400/40
And the highlight remains visible even after I start a new selection

Given I subsequently find "OTTIE" (second word found)
When the word is validated
Then "OTTIE" cells display bg-amber-400/40
And "DINN" cells retain bg-rose-400/40
And each subsequent found word receives the next color from WORD_HIGHLIGHT_COLORS
```

### Story 5: Fade Invalid Selection on Release

**As a** user,
**I want** invalid selections to fade away without penalty,
**So that** I can try again without frustration.

**Acceptance Criteria:**

```gherkin
Given I have selected cells that do not match any unfound word
When I lift my finger (pointer up)
Then the active selection highlight fades out over 200ms
And no haptic feedback fires
And no word is crossed off the list
And the drag state returns to "idle"
```

### Story 6: Render Grid Without Layout Shift on iOS Safari WebView

**As a** developer,
**I want** the grid to render with stable dimensions and no layout shift,
**So that** the word search is performant on iOS Safari WebView.

**Acceptance Criteria:**

```gherkin
Given the grid component mounts in the word search scene
When the 10x10 grid renders
Then the grid container has explicit dimensions (aspect-ratio or fixed size)
And no Cumulative Layout Shift occurs during or after grid population
And touch-action: none is set on the grid container to prevent scroll interference
And each cell meets the 44x44pt minimum touch target guideline at standard iOS display sizes
```

---

## Exit Criteria

- [ ] `src/components/word-search/use-drag-select.ts` exports `useDragSelect` hook and all associated types (`DragPhase`, `DragAction`, `UseDragSelectReturn`)
- [ ] `src/components/word-search/grid.tsx` exports `Grid` component and `GridProps`, `FoundWord` types
- [ ] Direction locks correctly after 2nd cell for all three directions (horizontal, vertical, diagonal)
- [ ] Active selection renders contiguous highlight along the locked direction
- [ ] Found words persist with unique warm-palette colors from `WORD_HIGHLIGHT_COLORS`
- [ ] Invalid selections fade on pointer release with no side effects
- [ ] Grid renders as 10x10 CSS Grid with `touch-action: none` and no layout shift
- [ ] Cell touch targets meet 44x44pt minimum at standard iOS viewport widths
- [ ] `whileTap` scale values are within 0.95-0.97 range per motion-engineering standards
- [ ] Zero `any` types in both modules
- [ ] All exported symbols have TSDoc comments
- [ ] `npx biome check src/components/word-search/` passes with zero diagnostics
- [ ] `pnpm build` succeeds with zero errors
