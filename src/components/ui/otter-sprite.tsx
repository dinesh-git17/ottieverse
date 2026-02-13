import clsx from "clsx";
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
 * All frames mount in the DOM for instant browser decode. Only the
 * active frame is visible; inactive frames use `invisible` to stay
 * pre-rendered but hidden. Crossfade is intentionally avoided because
 * transparent PNGs bleed through stacked opacity layers.
 *
 * @param props - Component properties.
 */
function OtterSprite({ frames, fps, alt, className }: OtterSpriteProps): React.ReactNode {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (frames.length <= 1) return;

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [frames.length, fps]);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={SPRING_OTTER_ENTRANCE}
      className={className}
    >
      <div className="relative h-full w-full">
        {frames.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={i === frameIndex ? alt : ""}
            draggable={false}
            className={clsx(
              "h-full w-full object-contain",
              i === 0 ? "relative" : "absolute inset-0",
              i !== frameIndex && "invisible",
            )}
          />
        ))}
      </div>
    </motion.div>
  );
}

export { OtterSprite };
export type { OtterSpriteProps };
