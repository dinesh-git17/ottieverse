import { useMemo, useReducer } from "react";
import type { WordSearchDirection } from "@/types";
import type { CellPosition } from "./generator";

// ---------- Exhaustive check ----------

/** Compile-time exhaustiveness guard for discriminated union switches. */
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

// ---------- Constants ----------

/** Grid dimension for boundary clamping. */
const GRID_SIZE = 10;

// ---------- Public Types ----------

/** Drag interaction phase modeled as a discriminated union state machine. */
type DragPhase =
  | { readonly type: "idle" }
  | {
      readonly type: "selecting";
      readonly cells: readonly CellPosition[];
      readonly direction: WordSearchDirection | null;
    }
  | {
      readonly type: "released";
      readonly cells: readonly CellPosition[];
      readonly direction: WordSearchDirection;
    };

/** Actions dispatched by pointer event handlers. */
type DragAction =
  | { readonly type: "POINTER_DOWN"; readonly cell: CellPosition }
  | { readonly type: "POINTER_ENTER"; readonly cell: CellPosition }
  | { readonly type: "POINTER_UP" }
  | { readonly type: "RESET" };

/** Return shape for the {@link useDragSelect} hook. */
type UseDragSelectReturn = {
  readonly dragPhase: DragPhase;
  readonly handlers: {
    readonly onPointerDown: (cell: CellPosition) => void;
    readonly onPointerEnter: (cell: CellPosition) => void;
    readonly onPointerUp: () => void;
  };
  readonly reset: () => void;
};

// ---------- Internal Types ----------

/** Row/column step direction for the locked axis. */
type DirectionVector = {
  readonly dr: number;
  readonly dc: number;
};

/** Internal reducer state — richer than the public DragPhase. */
type DragState = {
  readonly phase: DragPhase;
  readonly startCell: CellPosition | null;
  readonly vector: DirectionVector | null;
};

// ---------- Direction Helpers ----------

/**
 * Attempts to lock a direction from the start cell to the entering cell.
 * Returns null if the cells do not align to any valid axis.
 */
function tryLockDirection(
  start: CellPosition,
  cell: CellPosition,
): {
  readonly direction: WordSearchDirection;
  readonly vector: DirectionVector;
} | null {
  const dRow = cell.row - start.row;
  const dCol = cell.col - start.col;

  if (dRow === 0 && dCol !== 0) {
    return { direction: "horizontal", vector: { dr: 0, dc: Math.sign(dCol) } };
  }
  if (dRow !== 0 && dCol === 0) {
    return { direction: "vertical", vector: { dr: Math.sign(dRow), dc: 0 } };
  }
  if (Math.abs(dRow) === Math.abs(dCol)) {
    return {
      direction: "diagonal",
      vector: { dr: Math.sign(dRow), dc: Math.sign(dCol) },
    };
  }
  return null;
}

/**
 * Projects the pointer's cell position onto the locked direction axis
 * and returns the signed step count from the start cell.
 */
function projectSteps(start: CellPosition, cell: CellPosition, vector: DirectionVector): number {
  const deltaRow = cell.row - start.row;
  const deltaCol = cell.col - start.col;

  if (vector.dr === 0) return deltaCol * Math.sign(vector.dc);
  if (vector.dc === 0) return deltaRow * Math.sign(vector.dr);

  // Diagonal: dot product projection onto the unit diagonal vector
  return Math.round((deltaRow * vector.dr + deltaCol * vector.dc) / 2);
}

/**
 * Clamps the step count so the endpoint remains within grid bounds.
 * Reduces magnitude until the projected cell is valid.
 */
function clampSteps(start: CellPosition, steps: number, vector: DirectionVector): number {
  const sign = steps >= 0 ? 1 : -1;
  let n = Math.abs(steps);

  while (n > 0) {
    const row = start.row + n * sign * vector.dr;
    const col = start.col + n * sign * vector.dc;
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) break;
    n--;
  }

  return n * sign;
}

/**
 * Builds a contiguous line of cell positions from start to end.
 * Both endpoints are inclusive. Handles all directions including
 * backward selection (end before start on the axis).
 */
function buildCellLine(start: CellPosition, end: CellPosition): readonly CellPosition[] {
  const dRow = end.row - start.row;
  const dCol = end.col - start.col;
  const steps = Math.max(Math.abs(dRow), Math.abs(dCol));

  if (steps === 0) return [start];

  const stepRow = dRow === 0 ? 0 : Math.sign(dRow);
  const stepCol = dCol === 0 ? 0 : Math.sign(dCol);

  const cells: CellPosition[] = [];
  for (let i = 0; i <= steps; i++) {
    cells.push({ row: start.row + i * stepRow, col: start.col + i * stepCol });
  }
  return cells;
}

// ---------- Reducer ----------

const IDLE_STATE: DragState = {
  phase: { type: "idle" },
  startCell: null,
  vector: null,
};

/** Drag selection state machine with direction locking after the second cell. */
function dragReducer(state: DragState, action: DragAction): DragState {
  switch (action.type) {
    case "POINTER_DOWN":
      return {
        phase: { type: "selecting", cells: [action.cell], direction: null },
        startCell: action.cell,
        vector: null,
      };

    case "POINTER_ENTER": {
      if (state.phase.type !== "selecting" || state.startCell === null) return state;

      const start = state.startCell;
      const cell = action.cell;

      if (cell.row === start.row && cell.col === start.col) return state;

      // No direction locked yet — attempt to lock on 2nd cell contact
      if (state.phase.direction === null) {
        const lock = tryLockDirection(start, cell);
        if (lock === null) return state;

        return {
          phase: {
            type: "selecting",
            cells: buildCellLine(start, cell),
            direction: lock.direction,
          },
          startCell: start,
          vector: lock.vector,
        };
      }

      // Direction locked — project pointer onto the locked axis
      if (state.vector === null) return state;

      const rawSteps = projectSteps(start, cell, state.vector);
      const clampedSteps = clampSteps(start, rawSteps, state.vector);
      const endpoint: CellPosition = {
        row: start.row + clampedSteps * state.vector.dr,
        col: start.col + clampedSteps * state.vector.dc,
      };

      return {
        ...state,
        phase: {
          type: "selecting",
          cells: buildCellLine(start, endpoint),
          direction: state.phase.direction,
        },
      };
    }

    case "POINTER_UP": {
      if (state.phase.type !== "selecting") return IDLE_STATE;

      const { direction, cells } = state.phase;
      if (direction === null || cells.length < 2) return IDLE_STATE;

      return {
        ...state,
        phase: { type: "released", cells, direction },
      };
    }

    case "RESET":
      return IDLE_STATE;

    default:
      return assertNever(action);
  }
}

// ---------- Hook ----------

/**
 * Drag selection state machine for the word search grid.
 *
 * Tracks pointer events across cells, locks to a single direction
 * (horizontal, vertical, or diagonal) after the second cell contact,
 * and projects all subsequent movement along the locked axis.
 */
function useDragSelect(): UseDragSelectReturn {
  const [state, dispatch] = useReducer(dragReducer, IDLE_STATE);

  const handlers = useMemo(
    () => ({
      onPointerDown: (cell: CellPosition) => {
        dispatch({ type: "POINTER_DOWN", cell });
      },
      onPointerEnter: (cell: CellPosition) => {
        dispatch({ type: "POINTER_ENTER", cell });
      },
      onPointerUp: () => {
        dispatch({ type: "POINTER_UP" });
      },
    }),
    [],
  );

  const reset = useMemo(() => () => dispatch({ type: "RESET" }), []);

  return { dragPhase: state.phase, handlers, reset };
}

export { useDragSelect };
export type { DragAction, DragPhase, UseDragSelectReturn };
