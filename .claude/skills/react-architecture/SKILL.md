---
name: react-architecture
description: React 19 and Next.js 16 component architecture enforcement for static-export Capacitor apps. Use when creating or modifying any component, hook, context provider, or state logic in .tsx or .ts files. Enforces hook-first architecture, useReducer for complex state, compound component patterns, strict component size limits, and zero prop drilling.
---

# React Architecture

Logic lives in hooks. UI lives in components. State machines drive scenes.

## Static Export + Client Boundaries

Next.js serves as a static site generator (`output: 'export'`). All runtime code is client-side. Push `'use client'` to the lowest boundary — never on `page.tsx`.

| File | Boundary | Rationale |
| --- | --- | --- |
| `src/app/layout.tsx` | Server | Metadata, fonts, static shell |
| `src/app/page.tsx` | Server | Mounts client orchestrator |
| `src/components/experience.tsx` | Client | State machine, hooks, interaction |
| `src/components/scenes/*.tsx` | Inherited | Children of client boundary |
| `src/components/ui/*.tsx` | Inherited | Interactive UI elements |
| `src/lib/*.ts` | N/A | Pure logic — no React |

### Rules

1. `layout.tsx` and `page.tsx` MUST remain Server Components
2. Client boundary goes on the orchestrator (`experience.tsx`), not the page
3. Pure utility modules (`src/lib/`) never use `'use client'`
4. Scene components inherit the client boundary — no redundant directives

## Hook-First Architecture

> If a component contains more than trivial `useState`/`useCallback`, extract it into a custom hook.

```typescript
// BAD: 200+ lines of interleaved logic and JSX
function WordSearch({ onComplete }: WordSearchProps): React.ReactNode {
  const [grid, setGrid] = useState<Grid>(() => generateGrid(WORDS));
  const [found, setFound] = useState<readonly string[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  function handlePointerDown(row: number, col: number) { /* 30 lines */ }
  // ... logic and JSX mixed together
}

// GOOD: Hook owns logic, component owns rendering
function WordSearch({ onComplete }: WordSearchProps): React.ReactNode {
  const { grid, found, selection, handlers, allFound } = useWordSearch(WORDS);

  useEffect(() => {
    if (allFound) onComplete();
  }, [allFound, onComplete]);

  return (
    <div className="..." {...handlers.grid}>
      {/* Pure rendering — no logic */}
    </div>
  );
}
```

### Hook Design Rules

1. **Name:** `use` + feature in PascalCase (`useWordSearch`, `useQuizProgress`)
2. **Return type:** Named object for 3+ values. `as const` tuple for exactly 2
3. **Parameters:** Accept configuration, not component props
4. **Composition:** Hooks may call other hooks. Build complex from simple

### Return Type Convention

```typescript
// 2 values → tuple
function useToggle(initial: boolean): readonly [boolean, () => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle] as const;
}

// 3+ values → named object with readonly properties
type UseQuizReturn = {
  readonly currentQuestion: QuizQuestion;
  readonly questionIndex: number;
  readonly selectAnswer: (answerId: string) => void;
  readonly advance: () => void;
};
```

## State Management

### When to Use What

| Complexity | Tool | Example |
| --- | --- | --- |
| Boolean toggle | `useState` | Modal open/close |
| Single primitive | `useState` | Input value, counter |
| Independent values | Multiple `useState` | Unrelated UI flags |
| Interdependent state | `useReducer` | Quiz progress |
| State machine | `useReducer` | Scene orchestrator, word search |
| Complex with children | `useReducer` + Context | Compound components |

### useReducer with Discriminated Unions

Complex interactive features MUST use `useReducer` with discriminated union actions. Switch on `state.phase` first, then `action.type` — this models a state machine.

```typescript
type QuizState =
  | { readonly phase: "answering"; readonly questionIndex: number; readonly score: number }
  | { readonly phase: "feedback"; readonly questionIndex: number; readonly score: number;
      readonly isCorrect: boolean }
  | { readonly phase: "complete"; readonly score: number; readonly total: number };

type QuizAction =
  | { readonly type: "SELECT_ANSWER"; readonly answerId: string }
  | { readonly type: "ADVANCE" }
  | { readonly type: "RETRY" };

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (state.phase) {
    case "answering":
      if (action.type === "SELECT_ANSWER") {
        const isCorrect = checkAnswer(state.questionIndex, action.answerId);
        return { phase: "feedback", questionIndex: state.questionIndex,
          score: isCorrect ? state.score + 1 : state.score, isCorrect };
      }
      return state;
    case "feedback":
      if (action.type === "ADVANCE") {
        const next = state.questionIndex + 1;
        return next >= TOTAL_QUESTIONS
          ? { phase: "complete", score: state.score, total: TOTAL_QUESTIONS }
          : { phase: "answering", questionIndex: next, score: state.score };
      }
      if (action.type === "RETRY") {
        return { phase: "answering", questionIndex: state.questionIndex, score: state.score };
      }
      return state;
    case "complete":
      return state;
    default:
      return assertNever(state);
  }
}
```

### Reducer Rules

1. Reducers MUST be pure — no side effects, no async, no haptics
2. State and action types MUST be discriminated unions with `readonly` properties
3. Include `assertNever` default for exhaustive checking
4. Side effects fire in event handlers, not in the reducer

### useState Anti-Patterns

```typescript
// BAD: Interdependent useState — renders intermediate invalid states
const [question, setQuestion] = useState(0);
const [score, setScore] = useState(0);
const [isCorrect, setIsCorrect] = useState(false);

// GOOD: Atomic state transitions via useReducer
const [state, dispatch] = useReducer(quizReducer, INITIAL_STATE);
```

## Compound Components

Use when a feature has 3+ visual sub-parts sharing state. Parent manages state via Context; children consume it.

```typescript
const QuizContext = createContext<QuizContextValue | null>(null);

function useQuizContext(): QuizContextValue {
  const context = use(QuizContext);
  if (context === null) {
    throw new Error("Quiz.* components must be used within <Quiz.Root>");
  }
  return context;
}

function QuizRoot({ children }: { readonly children: React.ReactNode }): React.ReactNode {
  const quiz = useQuiz(QUESTIONS);
  return <QuizContext value={quiz}>{children}</QuizContext>;
}

function QuizProgress(): React.ReactNode {
  const { questionIndex, totalQuestions } = useQuizContext();
  return <ProgressDots current={questionIndex} total={totalQuestions} />;
}

// Assembly — export as namespace
const Quiz = { Root: QuizRoot, Progress: QuizProgress, Question: QuizQuestion } as const;

// Usage: <Quiz.Root><Quiz.Progress /><Quiz.Question /></Quiz.Root>
```

### Context Rules (React 19)

1. Use `<Context value={...}>` directly — no `.Provider` suffix
2. Use `use()` hook to read context — replaces `useContext()` for new code
3. Create a typed wrapper hook that throws if context is `null`
4. Split state and dispatch into separate contexts when performance matters

### When to Use Each Pattern

| Signal | Pattern |
| --- | --- |
| 3+ visual sub-parts sharing state | Compound component |
| Parent-child shared behavior | Compound component |
| Simple data flow (1-2 props) | Direct props |
| Cross-cutting concern | Context only |
| No visual output | Custom hook only |

## Component Size Limits

No component file SHOULD exceed 150 lines (excluding imports/types). Beyond 200 lines is a MUST-decompose signal.

### Extraction Signals

1. **Multiple responsibilities** — header AND form AND list in one component
2. **Deep JSX nesting** — more than 4 levels
3. **Conditional rendering** — more than 2 inline ternaries
4. **Repeated patterns** — similar JSX appears 3+ times
5. **Complex handlers** — handler exceeds 10 lines (extract to hook)

### File Organization

```
src/components/scenes/quiz.tsx      # Scene component (< 150 lines)
src/components/scenes/quiz/
├── use-quiz.ts                     # Feature hook
├── quiz-option.tsx                 # Sub-component
└── types.ts                       # Local types (if needed)
```

Co-locate hooks with scenes. Multi-scene hooks go to `src/lib/`.

## Prop Drilling Prevention

Props MUST NOT pass through more than 2 component boundaries without consumption.

| Depth | Solution |
| --- | --- |
| 1 level | Direct props |
| 2 levels | Direct props (if consumed at each level) |
| 3+ levels | Context or compound component |
| Cross-scene | Lift to orchestrator (`experience.tsx`) |

## Derived State

### No useEffect for Computed Values

```typescript
// BAD: useEffect to sync derived state — extra re-render
const [percentage, setPercentage] = useState(0);
useEffect(() => {
  setPercentage(total > 0 ? Math.round((score / total) * 100) : 0);
}, [score, total]);

// GOOD: Compute during render — zero overhead
const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
```

### useMemo for Expensive Computations

| Computation | useMemo? | Rationale |
| --- | --- | --- |
| Simple arithmetic | No | Negligible cost |
| Array filter/map (< 100 items) | No | Fast enough |
| Grid generation (100+ cells) | Yes | O(n^2) placement |
| Array shuffle (stable ref) | Yes | Prevents re-shuffle |
| Object literal in JSX | No | React Compiler handles it |

## Event Handler Conventions

Callback props model domain actions, not DOM events. Name props `on` + action, handlers `handle` + action.

```typescript
// BAD: Exposing DOM details
type Props = { readonly onClick: (e: React.MouseEvent) => void };

// GOOD: Domain callback
type Props = { readonly onAnswer: (answerId: string) => void };
```

Side effects (haptics, analytics) fire in the event handler, co-located with `dispatch`.

```typescript
function handleAnswer(answerId: string): void {
  const isCorrect = questions[index].correctId === answerId;
  isCorrect ? haptic.success() : haptic.error();
  dispatch({ type: "SELECT_ANSWER", answerId });
}
```

## Performance

### Lazy State Initialization

```typescript
// BAD: Runs generateGrid on every render
const [grid, setGrid] = useState(generateGrid(WORDS, 10));

// GOOD: Runs once on mount via initializer function
const [grid, setGrid] = useState(() => generateGrid(WORDS, 10));
```

### React Compiler Awareness

React Compiler (v1.0) handles automatic memoization. Do NOT add manual `useMemo`, `useCallback`, or `React.memo` unless:

1. Computation exceeds 1ms on mobile hardware
2. Value must remain referentially stable for `useEffect` dependency
3. Profiling confirms frame drops from re-renders

## Prohibitions

| Banned Pattern | Use Instead |
| --- | --- |
| `defaultProps` | Default parameter values in destructuring |
| `React.FC` | Function declaration with explicit return |
| `React.forwardRef` | `ref` as regular prop (React 19) |
| `useContext()` in new code | `use()` hook (React 19) |
| `<Context.Provider>` | `<Context value={}>` (React 19) |
| God components (> 200 lines) | Decompose into hook + sub-components |
| Prop drilling > 2 levels | Context or compound components |
| `useEffect` for derived state | Compute during render or `useMemo` |
| `useState` for interdependent state | `useReducer` with discriminated unions |
| `index` as `key` on dynamic lists | Stable unique identifier |
| `any` in hook return types | Explicit typed return |
| Side effects in reducers | Fire in event handlers |

## Component Templates

### Scene Component

```typescript
'use client';

import { useSceneHook } from "./use-scene-hook";
import type { SceneProps } from "@/types";

function SceneName({ onComplete }: SceneProps): React.ReactNode {
  const { state, handlers } = useSceneHook();
  return <SceneContainer gradient="welcome">{/* content */}</SceneContainer>;
}
```

### Feature Hook

```typescript
import { useReducer, useMemo } from "react";
import type { FeatureState, FeatureAction } from "./types";

type UseFeatureReturn = {
  readonly state: FeatureState;
  readonly handlers: { readonly onAction: (id: string) => void };
  readonly derived: { readonly isComplete: boolean; readonly progress: number };
};

function useFeature(config: FeatureConfig): UseFeatureReturn {
  const [state, dispatch] = useReducer(featureReducer, INITIAL_STATE);
  const handlers = useMemo(() => ({
    onAction: (id: string) => dispatch({ type: "ACTION", id }),
  }), []);
  const derived = useMemo(() => ({
    isComplete: state.phase === "complete",
    progress: computeProgress(state),
  }), [state]);
  return { state, handlers, derived };
}
```

## Validation Checklist

- [ ] `'use client'` at lowest boundary (not on `page.tsx`)
- [ ] Complex state uses `useReducer` with discriminated unions
- [ ] No `useState` spaghetti (3+ interdependent `useState` calls)
- [ ] Logic separated into custom hooks; components are pure rendering
- [ ] No component file exceeds 200 lines
- [ ] No prop drilling beyond 2 levels
- [ ] No `useEffect` for derived state
- [ ] Context uses `<Context value={}>` (no `.Provider`)
- [ ] Context read via `use()` hook (not `useContext()`)
- [ ] Event callbacks model domain actions, not DOM events
- [ ] Expensive computations use `useMemo` with correct dependencies
- [ ] Lazy initialization for expensive `useState` initial values
- [ ] No `defaultProps`, `React.FC`, or `React.forwardRef`
- [ ] Haptics fire in event handlers, not reducers
- [ ] Compound components used when 3+ sub-parts share state
