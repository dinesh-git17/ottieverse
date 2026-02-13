import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useQuiz } from "@/components/scenes/quiz/use-quiz";
import { OtterSprite } from "@/components/ui/otter-sprite";
import { QUIZ_QUESTIONS } from "@/lib/constants";
import type { QuizOption } from "@/types";

// ---------- Spring presets ----------

/** Scene enter/exit spring per DESIGN_DOC.md Section 4. */
const SPRING_SCENE = { type: "spring", stiffness: 300, damping: 30 } as const;

/** Question card slide spring — responsive entrance with minimal overshoot. */
const SPRING_CARD = { type: "spring", stiffness: 300, damping: 28 } as const;

/** Progress dot fill spring — snappy micro-interaction. */
const SPRING_DOT = { type: "spring", stiffness: 400, damping: 25 } as const;

// ---------- Otter frames ----------

const OTTER_THINKING = ["/otters/otter-thinking.png"] as const;
const OTTER_CELEBRATE = ["/otters/otter-celebrate.png"] as const;
const OTTER_CONFUSED = ["/otters/otter-confused.png"] as const;

// ---------- Props ----------

/** Props for the {@link Quiz} scene component. */
type QuizProps = {
  readonly onComplete: () => void;
};

// ---------- Component ----------

/**
 * Five-question trivia scene with reducer-driven state machine.
 *
 * Renders progress dots, animated question cards with shuffled options,
 * correct/wrong feedback, and otter reaction swaps. Calls `onComplete`
 * after the fifth correct answer's celebration feedback completes.
 */
function Quiz({ onComplete }: QuizProps): React.ReactNode {
  const {
    questionIndex,
    completedCount,
    answerStatus,
    currentQuestion,
    shuffledOptions,
    handleAnswer,
  } = useQuiz(onComplete);

  const otterFrames =
    answerStatus === "correct"
      ? OTTER_CELEBRATE
      : answerStatus === "wrong"
        ? OTTER_CONFUSED
        : OTTER_THINKING;

  const otterAlt =
    answerStatus === "correct"
      ? "Ottie celebrating"
      : answerStatus === "wrong"
        ? "Ottie confused"
        : "Ottie thinking";

  return (
    <motion.div
      key="quiz"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={SPRING_SCENE}
      className="relative flex min-h-dvh w-full flex-col items-center bg-linear-to-b from-welcome-start to-welcome-end px-6 pt-16 pb-8 text-white"
    >
      {/* Progress dots */}
      <div
        className="flex gap-2"
        role="progressbar"
        aria-valuenow={completedCount}
        aria-valuemax={QUIZ_QUESTIONS.length}
      >
        {QUIZ_QUESTIONS.map((q, i) => (
          <motion.div
            key={q.id}
            className={clsx("size-2 rounded-full", i < completedCount ? "bg-white" : "bg-white/30")}
            animate={i < completedCount ? { scale: [0.8, 1] } : { scale: 1 }}
            transition={SPRING_DOT}
          />
        ))}
      </div>

      {/* Question card */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={questionIndex}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={SPRING_CARD}
            className="flex w-full max-w-sm flex-col gap-4"
          >
            <h2 className="text-center text-xl font-bold">{currentQuestion.question}</h2>

            <div className="flex flex-col gap-3">
              {shuffledOptions.map((option, index) => (
                <OptionButton
                  key={option.label}
                  option={option}
                  index={index}
                  answerStatus={answerStatus}
                  onSelect={handleAnswer}
                />
              ))}
            </div>

            {answerStatus === "wrong" ? (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-sm font-medium text-rose-300"
              >
                bebe 🥺 really??
              </motion.p>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Otter reaction */}
      <div className="absolute bottom-4 right-4 size-24">
        <AnimatePresence mode="wait">
          <OtterSprite
            key={answerStatus}
            frames={otterFrames}
            fps={1}
            alt={otterAlt}
            className="size-full"
          />
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ---------- Option button ----------

type OptionButtonProps = {
  readonly option: QuizOption;
  readonly index: number;
  readonly answerStatus: "idle" | "correct" | "wrong";
  readonly onSelect: (option: QuizOption) => void;
};

/** Single quiz option card with stagger entrance and answer feedback animations. */
function OptionButton({
  option,
  index,
  answerStatus,
  onSelect,
}: OptionButtonProps): React.ReactNode {
  const isSelected = answerStatus !== "idle";
  const showCorrectFeedback = answerStatus === "correct" && option.isCorrect;
  const showWrongFeedback = answerStatus === "wrong" && !option.isCorrect;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: showCorrectFeedback ? [1, 1.05, 1] : 1,
        x: showWrongFeedback ? [0, -10, 10, -10, 10, 0] : 0,
      }}
      transition={{
        opacity: { delay: index * 0.05 },
        y: { delay: index * 0.05 },
        scale: showCorrectFeedback ? { duration: 0.4 } : undefined,
        x: showWrongFeedback ? { duration: 0.4 } : undefined,
      }}
      whileTap={isSelected ? undefined : { scale: 0.97 }}
      onClick={() => onSelect(option)}
      disabled={answerStatus === "correct"}
      className={clsx(
        "min-h-11 w-full rounded-xl px-5 py-3 text-left text-base font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        showCorrectFeedback && "ring-2 ring-green-400/60 bg-green-500/20",
        showWrongFeedback && "ring-2 ring-red-400/60 bg-red-500/20",
        !showCorrectFeedback && !showWrongFeedback && "bg-white/10",
      )}
    >
      {option.label}
    </motion.button>
  );
}

export { Quiz };
export type { QuizProps };
