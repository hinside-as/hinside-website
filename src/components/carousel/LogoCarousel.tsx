import { useEffect, useMemo, useRef } from "react";
import { useDragCarousel } from "../../hooks/useDragCarousel";

export type LogoCarouselItem = {
  src: string;
  alt: string;
  href: string;
  height: number;
};

const ARROW_SHORT_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="56" viewBox="0 0 80 56" fill="none">
  <path d="M56 56H48V48H56V56Z" fill="white"/>
  <path d="M64 48H56V40H64V48Z" fill="white"/>
  <path d="M72 24H80V32H72V40H64V32H0V24H64V16H72V24Z" fill="white"/>
  <path d="M64 16H56V8H64V16Z" fill="white"/>
  <path d="M56 8H48V0H56V8Z" fill="white"/>
</svg>`)}`;
const ARROW_LONG_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="88" height="56" viewBox="0 0 88 56" fill="none">
  <path d="M64 56H56V48H64V56Z" fill="white"/>
  <path d="M72 48H64V40H72V48Z" fill="white"/>
  <path d="M80 24H88V32H80V40H72V32H0V24H72V16H80V24Z" fill="white"/>
  <path d="M72 16H64V8H72V16Z" fill="white"/>
  <path d="M64 8H56V0H64V8Z" fill="white"/>
</svg>`)}`;
const ARROW_LONGEST_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="56" viewBox="0 0 96 56" fill="none">
  <path d="M72 56H64V48H72V56Z" fill="white"/>
  <path d="M80 48H72V40H80V48Z" fill="white"/>
  <path d="M88 24H96V32H88V40H80V32H0V24H80V16H88V24Z" fill="white"/>
  <path d="M80 16H72V8H80V16Z" fill="white"/>
  <path d="M72 8H64V0H72V8Z" fill="white"/>
</svg>`)}`;

const ARROW_FRAMES = [
  { src: ARROW_SHORT_URI, width: 80, height: 56, hotX: 48, hotY: 28 },
  { src: ARROW_LONG_URI, width: 88, height: 56, hotX: 48, hotY: 28 },
  { src: ARROW_LONGEST_URI, width: 96, height: 56, hotX: 48, hotY: 28 },
] as const;

const ARROW_REMINDER_SEQUENCE = [0, 1, 2, 1, 0, 1, 2, 1, 0] as const;
const ARROW_REMINDER_TIMINGS_MS = [0, 90, 170, 250, 330, 430, 510, 590, 680] as const;
const ARROW_REMINDER_INITIAL_DELAY_MS = 380;
const ARROW_REMINDER_NEXT_DELAY_MIN_MS = 5200;
const ARROW_REMINDER_NEXT_DELAY_RANGE_MS = 2600;

export default function LogoCarousel({ items }: { items: LogoCarouselItem[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const loopItems = useMemo(() => [...items, ...items], [items]);
  const { trackRef, isGrabbing, onMouseEnter, onMouseLeave, onClickCapture } = useDragCarousel({
    baseSpeed: 24,
    hoverSpeed: 6,
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
            >
              <img src={item.src} alt={item.alt} draggable={false} style={{ height: `${item.height}rem` }} />
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
          touch-action: pan-y;
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
          /* Headroom for the hover zoom below: at the tallest logo (5rem),
             a 1.04 scale + 1px lift needs a few px more than its own box,
             which would otherwise clip against .logo-carousel__mask. */
          padding-block: 6px;
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
          opacity: 0;
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
