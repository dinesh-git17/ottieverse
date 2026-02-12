# [PH-01] Implement Library Utilities

## Context

Three utility modules provide the shared runtime infrastructure for all scenes: a haptics abstraction that gates native Capacitor APIs behind platform detection, a constants module that defines quiz question data and word search configuration, and an SMS deep-link utility for the final scene CTA. These modules must be fully typed, tested against the shared type system, and safe to import in both native and browser environments.

**Design Doc Reference:** Section 5 — Scene Specifications (Quiz data, Word Search words), Section 7 — Haptics Strategy, Section 5 Scene 5 — SMS Deep Link
**Phase:** `PH-01` — Foundation & Tooling
**Blocks:** None
**Blocked By:** `shared-type-system` (imports `QuizQuestion`, `WordSearchWord`, `WordSearchConfig`, `HapticEvent` from `types/index.ts`)

---

## Scope

### In Scope

- `src/lib/haptics.ts` — Capacitor haptics abstraction with `light`, `medium`, `heavy`, `success`, `error`, `vibrate`, `pattern` methods, all gated behind `Capacitor.isNativePlatform()`
- `src/lib/constants.ts` — Quiz question data (5 questions per DESIGN_DOC.md Section 5 Scene 1), word search word list (7 words per DESIGN_DOC.md Section 5 Scene 2), word search config, and scene-related constants
- `src/lib/sms.ts` — SMS deep-link utility that opens the native Messages app with a pre-filled recipient and body

### Out of Scope

- Scene components that consume these utilities (PH-02+)
- Grid generation algorithm (`src/components/word-search/generator.ts` — PH-04)
- Haptic integration testing on physical device (PH-06)
- SMS recipient phone number and message text (pending from Dinesh — use placeholder constants with clear naming)

---

## Technical Approach

### Architecture

Each utility module is a standalone barrel export with zero cross-dependencies between them (they share only the type imports from `types/index.ts`). The haptics module uses the facade pattern to wrap `@capacitor/haptics` behind a platform check, ensuring browser development works without native APIs. The constants module exports readonly data structures matching the type contracts. The SMS module exports a single function.

### Key Files

| File                   | Action | Purpose                                       |
| ---------------------- | ------ | --------------------------------------------- |
| `src/lib/haptics.ts`   | Create | Capacitor haptics abstraction layer           |
| `src/lib/constants.ts` | Create | Quiz data, word search config, static content |
| `src/lib/sms.ts`       | Create | SMS deep-link launcher                        |

### Dependencies

| Package              | Version  | Import                                                                         |
| -------------------- | -------- | ------------------------------------------------------------------------------ |
| `@capacitor/haptics` | `^8.0.0` | `import { Haptics, ImpactStyle, NotificationStyle } from "@capacitor/haptics"` |
| `@capacitor/core`    | `^8.0.0` | `import { Capacitor } from "@capacitor/core"`                                  |

### Implementation Details

**haptics.ts — exact implementation from DESIGN_DOC.md Section 7:**

```typescript
import { Haptics, ImpactStyle, NotificationStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();

export const haptic = {
  light: () => isNative && Haptics.impact({ style: ImpactStyle.Light }),
  medium: () => isNative && Haptics.impact({ style: ImpactStyle.Medium }),
  heavy: () => isNative && Haptics.impact({ style: ImpactStyle.Heavy }),
  success: () =>
    isNative && Haptics.notification({ type: NotificationStyle.Success }),
  error: () =>
    isNative && Haptics.notification({ type: NotificationStyle.Error }),
  vibrate: () => isNative && Haptics.vibrate(),
  pattern: async (count: number, delay: number) => {
    if (!isNative) return;
    for (let i = 0; i < count; i++) {
      await Haptics.impact({ style: ImpactStyle.Light });
      await new Promise((r) => setTimeout(r, delay));
    }
  },
} as const;
```

**constants.ts — quiz questions sourced from DESIGN_DOC.md Section 5 Scene 1:**

All 5 questions with exact answer text from the Design Doc table. Each `QuizQuestion` object uses `readonly` arrays. Q2 has `allowMultipleCorrect: true` with both "January 25" and "January 26" marked `isCorrect: true`.

Word search configuration:

```typescript
const WORD_SEARCH_WORDS: readonly WordSearchWord[] = [
  { word: "DINN", direction: "horizontal" },
  { word: "OTTIE", direction: "vertical" },
  { word: "FOREVER", direction: "horizontal" },
  { word: "TORONTO", direction: "diagonal" },
  { word: "CRIMINAL", direction: "horizontal" },
  { word: "LOVE", direction: "vertical" },
  { word: "BEBE", direction: "diagonal" },
] as const;

const WORD_SEARCH_CONFIG: WordSearchConfig = {
  gridSize: 10,
  words: WORD_SEARCH_WORDS,
  hiddenMessage: "BE MY VALENTINE",
} as const;
```

**sms.ts — deep link from DESIGN_DOC.md Section 5 Scene 5:**

```typescript
/** Phone number for SMS deep link. */
const SMS_PHONE = "" as const;

/** Pre-filled SMS message body. */
const SMS_BODY = "" as const;

export function openSmsApp(): void {
  const message = encodeURIComponent(SMS_BODY);
  window.open(`sms:${SMS_PHONE}&body=${message}`, "_system");
}
```

Phone number and message body are empty strings with clear constant names. These are external blockers owned by Dinesh (see PHASES.md External Blockers table). The function signature and deep-link format are finalized.

---

## Stories

### Story 1: Implement platform-gated haptics abstraction

**As a** developer,
**I want** a `haptic` object exported from `lib/haptics.ts` with `light`, `medium`, `heavy`, `success`, `error`, `vibrate`, and `pattern` methods,
**So that** all scene components can trigger native haptic feedback through a single import without directly depending on `@capacitor/haptics`.

**Acceptance Criteria:**

```gherkin
Given haptics.ts is imported in a component
When haptic.light() is called on a native iOS device
Then Haptics.impact({ style: ImpactStyle.Light }) fires

Given haptics.ts is imported in a component
When haptic.light() is called in a browser environment
Then no error is thrown and the call is silently skipped

Given haptic.pattern(3, 100) is called on a native device
When the pattern executes
Then 3 sequential ImpactStyle.Light haptics fire with 100ms delay between each

Given haptic.success() is called
When running on native platform
Then Haptics.notification({ type: NotificationStyle.Success }) fires
```

### Story 2: Define quiz question data

**As a** developer,
**I want** a `QUIZ_QUESTIONS` constant exported from `lib/constants.ts` containing all 5 quiz questions with exact text from DESIGN_DOC.md,
**So that** the quiz scene can consume a typed, readonly data array without hardcoding question content.

**Acceptance Criteria:**

```gherkin
Given QUIZ_QUESTIONS is imported
When its length is checked
Then it is exactly 5

Given QUIZ_QUESTIONS is typed as readonly QuizQuestion[]
When question 1 is accessed
Then question is "When is Dinesh's birthday?" with correct answer "April 17" and 3 wrong answers matching DESIGN_DOC.md Section 5 Scene 1 table

Given question 2 (index 1) is accessed
When allowMultipleCorrect is checked
Then it is true, and both "January 25" and "January 26" options have isCorrect: true

Given QUIZ_QUESTIONS is declared as readonly
When a developer attempts to push, splice, or reassign
Then TypeScript emits a compile error
```

### Story 3: Define word search configuration

**As a** developer,
**I want** `WORD_SEARCH_CONFIG` and `WORD_SEARCH_WORDS` constants exported from `lib/constants.ts`,
**So that** the grid generator in PH-04 has typed, readonly input data for grid construction.

**Acceptance Criteria:**

```gherkin
Given WORD_SEARCH_WORDS is imported
When its length is checked
Then it is exactly 7 words

Given each word in WORD_SEARCH_WORDS
When its direction is checked
Then DINN is "horizontal", OTTIE is "vertical", FOREVER is "horizontal", TORONTO is "diagonal", CRIMINAL is "horizontal", LOVE is "vertical", BEBE is "diagonal" — matching DESIGN_DOC.md Section 5 Scene 2 table

Given WORD_SEARCH_CONFIG is imported
When gridSize is checked
Then it is 10

Given WORD_SEARCH_CONFIG.hiddenMessage is checked
Then it is "BE MY VALENTINE"
```

### Story 4: Implement SMS deep-link utility

**As a** developer,
**I want** an `openSmsApp()` function exported from `lib/sms.ts`,
**So that** the final scene CTA can launch the native Messages app with a pre-filled recipient and body using the iOS `sms:` URI scheme.

**Acceptance Criteria:**

```gherkin
Given openSmsApp() is called
When the function executes
Then window.open is called with a URL matching the pattern "sms:<phone>&body=<encoded_message>"

Given SMS_PHONE and SMS_BODY are empty strings (pending external input)
When the module is compiled
Then TypeScript compilation succeeds with zero errors

Given a developer needs to fill in the phone number and message
When they open sms.ts
Then SMS_PHONE and SMS_BODY constants are clearly named and located at the top of the file
```

### Story 5: Ensure no direct @capacitor/haptics imports in components

**As a** developer,
**I want** the haptics module to be the sole import point for `@capacitor/haptics`,
**So that** CLAUDE.md Section 10.4 is enforced: "Direct imports from `@capacitor/haptics` in components are FORBIDDEN."

**Acceptance Criteria:**

```gherkin
Given the codebase is searched for @capacitor/haptics imports
When excluding src/lib/haptics.ts
Then zero other files import from @capacitor/haptics

Given a new component needs haptic feedback
When the developer imports haptic functionality
Then they import { haptic } from "@/lib/haptics" — not from @capacitor/haptics directly
```

---

## Exit Criteria

- [ ] `src/lib/haptics.ts` exports `haptic` object with `light`, `medium`, `heavy`, `success`, `error`, `vibrate`, `pattern` methods
- [ ] All haptic methods are gated behind `Capacitor.isNativePlatform()` — no errors in browser
- [ ] `haptic.pattern(count, delay)` fires sequential `ImpactStyle.Light` impacts with specified delay
- [ ] `src/lib/constants.ts` exports `QUIZ_QUESTIONS` with exactly 5 questions matching DESIGN_DOC.md Section 5 Scene 1 table
- [ ] Q2 has `allowMultipleCorrect: true` with both "January 25" and "January 26" as correct
- [ ] `src/lib/constants.ts` exports `WORD_SEARCH_WORDS` (7 words) and `WORD_SEARCH_CONFIG` (gridSize: 10, hiddenMessage: "BE MY VALENTINE")
- [ ] Word directions match DESIGN_DOC.md Section 5 Scene 2 table exactly
- [ ] `src/lib/sms.ts` exports `openSmsApp()` using `sms:` URI scheme with `window.open`
- [ ] SMS phone number and message body are empty string placeholders (external blocker)
- [ ] All constants are `readonly` / `as const`
- [ ] Zero `any` types across all three files
- [ ] No direct `@capacitor/haptics` imports outside `src/lib/haptics.ts`
- [ ] `pnpm build` succeeds with zero errors
- [ ] `npx biome check .` passes with zero diagnostics
