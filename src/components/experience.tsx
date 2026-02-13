"use client";

import { useCallback, useReducer } from "react";
import { Letter } from "@/components/scenes/letter";
import { PoetryCanvas } from "@/components/scenes/poetry-canvas";
import { Quiz } from "@/components/scenes/quiz";
import { TheAsk } from "@/components/scenes/the-ask";
import { Welcome } from "@/components/scenes/welcome";
import { WordSearch } from "@/components/scenes/word-search";
import { FloatingHearts } from "@/components/ui/floating-hearts";
import { SceneTransition } from "@/components/ui/scene-transition";
import type { Scene } from "@/types";
import { SCENE_ORDER } from "@/types";

// ---------- Exhaustive check ----------

/** Compile-time exhaustiveness guard for discriminated union switches. */
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

// ---------- State machine ----------

type ExperienceState = {
  readonly currentScene: Scene;
};

type ExperienceAction = { readonly type: "ADVANCE" };

const INITIAL_STATE: ExperienceState = { currentScene: "welcome" };

/** Forward-only linear progression through the scene order. */
function experienceReducer(state: ExperienceState, action: ExperienceAction): ExperienceState {
  switch (action.type) {
    case "ADVANCE": {
      const currentIndex = SCENE_ORDER.indexOf(state.currentScene);
      const nextIndex = currentIndex + 1;
      if (nextIndex >= SCENE_ORDER.length) return state;
      return { currentScene: SCENE_ORDER[nextIndex] };
    }
    default:
      return assertNever(action.type);
  }
}

// ---------- Orchestrator ----------

/**
 * Root experience orchestrator driving the linear scene state machine.
 *
 * Renders the active scene inside an `AnimatePresence mode="wait"` boundary.
 * Each scene receives an `onComplete` callback that dispatches `ADVANCE` to
 * progress through the immutable scene order defined in DESIGN_DOC.md Section 4.
 */
function Experience(): React.ReactNode {
  const [state, dispatch] = useReducer(experienceReducer, INITIAL_STATE);

  const handleComplete = useCallback((): void => {
    dispatch({ type: "ADVANCE" });
  }, []);

  function renderScene(): React.ReactNode {
    switch (state.currentScene) {
      case "welcome":
        return <Welcome key="welcome" onComplete={handleComplete} />;
      case "quiz":
        return <Quiz key="quiz" onComplete={handleComplete} />;
      case "word-search":
        return <WordSearch key="word-search" onComplete={handleComplete} />;
      case "poetry-canvas":
        return <PoetryCanvas key="poetry-canvas" onComplete={handleComplete} />;
      case "letter":
        return <Letter key="letter" onComplete={handleComplete} />;
      case "the-ask":
        return <TheAsk key="the-ask" onComplete={handleComplete} />;
      default:
        return assertNever(state.currentScene);
    }
  }

  return (
    <>
      <SceneTransition>{renderScene()}</SceneTransition>
      <FloatingHearts scene={state.currentScene} />
    </>
  );
}

export { Experience };
