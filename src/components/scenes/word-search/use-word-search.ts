import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { CellPosition, GeneratedGrid } from "@/components/word-search/generator";
import { generateGrid } from "@/components/word-search/generator";
import type { FoundWord } from "@/components/word-search/grid";
import { WORD_HIGHLIGHT_COLORS } from "@/components/word-search/grid";
import type { DragPhase } from "@/components/word-search/use-drag-select";
import { useDragSelect } from "@/components/word-search/use-drag-select";
import { WORD_SEARCH_CONFIG } from "@/lib/constants";
import { haptic } from "@/lib/haptics";

// ---------- Constants ----------

const TOTAL_WORDS = 7;
const OTTER_EXCITEMENT_MS = 1500;
const REVEAL_DELAY_MS = 1000;

// ---------- Exhaustive check ----------

/** Compile-time exhaustiveness guard for discriminated union switches. */
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

// ---------- Types ----------

/** Game phase modeled as a discriminated union state machine. */
type WordSearchPhase =
  | { readonly type: "playing"; readonly foundWords: readonly FoundWord[] }
  | { readonly type: "revealing"; readonly foundWords: readonly FoundWord[] }
  | { readonly type: "complete"; readonly foundWords: readonly FoundWord[] };

/** Actions dispatched by game event handlers and timer effects. */
type WordSearchAction =
  | { readonly type: "WORD_FOUND"; readonly foundWord: FoundWord }
  | { readonly type: "START_REVEAL" }
  | { readonly type: "COMPLETE" };

/** Return shape for the {@link useWordSearch} hook. */
type UseWordSearchReturn = {
  readonly grid: GeneratedGrid;
  readonly gamePhase: WordSearchPhase;
  readonly dragPhase: DragPhase;
  readonly isOtterExcited: boolean;
  readonly onPointerDown: (cell: CellPosition) => void;
  readonly onPointerEnter: (cell: CellPosition) => void;
  readonly onPointerUp: () => void;
  readonly handleContinue: () => void;
};

// ---------- Helpers ----------

/** Checks whether two cell arrays describe the same path (forward or reversed). */
function cellsMatch(selected: readonly CellPosition[], target: readonly CellPosition[]): boolean {
  if (selected.length !== target.length) return false;

  const forward = selected.every((c, i) => c.row === target[i].row && c.col === target[i].col);
  if (forward) return true;

  const last = target.length - 1;
  return selected.every((c, i) => c.row === target[last - i].row && c.col === target[last - i].col);
}

// ---------- Reducer ----------

const INITIAL_PHASE: WordSearchPhase = { type: "playing", foundWords: [] };

/** Forward-only game state transitions with exhaustive action matching. */
function gameReducer(state: WordSearchPhase, action: WordSearchAction): WordSearchPhase {
  switch (action.type) {
    case "WORD_FOUND": {
      if (state.type !== "playing") return state;
      return { type: "playing", foundWords: [...state.foundWords, action.foundWord] };
    }
    case "START_REVEAL": {
      if (state.type !== "playing") return state;
      return { type: "revealing", foundWords: state.foundWords };
    }
    case "COMPLETE": {
      if (state.type !== "revealing") return state;
      return { type: "complete", foundWords: state.foundWords };
    }
    default:
      return assertNever(action);
  }
}

// ---------- Hook ----------

/**
 * Word search game state machine encapsulating grid generation, drag validation,
 * otter reactions, and hidden message reveal choreography.
 *
 * @param onComplete - Fires after the reveal sequence completes to advance the scene.
 */
function useWordSearch(onComplete: () => void): UseWordSearchReturn {
  const grid = useMemo(() => generateGrid(WORD_SEARCH_CONFIG), []);
  const [gamePhase, gameDispatch] = useReducer(gameReducer, INITIAL_PHASE);
  const { dragPhase, handlers, reset } = useDragSelect();
  const [isOtterExcited, setIsOtterExcited] = useState(false);

  const otterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerOtterExcitement = useCallback(() => {
    if (otterTimerRef.current !== null) clearTimeout(otterTimerRef.current);
    setIsOtterExcited(true);
    otterTimerRef.current = setTimeout(() => {
      setIsOtterExcited(false);
      otterTimerRef.current = null;
    }, OTTER_EXCITEMENT_MS);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (
      gamePhase.type === "playing" &&
      dragPhase.type === "selecting" &&
      dragPhase.direction !== null &&
      dragPhase.cells.length >= 2
    ) {
      const foundSet = new Set(gamePhase.foundWords.map((fw) => fw.word));
      const unfound = grid.wordPlacements.filter((wp) => !foundSet.has(wp.word));

      for (const placement of unfound) {
        if (cellsMatch(dragPhase.cells, placement.cells)) {
          const colorIndex = gamePhase.foundWords.length;
          haptic.medium();
          gameDispatch({
            type: "WORD_FOUND",
            foundWord: {
              word: placement.word,
              cells: placement.cells,
              colorClass: WORD_HIGHLIGHT_COLORS[colorIndex % WORD_HIGHLIGHT_COLORS.length],
            },
          });
          triggerOtterExcitement();
          break;
        }
      }
    }
    reset();
  }, [gamePhase, dragPhase, grid.wordPlacements, reset, triggerOtterExcitement]);

  // Trigger reveal after all words found
  useEffect(() => {
    if (gamePhase.type !== "playing" || gamePhase.foundWords.length < TOTAL_WORDS) return;

    revealTimerRef.current = setTimeout(() => {
      gameDispatch({ type: "START_REVEAL" });
      revealTimerRef.current = null;
    }, REVEAL_DELAY_MS);

    return () => {
      if (revealTimerRef.current !== null) clearTimeout(revealTimerRef.current);
    };
  }, [gamePhase]);

  // Fire haptics when reveal starts
  useEffect(() => {
    if (gamePhase.type !== "revealing") return;
    haptic.pattern(3, 100);
  }, [gamePhase.type]);

  const handleContinue = useCallback(() => {
    if (gamePhase.type !== "revealing") return;
    haptic.light();
    gameDispatch({ type: "COMPLETE" });
    onComplete();
  }, [gamePhase.type, onComplete]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (otterTimerRef.current !== null) clearTimeout(otterTimerRef.current);
      if (revealTimerRef.current !== null) clearTimeout(revealTimerRef.current);
    };
  }, []);

  return {
    grid,
    gamePhase,
    dragPhase,
    isOtterExcited,
    onPointerDown: handlers.onPointerDown,
    onPointerEnter: handlers.onPointerEnter,
    onPointerUp: handlePointerUp,
    handleContinue,
  };
}

export { useWordSearch };
export type { UseWordSearchReturn, WordSearchPhase };
