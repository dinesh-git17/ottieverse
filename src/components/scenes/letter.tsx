import { AnimatePresence, motion } from "motion/react";
import { useLetter } from "@/components/scenes/letter/use-letter";

// ---------- Spring presets ----------

/** Scene enter/exit spring per DESIGN_DOC.md Section 4. */
const SPRING_SCENE = { type: "spring", stiffness: 300, damping: 30 } as const;

/** Paragraph reveal spring — soft entrance with y-offset. */
const SPRING_PARAGRAPH = { type: "spring", stiffness: 200, damping: 25 } as const;

// ---------- Props ----------

/** Props for the {@link Letter} scene component. */
type LetterProps = {
  readonly onComplete: () => void;
};

// ---------- Component ----------

/**
 * Letter scene — the emotional climax of the experience.
 *
 * Renders a deep burgundy gradient with progressively revealed paragraphs
 * in Playfair Display serif. Paragraphs auto-reveal on a 500ms timer with
 * tap-to-accelerate. No haptics — the moment is intentionally quiet.
 */
function Letter({ onComplete }: LetterProps): React.ReactNode {
  const { paragraphs, state, revealNext } = useLetter();
  const { visibleCount, phase } = state;

  return (
    <motion.div
      key="letter"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={SPRING_SCENE}
      onClick={phase === "revealing" ? revealNext : undefined}
      className="h-full w-full overflow-y-auto bg-linear-to-b from-letter-start to-letter-end"
    >
      <div className="mx-auto flex max-w-[600px] flex-col items-center gap-6 px-6 py-12 pt-safe-top pb-safe-bottom">
        <AnimatePresence>
          {paragraphs.map((text, index) =>
            index < visibleCount ? (
              <motion.p
                key={`p-${String(index)}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={SPRING_PARAGRAPH}
                className="text-center font-[family-name:var(--font-playfair)] text-lg leading-[1.8] text-white/90"
              >
                {text}
              </motion.p>
            ) : null,
          )}
        </AnimatePresence>

        {/* Continue button — visible only when all paragraphs revealed */}
        <AnimatePresence>
          {phase === "all-visible" ? (
            <motion.button
              key="continue"
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRING_PARAGRAPH}
              whileTap={{ scale: 0.96 }}
              onClick={onComplete}
              className="mt-8 min-h-11 min-w-[120px] rounded-full border border-white/20 bg-white/10 px-8 py-3 text-base font-medium text-white/80 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              Continue
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export { Letter };
export type { LetterProps };
