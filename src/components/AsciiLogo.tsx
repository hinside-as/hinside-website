import { useEffect, useMemo, useRef, useState } from "react";
import { HINSIDE_MARK_SLATS as SLATS, VIEWBOX_WIDTH, VIEWBOX_HEIGHT } from "../lib/hinside-mark-geometry";

const SCRAMBLE_INTERVAL_MS = 220;
const IDLE_LOOP_SPEED = 0.00048;
const SCRAMBLE_GLYPHS = "█▓▒░";
const IDLE_GRADIENT_GLYPHS = "▏▎▍▌▋▊▉█▉▊▋▌▍▎▏";
// Extra viewBox-unit gap added between adjacent rows at full scramble
// (scaled by scrambleStrength, see rowCenterFactor below) — 0 when
// gathered, so the legible idle mark keeps its original, tightly packed
// row spacing.
const ROW_SPREAD_MAX = 3.5;

/**
 * The homepage's ASCII-interactive rendering of the hinside wordmark,
 * ported from legacy/logo-hinside.tsx: each pixel-block "slat" of the
 * mark is an SVG <text> filled with a stretched ASCII glyph strip
 * (textLength/lengthAdjust makes a handful of characters span the
 * block's exact width), driven by a spring/damping physics simulation
 * with a row-collision pass so adjacent slats don't overlap.
 *
 * Scrambled by default; gathers into its legible idle form only once the
 * pointer comes near the center of the page (a page-level read, not
 * scroll position and not hover over the mark itself — see pagePointer in
 * the effect below). Touch devices have no pointer to read, so instead
 * get a one-time, fixed-duration reveal from scrambled to gathered each
 * time the mark scrolls into view (MOBILE_GATHER_MS).
 *
 * Distinct from BrandMark.astro, which renders the same geometry as a
 * plain static mark for the header/footer chrome — this piece is
 * deliberately reserved for the homepage body, which gives it the room to
 * fill most of its slide's width.
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

  // Per-slat distance (in row steps) from the mark's own vertical center
  // row — 0 for a center row, ±1 for its immediate neighbors, and so on.
  // Multiplying this by a scramble-driven spread (see ROW_SPREAD_MAX)
  // pushes rows apart symmetrically from the middle rather than shifting
  // the whole mark up or down.
  const rowCenterFactor = useMemo(() => {
    const rowYValues = [...new Set(SLATS.map((slat) => slat.y))].sort((a, b) => a - b);
    const rowIndexByY = new Map(rowYValues.map((y, index) => [y, index]));
    const center = (rowYValues.length - 1) / 2;
    const factor = new Float32Array(SLATS.length);
    for (let i = 0; i < SLATS.length; i += 1) {
      factor[i] = (rowIndexByY.get(SLATS[i].y) ?? 0) - center;
    }
    return factor;
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

    const hover = { active: false, y: VIEWBOX_HEIGHT * 0.5 };

    let rafId = 0;
    let isRunning = false;
    let lastTime = performance.now();
    let scrambleStrength = 0;
    let lastScrambleAt = 0;
    let lastActiveState = false;
    let glyphCycle = 0;

    // Gather signal is page-level mouse proximity to the viewport's own
    // vertical center, not proximity/hover over the mark itself —
    // deliberately page-wide (a window listener, not one scoped to `svg`)
    // since the ask is "gather when the mouse is near the center of the
    // page," a different, coarser input than the existing per-slat `hover`
    // above (which still separately drives the fine-grained lean-toward-
    // cursor attraction physics only while the pointer is actually over
    // the mark). Vertical-only on purpose: horizontal cursor position
    // shouldn't move the needle on scattered vs. gathered at all, only how
    // close the pointer is to the page's own vertical middle. No pointer
    // on the page (touch devices, or before the first pointermove) reads
    // as maximally scrambled, not gathered.
    const pagePointer = { y: 0, active: false };
    const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    // Fraction of the viewport's own height treated as "near the vertical
    // center" — a deliberate band, not the whole screen, so the gather
    // reads as a distinct zone rather than fading in from every edge.
    const GATHER_RADIUS_FACTOR = 0.32;
    const MOBILE_GATHER_MS = 2000;
    let mobileRevealStartedAt = 0;

    const onPagePointerMove = (event: PointerEvent) => {
      pagePointer.y = event.clientY;
      pagePointer.active = true;
    };
    const onPointerMove = (event: PointerEvent) => {
      const bounds = svg.getBoundingClientRect();
      // Vertical only, by design — see the hoverForce comment below for why
      // horizontal cursor position no longer feeds this at all.
      const ratio = (event.clientY - bounds.top) / Math.max(bounds.height, 1);
      hover.y = ratio * VIEWBOX_HEIGHT;
      hover.active = true;
    };
    const onPointerEnter = () => {
      hover.active = true;
    };
    const onPointerLeave = () => {
      hover.active = false;
    };

    if (!isTouchDevice) window.addEventListener("pointermove", onPagePointerMove, { passive: true });
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerenter", onPointerEnter);
    svg.addEventListener("pointerleave", onPointerLeave);

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      // Signal-to-noise: scrambled by default, gathering into legible form
      // only once the mouse comes near the page's own center — a page-
      // level pointer-position read (see pagePointer above), not scroll
      // position and not hover over the mark itself. activity is scramble
      // *target*: 1 (fully scrambled) far from center or with no pointer
      // at all, easing toward 0 (gathered) as the pointer nears the middle
      // of the viewport.
      let activity: number;
      if (isTouchDevice) {
        // No pointer to read on touch — a one-time, fixed-duration reveal
        // instead: fully scrambled the instant this slide becomes visible
        // (mobileRevealStartedAt is (re)armed by the IntersectionObserver
        // below each time it re-enters view), easing to fully gathered
        // over MOBILE_GATHER_MS, then holding there.
        const elapsed = now - mobileRevealStartedAt;
        activity = 1 - Math.min(Math.max(elapsed / MOBILE_GATHER_MS, 0), 1);
      } else {
        const radius = Math.min(window.innerWidth, window.innerHeight) * GATHER_RADIUS_FACTOR;
        const dist = Math.abs(pagePointer.y - window.innerHeight / 2);
        const centerProximity = pagePointer.active ? Math.max(0, 1 - dist / radius) : 0;
        activity = 1 - centerProximity;
      }
      scrambleStrength += (activity - scrambleStrength) * Math.min(dt * 5.5, 1);

      const isNowActive = scrambleStrength > 0.12;
      if (isNowActive !== lastActiveState) {
        lastActiveState = isNowActive;
        setIsActive(isNowActive);
      }

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

        // Cursor Y only (which row it's near), never cursor X — a slat
        // still only ever moves along its own horizontal axis (it's a
        // single-row-tall horizontal bar, see hinside-mark-geometry.ts),
        // so "direction" can't come from cursor X anymore; it's now the
        // slat's own fixed side of center, giving a symmetric part-down-
        // the-middle ripple on whichever row(s) the cursor's height
        // currently lines up with, regardless of how far left/right the
        // pointer actually is.
        let hoverForce = 0;
        if (hover.active) {
          const dy = slat.y - hover.y;
          const sigma = 2;
          const influence = Math.exp(-(dy * dy) / (2 * sigma * sigma));
          const direction = slat.x + slat.w * 0.5 < VIEWBOX_WIDTH * 0.5 ? -1 : 1;
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

      // Rows push apart from the mark's own vertical center as it
      // scrambles — 0 extra spacing when fully gathered (idle rows sit
      // exactly at their authored y), growing to ROW_SPREAD_MAX extra
      // viewBox units between adjacent rows at full scramble.
      const rowSpread = scrambleStrength * ROW_SPREAD_MAX;
      for (let i = 0; i < SLATS.length; i += 1) {
        const slat = SLATS[i];
        const text = textRefs.current[i];
        if (!text) continue;
        text.setAttribute("x", (slat.x + offsets[i]).toFixed(3));
        text.setAttribute("y", (slat.y + rowCenterFactor[i] * rowSpread + 0.84).toFixed(3));
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
        if (entry.isIntersecting) {
          // Re-arms the mobile timed reveal each time this slide comes
          // back into view, rather than only once per page load — so
          // scrolling away and back re-plays the scrambled->gathered
          // moment instead of leaving it permanently settled after the
          // first visit.
          mobileRevealStartedAt = performance.now();
          startLoop();
        } else {
          stopLoop();
        }
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(svg);

    return () => {
      stopLoop();
      intersectionObserver.disconnect();
      if (!isTouchDevice) window.removeEventListener("pointermove", onPagePointerMove);
      svg.removeEventListener("pointermove", onPointerMove);
      svg.removeEventListener("pointerenter", onPointerEnter);
      svg.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [rowGroups, rowCenterFactor]);

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
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          overflow: visible;
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
