import { clsx } from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { OtterSprite } from "@/components/ui/otter-sprite";
import type { CellPosition } from "@/components/word-search/generator";
import { Grid } from "@/components/word-search/grid";
import { WORD_SEARCH_CONFIG } from "@/lib/constants";
import { useWordSearch } from "./word-search/use-word-search";

// ---------- Constants ----------

/** Scene enter/exit spring per DESIGN_DOC.md Section 4. */
const SPRING_SCENE = { type: "spring" as const, stiffness: 300, damping: 30 };

const OTTER_PEEKING = ["/otters/otter-peeking.png"] as const;
const OTTER_EXCITED = ["/otters/otter-excited.png"] as const;

/** Stable empty array for revealedCells prop to avoid re-renders. */
const EMPTY_CELLS: readonly CellPosition[] = [];

// ---------- Props ----------

/** Props for the {@link WordSearch} scene component. */
type WordSearchProps = {
  readonly onComplete: () => void;
};

// ---------- Component ----------

/**
 * Word search scene orchestrator with drag-to-find gameplay,
 * otter reactions, and hidden message reveal sequence.
 *
 * Renders a 10x10 letter grid, word list with cross-off tracking,
 * and an otter companion. After all 7 words are found, highlights
 * hidden message cells with synchronized haptics, then waits for a tap to advance.
 */
function WordSearch({ onComplete }: WordSearchProps): React.ReactNode {
  const {
    grid,
    gamePhase,
    dragPhase,
    isOtterExcited,
    onPointerDown,
    onPointerEnter,
    onPointerUp,
    handleContinue,
  } = useWordSearch(onComplete);

  const foundWordSet = new Set(gamePhase.foundWords.map((fw) => fw.word));
  const isRevealing = gamePhase.type === "revealing" || gamePhase.type === "complete";

  const otterFrames = isOtterExcited ? OTTER_EXCITED : OTTER_PEEKING;
  const otterAlt = isOtterExcited ? "Ottie excited about found word" : "Ottie peeking at the grid";

  return (
    <motion.div
      key="word-search"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={SPRING_SCENE}
      className="relative flex min-h-dvh w-full flex-col items-center bg-linear-to-b from-search-start to-search-end px-4 pt-12 pb-8 text-white"
    >
      {/* Scene title */}
      <h1 className="mb-6 font-[family-name:var(--font-playfair)] text-2xl font-bold text-white">
        Word Search
      </h1>

      {/* Grid */}
      <Grid
        grid={grid}
        dragPhase={dragPhase}
        foundWords={gamePhase.foundWords}
        revealedCells={isRevealing ? grid.hiddenMessageCells : EMPTY_CELLS}
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onPointerUp={onPointerUp}
      />

      {/* Word list */}
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {WORD_SEARCH_CONFIG.words.map((entry) => {
          const isFound = foundWordSet.has(entry.word);
          return (
            <span
              key={entry.word}
              className={clsx(
                "text-sm font-medium uppercase",
                isFound ? "text-white/30 line-through" : "text-white/60",
              )}
            >
              {entry.word}
            </span>
          );
        })}
      </div>

      {/* Tap to continue */}
      {isRevealing && (
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.5, 1] }}
          transition={{ duration: 1.5, times: [0, 0.3, 0.7, 1] }}
          onClick={handleContinue}
          className="mt-8 min-h-11 px-6 py-3 text-base font-medium text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          Tap to continue
        </motion.button>
      )}

      {/* Otter companion */}
      <div className="absolute bottom-4 right-4 size-24">
        <AnimatePresence mode="wait">
          <OtterSprite
            key={isOtterExcited ? "excited" : "peeking"}
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

export { WordSearch };
export type { WordSearchProps };
