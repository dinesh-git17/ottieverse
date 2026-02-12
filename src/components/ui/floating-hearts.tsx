import { useEffect, useRef } from "react";
import type { Scene } from "@/types";

/** Heart density ranges per scene from DESIGN_DOC.md Section 6 Ambient Layer. */
const HEART_DENSITY = {
  welcome: [0, 0],
  quiz: [0, 0],
  "word-search": [0, 0],
  "poetry-canvas": [3, 5],
  letter: [8, 10],
  "the-ask": [20, 25],
} as const satisfies Record<Scene, readonly [number, number]>;

/** Warm rose fill derived from --color-ask-start (#fda4af). */
const HEART_COLOR = "rgba(253, 164, 175, 0.6)";

type HeartParticle = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  drift: number;
  phase: number;
};

/** Props for the {@link FloatingHearts} ambient canvas overlay. */
type FloatingHeartsProps = {
  readonly scene: Scene;
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createParticle(width: number, height: number, isMixed: boolean): HeartParticle {
  return {
    x: Math.random() * width,
    y: height + Math.random() * 50,
    size: isMixed ? randomBetween(8, 20) : randomBetween(8, 12),
    opacity: randomBetween(0.3, 0.7),
    speed: randomBetween(0.3, 0.8),
    drift: randomBetween(0.3, 1.0),
    phase: Math.random() * Math.PI * 2,
  };
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  opacity: number,
): void {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = HEART_COLOR;
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.4);
  ctx.bezierCurveTo(
    cx - size * 0.55,
    cy + size * 0.1,
    cx - size * 0.55,
    cy - size * 0.4,
    cx,
    cy - size * 0.15,
  );
  ctx.bezierCurveTo(
    cx + size * 0.55,
    cy - size * 0.4,
    cx + size * 0.55,
    cy + size * 0.1,
    cx,
    cy + size * 0.4,
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Canvas-based ambient floating hearts overlay.
 *
 * Heart particle density scales with scene progression per DESIGN_DOC.md
 * Section 6: zero in Scenes 0-2, subtle in Scene 3, building to full
 * density in Scene 5 with mixed sizes.
 *
 * @param props - Component properties.
 */
function FloatingHearts({ scene }: FloatingHeartsProps): React.ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<HeartParticle[]>([]);
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
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Animation loop gated by scene density
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [min, max] = HEART_DENSITY[scene];
    const target = min === max ? min : Math.round(randomBetween(min, max));
    const isMixed = scene === "the-ask";

    if (target === 0) {
      particlesRef.current = [];
      ctx.clearRect(0, 0, sizeRef.current.width, sizeRef.current.height);
      return;
    }

    let rafId = 0;

    const loop = (): void => {
      const { width, height } = sizeRef.current;

      // Spawn particles gradually — one per frame until target reached
      if (particlesRef.current.length < target) {
        particlesRef.current.push(createParticle(width, height, isMixed));
      }

      ctx.clearRect(0, 0, width, height);

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.y -= p.speed;
        p.x += Math.sin(p.phase) * p.drift;
        p.phase += 0.02;

        if (p.y < -50) {
          if (particlesRef.current.length > target) {
            particlesRef.current.splice(i, 1);
            continue;
          }
          p.x = Math.random() * width;
          p.y = height + Math.random() * 50;
          p.size = isMixed ? randomBetween(8, 20) : randomBetween(8, 12);
          p.opacity = randomBetween(0.3, 0.7);
          p.speed = randomBetween(0.3, 0.8);
          p.drift = randomBetween(0.3, 1.0);
          p.phase = Math.random() * Math.PI * 2;
        }

        drawHeart(ctx, p.x, p.y, p.size, p.opacity);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [scene]);

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

export { FloatingHearts };
export type { FloatingHeartsProps };
