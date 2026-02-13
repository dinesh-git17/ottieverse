import { useCallback, useEffect, useReducer, useRef } from "react";

// ---------- Constants ----------

/** Letter paragraphs revealed progressively during Scene 4. */
const LETTER_PARAGRAPHS = [
  "Carolina,",
  "Sometimes I try to remember what life felt like before you, and it\u2019s strange how distant it seems. Not bad. Not empty. Just\u2026 quieter. Like a room before the windows are opened.",
  "You came into my life gently, but everything shifted. The light changed. The air felt different. Even the ordinary parts of my day began to carry something softer. I find myself moving through the world knowing there is someone out there whose heart is intertwined with mine, and that thought alone steadies me.",
  "You are not just someone I love. You are someone I admire. The way you feel deeply. The way you think. The way you care. There\u2019s a quiet strength in you that I notice all the time. You don\u2019t always see it, but I do. And it makes me incredibly proud to stand beside you.",
  "There is something almost sacred about the way you\u2019ve changed me. I am more intentional now. More patient. More aware of the kind of future I want to build. Loving you has made me want to be stronger, kinder, more grounded. Not because you demand it, but because you inspire it.",
  "I feel lucky in a way that feels almost unfair. Out of all the chaos in this world, somehow I get you. I get your laugh on my worst days. I get your voice when I need calm. I get the comfort of knowing that when something good happens, you are the first person I want to tell.",
  "You make my life warmer. Not louder. Not more dramatic. Just warmer. Like a steady fire that never goes out. And I carry that warmth with me everywhere.",
  "If there is one thing I hope you always know, it\u2019s this. I do not take you for granted. Not your heart. Not your time. Not your love. Being with you feels like being trusted with something precious. And I treat it that way.",
  "I am grateful for you in ways words will never fully capture. But I will keep trying anyway.",
] as const;

// ---------- Types ----------

/** Phase of the letter reveal state machine. */
type LetterPhase = "revealing" | "all-visible";

/** Immutable state for the letter reducer. */
type LetterState = {
  readonly visibleCount: number;
  readonly phase: LetterPhase;
};

/** Discriminated union of all reducer actions. */
type LetterAction = { readonly type: "REVEAL_NEXT" };

// ---------- Reducer ----------

const INITIAL_STATE: LetterState = {
  visibleCount: 0,
  phase: "revealing",
};

/** Auto-reveal interval in milliseconds. */
const REVEAL_INTERVAL_MS = 500;

/** Forward-only reveal: increment visibleCount until all paragraphs shown. */
function letterReducer(state: LetterState, action: LetterAction): LetterState {
  switch (action.type) {
    case "REVEAL_NEXT": {
      if (state.phase === "all-visible") return state;
      const next = state.visibleCount + 1;
      return next >= LETTER_PARAGRAPHS.length
        ? { visibleCount: next, phase: "all-visible" }
        : { visibleCount: next, phase: "revealing" };
    }
    default: {
      const _exhaustive: never = action.type;
      throw new Error(`Unexpected action: ${String(_exhaustive)}`);
    }
  }
}

// ---------- Hook ----------

/** Return type of {@link useLetter}. */
type UseLetterReturn = {
  readonly paragraphs: readonly string[];
  readonly state: LetterState;
  readonly revealNext: () => void;
};

/**
 * Encapsulates the letter scene reveal state machine.
 *
 * Auto-reveals one paragraph every 500ms. Exposes `revealNext` for
 * tap-to-accelerate behavior. Clears the interval on unmount or when
 * all paragraphs are visible.
 */
function useLetter(): UseLetterReturn {
  const [state, dispatch] = useReducer(letterReducer, INITIAL_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const revealNext = useCallback((): void => {
    dispatch({ type: "REVEAL_NEXT" });
  }, []);

  useEffect(() => {
    if (state.phase === "all-visible") {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      dispatch({ type: "REVEAL_NEXT" });
    }, REVEAL_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.phase]);

  return { paragraphs: LETTER_PARAGRAPHS, state, revealNext } as const;
}

export { LETTER_PARAGRAPHS, useLetter };
export type { LetterAction, LetterPhase, LetterState, UseLetterReturn };
