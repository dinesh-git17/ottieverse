import { useEffect, useReducer, useRef } from "react";

// ---------- Types ----------

/** Discriminated phases of the poetry submission state machine. */
type PoetryPhase = "composing" | "submitted" | "continue-visible";

/** Immutable state for the poetry canvas reducer. */
type PoetryState = {
  readonly phase: PoetryPhase;
  readonly text: string;
};

/** Discriminated union of all reducer actions. */
type PoetryAction =
  | { readonly type: "UPDATE_TEXT"; readonly text: string }
  | { readonly type: "SUBMIT" }
  | { readonly type: "SHOW_CONTINUE" };

// ---------- Reducer ----------

const INITIAL_STATE: PoetryState = {
  phase: "composing",
  text: "",
};

/** Delay in ms before showing the continue button after submission. */
const CONTINUE_DELAY_MS = 2000;

/** Forward-only state machine: composing → submitted → continue-visible. */
function poetryReducer(state: PoetryState, action: PoetryAction): PoetryState {
  switch (action.type) {
    case "UPDATE_TEXT":
      return state.phase === "composing" ? { ...state, text: action.text } : state;
    case "SUBMIT":
      return state.phase === "composing" ? { ...state, phase: "submitted" } : state;
    case "SHOW_CONTINUE":
      return state.phase === "submitted" ? { ...state, phase: "continue-visible" } : state;
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unexpected action: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

// ---------- Hook ----------

/** Return type of {@link usePoetry}. */
type UsePoetryReturn = {
  readonly state: PoetryState;
  readonly handleTextChange: (text: string) => void;
  readonly handleSubmit: () => void;
};

/**
 * Encapsulates the poetry canvas state machine.
 *
 * Manages the composing → submitted → continue-visible phase progression,
 * including the 2-second hold timer before revealing the continue button.
 */
function usePoetry(): UsePoetryReturn {
  const [state, dispatch] = useReducer(poetryReducer, INITIAL_STATE);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleTextChange(text: string): void {
    dispatch({ type: "UPDATE_TEXT", text });
  }

  function handleSubmit(): void {
    dispatch({ type: "SUBMIT" });
    timerRef.current = setTimeout(() => {
      dispatch({ type: "SHOW_CONTINUE" });
    }, CONTINUE_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { state, handleTextChange, handleSubmit } as const;
}

export { usePoetry };
export type { PoetryPhase, PoetryState, UsePoetryReturn };
