/** Scene identifier for the linear state machine. */
export type Scene = "welcome" | "quiz" | "word-search" | "poetry-canvas" | "letter" | "the-ask";

/** Immutable scene progression order matching DESIGN_DOC.md Section 4. */
export const SCENE_ORDER = [
  "welcome",
  "quiz",
  "word-search",
  "poetry-canvas",
  "letter",
  "the-ask",
] as const satisfies readonly Scene[];

/** Single answer option within a quiz question. */
export type QuizOption = {
  readonly label: string;
  readonly isCorrect: boolean;
};

/**
 * Quiz question with shuffleable options.
 *
 * When `allowMultipleCorrect` is true, more than one option may have
 * `isCorrect: true` (e.g., Q2 timezone edge case).
 */
export type QuizQuestion = {
  readonly id: number;
  readonly question: string;
  readonly options: readonly QuizOption[];
  readonly allowMultipleCorrect: boolean;
};

/** Placement direction for a word in the search grid. */
export type WordSearchDirection = "horizontal" | "vertical" | "diagonal";

/** Single word entry for grid placement. */
export type WordSearchWord = {
  readonly word: string;
  readonly direction: WordSearchDirection;
};

/** Configuration for the 10x10 word search grid generator. */
export type WordSearchConfig = {
  readonly gridSize: number;
  readonly words: readonly WordSearchWord[];
  readonly hiddenMessage: string;
};

/** Haptic event identifiers from DESIGN_DOC.md Section 7. */
export type HapticEvent =
  | "tap-to-start"
  | "correct-answer"
  | "wrong-answer"
  | "word-found"
  | "hidden-message-reveal"
  | "poem-submitted"
  | "no-button-press"
  | "yes-press";

/** Scene transition descriptor for the state machine. */
export type SceneTransition = {
  readonly from: Scene;
  readonly to: Scene;
  readonly trigger: string;
};
