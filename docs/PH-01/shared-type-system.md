# [PH-01] Define Shared Type System

## Context

Every scene, component, and utility module in OttieVerse depends on a common set of type definitions. The `Scene` discriminated union drives the state machine, quiz question types define the trivia engine data shape, and word search types specify the grid generation contract. Defining these types first establishes the compile-time contract that all downstream code must satisfy, preventing drift between modules.

**Design Doc Reference:** Section 4 — Scene Architecture, Section 5 — Scene Specifications (Quiz + Word Search)
**Phase:** `PH-01` — Foundation & Tooling
**Blocks:** `implement-library-utilities` (constants.ts imports these types)
**Blocked By:** None

---

## Scope

### In Scope

- `src/types/index.ts` — all shared type definitions and constants:
  - `Scene` type (string literal union)
  - `SCENE_ORDER` constant (readonly tuple of all scene values)
  - `QuizQuestion` type (question text, correct answer(s), wrong answers, metadata)
  - `QuizOption` type (label, value, correct flag)
  - `WordSearchDirection` type (placement direction union)
  - `WordSearchWord` type (word, length, direction)
  - `WordSearchConfig` type (grid dimensions, words, hidden message)
  - `HapticEvent` type (union of all haptic events defined in DESIGN_DOC.md Section 7)
  - `SceneTransition` type (from/to scene pair with trigger description)

### Out of Scope

- Runtime logic (no functions, no side effects — types and constants only)
- Component props types (defined co-located with each component)
- Quiz question content data (that lives in `constants.ts`)
- Word search word list data (that lives in `constants.ts`)

---

## Technical Approach

### Architecture

This module is a pure type-and-constant barrel export. It contains zero runtime logic beyond the `SCENE_ORDER` constant array. All types use discriminated unions where applicable and `readonly` modifiers by default. The module is the dependency root — it imports nothing from the project.

### Key Files

| File                 | Action | Purpose                                                         |
| -------------------- | ------ | --------------------------------------------------------------- |
| `src/types/index.ts` | Create | Define and export all shared types and the SCENE_ORDER constant |

### Dependencies

None. This module has zero imports (no external packages, no project modules).

### Implementation Details

**Scene type (from DESIGN_DOC.md Section 4):**

```typescript
type Scene =
  | "welcome"
  | "quiz"
  | "word-search"
  | "poetry-canvas"
  | "letter"
  | "the-ask";

const SCENE_ORDER = [
  "welcome",
  "quiz",
  "word-search",
  "poetry-canvas",
  "letter",
  "the-ask",
] as const satisfies readonly Scene[];
```

**QuizQuestion type (from DESIGN_DOC.md Section 5, Scene 1):**

```typescript
interface QuizOption {
  readonly label: string;
  readonly isCorrect: boolean;
}

interface QuizQuestion {
  readonly id: number;
  readonly question: string;
  readonly options: readonly QuizOption[];
  readonly allowMultipleCorrect: boolean;
}
```

- `allowMultipleCorrect` supports Q2 where both "January 25" and "January 26" are valid
- Options contain their correctness flag; shuffling happens at render time

**WordSearch types (from DESIGN_DOC.md Section 5, Scene 2):**

```typescript
type WordSearchDirection = "horizontal" | "vertical" | "diagonal";

interface WordSearchWord {
  readonly word: string;
  readonly direction: WordSearchDirection;
}

interface WordSearchConfig {
  readonly gridSize: number;
  readonly words: readonly WordSearchWord[];
  readonly hiddenMessage: string;
}
```

- `gridSize` is 10 (10x10 grid = 100 cells)
- `hiddenMessage` is "BE MY VALENTINE"
- 7 words with directions per DESIGN_DOC.md Section 5 Scene 2 table

**HapticEvent type (from DESIGN_DOC.md Section 7):**

```typescript
type HapticEvent =
  | "tap-to-start"
  | "correct-answer"
  | "wrong-answer"
  | "word-found"
  | "hidden-message-reveal"
  | "poem-submitted"
  | "no-button-press"
  | "yes-press";
```

---

## Stories

### Story 1: Define Scene type and SCENE_ORDER constant

**As a** developer,
**I want** a `Scene` string literal union and `SCENE_ORDER` readonly tuple exported from `types/index.ts`,
**So that** the state machine and all scene-conditional logic reference a single source of truth for scene identifiers and ordering.

**Acceptance Criteria:**

```gherkin
Given types/index.ts is imported
When a variable is typed as Scene
Then it only accepts "welcome", "quiz", "word-search", "poetry-canvas", "letter", or "the-ask"

Given SCENE_ORDER is imported
When its length is checked
Then it is exactly 6 entries matching the state machine order: welcome → quiz → word-search → poetry-canvas → letter → the-ask

Given SCENE_ORDER is declared
When a developer attempts to mutate it (push, splice, assignment)
Then TypeScript emits a compile error because the array is readonly
```

### Story 2: Define QuizQuestion and QuizOption types

**As a** developer,
**I want** `QuizQuestion` and `QuizOption` interfaces exported from `types/index.ts`,
**So that** quiz data in `constants.ts` and the quiz scene component have a compile-time contract for question shape.

**Acceptance Criteria:**

```gherkin
Given QuizQuestion is imported
When a question object is constructed
Then it requires id (number), question (string), options (readonly QuizOption[]), and allowMultipleCorrect (boolean)

Given QuizOption is imported
When an option object is constructed
Then it requires label (string) and isCorrect (boolean)

Given a QuizQuestion with allowMultipleCorrect: true
When multiple options have isCorrect: true
Then TypeScript does not error because the type permits multiple correct options
```

### Story 3: Define WordSearch types

**As a** developer,
**I want** `WordSearchDirection`, `WordSearchWord`, and `WordSearchConfig` types exported from `types/index.ts`,
**So that** the grid generator and word search scene have a shared contract for grid configuration.

**Acceptance Criteria:**

```gherkin
Given WordSearchDirection is imported
When a variable is typed as WordSearchDirection
Then it only accepts "horizontal", "vertical", or "diagonal"

Given WordSearchConfig is imported
When a config object is constructed
Then it requires gridSize (number), words (readonly WordSearchWord[]), and hiddenMessage (string)

Given WordSearchWord is imported
When a word object is constructed
Then it requires word (string) and direction (WordSearchDirection)
```

### Story 4: Define HapticEvent type

**As a** developer,
**I want** a `HapticEvent` string literal union exported from `types/index.ts`,
**So that** haptic event references across the codebase are type-checked against the DESIGN_DOC.md Section 7 haptics table.

**Acceptance Criteria:**

```gherkin
Given HapticEvent is imported
When a variable is typed as HapticEvent
Then it only accepts the 8 event identifiers defined in DESIGN_DOC.md Section 7: "tap-to-start", "correct-answer", "wrong-answer", "word-found", "hidden-message-reveal", "poem-submitted", "no-button-press", "yes-press"

Given a developer types an invalid string as HapticEvent
When TypeScript checks the assignment
Then a compile error is emitted
```

### Story 5: Enforce zero `any` and full readonly

**As a** developer,
**I want** every property in every exported type to use `readonly` modifiers and zero `any` types,
**So that** the type system enforces immutability and type safety per CLAUDE.md Section 4.

**Acceptance Criteria:**

```gherkin
Given types/index.ts is compiled
When npx biome check . runs
Then zero diagnostics are reported — no any types, no unused exports, no formatting violations

Given all interfaces in types/index.ts
When a developer attempts to mutate a property (e.g., question.id = 5)
Then TypeScript emits a compile error because all properties are readonly
```

---

## Exit Criteria

- [ ] `src/types/index.ts` exists and exports `Scene`, `SCENE_ORDER`, `QuizQuestion`, `QuizOption`, `WordSearchDirection`, `WordSearchWord`, `WordSearchConfig`, `HapticEvent`
- [ ] `Scene` is a 6-member string literal union matching DESIGN_DOC.md Section 4 state machine
- [ ] `SCENE_ORDER` is a `readonly` tuple with `as const satisfies readonly Scene[]`
- [ ] `QuizQuestion` supports `allowMultipleCorrect` for Q2 dual-correct logic
- [ ] `WordSearchConfig` includes `gridSize`, `words`, and `hiddenMessage` fields
- [ ] All properties across all interfaces use `readonly` modifier
- [ ] Zero `any` types in the file
- [ ] `pnpm build` succeeds with zero errors
- [ ] `npx biome check .` passes with zero diagnostics
- [ ] File uses `export type` for all type-position-only exports
