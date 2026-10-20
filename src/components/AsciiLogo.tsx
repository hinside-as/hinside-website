import { useEffect, useRef } from "react";
import { HINSIDE_MARK_SLATS as SLATS, VIEWBOX_WIDTH, VIEWBOX_HEIGHT } from "../lib/hinside-mark-geometry";

// Scroll-scrubbed, not triggered: the mark's centre distance from the
// viewport's centre (fraction of viewport height) maps straight onto how
// gathered it is. Scattered from the moment the section enters the
// screen (OUTER), moving steadily toward the exact mark as it travels to the
// middle, fully gathered only at the centre itself (no hold), then steadily breaking
// apart again on the way out. Long range on purpose, so the movement reads
// at ordinary scroll speeds.
const GATHER_INNER = 0;
const GATHER_OUTER = 0.95;
const SCRAMBLE_STEP_MS = 220;
const IDLE_LOOP_SPEED = 0.00048;
// Left-block glyph widths in eighths (▏ … █ … ▏): the idle shimmer sweeps a
// gradient of these down the rows.
const IDLE_EIGHTHS = [1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1];
// Scrambled cells are density blocks (░ ▒ ▓ █), drawn as alpha.
const SCRAMBLE_ALPHAS = [0.22, 0.4, 0.66, 1];

// Each character cell of the mark, positioned in viewBox units.
type Cell = { x: number; y: number; w: number };
const CELLS: Cell[] = SLATS.flatMap((slat) => {
  const count = Math.max(2, Math.round(slat.w * 1.18));
  const w = slat.w / count;
  return Array.from({ length: count }, (_, c) => ({ x: slat.x + c * w, y: slat.y, w }));
});

// Deterministic per-cell randomness (fixed scatter layout, no reseeding).
const hash = (a: number, b: number) => {
  let h = Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 1, 0x85ebca6b);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
};
const rand01 = (a: number, b: number) => hash(a, b) / 4294967296;
// Flat at both ends — eases each character in and out of its two resting
// states.
const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

/**
 * The homepage's ASCII rendering of the hinside wordmark. One canvas fills
 * its section: scattered characters while the mark is away from the
 * vertical middle of the screen, gathering into the exact, readable mark as
 * it reaches the middle, and breaking apart again as the page scrolls on.
 *
 * Position is a plain function of the mark's scroll position (no physics
 * simulation to settle), redrawn only while the section is on screen.
 * Scrolling itself is never touched, and the pointer has no effect.
 */
export default function AsciiLogo() {
  const markRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const mark = markRef.current;
    const canvas = canvasRef.current;
    const section = mark?.closest("section");
    const ctx = canvas?.getContext("2d");
    if (!mark || !canvas || !section || !ctx) return;

    const n = CELLS.length;
    const restX = new Float32Array(n);
    const restY = new Float32Array(n);
    const scatterX = new Float32Array(n);
    const scatterY = new Float32Array(n);
    // A second, different scatter layout for the far side of the mark's
    // pass: it arrives from layout A (below the middle) and leaves toward
    // layout C (above the middle), so each character travels A → B → C
    // instead of retracing its steps.
    const exitX = new Float32Array(n);
    const exitY = new Float32Array(n);
    // Each cell's own gather delay, so the mark forms in a ripple rather
    // than every character arriving at the same instant.
    const delay = new Float32Array(n);
    for (let i = 0; i < n; i += 1) delay[i] = rand01(i, 1);

    let width = 0;
    let height = 0;
    let unit = 1; // px per viewBox unit
    let markCenterY = 0; // mark's centre, px from the section's top
    let color = "#fff";

    const measure = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const sectionRect = section.getBoundingClientRect();
      const markRect = mark.getBoundingClientRect();
      width = sectionRect.width;
      height = sectionRect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      unit = markRect.width / VIEWBOX_WIDTH;
      const originX = markRect.left - sectionRect.left;
      const originY = markRect.top - sectionRect.top;
      markCenterY = originY + markRect.height / 2;
      for (let i = 0; i < n; i += 1) {
        restX[i] = originX + CELLS[i].x * unit;
        restY[i] = originY + CELLS[i].y * unit;
        // Scatter anywhere across the whole section.
        scatterX[i] = rand01(i, 2) * (width - CELLS[i].w * unit);
        scatterY[i] = rand01(i, 3) * (height - unit);
        exitX[i] = rand01(i, 4) * (width - CELLS[i].w * unit);
        exitY[i] = rand01(i, 5) * (height - unit);
      }
      color = getComputedStyle(mark).color;
    };

    let strength = 1;
    let lastTime = 0;

    const draw = (now: number, still: boolean) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const viewportHeight = window.innerHeight;
      const top = section.getBoundingClientRect().top;
      const signed = top + markCenterY - viewportHeight / 2;
      const leaving = signed < 0; // mark is above the middle: on its way out
      const dist = Math.abs(signed) / viewportHeight;
      const target = still ? 0 : clamp01((dist - GATHER_INNER) / (GATHER_OUTER - GATHER_INNER));
      // Light smoothing only, just to take the jitter out of wheel ticks.
      strength = still ? 0 : strength + (target - strength) * Math.min(dt * 14, 1);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;

      const loop = (now * IDLE_LOOP_SPEED) % 1;
      const step = Math.floor(now / SCRAMBLE_STEP_MS);
      const t = now * 0.001;
      const cellHeight = unit * 0.86;

      for (let i = 0; i < n; i += 1) {
        const cell = CELLS[i];
        // This cell's own progress: 0 = home, 1 = fully scattered.
        const s = smootherstep(clamp01(strength / (1 - delay[i] * 0.35)));
        let x = restX[i];
        let y = restY[i];
        if (s > 0) {
          const toX = leaving ? exitX[i] : scatterX[i];
          const toY = leaving ? exitY[i] : scatterY[i];
          x += (toX - x) * s + Math.sin(t * (0.9 + (i % 7) * 0.08) + i) * unit * 0.6 * s;
          y += (toY - y) * s + Math.cos(t * (0.8 + (i % 5) * 0.09) + i * 1.7) * unit * 0.6 * s;
        }

        // Glyph: the idle shimmer, or (while scattered) some cells flicker
        // to density blocks.
        let widthFrac: number;
        let alpha = 1;
        if (s > 0.02 && rand01(i, step) < s * 0.65) {
          widthFrac = 1;
          alpha = SCRAMBLE_ALPHAS[hash(i, step + 7) & 3];
        } else {
          const scaled = ((cell.y / (VIEWBOX_HEIGHT - 1) - loop + 1) % 1) * (IDLE_EIGHTHS.length - 1);
          widthFrac = IDLE_EIGHTHS[Math.round(scaled)] / 8;
        }
        ctx.globalAlpha = alpha;
        ctx.fillRect(x, y, cell.w * unit * 0.9 * widthFrac, cellHeight);
      }
      ctx.globalAlpha = 1;
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let rafId = 0;
    let running = false;
    const frame = (now: number) => {
      draw(now, false);
      if (running) rafId = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running) return;
      running = true;
      lastTime = performance.now();
      rafId = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    measure();
    if (reducedMotion) draw(performance.now(), true);

    // Redraw on resize; only run the frame loop while the section is on
    // screen.
    const resizeObserver = new ResizeObserver(() => {
      measure();
      if (reducedMotion) draw(performance.now(), true);
    });
    resizeObserver.observe(section);
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        if (reducedMotion) return;
        if (entry.isIntersecting) start();
        else stop();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(section);

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, []);

  return (
    <div ref={markRef} className="ascii-logo" role="img" aria-label="hinside">
      <canvas ref={canvasRef} className="ascii-logo__canvas" aria-hidden="true" />

      <style>{`
        /* Reserves the mark's own rest-state box (its aspect ratio); the
           canvas is taken out of flow and fills the whole section instead
           (this element is deliberately not positioned, so the canvas
           resolves against the section). */
        .ascii-logo {
          width: 100%;
          aspect-ratio: ${VIEWBOX_WIDTH} / ${VIEWBOX_HEIGHT};
          color: var(--color-fg);
        }
        .ascii-logo__canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
