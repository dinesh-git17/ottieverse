import { motion } from "motion/react";
import { useEffect, useState } from "react";

/** Spring preset for otter scale-in entrance per DESIGN_DOC.md Section 5, Scene 0. */
const SPRING_OTTER_ENTRANCE = {
  type: "spring",
  stiffness: 200,
  damping: 20,
} as const;

/** Props for the {@link OtterSprite} frame-cycling animation component. */
type OtterSpriteProps = {
  readonly frames: readonly string[];
  readonly fps: number;
  readonly alt: string;
  readonly className?: string;
};

/**
 * Frame-cycling otter sprite with spring-based entrance animation.
 *
 * Cycles through provided image paths at the specified FPS. Single-frame
 * arrays render statically without a timer. All frames are preloaded on
 * mount to prevent flicker during transitions.
 *
 * @param props - Component properties.
 */
function OtterSprite({ frames, fps, alt, className }: OtterSpriteProps): React.ReactNode {
  const [frameIndex, setFrameIndex] = useState(0);

  // Cycle frames at 1000/fps interval — skip for single-frame arrays
  useEffect(() => {
    if (frames.length <= 1) return;

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [frames.length, fps]);

  // Preload all frame images to prevent flicker during transitions
  useEffect(() => {
    for (const src of frames) {
      const img = new Image();
      img.src = src;
    }
  }, [frames]);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={SPRING_OTTER_ENTRANCE}
      className={className}
    >
      <img src={frames[frameIndex]} alt={alt} draggable={false} />
    </motion.div>
  );
}

export { OtterSprite };
export type { OtterSpriteProps };
