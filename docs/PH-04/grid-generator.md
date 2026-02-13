# [PH-04] Build Grid Generation Algorithm

## Context

The word search grid is a 10x10 letter matrix encoding 7 hidden words and a secret message. The generator is a pure computational module with zero React or DOM dependencies — it takes a `WordSearchConfig` and returns a fully populated grid with placement metadata. This module is the foundational data layer that the grid renderer and scene orchestrator depend on.

**Design Doc Reference:** Section 5 — Scene 2 (Word Search), Grid Generation
**Phase:** `PH-04` — Word Search Scene
**Blocks:** `drag-select-and-grid`, `word-search-scene`
**Blocked By:** `PH-01` (types: `WordSearchConfig`, `WordSearchWord`, `WordSearchDirection`)

---

## Scope

### In Scope

- `src/components/word-search/generator.ts` — pure module exporting `generateGrid` function
- Type definitions: `GridCell`, `CellPosition`, `WordPlacement`, `GeneratedGrid`
- Word placement algorithm for 3 direction types (horizontal, vertical, diagonal-down-right)
- Hidden message letter scattering ("BE MY VALENTINE" = 13 alphabetic characters across remaining cells)
- Weighted random filler generation for remaining cells (weighted toward common consonants)
- Deterministic output for a given config (seeded randomness or fixed placement strategy)
- Validation that all 7 words are findable and hidden message is extractable

### Out of Scope

- Grid rendering or any DOM manipulation
- Drag/selection interaction logic
- React hooks or component code
- Animation, haptics, or scene transitions
- Word list display or cross-off UI
- Otter sprite integration

---

## Technical Approach

### Architecture

Pure functional module. Single entry point `generateGrid` accepts `WordSearchConfig` (from `@/types`) and returns `GeneratedGrid`. Zero side effects, zero external state. All randomness is internal to the function; the algorithm prioritizes longest words first to maximize placement success.

### Key Files

| File                                      | Action | Purpose                                 |
| ----------------------------------------- | ------ | --------------------------------------- |
| `src/components/word-search/generator.ts` | Create | Grid generation algorithm, type exports |

### Dependencies

| Package | Version | Import                                             |
| ------- | ------- | -------------------------------------------------- |
| None    | —       | Pure TypeScript module, zero external dependencies |

### Imports from Existing Modules

| Module    | Import                                                      | Purpose                   |
| --------- | ----------------------------------------------------------- | ------------------------- |
| `@/types` | `WordSearchConfig`, `WordSearchWord`, `WordSearchDirection` | Input configuration types |

### Implementation Details

**Exported Types:**

```typescript
type CellPosition = {
  readonly row: number;
  readonly col: number;
};

type GridCell = {
  readonly letter: string;
  readonly row: number;
  readonly col: number;
};

type WordPlacement = {
  readonly word: string;
  readonly direction: WordSearchDirection;
  readonly cells: readonly CellPosition[];
};

type GeneratedGrid = {
  readonly cells: readonly (readonly GridCell[])[];
  readonly wordPlacements: readonly WordPlacement[];
  readonly hiddenMessageCells: readonly CellPosition[];
};
```

**Exported Function:**

```typescript
function generateGrid(config: WordSearchConfig): GeneratedGrid;
```

**Algorithm — Word Placement:**

1. Initialize a 10x10 mutable grid (internal working copy, frozen on output)
2. Sort words by length descending: CRIMINAL(8), FOREVER(7), TORONTO(7), OTTIE(5), DINN(4), LOVE(4), BEBE(4)
3. For each word, compute all valid start positions given its assigned direction:
   - **Horizontal:** row 0-9, column must satisfy `col + word.length <= 10`
   - **Vertical:** column 0-9, row must satisfy `row + word.length <= 10`
   - **Diagonal (down-right):** both `row + word.length <= 10` and `col + word.length <= 10`
4. Direction vectors: horizontal `(0, 1)`, vertical `(1, 0)`, diagonal `(1, 1)`
5. For each candidate position, verify every target cell is either empty or contains the same letter (valid intersection)
6. Select a valid position for each word. If no valid position exists, retry with a different placement order (backtracking)
7. Record `WordPlacement` with the word, direction, and occupied `CellPosition` array

**Algorithm — Hidden Message Scattering:**

1. After word placement, collect all empty cell positions
2. The hidden message "BE MY VALENTINE" contains 13 alphabetic characters: B, E, M, Y, V, A, L, E, N, T, I, N, E
3. Select 13 cells from the empty pool (random distribution, not clustered)
4. Assign each hidden message letter to a selected cell in message order
5. Record these 13 cells as `hiddenMessageCells` in message-reading order

**Algorithm — Filler Generation:**

1. Fill all remaining empty cells with weighted random letters
2. Weight distribution (relative frequency):
   - High frequency: T(12), N(10), S(10), R(10)
   - Medium frequency: L(8), D(6), C(6), M(6)
   - Low frequency: H(4), G(4), P(4), B(3), F(3), W(3)
   - Rare: K(2), J(1), X(1), Z(1)
3. Exclude vowels A, E, I, O, U from filler to minimize accidental word formation (hidden message already supplies necessary vowels)

**Cell Count Reconciliation:**

- 7 words occupy 39 cells (assuming no intersections; intersections reduce this count)
- Hidden message occupies 13 cells
- Filler occupies remaining cells (48 if no intersections, more if words intersect)
- Total: 100 cells

**Output Immutability:**

All returned arrays and objects use `readonly` modifiers. The internal mutable working grid is frozen via spread/map before return.

---

## Stories

### Story 1: Place All 7 Words in Correct Directions

**As a** user,
**I want** the grid to contain all 7 words placed in their specified directions,
**So that** I can find each word by dragging in the correct orientation.

**Acceptance Criteria:**

```gherkin
Given a WordSearchConfig with 7 words and their directions
When generateGrid is called
Then the returned GeneratedGrid.wordPlacements contains exactly 7 entries
And each WordPlacement.word matches the input word
And each WordPlacement.direction matches the input direction
And each WordPlacement.cells array has length equal to the word length
And reading the grid cells at each WordPlacement.cells position spells the word
```

### Story 2: Encode Hidden Message in Remaining Cells

**As a** user,
**I want** the remaining grid cells to encode "BE MY VALENTINE",
**So that** the hidden message reveals after I find all words.

**Acceptance Criteria:**

```gherkin
Given a generated grid with all 7 words placed
When the hiddenMessageCells are read in order
Then the letters spell "BEMYVALENTINE" (13 characters)
And no hiddenMessageCell overlaps with any WordPlacement cell
And hiddenMessageCells are distributed across the grid (not clustered in a single row/column)
```

### Story 3: Fill Remaining Cells with Weighted Random Letters

**As a** developer,
**I want** filler cells to use weighted consonant distribution,
**So that** the grid looks natural and does not form accidental readable words.

**Acceptance Criteria:**

```gherkin
Given a generated grid with words and hidden message placed
When filler cells are populated
Then every remaining empty cell contains a single uppercase letter
And filler letters are drawn from the weighted consonant distribution (no A, E, I, O, U in filler)
And the total grid contains exactly 100 filled cells (10 rows x 10 columns)
```

### Story 4: Produce Deterministic Output

**As a** developer,
**I want** the grid generation to produce consistent results for the same config,
**So that** the word search experience is testable and reproducible.

**Acceptance Criteria:**

```gherkin
Given the WORD_SEARCH_CONFIG from @/lib/constants
When generateGrid is called multiple times
Then the word placements are identical across invocations
And the hidden message cell positions are identical across invocations
And the filler letters are identical across invocations
```

### Story 5: Handle Word Intersections Gracefully

**As a** developer,
**I want** the placement algorithm to allow valid letter intersections,
**So that** words sharing a common letter can cross without conflict.

**Acceptance Criteria:**

```gherkin
Given two words that share a common letter (e.g., FOREVER and LOVE both contain 'O')
When both words are placed and their paths cross at the shared letter
Then the intersection cell contains the shared letter exactly once
And both WordPlacement entries include the intersection cell in their cells array
And the total occupied cell count is (sum of word lengths - number of intersections)
```

---

## Exit Criteria

- [ ] `src/components/word-search/generator.ts` exports `generateGrid`, `GridCell`, `CellPosition`, `WordPlacement`, `GeneratedGrid`
- [ ] `generateGrid(WORD_SEARCH_CONFIG)` returns a grid with all 7 words correctly placed in their specified directions
- [ ] Hidden message cells spell "BEMYVALENTINE" when read in order
- [ ] All 100 grid cells contain a single uppercase letter — zero empty cells
- [ ] Filler cells contain only consonants from the weighted distribution
- [ ] Output is fully `readonly` — no mutable arrays or objects in the return type
- [ ] Zero `any` types in the module
- [ ] All exported symbols have TSDoc comments
- [ ] `npx biome check src/components/word-search/generator.ts` passes with zero diagnostics
- [ ] `pnpm build` succeeds with zero errors
