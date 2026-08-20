import { useEffect, useMemo, useRef } from "react";
import { useDragCarousel } from "../../hooks/useDragCarousel";
import { ARROW_FRAMES, ARROW_REMINDER_SEQUENCE, ARROW_REMINDER_TIMINGS_MS } from "./arrow-frames";

export type LogoCarouselItem = {
  src: string;
  alt: string;
  href: string;
  height: number;
};

// Multiplies every logo's own calibrated height (see clients.ts) uniformly,
// rather than editing those per-logo values directly — keeps each mark's
// relative proportion to the others intact while scaling the whole
// carousel up.
const LOGO_SCALE = 1.3;

const ARROW_REMINDER_INITIAL_DELAY_MS = 380;
const ARROW_REMINDER_NEXT_DELAY_MIN_MS = 5200;
const ARROW_REMINDER_NEXT_DELAY_RANGE_MS = 2600;

export default function LogoCarousel({ items }: { items: LogoCarouselItem[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const loopItems = useMemo(() => [...items, ...items], [items]);
  // Matches PortfolioCarousel's own speeds exactly (see that component) —
  // every carousel on the site shares useDragCarousel's physics engine
  // already, and now the same base/hover speeds too, so they feel the
  // same drifting past and the same easing down on hover instead of each
  // having its own hand-tuned pace.
  const { trackRef, isGrabbing, onMouseEnter, onMouseLeave, onClickCapture } = useDragCarousel({
    baseSpeed: 42,
    hoverSpeed: 9,
  });

  // Single viewport-level "growing arrow" cursor that tracks the pointer
  // and plays a brief reminder animation on entering a logo link — mirrors
  // the original's shared-cursor approach rather than a per-item cursor.
  useEffect(() => {
    const viewport = viewportRef.current;
    const cursor = cursorRef.current;
    if (!viewport || !cursor) return;

    const canUseCustomCursor = () =>
      window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 769px)").matches;

    let frameIndex = 0;
    let isHoveringLink = false;
    let isDragging = false;
    let pointerX = 0;
    let pointerY = 0;
    let reminderTimer: number | null = null;

    const clearReminderTimer = () => {
      if (reminderTimer !== null) {
        window.clearTimeout(reminderTimer);
        reminderTimer = null;
      }
    };

    const setFrame = (index: number) => {
      const frame = ARROW_FRAMES[index] ?? ARROW_FRAMES[0];
      frameIndex = index;
      cursor.style.width = `${frame.width}px`;
      cursor.style.height = `${frame.height}px`;
      cursor.style.backgroundImage = `url("${frame.src}")`;
      // Same treatment as EyeCursorItem's own cursor sprite (see that
      // component): masking to the same artwork used as the background
      // keeps mix-blend-mode/backdrop-filter below confined to the arrow's
      // actual silhouette instead of its whole (mostly-transparent)
      // bounding box.
      cursor.style.maskImage = `url("${frame.src}")`;
      cursor.style.setProperty("-webkit-mask-image", `url("${frame.src}")`);
    };

    const syncPosition = () => {
      const frame = ARROW_FRAMES[frameIndex] ?? ARROW_FRAMES[0];
      const bounds = viewport.getBoundingClientRect();
      cursor.style.left = `${pointerX - bounds.left - frame.hotX}px`;
      cursor.style.top = `${pointerY - bounds.top - frame.hotY}px`;
    };

    const stopReminder = () => {
      clearReminderTimer();
      setFrame(0);
      cursor.style.opacity = "0";
    };

    const startReminder = () => {
      clearReminderTimer();
      const step = (index: number) => {
        if (!isHoveringLink || isDragging || !canUseCustomCursor()) return;
        setFrame(ARROW_REMINDER_SEQUENCE[index]);
        syncPosition();
        if (index < ARROW_REMINDER_SEQUENCE.length - 1) {
          const delay = ARROW_REMINDER_TIMINGS_MS[index + 1] - ARROW_REMINDER_TIMINGS_MS[index];
          reminderTimer = window.setTimeout(() => step(index + 1), delay);
          return;
        }
        setFrame(0);
        syncPosition();
        const nextDelay = ARROW_REMINDER_NEXT_DELAY_MIN_MS + Math.random() * ARROW_REMINDER_NEXT_DELAY_RANGE_MS;
        reminderTimer = window.setTimeout(() => {
          if (isHoveringLink && !isDragging && canUseCustomCursor()) startReminder();
        }, nextDelay);
      };
      setFrame(0);
      syncPosition();
      reminderTimer = window.setTimeout(() => step(0), ARROW_REMINDER_INITIAL_DELAY_MS);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;

      const target = event.target instanceof Element ? event.target.closest(".logo-carousel__item") : null;
      const nowHovering = Boolean(target);

      if (nowHovering !== isHoveringLink) {
        isHoveringLink = nowHovering;
        if (nowHovering && canUseCustomCursor() && !isDragging) {
          syncPosition();
          cursor.style.opacity = "1";
          startReminder();
        } else {
          stopReminder();
        }
      }

      if (canUseCustomCursor() && isHoveringLink && !isDragging) syncPosition();
    };

    const onPointerLeave = () => {
      isHoveringLink = false;
      stopReminder();
    };

    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerleave", onPointerLeave);
    return () => {
      clearReminderTimer();
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div
      className={`logo-carousel${isGrabbing ? " is-grabbing" : ""}`}
      ref={viewportRef}
      onClickCapture={onClickCapture}
    >
      <div className="logo-carousel__mask">
        <div ref={trackRef} className="logo-carousel__track">
          {loopItems.map((item, index) => (
            <a
              key={`${item.src}-${index}`}
              className="logo-carousel__item"
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${item.alt} website`}
              aria-hidden={index >= items.length}
              tabIndex={index >= items.length ? -1 : 0}
              onDragStart={(event) => event.preventDefault()}
              // Per-item, not on the outer viewport (see useDragCarousel's
              // own hoverCountRef comment) — the track's own headroom
              // padding otherwise counted as "hovering the carousel"
              // before the pointer reached an actual logo. Separate from
              // viewportRef's own native pointermove/pointerleave
              // listeners above, which drive the custom arrow cursor's
              // position/visibility and stay on the outer viewport —
              // that's a different concern from the drag-speed slowdown
              // these two props control.
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
            >
              <img src={item.src} alt={item.alt} draggable={false} style={{ height: `${item.height * LOGO_SCALE}rem` }} />
            </a>
          ))}
        </div>
      </div>
      <span ref={cursorRef} className="logo-carousel__cursor" aria-hidden="true" />

      <style>{`
        .logo-carousel {
          position: relative;
          min-width: 0;
          width: 100%;
          /* pan-y (not the bare default) hands vertical scroll to the
             native page while useDragCarousel's JS claims horizontal drag —
             but touch-action's allowed-gesture list is exhaustive, so
             pan-y alone silently also blocks pinch-zoom over this element.
             Appending pinch-zoom restores it without giving back the
             horizontal axis. */
          touch-action: pan-y pinch-zoom;
          user-select: none;
          cursor: grab;
        }
        .logo-carousel.is-grabbing {
          cursor: grabbing;
        }
        /* Only this inner mask clips — the cursor lives outside it (as a
           sibling, not a descendant) so it's never subject to the clip.
           Splitting these responsibilities avoids a CSS overflow gotcha:
           setting overflow-x: hidden with overflow-y: visible on the SAME
           element doesn't actually keep y visible — the spec computes the
           "visible" axis to "auto" whenever the other axis isn't "visible",
           and auto still clips. */
        .logo-carousel__mask {
          overflow: hidden;
        }
        .logo-carousel__track {
          display: flex;
          align-items: center;
          gap: var(--space-8);
          width: max-content;
          /* Headroom for the hover zoom below: at the tallest logo
             (5rem * LOGO_SCALE), a 1.04 scale + 1px lift needs a few px
             more than its own box, which would otherwise clip against
             .logo-carousel__mask. */
          padding-block: 8px;
          will-change: transform;
        }
        .logo-carousel__item {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          opacity: 0.7;
          transition: opacity var(--duration-base) var(--ease-standard);
        }
        .logo-carousel__item:hover,
        .logo-carousel__item:focus-visible {
          opacity: 1;
        }
        .logo-carousel__item img {
          width: auto;
          transform: scale(1);
          transform-origin: center;
          filter: brightness(1) contrast(1);
          transition:
            transform var(--duration-base) var(--ease-out-expressive),
            filter var(--duration-base) var(--ease-standard);
        }
        .logo-carousel__item:hover img,
        .logo-carousel__item:focus-visible img {
          transform: translateY(-1px) scale(1.04);
          filter: brightness(1.12) contrast(1.08);
        }
        .logo-carousel__cursor {
          position: absolute;
          left: 0;
          top: 0;
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
          /* Same reasoning as EyeCursorItem's own cursor (see that
             component's comments in full): the arrow sprite is solid
             white on transparent, so difference blending self-inverts it
             to black over light logos and keeps it white over dark ones.
             backdrop-filter: grayscale(1) desaturates just the small patch
             behind the arrow before that blend runs, so the result always
             stays black/white/gray instead of tinting toward whatever hue
             the logo underneath happens to be. */
          backdrop-filter: grayscale(1);
          -webkit-backdrop-filter: grayscale(1);
          mix-blend-mode: difference;
          transition: opacity 120ms var(--ease-standard);
        }

        @media (hover: hover) and (pointer: fine) and (min-width: 769px) {
          .logo-carousel__item {
            cursor: none;
          }
        }
        @media (hover: none), (pointer: coarse) {
          .logo-carousel__cursor {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
