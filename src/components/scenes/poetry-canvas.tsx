import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import type { ChangeEvent } from "react";
import { usePoetry } from "@/components/scenes/poetry-canvas/use-poetry";
import { OtterSprite } from "@/components/ui/otter-sprite";
import { haptic } from "@/lib/haptics";

// ---------- Spring presets ----------

/** Scene enter/exit spring per DESIGN_DOC.md Section 4. */
const SPRING_SCENE = { type: "spring", stiffness: 300, damping: 30 } as const;

/** Response and continue button entrance spring — gentle reveal. */
const SPRING_RESPONSE = { type: "spring", stiffness: 200, damping: 25 } as const;

// ---------- Constants ----------

/** Otter reading frame for static display. */
const OTTER_READING = ["/otters/otter-reading.png"] as const;

/** Soft character limit before counter becomes visible. */
const CHAR_SOFT_LIMIT = 500;

/** Threshold at which the character counter appears. */
const CHAR_COUNTER_THRESHOLD = 450;

// ---------- Props ----------

/** Props for the {@link PoetryCanvas} scene component. */
type PoetryCanvasProps = {
  readonly onComplete: () => void;
};

// ---------- Component ----------

/**
 * Poetry canvas scene — freeform text input with warm gradient and static response.
 *
 * Renders a full-screen amber-to-rose gradient with serif prompt, auto-growing
 * Caveat textarea, submit flow with haptic feedback, and a timed continue button.
 * The response is static — this moment cannot fail.
 */
function PoetryCanvas({ onComplete }: PoetryCanvasProps): React.ReactNode {
  const { state, handleTextChange, handleSubmit } = usePoetry();
  const { phase, text } = state;

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    const target = event.currentTarget;
    handleTextChange(target.value);
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  }

  function handleSubmitTap(): void {
    haptic.light();
    handleSubmit();
  }

  function handleContinueTap(): void {
    haptic.light();
    onComplete();
  }

  const showCounter = text.length > CHAR_COUNTER_THRESHOLD;
  const overLimit = text.length > CHAR_SOFT_LIMIT;

  return (
    <motion.div
      key="poetry-canvas"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={SPRING_SCENE}
      className="relative flex min-h-dvh w-full flex-col items-center bg-linear-to-b from-poetry-start to-poetry-end px-6 pt-safe-top pb-safe-bottom text-white"
    >
      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6">
        {/* Prompt */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "composing" ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="text-center font-serif text-lg leading-relaxed text-white/90"
        >
          Write something beautiful. Anything. A thought, a feeling, a few words.
        </motion.p>

        {/* Composing phase: textarea + submit */}
        <AnimatePresence>
          {phase === "composing" ? (
            <motion.div
              key="composing"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex w-full flex-col items-center gap-4"
            >
              <textarea
                value={text}
                onChange={handleChange}
                placeholder="Start writing..."
                rows={3}
                className="w-full resize-none overflow-hidden rounded-2xl border-none bg-white/5 px-5 py-4 font-caveat text-[22px] leading-relaxed text-white outline-none placeholder:text-white/30"
              />

              {showCounter ? (
                <p
                  className={clsx(
                    "self-end text-xs",
                    overLimit ? "text-amber-200" : "text-white/40",
                  )}
                >
                  {text.length}/{CHAR_SOFT_LIMIT}
                </p>
              ) : null}

              <motion.button
                type="button"
                onClick={handleSubmitTap}
                disabled={text.length === 0}
                whileTap={text.length > 0 ? { scale: 0.96 } : undefined}
                className={clsx(
                  "min-h-11 rounded-full px-10 py-3 text-base font-medium backdrop-blur-sm",
                  "border border-white/20",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                  text.length > 0
                    ? "bg-white/15 text-white shadow-sm"
                    : "pointer-events-none bg-white/5 text-white/30 border-white/10",
                )}
              >
                Submit
              </motion.button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Response phase: affirmation text */}
        <AnimatePresence>
          {phase !== "composing" ? (
            <motion.p
              key="response"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRING_RESPONSE}
              className="text-center font-serif text-xl leading-relaxed text-white/90"
            >
              You wrote beautifully my love ♥️ not as gorgeous as you but beautiful indeed
            </motion.p>
          ) : null}
        </AnimatePresence>

        {/* Continue button */}
        <AnimatePresence>
          {phase === "continue-visible" ? (
            <motion.button
              key="continue"
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRING_RESPONSE}
              whileTap={{ scale: 0.96 }}
              onClick={handleContinueTap}
              className="min-h-11 min-w-[120px] rounded-full bg-white/20 px-8 py-3 text-base font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              Continue
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Otter — bottom right */}
      <div className="absolute bottom-6 right-4 size-24">
        <OtterSprite frames={OTTER_READING} fps={1} alt="Ottie reading" className="size-full" />
      </div>
    </motion.div>
  );
}

export { PoetryCanvas };
export type { PoetryCanvasProps };
