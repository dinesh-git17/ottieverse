import { useEffect, useImperativeHandle, useRef } from "react";

const CONFETTI_GRAVITY = 0.15;
const CONFETTI_PARTICLE_COUNT = 220;
const CONFETTI_DURATION_MS = 3000;

/** Festive palette derived from scene gradient tokens in globals.css. */
const CONFETTI_COLORS = [
  "#fda4af", // rose-300 (--color-ask-start)
  "#fbbf24", // amber-400 (--color-ask-end)
  "#0d9488", // teal-600 (--color-welcome-start)
  "#7c3aed", // violet-600 (--color-welcome-end)
  "#f59e0b", // amber-500 (--color-poetry-start)
] as const;

type ConfettiParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  opacity: number;
};

/** Imperative handle for triggering confetti explosions. */
type ConfettiHandle = {
  readonly fire: () => void;
};

/** Props for the {@link Confetti} imperative canvas overlay. */
type ConfettiProps = {
  readonly ref?: React.Ref<ConfettiHandle>;
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Canvas-based confetti explosion triggered imperatively.
 *
 * Fires 220 particles from the center-top of the viewport with gravity,
 * rotation, and a 3-second auto-cleanup per DESIGN_DOC.md Section 5 Scene 5.
 * Uses the React 19 ref-as-prop pattern with `useImperativeHandle`.
 *
 * @param props - Component properties.
 */
function Confetti({ ref }: ConfettiProps): React.ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const rafIdRef = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0 });

  // Canvas dimensions and HiDPI scaling — re-measured on viewport resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = (): void => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      sizeRef.current = { width: w, height: h };
    };

    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    fire: (): void => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { width, height } = sizeRef.current;
      const particles: ConfettiParticle[] = [];

      for (let i = 0; i < CONFETTI_PARTICLE_COUNT; i++) {
        particles.push({
          x: width / 2,
          y: height * 0.2,
          vx: randomBetween(-8, 8),
          vy: randomBetween(-12, -3),
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: randomBetween(-0.1, 0.1),
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: randomBetween(6, 10),
          opacity: 1,
        });
      }

      particlesRef.current = particles;
      const startTime = performance.now();
      cancelAnimationFrame(rafIdRef.current);

      const loop = (): void => {
        const elapsed = performance.now() - startTime;

        if (elapsed > CONFETTI_DURATION_MS) {
          particlesRef.current = [];
          ctx.clearRect(0, 0, sizeRef.current.width, sizeRef.current.height);
          return;
        }

        // Linear opacity fade over final 1000ms
        const fadeStart = CONFETTI_DURATION_MS - 1000;
        const fadeFactor = elapsed > fadeStart ? 1 - (elapsed - fadeStart) / 1000 : 1;

        ctx.clearRect(0, 0, sizeRef.current.width, sizeRef.current.height);

        for (const p of particlesRef.current) {
          p.vy += CONFETTI_GRAVITY;
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.rotationSpeed;
          p.opacity = fadeFactor;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }

        rafIdRef.current = requestAnimationFrame(loop);
      };

      rafIdRef.current = requestAnimationFrame(loop);
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

export { Confetti };
export type { ConfettiHandle, ConfettiProps };
