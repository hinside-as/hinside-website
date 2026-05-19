import { useEffect, useMemo, useRef, useState } from "react";

const VIEWBOX_WIDTH = 112;
const VIEWBOX_HEIGHT = 13;
const SCRAMBLE_INTERVAL_MS = 220;
const IDLE_LOOP_SPEED = 0.00048;
const SCRAMBLE_GLYPHS = "█▓▒░";
const IDLE_GRADIENT_GLYPHS = "▏▎▍▌▋▊▉█▉▊▋▌▍▎▏";

const SLATS = [
  { x: 101, y: 12, w: 11 }, { x: 101, y: 10, w: 4 }, { x: 101, y: 8, w: 4 }, { x: 101, y: 6, w: 8 },
  { x: 101, y: 4, w: 4 }, { x: 101, y: 2, w: 4 }, { x: 101, y: 0, w: 11 }, { x: 82, y: 12, w: 10 },
  { x: 90, y: 10, w: 4 }, { x: 82, y: 10, w: 4 }, { x: 92, y: 8, w: 4 }, { x: 82, y: 8, w: 4 },
  { x: 92, y: 6, w: 4 }, { x: 82, y: 6, w: 4 }, { x: 92, y: 4, w: 4 }, { x: 82, y: 4, w: 4 },
  { x: 90, y: 2, w: 4 }, { x: 82, y: 2, w: 4 }, { x: 82, y: 0, w: 10 }, { x: 68, y: 12, w: 8 },
  { x: 70, y: 10, w: 4 }, { x: 70, y: 8, w: 4 }, { x: 70, y: 6, w: 4 }, { x: 70, y: 4, w: 4 },
  { x: 70, y: 2, w: 4 }, { x: 68, y: 0, w: 8 }, { x: 52, y: 12, w: 8 }, { x: 58, y: 10, w: 4 },
  { x: 50, y: 10, w: 5 }, { x: 58, y: 8, w: 4 }, { x: 52, y: 6, w: 8 }, { x: 50, y: 4, w: 4 },
  { x: 58, y: 2, w: 4 }, { x: 50, y: 2, w: 4 }, { x: 52, y: 0, w: 8 }, { x: 40, y: 12, w: 4 },
  { x: 32, y: 12, w: 4 }, { x: 40, y: 10, w: 4 }, { x: 32, y: 10, w: 4 }, { x: 40, y: 8, w: 4 },
  { x: 32, y: 8, w: 4 }, { x: 38, y: 6, w: 6 }, { x: 32, y: 6, w: 4 }, { x: 32, y: 4, w: 12 },
  { x: 40, y: 2, w: 4 }, { x: 32, y: 2, w: 6 }, { x: 40, y: 0, w: 4 }, { x: 32, y: 0, w: 4 },
  { x: 18, y: 12, w: 8 }, { x: 20, y: 10, w: 4 }, { x: 20, y: 8, w: 4 }, { x: 20, y: 6, w: 4 },
  { x: 20, y: 4, w: 4 }, { x: 20, y: 2, w: 4 }, { x: 18, y: 0, w: 8 }, { x: 8, y: 12, w: 4 },
  { x: 0, y: 12, w: 4 }, { x: 8, y: 10, w: 4 }, { x: 0, y: 10, w: 4 }, { x: 8, y: 8, w: 4 },
  { x: 0, y: 8, w: 4 }, { x: 0, y: 6, w: 12 }, { x: 8, y: 4, w: 4 }, { x: 0, y: 4, w: 4 },
  { x: 8, y: 2, w: 4 }, { x: 0, y: 2, w: 4 }, { x: 8, y: 0, w: 4 }, { x: 0, y: 0, w: 4 }
];

export default function InteractiveLogo() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const textRefs = useRef<Array<SVGTextElement | null>>([]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const lastRenderedStripsRef = useRef<string[]>(Array(SLATS.length).fill(""));

  const asciiLengths = useMemo(
    () => SLATS.map((slat, index) => {
      const length = Math.max(2, Math.round(slat.w * 1.18));
      return length;
    }),
    []
  );

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
      if (row) {
        row.push(i);
      } else {
        groups.set(y, [i]);
      }
    }
    return [...groups.values()];
  }, []);

  useEffect(() => {
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
    const svg = svgRef.current;

    let rafId = 0;
    let lastTime = performance.now();
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;
    let scrambleStrength = 0;
    let lastScrambleAt = 0;
    let lastActiveState = false;
    let glyphCycle = 0;

    for (let i = 0; i < SLATS.length; i += 1) {
      const text = textRefs.current[i];
      if (text) {
        const initialStrip = getIdleStrip(i, 0);
        text.textContent = initialStrip;
        lastRenderedStripsRef.current[i] = initialStrip;
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!svg) {
        return;
      }
      const bounds = svg.getBoundingClientRect();
      const ratio = (event.clientX - bounds.left) / Math.max(bounds.width, 1);
      hover.x = ratio * VIEWBOX_WIDTH;
      hover.active = true;
    };

    const onPointerEnter = () => {
      hover.active = true;
      setIsActive(true);
    };

    const onPointerLeave = () => {
      hover.active = false;
    };

    if (svg) {
      svg.addEventListener("pointermove", onPointerMove);
      svg.addEventListener("pointerenter", onPointerEnter);
      svg.addEventListener("pointerleave", onPointerLeave);
    }

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      const scrollY = window.scrollY;
      const rawScrollVelocity = (scrollY - lastScrollY) / Math.max(dt, 0.001);
      lastScrollY = scrollY;
      scrollVelocity = scrollVelocity * 0.86 + rawScrollVelocity * 0.14;
      const scrollEnergy = Math.min(Math.abs(scrollVelocity) * 0.0025, 1.8);
      const activity = Math.max(hover.active ? 1 : 0, Math.min(scrollEnergy / 1.2, 1));
      scrambleStrength += (activity - scrambleStrength) * Math.min(dt * 5.5, 1);

      const isNowActive = scrambleStrength > 0.12;
      if (isNowActive !== lastActiveState) {
        lastActiveState = isNowActive;
        setIsActive(isNowActive);
      }

      const stage = stageRef.current;
      if (stage) {
        const bleed = isNowActive ? 12 + scrambleStrength * 140 : 0;
        const margin = bleed * -0.5;
        stage.style.width = "100%";
        stage.style.maxWidth = "100%";
        stage.style.marginLeft = `${margin.toFixed(2)}px`;
        stage.style.marginRight = `${margin.toFixed(2)}px`;
        stage.style.transform = isNowActive
          ? `translateX(${(Math.sin(now * 0.0012) * scrambleStrength * 4).toFixed(2)}px)`
          : "translateX(0px)";
      }

      if (now - lastScrambleAt > SCRAMBLE_INTERVAL_MS) {
        const range = 1.8 + 33 * scrambleStrength;
          const loopOffset = (now * IDLE_LOOP_SPEED) % 1;
        for (let i = 0; i < SLATS.length; i += 1) {
          scrambleTargets[i] = (Math.random() * 2 - 1) * range;

          const text = textRefs.current[i];
          if (!text) {
            continue;
          }

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
          if (!text) {
            continue;
          }
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
        const driftForce = Math.sin(t * freq[i] + phase[i]) * driftBase * (1 + scrollEnergy * 0.2 + scrambleStrength * 1.8);
        const scrambleForce = (scrambleTargets[i] - x) * (2.2 + 28 * scrambleStrength);
        const jitterForce = (Math.sin(t * (8 + (i % 5)) + phase[i] * 2.3) + Math.cos(t * (7 + (i % 3)) + phase[i]))
          * 0.35
          * scrambleStrength;

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
        const indices = [...rowGroups[rowIndex]].sort((a, b) => (SLATS[a].x + offsets[a]) - (SLATS[b].x + offsets[b]));

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
        if (text) {
          text.setAttribute("x", (slat.x + offsets[i]).toFixed(3));
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      if (svg) {
        svg.removeEventListener("pointermove", onPointerMove);
        svg.removeEventListener("pointerenter", onPointerEnter);
        svg.removeEventListener("pointerleave", onPointerLeave);
      }
    };
  }, [rowGroups]);

  return (
    <div className="interactive-logo-shell">
      <style>{".interactive-logo-shell{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000;padding-left:20px;padding-right:20px;overflow:visible;}.interactive-logo-stage{width:100%;max-width:100%;overflow:visible;transition:margin 240ms ease,transform 240ms ease;will-change:margin,transform;}.interactive-logo-text{fill:#fff;font-family:'IBM Plex Mono','Menlo','Consolas',monospace;font-size:1.04px;font-weight:700;letter-spacing:-0.05px;user-select:none;transition:opacity 180ms ease;}.interactive-logo-stage[data-active='true'] .interactive-logo-text{opacity:0.9;}@media (min-width: 1280px){.interactive-logo-shell{padding-left:96px;padding-right:96px;}}"}</style>
      <div
        ref={stageRef}
        className="interactive-logo-stage"
        data-active={isActive ? "true" : "false"}
        style={{ cursor: isActive ? "grabbing" : "crosshair" }}
      >
        <svg
          ref={svgRef}
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          shapeRendering="auto"
          style={{ display: "block", height: "auto", cursor: isActive ? "grabbing" : "crosshair", overflow: "visible" }}
          fill="none"
        >
          {SLATS.map((slat, index) => (
            <text
              key={`${slat.x}-${slat.y}-${slat.w}-${index}`}
              ref={(node: SVGTextElement | null) => {
                textRefs.current[index] = node;
              }}
              className="interactive-logo-text"
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
    </div>
  );
}