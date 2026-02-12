---
name: typescript-writing
description: Production-grade TypeScript code generation for React 19, Next.js static export, and Capacitor mobile apps. Use when creating or modifying any .ts or .tsx file. Enforces strict typing, discriminated unions, Result types, readonly-first patterns, and FAANG-level code standards derived from Google TSGuide, Microsoft guidelines, and Total TypeScript best practices.
---

# TypeScript Writing

Write production-grade TypeScript. All `.ts` and `.tsx` output MUST comply with these standards.

## Strict Typing

### Zero `any` Policy

Never use `any`. Use `unknown` at boundaries and narrow with type guards.

```typescript
// BAD
function parse(input: any): any {
  return JSON.parse(input);
}

// GOOD
function parse(input: string): unknown {
  return JSON.parse(input);
}

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as Record<string, unknown>).id === "string"
  );
}
```

### Discriminated Unions for State

Model all multi-state objects as discriminated unions. Use `assertNever` for exhaustiveness.

```typescript
// BAD
type SceneState = {
  loading: boolean;
  error: string | null;
  data: SceneData | null;
};

// GOOD
type SceneState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly error: AppError }
  | { readonly status: "ready"; readonly data: SceneData };

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

function renderScene(state: SceneState): React.ReactNode {
  switch (state.status) {
    case "idle": return <Placeholder />;
    case "loading": return <Spinner />;
    case "error": return <ErrorView error={state.error} />;
    case "ready": return <Scene data={state.data} />;
    default: return assertNever(state);
  }
}
```

### `satisfies` for Validation with Narrow Inference

```typescript
// BAD — annotation widens the type
const SCENES: Record<string, SceneConfig> = { welcome: { ... } };

// GOOD — validates AND preserves literal keys
const SCENES = {
  welcome: { order: 0, haptic: "light" },
  quiz: { order: 1, haptic: "medium" },
} satisfies Record<string, SceneConfig>;
```

### `as const` for Literal Tuples and Enums

```typescript
const SCENE_ORDER = [
  "welcome",
  "quiz",
  "word-search",
  "poetry-canvas",
  "letter",
  "the-ask",
] as const;

type SceneId = (typeof SCENE_ORDER)[number];
```

## Prohibitions

These patterns are **banned**. Their presence is a merge blocker.

| Banned Pattern                           | Use Instead                                    |
| ---------------------------------------- | ---------------------------------------------- |
| `any` (explicit or implicit)             | `unknown` + type guards                        |
| `@ts-ignore` without justification       | `@ts-expect-error` with linked issue           |
| `var`                                    | `const` (default) or `let` (mutation required) |
| `as` type assertion without comment      | Narrowing via type guards                      |
| `!` non-null assertion                   | Explicit null checks or `??`                   |
| `enum` (runtime enum)                    | `as const` object or union type                |
| `React.FC`                               | Function declaration with explicit return      |
| `React.forwardRef` (deprecated React 19) | `ref` as a regular prop                        |
| Floating promises                        | `await`, `void`, or `.catch()`                 |
| `useEffect` for derived state            | Compute during render                          |
| Barrel `index.ts` re-exports (app code)  | Direct file imports                            |
| `@apply` in CSS                          | Tailwind utilities in JSX                      |

## Error Handling

### Result Types for Domain Logic

Use `Result<T, E>` for operations with expected failure modes. Reserve `try/catch` for infrastructure boundaries (JSON parsing, Capacitor plugin calls).

```typescript
type Result<T, E = Error> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

type QuizValidationError =
  | { readonly code: "EMPTY_ANSWER" }
  | { readonly code: "INVALID_OPTION"; readonly optionId: string }
  | { readonly code: "ALREADY_ANSWERED"; readonly questionId: string };

function validateAnswer(
  question: QuizQuestion,
  answerId: string,
): Result<ValidatedAnswer, QuizValidationError> {
  if (!answerId) {
    return { success: false, error: { code: "EMPTY_ANSWER" } };
  }
  if (!question.options.some((o) => o.id === answerId)) {
    return {
      success: false,
      error: { code: "INVALID_OPTION", optionId: answerId },
    };
  }
  return {
    success: true,
    data: {
      questionId: question.id,
      answerId,
      correct: question.correctId === answerId,
    },
  };
}
```

### Custom Error Classes

Use `cause` chaining (ES2022). Always set `name`. Include a discriminant `code`.

```typescript
abstract class AppError extends Error {
  abstract readonly code: string;
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }
}
```

### Exhaustive Error Handling

Every `switch` on a discriminated union MUST include a `default: return assertNever(x)` branch.

## Immutability

Default to `readonly`. Only remove when localized mutation is intentionally required.

```typescript
// Properties
type SceneState = {
  readonly currentScene: SceneId;
  readonly answers: readonly string[];
  readonly score: number;
};

// Function parameters
function calculateScore(answers: readonly Answer[]): number {
  return answers.reduce((sum, a) => sum + (a.correct ? 1 : 0), 0);
}

// Updates via spread — never mutate
function addAnswer(state: SceneState, answer: string): SceneState {
  return {
    ...state,
    answers: [...state.answers, answer],
    score: state.score + 1,
  };
}

// Use toSorted/toReversed (ES2023) over sort/reverse
const sorted = items.toSorted((a, b) => a.score - b.score);
```

## React 19 Patterns

### Component Declarations

Use function declarations. Return `React.ReactNode`. Props are `readonly`.

```typescript
type QuizOptionProps = {
  readonly option: Option;
  readonly onSelect: (id: string) => void;
  readonly disabled: boolean;
};

function QuizOption({ option, onSelect, disabled }: QuizOptionProps): React.ReactNode {
  return (
    <button onClick={() => onSelect(option.id)} disabled={disabled} type="button">
      {option.label}
    </button>
  );
}
```

### Ref as Regular Prop (React 19)

```typescript
type InputProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly ref?: React.Ref<HTMLInputElement>;
};

function Input({ value, onChange, ref }: InputProps): React.ReactNode {
  return <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} />;
}
```

### Event Handlers

Model domain events in callback props, not DOM events. Use React event types only when the DOM event is needed directly.

```typescript
// GOOD: Domain callback
type QuizCardProps = { readonly onAnswer: (answerId: string) => void };

// GOOD: DOM event when needed
function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
  setQuery(event.currentTarget.value);
}
```

### Custom Hook Return Types

Use `as const` tuples for 2-value returns. Use named objects for 3+ values.

```typescript
function useToggle(initial: boolean): readonly [boolean, () => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle] as const;
}

type UseSceneManagerReturn = {
  readonly currentScene: SceneId;
  readonly advance: () => void;
  readonly progress: number;
};

function useSceneManager(): UseSceneManagerReturn {
  /* ... */
}
```

### State Initialization

Let TypeScript infer when the initial value is sufficient. Annotate for nullable or empty collections.

```typescript
const [count, setCount] = useState(0); // inferred
const [user, setUser] = useState<UserProfile | null>(null); // nullable
const [answers, setAnswers] = useState<readonly QuizAnswer[]>([]); // typed empty
```

## Async Patterns

### No Floating Promises

Every `Promise` must be `await`ed, `void`-prefixed (intentional fire-and-forget with `.catch()`), or returned.

```typescript
// BAD
function handleClick(): void {
  saveData();
}

// GOOD
async function handleClick(): Promise<void> {
  await saveData();
}

// GOOD: Intentional fire-and-forget in React event handler
function handleSubmit(): void {
  void (async () => {
    try {
      await submitForm(formData);
    } catch (e: unknown) {
      setError(toAppError(e));
    }
  })();
}
```

### Error Cause Chaining

Add context when re-throwing. Never catch-and-rethrow without adding information.

```typescript
try {
  return await loadConfig(sceneId);
} catch (e: unknown) {
  throw new SceneLoadError(sceneId, { cause: e });
}
```

## Imports

### Type-Only Imports

Use `import type` for all type-position-only imports. Use inline `type` qualifier for mixed imports.

```typescript
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

import type { SceneId } from "@/types/scene";
import { useSceneManager } from "@/lib/scene-manager";
import { triggerHaptic, type HapticPattern } from "@/lib/haptics";

import { QuizOption } from "./QuizOption";
import type { QuizConfig } from "./types";
```

### Import Order

1. External packages (react, motion, zod)
2. Internal aliases (`@/...`)
3. Relative imports (`./...`)

Type imports follow value imports within each group. Biome enforces sorting.

### Direct Imports Only

Import from the source file, not barrel `index.ts` re-exports. Exception: small, cohesive modules (3 or fewer exports) where all exports are always consumed together.

## Comments

### "Why, Not What" — Mandatory

Comments explain intent, trade-offs, and constraints. Never restate what the code does.

```typescript
// BAD: Restates code
// Set the score to zero
let score = 0;

// GOOD: Explains WHY
// Scene score resets on each entry — scores are not persisted across scenes
// per DESIGN_DOC.md Section 5.3
let score = 0;
```

### When Comments ARE Required

1. **Regex patterns** — explain what the pattern matches
2. **Magic numbers** — explain derivation
3. **Workarounds** — link upstream issue and expected resolution
4. **Type assertions** — every `as` cast MUST justify why it is safe
5. **Non-obvious performance choices** — explain the trade-off

### TSDoc for Exported Symbols

All exported functions, types, and constants MUST have TSDoc. Internal symbols do not require docs if self-documenting.

```typescript
/**
 * Triggers device haptic feedback for the given interaction type.
 *
 * Falls back to a no-op on platforms without haptic support.
 * Safe to call unconditionally — platform detection is handled internally.
 *
 * @param pattern - Haptic pattern from DESIGN_DOC.md Section 8.
 */
export function triggerHaptic(pattern: HapticPattern): void {
  /* ... */
}
```

## Boundary Validation

Use `zod` for all external data boundaries (URL params, storage reads, Capacitor plugin responses). Schema-first: define the zod schema, then derive the TypeScript type.

```typescript
import { z } from "zod";

const QuizAnswerSchema = z.object({
  questionId: z.string().min(1),
  answerId: z.string().min(1),
  timestamp: z.number().int().positive(),
});

type QuizAnswer = z.infer<typeof QuizAnswerSchema>;

function parseAnswer(raw: unknown): Result<QuizAnswer, z.ZodError> {
  const result = QuizAnswerSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}
```

## Generics

Use generics when preserving a type relationship between inputs and outputs. Prefer inference over explicit type arguments. Do not add generics when a concrete type suffices.

```typescript
// BAD: Generic used once with no relationship
function wrap<T>(value: T): { value: T } {
  return { value };
}

// GOOD: Generic preserves input-output relationship
function groupBy<T, K extends string>(
  items: readonly T[],
  keyFn: (item: T) => K,
): Record<K, readonly T[]> {
  const result = {} as Record<K, T[]>;
  for (const item of items) {
    const key = keyFn(item);
    (result[key] ??= []).push(item);
  }
  return result;
}
```

## Validation Checklist

Before declaring TypeScript output complete:

- [ ] Zero `any` types (explicit or implicit via `noImplicitAny`)
- [ ] Zero `@ts-ignore` without linked issue
- [ ] Zero `var` declarations
- [ ] Zero floating promises
- [ ] Zero unused variables or imports
- [ ] All state modeled as discriminated unions
- [ ] All properties and parameters `readonly` by default
- [ ] All exported symbols have TSDoc
- [ ] All `switch` on unions include `assertNever` default
- [ ] All type-only imports use `import type`
- [ ] `npx biome check .` passes with zero diagnostics
