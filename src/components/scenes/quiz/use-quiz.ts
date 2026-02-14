import { useCallback, useMemo, useReducer, useRef } from "react";
import { QUIZ_QUESTIONS } from "@/lib/constants";
import { haptic } from "@/lib/haptics";
import type { QuizOption } from "@/types";

// ---------- Exhaustive check ----------

/** Compile-time exhaustiveness guard for discriminated union switches. */
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

// ---------- Types ----------

type QuizAnswerStatus = "idle" | "correct" | "wrong";

type QuizState = {
  readonly questionIndex: number;
  readonly completedCount: number;
  readonly answerStatus: QuizAnswerStatus;
  readonly shuffleSeed: number;
};

type QuizAction =
  | { readonly type: "ANSWER_CORRECT" }
  | { readonly type: "ANSWER_WRONG" }
  | { readonly type: "ADVANCE" }
  | { readonly type: "RETRY" };

/** Return shape for the {@link useQuiz} hook. */
type UseQuizReturn = {
  readonly questionIndex: number;
  readonly completedCount: number;
  readonly answerStatus: QuizAnswerStatus;
  readonly currentQuestion: (typeof QUIZ_QUESTIONS)[number];
  readonly shuffledOptions: readonly QuizOption[];
  readonly handleAnswer: (option: QuizOption) => void;
};

// ---------- Reducer ----------

const INITIAL_STATE: QuizState = {
  questionIndex: 0,
  completedCount: 0,
  answerStatus: "idle",
  shuffleSeed: 0,
};

/** Forward-only quiz state transitions with exhaustive action matching. */
function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "ANSWER_CORRECT":
      return {
        ...state,
        answerStatus: "correct",
        completedCount: state.completedCount + 1,
      };
    case "ANSWER_WRONG":
      return { ...state, answerStatus: "wrong" };
    case "ADVANCE":
      return {
        ...state,
        questionIndex: state.questionIndex + 1,
        answerStatus: "idle",
        shuffleSeed: state.shuffleSeed + 1,
      };
    case "RETRY":
      return {
        ...state,
        answerStatus: "idle",
        shuffleSeed: state.shuffleSeed + 1,
      };
    default:
      return assertNever(action);
  }
}

// ---------- Fisher-Yates shuffle ----------

/** Produces a new shuffled array without mutating the source. */
function shuffle<T>(source: readonly T[]): readonly T[] {
  const arr = [...source];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- Hook ----------

/**
 * Quiz state machine encapsulating question sequencing, option shuffling,
 * answer validation, haptic feedback, and auto-advance timing.
 *
 * @param onComplete - Fires after the final question is answered correctly.
 */
function useQuiz(onComplete: () => void): UseQuizReturn {
  const [state, dispatch] = useReducer(quizReducer, INITIAL_STATE);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuestion = QUIZ_QUESTIONS[state.questionIndex];

  /**
   * Shuffle options for the current question. Re-runs on question change
   * or retry (answerStatus reset to "idle"). Q2 dual-correct logic picks
   * 1 random correct option + 3 wrong options = 4 total cards.
   */
  const { shuffleSeed } = state;

  const shuffledOptions = useMemo((): readonly QuizOption[] => {
    void shuffleSeed;
    const { options, allowMultipleCorrect } = currentQuestion;

    if (allowMultipleCorrect) {
      const correct = options.filter((o) => o.isCorrect);
      const wrong = options.filter((o) => !o.isCorrect);
      const selectedCorrect = correct[Math.floor(Math.random() * correct.length)];
      return shuffle([selectedCorrect, ...wrong]);
    }

    return shuffle(options);
  }, [currentQuestion, shuffleSeed]);

  const handleAnswer = useCallback(
    (option: QuizOption): void => {
      if (state.answerStatus === "correct") return;

      // Clear any pending advance timer on retry
      if (advanceTimerRef.current !== null) {
        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }

      if (state.answerStatus === "wrong") {
        dispatch({ type: "RETRY" });
      }

      if (option.isCorrect) {
        haptic.success();
        dispatch({ type: "ANSWER_CORRECT" });

        const isLastQuestion = state.completedCount + 1 >= QUIZ_QUESTIONS.length;

        advanceTimerRef.current = setTimeout(() => {
          advanceTimerRef.current = null;
          if (isLastQuestion) {
            onComplete();
          } else {
            dispatch({ type: "ADVANCE" });
          }
        }, 600);
      } else {
        haptic.error();
        dispatch({ type: "ANSWER_WRONG" });
      }
    },
    [state.answerStatus, state.completedCount, onComplete],
  );

  return {
    questionIndex: state.questionIndex,
    completedCount: state.completedCount,
    answerStatus: state.answerStatus,
    currentQuestion,
    shuffledOptions,
    handleAnswer,
  };
}

export { useQuiz };
export type { QuizAnswerStatus, UseQuizReturn };
