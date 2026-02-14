import { clsx } from "clsx";
import { motion } from "motion/react";
import { useMemo } from "react";
import type { CellPosition, GeneratedGrid } from "./generator";
import type { DragPhase } from "./use-drag-select";

// ---------- Constants ----------

/** Warm-palette highlight colors for found words, assigned in discovery order. */
const WORD_HIGHLIGHT_COLORS = [
  "bg-rose-400/60",
  "bg-amber-400/60",
  "bg-orange-400/60",
  "bg-pink-400/60",
  "bg-fuchsia-400/60",
  "bg-red-400/60",
  "bg-yellow-400/60",
] as const;

/** Spring preset for cell tap feedback. */
const SPRING_CELL = { type: "spring" as const, stiffness: 400, damping: 25 };

// ---------- Types ----------

/** A found word with its grid cells and assigned highlight color. */
type FoundWord = {
  readonly word: string;
  readonly cells: readonly CellPosition[];
  readonly colorClass: string;
};

/** Props for the word search {@link Grid} component. */
type GridProps = {
  readonly grid: GeneratedGrid;
  readonly dragPhase: DragPhase;
  readonly foundWords: readonly FoundWord[];
  readonly revealedCells: readonly CellPosition[];
  readonly onPointerDown: (cell: CellPosition) => void;
  readonly onPointerEnter: (cell: CellPosition) => void;
};

// ---------- Helpers ----------

/** Serializes a cell position to a unique string key for set/map lookups. */
function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

// ---------- Component ----------

/**
 * 10x10 word search grid renderer with active selection overlay
 * and persistent found-word highlights.
 *
 * Pure rendering layer — all interaction state flows through props.
 * Pointer events are forwarded to the parent via handler props.
 * Uses `touch-action: none` to prevent scroll interference during drag.
 */
function Grid({
  grid,
  dragPhase,
  foundWords,
  revealedCells,
  onPointerDown,
  onPointerEnter,
}: GridProps): React.ReactNode {
  const activeCells = useMemo(() => {
    if (dragPhase.type !== "selecting") return new Set<string>();
    return new Set(dragPhase.cells.map((c) => cellKey(c.row, c.col)));
  }, [dragPhase]);

  const foundCellMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const fw of foundWords) {
      for (const cell of fw.cells) {
        map.set(cellKey(cell.row, cell.col), fw.colorClass);
      }
    }
    return map;
  }, [foundWords]);

  const revealedSet = useMemo(() => {
    return new Set(revealedCells.map((c) => cellKey(c.row, c.col)));
  }, [revealedCells]);

  return (
    <div className="grid aspect-square w-full max-w-[min(92dvw,440px)] select-none grid-cols-10 gap-1 touch-none">
      {grid.cells.flat().map((cell) => {
        const key = cellKey(cell.row, cell.col);
        const isActive = activeCells.has(key);
        const foundColor = foundCellMap.get(key);
        const isRevealed = revealedSet.has(key);

        return (
          <motion.div
            key={key}
            className={clsx(
              "relative flex items-center justify-center rounded-md text-sm font-medium",
              "bg-white/10 text-white",
              isRevealed && "ring-1 ring-white/30",
            )}
            whileTap={{ scale: 0.95 }}
            transition={SPRING_CELL}
            onPointerDown={(e) => {
              (e.target as Element).releasePointerCapture(e.pointerId);
              onPointerDown(cell);
            }}
            onPointerEnter={() => onPointerEnter(cell)}
          >
            {foundColor !== undefined && (
              <div
                className={clsx("pointer-events-none absolute inset-0 rounded-md", foundColor)}
              />
            )}
            {isActive && (
              <div className="pointer-events-none absolute inset-0 rounded-md bg-white/50" />
            )}
            <span className="relative z-10">{cell.letter}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

export { Grid, WORD_HIGHLIGHT_COLORS };
export type { FoundWord, GridProps };
