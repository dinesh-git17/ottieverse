"use client";

import { motion } from "motion/react";
import { useCallback, useReducer } from "react";
import { FloatingHearts } from "@/components/ui/floating-hearts";
import { SceneTransition } from "@/components/ui/scene-transition";
import type { Scene } from "@/types";
import { SCENE_ORDER } from "@/types";

// ---------- Exhaustive check ----------

/** Compile-time exhaustiveness guard for discriminated union switches. */
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

// ---------- Spring preset ----------

/**
 * Default spring physics for scene enter/exit transitions.
 *
 * Placeholder values pending device validation — DESIGN_DOC.md Section 4
 * describes transitions qualitatively, not with exact stiffness/damping.
 */
const SPRING_SCENE = {
  type: "spring",
  stiffness: 300,
  damping: 30,
} as const;

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

// ---------- Stub scene ----------

type StubSceneProps = {
  readonly name: string;
  readonly onComplete: () => void;
};

/** Temporary placeholder scene for state machine testing. */
function StubScene({ name, onComplete }: StubSceneProps): React.ReactNode {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={SPRING_SCENE}
      className="flex min-h-dvh flex-col items-center justify-center gap-6"
    >
      <p className="text-2xl font-bold">{name}</p>
      <button
        type="button"
        onClick={onComplete}
        className="rounded-lg bg-white/20 px-6 py-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        Next
      </button>
    </motion.div>
  );
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
        return <StubScene key="welcome" name="welcome" onComplete={handleComplete} />;
      case "quiz":
        return <StubScene key="quiz" name="quiz" onComplete={handleComplete} />;
      case "word-search":
        return <StubScene key="word-search" name="word-search" onComplete={handleComplete} />;
      case "poetry-canvas":
        return <StubScene key="poetry-canvas" name="poetry-canvas" onComplete={handleComplete} />;
      case "letter":
        return <StubScene key="letter" name="letter" onComplete={handleComplete} />;
      case "the-ask":
        return <StubScene key="the-ask" name="the-ask" onComplete={handleComplete} />;
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
