import { useEffect, useMemo, useRef, useState } from "react";
import { HINSIDE_MARK_SLATS as SLATS, VIEWBOX_WIDTH, VIEWBOX_HEIGHT } from "../lib/hinside-mark-geometry";

const SCRAMBLE_INTERVAL_MS = 220;
const IDLE_LOOP_SPEED = 0.00048;
const SCRAMBLE_GLYPHS = "█▓▒░";
const IDLE_GRADIENT_GLYPHS = "▏▎▍▌▋▊▉█▉▊▋▌▍▎▏";

/**
 * The homepage's ASCII-interactive rendering of the hinside wordmark,
 * ported from legacy/logo-hinside.tsx: each pixel-block "slat" of the
 * mark is an SVG <text> filled with a stretched ASCII glyph strip
 * (textLength/lengthAdjust makes a handful of characters span the
 * block's exact width), driven by a spring/damping physics simulation
 * that reacts to scroll velocity and pointer proximity, with a
 * row-collision pass so adjacent slats don't overlap.
 *
 * Distinct from BrandMark.astro, which renders the same geometry as a
 * plain static mark for the header/footer chrome — this piece is
 * deliberately reserved for the homepage body, since its "bleed" effect
 * (the mark growing beyond its own box under scroll/hover energy) needs
 * room that a shared header/footer row can't give it.
 */
export default function AsciiLogo() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const textRefs = useRef<Array<SVGTextElement | null>>([]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const lastRenderedStripsRef = useRef<string[]>(Array(SLATS.length).fill(""));

  const asciiLengths = useMemo(() => SLATS.map((slat) => Math.max(2, Math.round(slat.w * 1.18))), []);

  const getIdleStrip = (index: number, loopOffset: number) => {
    const slat = SLATS[index];
    const stripLength = asciiLengths[index];
    const normalizedRow = slat.y / Math.max(VIEWBOX_HEIGHT - 1, 1);
    const scaled = ((normalizedRow - loopOffset + 1) % 1) * (IDLE_GRADIENT_GLYPHS.length - 1);
    const glyphIndex = Math.max(0, Math.min(IDLE_GRADIENT_GLYPHS.length - 1, Math.round(scaled)));
    return IDLE_GRADIENT_GLYPHS[glyphIndex].repeat(stripLength);
  };

  const rowGroups = useMemo(() => {
    const groups = new Map<number, number[]>();
    for (let i = 0; i < SLATS.length; i += 1) {
      const y = SLATS[i].y;
      const row = groups.get(y);
      if (row) row.push(i);
      else groups.set(y, [i]);
    }
    return [...groups.values()];
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    const stage = stageRef.current;
    if (!svg || !stage) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Static idle state only — the JSX's default children already render
      // getIdleStrip(index, 0) with x={slat.x}, so there's nothing to do.
      return;
    }

    const offsets = new Float32Array(SLATS.length);
    const velocities = new Float32Array(SLATS.length);
    const phase = new Float32Array(SLATS.length);
    const freq = new Float32Array(SLATS.length);
    const scrambleTargets = new Float32Array(SLATS.length);

    for (let i = 0; i < SLATS.length; i += 1) {
      phase[i] = i * 0.41;
      freq[i] = 0.9 + (i % 7) * 0.08;
    }

    const hover = { active: false, x: VIEWBOX_WIDTH * 0.5 };

    let rafId = 0;
    let isRunning = false;
    let lastTime = performance.now();
    let scrambleStrength = 0;
    let lastScrambleAt = 0;
    let lastActiveState = false;
    let glyphCycle = 0;

    const onPointerMove = (event: PointerEvent) => {
      const bounds = svg.getBoundingClientRect();
      const ratio = (event.clientX - bounds.left) / Math.max(bounds.width, 1);
      hover.x = ratio * VIEWBOX_WIDTH;
      hover.active = true;
    };
    const onPointerEnter = () => {
      hover.active = true;
    };
    const onPointerLeave = () => {
      hover.active = false;
    };

    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerenter", onPointerEnter);
    svg.addEventListener("pointerleave", onPointerLeave);

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      // Signal-to-noise: legible when the mark is the visual focus of the
      // viewport (centered), scrambled when it's arriving/leaving at the
      // top or bottom edge — a scroll-*position* read, not scroll speed.
      // 1 = perfectly centered, 0 = its center coincides with either edge.
      const rect = svg.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const elementCenter = rect.top + rect.height / 2;
      const focus = Math.max(0, 1 - Math.abs(elementCenter - viewportCenter) / viewportCenter);
      const activity = Math.max(hover.active ? 1 : 0, 1 - focus);
      scrambleStrength += (activity - scrambleStrength) * Math.min(dt * 5.5, 1);

      const isNowActive = scrambleStrength > 0.12;
      if (isNowActive !== lastActiveState) {
        lastActiveState = isNowActive;
        setIsActive(isNowActive);
      }

      // Both of these are continuous functions of scrambleStrength itself —
      // no gating on isNowActive — so they ease down smoothly as strength
      // decays instead of hard-cutting to 0 the instant it crosses the
      // 0.12 threshold, which read as a rough snap.
      const bleed = scrambleStrength * 140;
      // Symmetric growth needs width + a half-bleed shift, not equal
      // negative margins on both sides: in normal block flow (this section
      // isn't a flex row), margin-left moves the box itself while
      // margin-right only affects spacing after it — so marginLeft ===
      // marginRight only ever bled the mark to the left, never evenly.
      stage.style.width = `calc(100% + ${bleed.toFixed(2)}px)`;
      stage.style.marginLeft = `${(-bleed / 2).toFixed(2)}px`;
      stage.style.transform = `translateX(${(Math.sin(now * 0.0012) * scrambleStrength * 4).toFixed(2)}px)`;

      if (now - lastScrambleAt > SCRAMBLE_INTERVAL_MS) {
        // No constant floor here: at scrambleStrength 0 this must reach
        // exactly 0 too, or every slat keeps chasing a fresh random target
        // forever even at rest — the glyph text correctly freezes into its
        // readable idle form, but the position never actually stops being
        // perturbed, so it looks like it's permanently trying (and failing)
        // to settle.
        const range = 33 * scrambleStrength;
        const loopOffset = (now * IDLE_LOOP_SPEED) % 1;
        for (let i = 0; i < SLATS.length; i += 1) {
          scrambleTargets[i] = (Math.random() * 2 - 1) * range;

          const text = textRefs.current[i];
          if (!text) continue;

          if (scrambleStrength < 0.08) {
            const idleStrip = getIdleStrip(i, loopOffset);
            if (idleStrip !== lastRenderedStripsRef.current[i]) {
              text.textContent = idleStrip;
              lastRenderedStripsRef.current[i] = idleStrip;
            }
            continue;
          }

          const base = getIdleStrip(i, loopOffset);
          const chars = base.split("");
          const mutateCount = Math.max(1, Math.round(chars.length * Math.min(scrambleStrength * 0.9, 0.65)));
          for (let m = 0; m < mutateCount; m += 1) {
            const pick = (glyphCycle + m * 7 + i * 3) % chars.length;
            const glyphIndex = (glyphCycle * 5 + i * 11 + m * 13) % SCRAMBLE_GLYPHS.length;
            chars[pick] = SCRAMBLE_GLYPHS[glyphIndex];
          }
          const scrambledStrip = chars.join("");
          if (scrambledStrip !== lastRenderedStripsRef.current[i]) {
            text.textContent = scrambledStrip;
            lastRenderedStripsRef.current[i] = scrambledStrip;
          }
        }
        glyphCycle += 1;
        lastScrambleAt = now;
      }

      if (scrambleStrength < 0.08) {
        const loopOffset = (now * IDLE_LOOP_SPEED) % 1;
        for (let i = 0; i < SLATS.length; i += 1) {
          const text = textRefs.current[i];
          if (!text) continue;
          const idleStrip = getIdleStrip(i, loopOffset);
          if (idleStrip !== lastRenderedStripsRef.current[i]) {
            text.textContent = idleStrip;
            lastRenderedStripsRef.current[i] = idleStrip;
          }
        }
      }

      for (let i = 0; i < SLATS.length; i += 1) {
        const slat = SLATS[i];
        const x = offsets[i];
        const v = velocities[i];
        const t = now * 0.001;
        const driftBase = 0.12 + (slat.y % 4) * 0.024;
        const driftForce = Math.sin(t * freq[i] + phase[i]) * driftBase * (1 + scrambleStrength * 1.8);
        const scrambleForce = (scrambleTargets[i] - x) * (2.2 + 28 * scrambleStrength);
        const jitterForce =
          (Math.sin(t * (8 + (i % 5)) + phase[i] * 2.3) + Math.cos(t * (7 + (i % 3)) + phase[i])) *
          0.35 *
          scrambleStrength;

        let hoverForce = 0;
        if (hover.active) {
          const dx = slat.x + x + slat.w * 0.5 - hover.x;
          const sigma = 9;
          const influence = Math.exp(-(dx * dx) / (2 * sigma * sigma));
          const direction = dx >= 0 ? 1 : -1;
          hoverForce = direction * influence * (16 + 20 * scrambleStrength);
        }

        const spring = -(14 - 5 * scrambleStrength) * x;
        const damping = -(7.8 - 2 * scrambleStrength) * v;
        const a = spring + damping + driftForce + hoverForce + scrambleForce + jitterForce;

        velocities[i] = v + a * dt;
        offsets[i] = x + velocities[i] * dt;
      }

      for (let rowIndex = 0; rowIndex < rowGroups.length; rowIndex += 1) {
        const indices = [...rowGroups[rowIndex]].sort(
          (a, b) => SLATS[a].x + offsets[a] - (SLATS[b].x + offsets[b]),
        );

        for (let i = 0; i < indices.length - 1; i += 1) {
          const leftIndex = indices[i];
          const rightIndex = indices[i + 1];
          const left = SLATS[leftIndex].x + offsets[leftIndex];
          const right = SLATS[rightIndex].x + offsets[rightIndex];
          const minimumGap = 0.35 + scrambleStrength * 0.65;
          const overlap = left + SLATS[leftIndex].w + minimumGap - right;

          if (overlap > 0) {
            const correction = overlap * 0.5;
            offsets[leftIndex] -= correction;
            offsets[rightIndex] += correction;

            const restitution = 0.68 + 0.14 * scrambleStrength;
            const lv = velocities[leftIndex];
            const rv = velocities[rightIndex];
            const relative = lv - rv;
            const impulse = relative * restitution;

            velocities[leftIndex] -= impulse * 0.5;
            velocities[rightIndex] += impulse * 0.5;
          }
        }
      }

      for (let i = 0; i < SLATS.length; i += 1) {
        const slat = SLATS[i];
        const text = textRefs.current[i];
        if (text) text.setAttribute("x", (slat.x + offsets[i]).toFixed(3));
      }

      if (isRunning) rafId = window.requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (isRunning) return;
      isRunning = true;
      lastTime = performance.now();
      rafId = window.requestAnimationFrame(tick);
    };
    const stopLoop = () => {
      isRunning = false;
      if (rafId) window.cancelAnimationFrame(rafId);
    };

    // Only spend the per-frame physics cost while the mark is actually
    // on screen — otherwise it'd keep animating invisibly forever on any
    // page load, since the idle drift term never settles to exactly zero.
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) startLoop();
        else stopLoop();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(svg);

    return () => {
      stopLoop();
      intersectionObserver.disconnect();
      svg.removeEventListener("pointermove", onPointerMove);
      svg.removeEventListener("pointerenter", onPointerEnter);
      svg.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [rowGroups]);

  return (
    <div className="ascii-logo" role="img" aria-label="hinside">
      <div ref={stageRef} className="ascii-logo__stage" data-active={isActive ? "true" : "false"}>
        <svg
          ref={svgRef}
          className="ascii-logo__svg"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          fill="none"
          aria-hidden="true"
        >
          {SLATS.map((slat, index) => (
            <text
              key={`${slat.x}-${slat.y}-${slat.w}-${index}`}
              ref={(node: SVGTextElement | null) => {
                textRefs.current[index] = node;
              }}
              className="ascii-logo__text"
              x={slat.x}
              y={slat.y + 0.84}
              textLength={slat.w}
              lengthAdjust="spacingAndGlyphs"
            >
              {getIdleStrip(index, 0)}
            </text>
          ))}
        </svg>
      </div>

      <style>{`
        .ascii-logo {
          position: relative;
          width: 100%;
          /* Reserves stable height matching the mark's own rest-state
             aspect ratio, since .ascii-logo__stage below is taken out of
             normal flow and no longer contributes any height of its own. */
          aspect-ratio: ${VIEWBOX_WIDTH} / ${VIEWBOX_HEIGHT};
          overflow: visible;
        }
        .ascii-logo__stage {
          /* Absolutely positioned so growing wider/taller during
             interaction (the bleed effect) is purely visual overlay —
             without this, the SVG's height growing with its width (it
             keeps its aspect ratio) pushed the section below it down the
             page in real time while hovering. */
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          overflow: visible;
          /* No CSS transition here: width, margin-left and transform are
             all driven every frame straight from scrambleStrength, which
             already eases smoothly on its own. A CSS transition on top of
             that only added a second, differently-timed smoothing layer —
             and since only margin/transform were listed (not width), that
             mismatch was exactly why the mark drifted off-center and
             "snapped" during settle instead of shrinking back in place. */
          will-change: margin, transform;
        }
        .ascii-logo__svg {
          display: block;
          width: 100%;
          height: auto;
          overflow: visible;
          cursor: crosshair;
        }
        .ascii-logo__text {
          fill: var(--color-fg);
          /* Deliberately --font-body, not --font-display: this is the
             studio's ASCII/mono identity mark, not a heading, and its
             physics-driven pixel positioning was tuned against JetBrains
             Mono's metrics — swapping in the display serif here would be
             a metrics change hiding as a brand-mark change. */
          font-family: var(--font-body);
          font-size: 1.04px;
          font-weight: var(--weight-bold);
          letter-spacing: -0.05px;
          user-select: none;
          transition: opacity var(--duration-fast) var(--ease-standard);
        }
        .ascii-logo__stage[data-active="true"] .ascii-logo__text {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
