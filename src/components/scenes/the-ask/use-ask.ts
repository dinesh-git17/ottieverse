import { useCallback, useReducer } from "react";

// ---------- Types ----------

/** "No" button degradation stage (0 = initial, 6 = removed from DOM). */
type NoStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Celebration phase after "Yes" press. */
type CelebrationPhase = "idle" | "celebrating" | "cta-visible";

/** Immutable state for The Ask scene reducer. */
type AskState = {
  readonly noStage: NoStage;
  readonly celebrationPhase: CelebrationPhase;
  readonly yesScale: number;
  readonly shakeCount: number;
};

/** Discriminated union of all reducer actions. */
type AskAction =
  | { readonly type: "PRESS_NO" }
  | { readonly type: "PRESS_YES" }
  | { readonly type: "SHOW_CTA" };

// ---------- Constants ----------

/** Stage-specific degradation messages displayed below the buttons. */
const NO_MESSAGES: Record<NoStage, string | null> = {
  0: null,
  1: "Are you sure? \u{1F97A}",
  2: "The otter is crying",
  3: "Dinesh.exe has stopped working",
  4: "Fine I\u2019ll ask the otter instead",
  5: null,
  6: null,
} as const;

/** "No" button scale at each degradation stage. */
const NO_SCALE: Record<NoStage, number> = {
  0: 1.0,
  1: 0.8,
  2: 0.6,
  3: 0.4,
  4: 0.2,
  5: 0.1,
  6: 0,
} as const;

// ---------- Reducer ----------

const INITIAL_STATE: AskState = {
  noStage: 0,
  celebrationPhase: "idle",
  yesScale: 1.0,
  shakeCount: 0,
};

/** Forward-only state machine driving the Yes/No degradation and celebration. */
function askReducer(state: AskState, action: AskAction): AskState {
  switch (action.type) {
    case "PRESS_NO": {
      if (state.noStage >= 6) return state;
      const next = Math.min(state.noStage + 1, 6) as NoStage;
      return {
        ...state,
        noStage: next,
        yesScale: Math.min(state.yesScale + 0.05, 1.25),
        shakeCount: state.shakeCount + 1,
      };
    }
    case "PRESS_YES":
      return { ...state, celebrationPhase: "celebrating", noStage: 6 };
    case "SHOW_CTA":
      return state.celebrationPhase === "celebrating"
        ? { ...state, celebrationPhase: "cta-visible" }
        : state;
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unexpected action: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

// ---------- Hook ----------

/** Return type of {@link useAsk}. */
type UseAskReturn = {
  readonly state: AskState;
  readonly pressNo: () => void;
  readonly pressYes: () => void;
  readonly showCta: () => void;
};

/**
 * Encapsulates The Ask scene state machine.
 *
 * Manages the 6-stage "No" button degradation, "Yes" button growth,
 * screen shake counter, and celebration phase progression.
 */
function useAsk(): UseAskReturn {
  const [state, dispatch] = useReducer(askReducer, INITIAL_STATE);

  const pressNo = useCallback((): void => {
    dispatch({ type: "PRESS_NO" });
  }, []);

  const pressYes = useCallback((): void => {
    dispatch({ type: "PRESS_YES" });
  }, []);

  const showCta = useCallback((): void => {
    dispatch({ type: "SHOW_CTA" });
  }, []);

  return { state, pressNo, pressYes, showCta } as const;
}

/** Compute the "No" button Motion `animate` object for the given stage and flee offset. */
function getNoAnimate(
  stage: NoStage,
  flee: { readonly x: number; readonly y: number },
): Record<string, number | number[]> {
  if (stage === 5) return { scale: 0.1, opacity: 0.1, x: flee.x, y: flee.y };
  if (stage === 4) return { scale: NO_SCALE[4], x: [0, 10, -10, 5, -5, 0] };
  if (stage === 3) return { scale: NO_SCALE[3], x: [0, -4, 4, -4, 4, 0] };
  return { scale: NO_SCALE[stage < 6 ? stage : 0] };
}

/** Compute the "No" button Motion `transition` for the given stage. */
function getNoTransition(
  stage: NoStage,
  springButton: Record<string, unknown>,
): Record<string, unknown> {
  if (stage === 3) return { ...springButton, x: { repeat: Infinity, duration: 0.5 } };
  if (stage === 4) return { ...springButton, x: { repeat: Infinity, duration: 2 } };
  return springButton;
}

export { NO_MESSAGES, NO_SCALE, getNoAnimate, getNoTransition, useAsk };
export type { AskAction, AskState, CelebrationPhase, NoStage, UseAskReturn };
