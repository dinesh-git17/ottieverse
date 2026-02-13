import type { WordSearchConfig, WordSearchDirection } from "@/types";

// ---------------------------------------------------------------------------
// Exported Types
// ---------------------------------------------------------------------------

/** Row and column coordinates for a single cell in the grid. */
export type CellPosition = {
  readonly row: number;
  readonly col: number;
};

/** A single cell in the generated grid containing its letter and coordinates. */
export type GridCell = {
  readonly letter: string;
  readonly row: number;
  readonly col: number;
};

/** Metadata describing where a word was placed in the grid. */
export type WordPlacement = {
  readonly word: string;
  readonly direction: WordSearchDirection;
  readonly cells: readonly CellPosition[];
};

/** Complete output of the grid generation algorithm. */
export type GeneratedGrid = {
  readonly cells: readonly (readonly GridCell[])[];
  readonly wordPlacements: readonly WordPlacement[];
  readonly hiddenMessageCells: readonly CellPosition[];
};

// ---------------------------------------------------------------------------
// Internal Error
// ---------------------------------------------------------------------------

class GridGenerationError extends Error {
  readonly code = "GRID_GENERATION_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "GridGenerationError";
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Seed for the LCG — produces a stable layout for the 7-word + hidden-message config. */
const FIXED_SEED = 12345;

/** Upper bound on random-start attempts before declaring placement failure. */
const MAX_PLACEMENT_ATTEMPTS = 200;

/** Row/column deltas for each placement direction. */
const DIRECTION_VECTORS: Readonly<Record<WordSearchDirection, readonly [number, number]>> = {
  horizontal: [0, 1],
  vertical: [1, 0],
  diagonal: [1, 1],
};

/**
 * Weighted consonant pool for filler cells.
 *
 * Vowels (A, E, I, O, U) are excluded to prevent accidental word formation.
 * Weights sourced from DESIGN_DOC.md Section 5, Scene 2 grid specification.
 */
const FILLER_WEIGHTS: readonly (readonly [string, number])[] = [
  ["T", 12],
  ["N", 10],
  ["S", 10],
  ["R", 10],
  ["L", 8],
  ["D", 6],
  ["C", 6],
  ["M", 6],
  ["H", 4],
  ["G", 4],
  ["P", 4],
  ["B", 3],
  ["F", 3],
  ["W", 3],
  ["K", 2],
  ["J", 1],
  ["X", 1],
  ["Z", 1],
];

function buildFillerPool(): readonly string[] {
  const pool: string[] = [];
  for (const [letter, weight] of FILLER_WEIGHTS) {
    for (let i = 0; i < weight; i++) {
      pool.push(letter);
    }
  }
  return pool;
}

/** Pre-computed filler pool — 93 consonants weighted by natural frequency. */
const FILLER_POOL: readonly string[] = buildFillerPool();

// ---------------------------------------------------------------------------
// Seeded RNG (Linear Congruential Generator)
// ---------------------------------------------------------------------------

/**
 * Creates a deterministic pseudo-random number generator.
 *
 * Uses Numerical Recipes LCG parameters (a = 1664525, c = 1013904223, m = 2^32).
 * Each call returns a float in [0, 1). Identical seeds produce identical sequences.
 */
function createLcg(seed: number): () => number {
  let state = seed;
  return (): number => {
    // 32-bit multiply + additive constant, truncated to integer via bitwise OR
    state = (Math.imul(1664525, state) + 1013904223) | 0;
    // Unsigned shift converts to [0, 2^32), then normalize to [0, 1)
    return (state >>> 0) / 0x100000000;
  };
}

// ---------------------------------------------------------------------------
// Grid Helpers
// ---------------------------------------------------------------------------

function createEmptyGrid(size: number): (string | null)[][] {
  return Array.from({ length: size }, () => new Array<string | null>(size).fill(null));
}

// ---------------------------------------------------------------------------
// Word Placement
// ---------------------------------------------------------------------------

function placeWord(
  grid: (string | null)[][],
  word: string,
  direction: WordSearchDirection,
  gridSize: number,
  random: () => number,
): WordPlacement {
  const [dRow, dCol] = DIRECTION_VECTORS[direction];
  const maxRow = gridSize - dRow * (word.length - 1);
  const maxCol = gridSize - dCol * (word.length - 1);

  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
    const startRow = Math.floor(random() * maxRow);
    const startCol = Math.floor(random() * maxCol);
    const cells: CellPosition[] = [];
    let valid = true;

    for (let i = 0; i < word.length; i++) {
      const row = startRow + i * dRow;
      const col = startCol + i * dCol;
      const existing = grid[row][col];

      if (existing !== null && existing !== word.charAt(i)) {
        valid = false;
        break;
      }

      cells.push({ row, col });
    }

    if (valid) {
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        grid[cell.row][cell.col] = word.charAt(i);
      }
      return { word, direction, cells };
    }
  }

  throw new GridGenerationError(
    `Failed to place "${word}" (${direction}) after ${MAX_PLACEMENT_ATTEMPTS} attempts`,
  );
}

// ---------------------------------------------------------------------------
// Hidden Message Scattering
// ---------------------------------------------------------------------------

function scatterHiddenMessage(
  grid: (string | null)[][],
  message: string,
  gridSize: number,
  random: () => number,
): readonly CellPosition[] {
  // Collect every empty cell remaining after word placement
  const emptyCells: CellPosition[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] === null) {
        emptyCells.push({ row, col });
      }
    }
  }

  const messageChars = message.replaceAll(" ", "");

  if (emptyCells.length < messageChars.length) {
    throw new GridGenerationError(
      `Not enough empty cells (${emptyCells.length}) for hidden message` +
        ` (${messageChars.length} chars)`,
    );
  }

  // Fisher-Yates shuffle with deterministic RNG for uniform distribution
  for (let i = emptyCells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = emptyCells[i];
    emptyCells[i] = emptyCells[j];
    emptyCells[j] = temp;
  }

  const selectedCells = emptyCells.slice(0, messageChars.length);

  for (let i = 0; i < messageChars.length; i++) {
    const cell = selectedCells[i];
    grid[cell.row][cell.col] = messageChars.charAt(i);
  }

  return selectedCells;
}

// ---------------------------------------------------------------------------
// Filler Generation
// ---------------------------------------------------------------------------

function fillRemainingCells(
  grid: (string | null)[][],
  gridSize: number,
  random: () => number,
): void {
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] === null) {
        const index = Math.floor(random() * FILLER_POOL.length);
        grid[row][col] = FILLER_POOL[index];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Grid Finalization
// ---------------------------------------------------------------------------

function freezeGrid(grid: (string | null)[][]): readonly (readonly GridCell[])[] {
  return grid.map((row, rowIdx) =>
    row.map(
      (letter, colIdx): GridCell => ({
        letter: letter ?? "",
        row: rowIdx,
        col: colIdx,
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a fully populated word search grid from the given configuration.
 *
 * Uses a seeded Linear Congruential Generator for deterministic output —
 * identical config always produces identical grid layout, hidden message
 * placement, and filler letters.
 *
 * @param config - Word search configuration with grid size, words, and hidden message.
 * @returns Immutable grid with word placements, hidden message cells, and filler.
 * @throws GridGenerationError if word placement fails or insufficient empty cells for message.
 */
export function generateGrid(config: WordSearchConfig): GeneratedGrid {
  const random = createLcg(FIXED_SEED);
  const grid = createEmptyGrid(config.gridSize);

  // Longest words first to maximize placement success in a constrained grid
  const sortedWords = config.words.toSorted((a, b) => b.word.length - a.word.length);

  const wordPlacements: WordPlacement[] = [];

  for (const entry of sortedWords) {
    const placement = placeWord(grid, entry.word, entry.direction, config.gridSize, random);
    wordPlacements.push(placement);
  }

  const hiddenMessageCells = scatterHiddenMessage(
    grid,
    config.hiddenMessage,
    config.gridSize,
    random,
  );

  fillRemainingCells(grid, config.gridSize, random);

  const cells = freezeGrid(grid);

  return { cells, wordPlacements, hiddenMessageCells };
}
