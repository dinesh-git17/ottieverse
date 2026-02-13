import { motion } from "motion/react";
import { OtterSprite } from "@/components/ui/otter-sprite";
import { haptic } from "@/lib/haptics";

/** Spring physics for scene enter/exit transitions. */
const SPRING_SCENE = {
  type: "spring",
  stiffness: 300,
  damping: 30,
} as const;

/** Wave animation frames per DESIGN_DOC.md Section 5, Scene 0. */
const WELCOME_OTTER_FRAMES = [
  "/otters/otter-wave-1.png",
  "/otters/otter-wave-2.png",
  "/otters/otter-wave-3.png",
] as const;

/** Frame rate for otter wave cycle per DESIGN_DOC.md Section 5, Scene 0. */
const WELCOME_OTTER_FPS = 4;

/** Props for the {@link Welcome} scene component. */
type WelcomeProps = {
  readonly onComplete: () => void;
};

/**
 * Welcome scene — first screen establishing the visual tone.
 *
 * Full-screen teal-to-violet gradient with animated waving otter,
 * personalized greeting, and tap-anywhere interaction gating entry
 * into the experience.
 */
function Welcome({ onComplete }: WelcomeProps): React.ReactNode {
  function handleTap(): void {
    haptic.light();
    onComplete();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={SPRING_SCENE}
      onClick={handleTap}
      className="flex min-h-dvh w-full cursor-pointer select-none flex-col items-center justify-center bg-linear-to-b from-welcome-start to-welcome-end text-white"
    >
      <OtterSprite
        frames={WELCOME_OTTER_FRAMES}
        fps={WELCOME_OTTER_FPS}
        alt="Ottie waving hello"
        className="mb-8 h-48 w-48"
      />

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-4 text-4xl font-bold"
      >
        Hi Carolina
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.7, 1] }}
        transition={{
          delay: 1.5,
          duration: 2,
          times: [0, 0.2, 0.6, 1],
          repeat: Infinity,
          repeatDelay: 1,
        }}
        className="text-lg font-normal text-white/70"
      >
        Tap anywhere to begin
      </motion.p>
    </motion.div>
  );
}

export { Welcome };
export type { WelcomeProps };
