import type { QuizQuestion, WordSearchConfig, WordSearchWord } from "@/types";

/**
 * Five quiz questions sourced from DESIGN_DOC.md Section 5, Scene 1.
 *
 * Q2 (index 1) accepts both "January 25"
 * and "January 26" as correct answers (timezone edge case).
 */
export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 1,
    question: "When is Dinesh's birthday?",
    options: [
      { label: "April 17", isCorrect: true },
      { label: "February 14 (too convenient)", isCorrect: false },
      { label: "December 25 (he wishes)", isCorrect: false },
      { label: "He doesn't age, he just updates", isCorrect: false },
    ],
    allowMultipleCorrect: false,
  },
  {
    id: 2,
    question: "When did we first start texting?",
    options: [
      { label: "January 25", isCorrect: true },
      { label: "January 26", isCorrect: true },
      { label: "March 1st", isCorrect: false },
      { label: "February 14 (again, too convenient)", isCorrect: false },
      { label: "Sometime in 2019, you just don't remember", isCorrect: false },
    ],
    allowMultipleCorrect: true,
  },
  {
    id: 3,
    question: "What's Dinesh's go-to Starbucks order?",
    options: [
      { label: "Matcha", isCorrect: true },
      { label: "Black coffee, no personality", isCorrect: false },
      { label: "Pumpkin Spice Latte (basic era)", isCorrect: false },
      { label: "He just orders water and judges everyone", isCorrect: false },
    ],
    allowMultipleCorrect: false,
  },
  {
    id: 4,
    question: "What coding language does Dinesh use the most?",
    options: [
      { label: "Python", isCorrect: true },
      { label: "HTML (watch him lose his mind)", isCorrect: false },
      { label: "Microsoft Word", isCorrect: false },
      { label: "He just talks to AI and calls it coding", isCorrect: false },
    ],
    allowMultipleCorrect: false,
  },
  {
    id: 5,
    question: "What's the first thing we cooked together?",
    options: [
      { label: "Pasta", isCorrect: true },
      { label: "Reservations", isCorrect: false },
      { label: "Cereal (it counts)", isCorrect: false },
      { label: "We don't cook, we DoorDash", isCorrect: false },
    ],
    allowMultipleCorrect: false,
  },
] as const;

/**
 * Seven words for the 10x10 word search grid.
 *
 * Directions sourced from DESIGN_DOC.md Section 5, Scene 2 table.
 */
export const WORD_SEARCH_WORDS: readonly WordSearchWord[] = [
  { word: "DINN", direction: "horizontal" },
  { word: "OTTIE", direction: "vertical" },
  { word: "FOREVER", direction: "horizontal" },
  { word: "TORONTO", direction: "diagonal" },
  { word: "CRIMINAL", direction: "horizontal" },
  { word: "LOVE", direction: "vertical" },
  { word: "BEBE", direction: "diagonal" },
] as const;

/** Word search grid configuration for the generator in PH-04. */
export const WORD_SEARCH_CONFIG: WordSearchConfig = {
  gridSize: 10,
  words: WORD_SEARCH_WORDS,
  hiddenMessage: "BE MY VALENTINE",
} as const;
