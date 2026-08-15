import { useRef } from "react";
import {
  EYE_CURSOR_FRAMES,
  BLINK_SEQUENCE_SINGLE,
  BLINK_SEQUENCE_DOUBLE,
  BLINK_TIMINGS_MS,
  BLINK_DOUBLE_PROBABILITY,
  BLINK_NEXT_DELAY_MIN_MS,
  BLINK_NEXT_DELAY_RANGE_MS,
} from "./cursor-frames";

/**
 * Wraps an image with the hinside "eye" cursor: a small sprite that tracks
 * the pointer and blinks idly, plus a glint overlay that follows it. Used
 * anywhere an image behaves like a photo/artwork to look closer at, as
 * opposed to a plain link or a small glyph.
 */
export default function EyeCursorItem({
  children,
  isCarouselDragging,
  disabled = false,
  bare = false,
  radius = "0px",
}: {
  children: React.ReactNode;
  isCarouselDragging: () => boolean;
  /** Set true under prefers-reduced-motion to stop the idle blink loop. */
  disabled?: boolean;
  /** True for the Grieg Connect gallery items: transparent shell, no
   * elevation shadow — only the homepage portfolio cards get the raised
   * card treatment. */
  bare?: boolean;
  /** Corner rounding of the shell itself, e.g. "50%" for portraits. */
  radius?: string;
}) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const blinkTimerRef = useRef<number | null>(null);
  const positionRafRef = useRef<number | null>(null);
  const currentFrameRef = useRef(0);
  const pointerXRef = useRef(0);
  const pointerYRef = useRef(0);
  const isHoveringRef = useRef(false);
  const isImageHoveringRef = useRef(false);

  const isEyeCursorEnabled = (): boolean => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(max-width: 720px), (hover: none), (pointer: coarse)").matches;
  };

  const syncCursorPositionFromPointer = () => {
    const cursor = cursorRef.current;
    const shell = shellRef.current;
    if (!cursor || !shell) return;

    const shellBounds = shell.getBoundingClientRect();
    const relativeX = pointerXRef.current - shellBounds.left;
    const relativeY = pointerYRef.current - shellBounds.top;
    const frame = EYE_CURSOR_FRAMES[currentFrameRef.current] ?? EYE_CURSOR_FRAMES[0];

    // transform, not left/top: this runs every rAF tick while the pointer
    // moves, and left/top would force a layout reflow each frame on an
    // element that also has backdrop-filter (below) — that combination is
    // a known cause of visible flicker as the browser fights to keep the
    // filtered backdrop in sync with a reflowing element. translate3d is
    // compositor-only, so the same tracking never touches layout.
    cursor.style.transform = `translate3d(${relativeX - frame.hotX}px, ${relativeY - frame.hotY}px, 0)`;
    shell.style.setProperty("--glint-x", `${relativeX}px`);
    shell.style.setProperty("--glint-y", `${relativeY}px`);
  };

  const applyCursorFrame = (frameIndex: number) => {
    const cursor = cursorRef.current;
    const frame = EYE_CURSOR_FRAMES[frameIndex];
    if (!cursor || !frame) return;
    currentFrameRef.current = frameIndex;
    cursor.style.width = `${frame.width}px`;
    cursor.style.height = `${frame.height}px`;
    cursor.style.backgroundImage = `url("${frame.src}")`;
    // Masks the element to the same artwork used as its background — the
    // eye glyph only fills part of its own bounding box (more so on the
    // thin blink frames), and without this, backdrop-filter/mix-blend-mode
    // below apply to that whole rectangle rather than just the visible
    // shape, showing up as a grayscale/inverted block around the eye
    // instead of hugging its outline.
    cursor.style.maskImage = `url("${frame.src}")`;
    cursor.style.setProperty("-webkit-mask-image", `url("${frame.src}")`);
    if (isImageHoveringRef.current) syncCursorPositionFromPointer();
  };

  const stopBlink = () => {
    if (blinkTimerRef.current !== null) {
      window.clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = null;
    }
  };

  const stopCursorTracking = () => {
    if (positionRafRef.current !== null) {
      window.cancelAnimationFrame(positionRafRef.current);
      positionRafRef.current = null;
    }
  };

  const startBlink = () => {
    if (disabled) return;
    stopBlink();
    const sequence = Math.random() < BLINK_DOUBLE_PROBABILITY ? BLINK_SEQUENCE_DOUBLE : BLINK_SEQUENCE_SINGLE;

    const step = (index: number) => {
      if (!isHoveringRef.current || isCarouselDragging()) return;
      applyCursorFrame(sequence[index]);
      if (index < sequence.length - 1) {
        blinkTimerRef.current = window.setTimeout(
          () => step(index + 1),
          BLINK_TIMINGS_MS[index + 1] - BLINK_TIMINGS_MS[index],
        );
      } else {
        const nextDelay = BLINK_NEXT_DELAY_MIN_MS + Math.random() * BLINK_NEXT_DELAY_RANGE_MS;
        blinkTimerRef.current = window.setTimeout(() => {
          if (isHoveringRef.current && !isCarouselDragging()) startBlink();
        }, nextDelay);
      }
    };
    step(0);
  };

  const startCursorTracking = () => {
    stopCursorTracking();
    const tick = () => {
      if (!isHoveringRef.current || isCarouselDragging()) {
        isImageHoveringRef.current = false;
        positionRafRef.current = null;
        return;
      }
      if (isImageHoveringRef.current) syncCursorPositionFromPointer();
      positionRafRef.current = window.requestAnimationFrame(tick);
    };
    positionRafRef.current = window.requestAnimationFrame(tick);
  };

  return (
    <div
      className="eye-cursor-item"
      onPointerEnter={() => {
        isHoveringRef.current = true;
      }}
      onPointerLeave={() => {
        isHoveringRef.current = false;
        stopBlink();
        stopCursorTracking();
        isImageHoveringRef.current = false;
      }}
    >
      <div
        ref={shellRef}
        className={`eye-cursor-item__shell${bare ? " eye-cursor-item__shell--bare" : ""}`}
        style={{ borderRadius: radius }}
        onPointerEnter={(event) => {
          if (!isEyeCursorEnabled() || isCarouselDragging() || event.pointerType !== "mouse") return;
          isImageHoveringRef.current = true;
          pointerXRef.current = event.clientX;
          pointerYRef.current = event.clientY;
          applyCursorFrame(0);
          syncCursorPositionFromPointer();
          startBlink();
          startCursorTracking();
        }}
        onPointerMove={(event) => {
          if (!isEyeCursorEnabled() || isCarouselDragging() || event.pointerType !== "mouse") return;
          pointerXRef.current = event.clientX;
          pointerYRef.current = event.clientY;
          syncCursorPositionFromPointer();
        }}
        onPointerLeave={() => {
          isImageHoveringRef.current = false;
          stopBlink();
          stopCursorTracking();
        }}
      >
        {children}
      </div>
      <span aria-hidden="true" className="eye-cursor-item__cursor" ref={cursorRef} />

      <style>{`
        .eye-cursor-item {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .eye-cursor-item__shell {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          --glint-x: 50%;
          --glint-y: 30%;
          background: var(--color-bg-raised);
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.28);
          transition: box-shadow var(--duration-slow) var(--ease-standard);
          cursor: none;
        }
        .eye-cursor-item__shell::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(120% 96% at var(--glint-x) var(--glint-y),
              rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 32%,
              rgba(255, 255, 255, 0.015) 52%, rgba(255, 255, 255, 0) 74%),
            radial-gradient(170% 120% at 50% 8%,
              rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 34%, rgba(255, 255, 255, 0) 72%);
          opacity: 0;
          transition: opacity var(--duration-slow) var(--ease-standard);
        }
        .eye-cursor-item__shell:hover,
        .eye-cursor-item__shell:focus-visible {
          box-shadow: 0 22px 40px rgba(0, 0, 0, 0.38);
        }
        .eye-cursor-item__shell--bare,
        .eye-cursor-item__shell--bare:hover,
        .eye-cursor-item__shell--bare:focus-visible {
          background: transparent;
          box-shadow: none;
          transition: none;
        }
        .eye-cursor-item__shell:hover::after,
        .eye-cursor-item__shell:focus-visible::after {
          opacity: 0.5;
        }
        .eye-cursor-item__cursor {
          /* Its size, sprite frame, and position are only ever set by the
             mouse-pointer JS above (onPointerEnter/onPointerMove) — there's
             no keyboard equivalent, so a stray :focus-visible rule that
             also revealed this used to show whatever frame/position a
             *previous* mouse hover had last left behind (sometimes a
             mid-blink frame, i.e. a flat eyelid line) frozen in the wrong
             spot the moment Tab landed on an item, with nothing to update
             it since focus never runs the tracking loop. Visibility here is
             mouse-hover-only for that reason; :focus-visible still gets its
             own real feedback via the shell's box-shadow/glint rules below.
          */
          position: absolute;
          left: 0;
          top: 0;
          will-change: transform;
          z-index: 3;
          pointer-events: none;
          display: block;
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
          mask-repeat: no-repeat;
          mask-position: center;
          mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position: center;
          -webkit-mask-size: contain;
          opacity: 0;
          /* The sprite itself is solid white on transparent (see
             cursor-frames.ts) — difference blending against whatever's
             underneath means it self-inverts to black over light areas
             and stays white over dark ones, so it never needs its own
             light/dark variant and never disappears against a
             light-colored image the way a plain white icon would.

             difference is a per-channel operation, though: against a
             colored backdrop (not just grayscale) it doesn't invert to
             black/white, it inverts to that color's complement — a blue
             area turned the cursor orange rather than gray. backdrop-
             filter: grayscale(1) desaturates only the small patch directly
             behind the cursor's own box *before* the blend runs, so
             difference only ever has R=G=B values to invert against,
             which always stays achromatic regardless of what's underneath
             — without touching the actual image's own color anywhere
             outside the cursor's tiny footprint. */
          backdrop-filter: grayscale(1);
          -webkit-backdrop-filter: grayscale(1);
          mix-blend-mode: difference;
          transition: opacity 120ms var(--ease-standard);
        }
        .eye-cursor-item__shell:hover ~ .eye-cursor-item__cursor {
          opacity: 1;
        }

        @media (max-width: 720px), (hover: none), (pointer: coarse) {
          .eye-cursor-item__cursor {
            display: none !important;
          }
          .eye-cursor-item__shell {
            cursor: auto;
          }
        }
      `}</style>
    </div>
  );
}
