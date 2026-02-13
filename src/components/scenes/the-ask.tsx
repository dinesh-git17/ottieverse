import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getNoAnimate,
  getNoTransition,
  NO_MESSAGES,
  NO_SCALE,
  useAsk,
} from "@/components/scenes/the-ask/use-ask";
import type { ConfettiHandle } from "@/components/ui/confetti";
import { Confetti } from "@/components/ui/confetti";
import { OtterSprite } from "@/components/ui/otter-sprite";
import { haptic } from "@/lib/haptics";
import { openSmsApp } from "@/lib/sms";

/** Scene enter/exit spring per DESIGN_DOC.md Section 4. */
const SPRING_SCENE = { type: "spring", stiffness: 300, damping: 30 } as const;
/** Button interaction spring — snappy tap response. */
const SPRING_BUTTON = { type: "spring", stiffness: 400, damping: 25 } as const;

const OTTER_HEART = ["/otters/otter-heart.png"] as const;
const OTTER_CRYING = ["/otters/otter-crying.png"] as const;
const OTTER_PARTY = ["/otters/otter-party.png"] as const;

/** Props for the {@link TheAsk} scene component. */
type TheAskProps = { readonly onComplete: () => void };

/** Grand finale: 6-stage "No" degradation, escalating "Yes", confetti, SMS CTA. */
function TheAsk({ onComplete }: TheAskProps): React.ReactNode {
  const { state, pressNo, pressYes, showCta } = useAsk();
  const { noStage, celebrationPhase, yesScale, shakeCount } = state;
  const confettiRef = useRef<ConfettiHandle>(null);
  const noButtonRef = useRef<HTMLButtonElement>(null);
  const ctaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fleeOffset, setFleeOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    return () => {
      if (ctaTimerRef.current !== null) clearTimeout(ctaTimerRef.current);
    };
  }, []);

  const isCelebrating = celebrationPhase !== "idle";
  const otterFrames = isCelebrating ? OTTER_PARTY : noStage >= 2 ? OTTER_CRYING : OTTER_HEART;
  const otterKey = isCelebrating ? "party" : noStage >= 2 ? "crying" : "heart";
  const message = noStage < 6 ? NO_MESSAGES[noStage] : null;

  function handleNo(): void {
    haptic.heavy();
    pressNo();
  }

  function handleYes(): void {
    haptic.success();
    haptic.vibrate();
    confettiRef.current?.fire();
    pressYes();
    ctaTimerRef.current = setTimeout(showCta, 2000);
  }

  function handleCta(): void {
    haptic.light();
    openSmsApp();
    onComplete();
  }

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      if (noStage !== 5) return;
      const btn = noButtonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const dx = r.left + r.width / 2 - e.clientX;
      const dy = r.top + r.height / 2 - e.clientY;
      if (Math.sqrt(dx * dx + dy * dy) < 150) {
        const a = Math.atan2(dy, dx);
        setFleeOffset({ x: Math.cos(a) * 200, y: Math.sin(a) * 200 });
      }
    },
    [noStage],
  );

  return (
    <motion.div
      key="the-ask"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={SPRING_SCENE}
      onPointerMove={noStage === 5 ? handlePointerMove : undefined}
      className="relative flex min-h-dvh w-full flex-col items-center bg-linear-to-b from-ask-start to-ask-end px-6 pt-safe-top pb-safe-bottom"
    >
      <motion.div
        key={shakeCount}
        animate={shakeCount > 0 ? { x: [0, -8, 8, -8, 8, 0] } : undefined}
        transition={{ duration: 0.4 }}
        className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5"
      >
        <div className="size-28">
          <OtterSprite
            key={otterKey}
            frames={otterFrames}
            fps={1}
            alt={`Ottie ${otterKey}`}
            className="size-full"
          />
        </div>
        <div className="space-y-3 text-center">
          <p className="text-base leading-relaxed text-rose-950/80">
            Carolina, Loving you has been the easiest and most natural thing in my life. You make my
            days warmer, my goals clearer, and my heart calmer just by being you. I feel incredibly
            lucky that I get to call you mine.
          </p>
          <p className="text-base leading-relaxed text-rose-950/80">
            So I have a simple question for the girl who means the world to me.
          </p>
        </div>
        <h1 className="font-[family-name:var(--font-playfair)] text-[26px] font-bold leading-tight text-rose-950">
          Will you be my Valentine? {"\u{1F339}"}
        </h1>
        <AnimatePresence mode="wait">
          {message != null ? (
            <motion.p
              key={message}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRING_BUTTON}
              className="h-6 text-sm text-rose-950/60"
            >
              {message}
            </motion.p>
          ) : (
            <div key="spacer" className="h-6" />
          )}
        </AnimatePresence>
        <div className="flex flex-col items-center gap-4">
          <AnimatePresence>
            {celebrationPhase === "idle" ? (
              <motion.button
                key="yes"
                type="button"
                animate={{ scale: yesScale }}
                exit={{ scale: 1.4, opacity: 0 }}
                transition={SPRING_BUTTON}
                whileTap={{ scale: yesScale * 0.96 }}
                onClick={handleYes}
                className={clsx(
                  "min-h-11 min-w-[160px] rounded-full px-10 py-3 text-lg font-semibold",
                  "bg-linear-to-r from-rose-500 to-pink-500 text-white",
                  noStage >= 4
                    ? "shadow-xl shadow-rose-500/40"
                    : noStage >= 2
                      ? "shadow-lg shadow-rose-500/30"
                      : "shadow-md shadow-rose-500/20",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2",
                )}
              >
                Yes
              </motion.button>
            ) : null}
          </AnimatePresence>
          <AnimatePresence>
            {noStage < 6 && celebrationPhase === "idle" ? (
              <motion.button
                key="no"
                ref={noButtonRef}
                type="button"
                animate={getNoAnimate(noStage, fleeOffset)}
                exit={{ scale: 0, opacity: 0 }}
                transition={getNoTransition(noStage, SPRING_BUTTON)}
                whileTap={noStage < 3 ? { scale: NO_SCALE[noStage] * 0.96 } : undefined}
                onClick={handleNo}
                className="min-h-11 rounded-full bg-rose-950/10 px-6 py-2 text-sm font-medium text-rose-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-950/30"
              >
                No
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {celebrationPhase === "cta-visible" ? (
            <motion.button
              key="cta"
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRING_BUTTON}
              whileTap={{ scale: 0.96 }}
              onClick={handleCta}
              className="min-h-11 rounded-full bg-rose-950/20 px-8 py-3 text-base font-medium text-rose-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-950/30"
            >
              Send him the good news {"\u{1F48C}"}
            </motion.button>
          ) : null}
        </AnimatePresence>
      </motion.div>
      <Confetti ref={confettiRef} />
    </motion.div>
  );
}

export { TheAsk };
export type { TheAskProps };
