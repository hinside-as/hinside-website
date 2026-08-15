import { useEffect, useRef, useState } from "react";

export type UseDragCarouselOptions = {
  baseSpeed?: number;
  hoverSpeed?: number;
};

const DRAG_THRESHOLD_MOUSE_PX = 6;
const DRAG_THRESHOLD_TOUCH_PX = 2;
const MAX_ABS_VELOCITY = 2400;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getDragThreshold(pointerType: string): number {
  return pointerType === "mouse" ? DRAG_THRESHOLD_MOUSE_PX : DRAG_THRESHOLD_TOUCH_PX;
}

/**
 * Shared physics for the site's auto-scrolling, draggable carousels:
 * momentum-based drag (low-pass filtered velocity), trackpad/wheel support,
 * hover-to-slow, and reduced-motion handling. Consuming components own
 * rendering; this owns the transform loop and interaction plumbing.
 */
export function useDragCarousel({ baseSpeed = 30, hoverSpeed = 8 }: UseDragCarouselOptions = {}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const setWidthRef = useRef(0);
  const velocityRef = useRef(baseSpeed);
  const isHoveringRef = useRef(false);
  // A count, not a bare boolean: onMouseEnter/onMouseLeave are meant to be
  // attached per-item (see each carousel's own item markup), not once to
  // the whole padded viewport — attaching to the viewport made hovering
  // its cursor-headroom padding (empty-looking space around the actual
  // cards/logos/images) already trigger the slowdown before the pointer
  // ever reached visible content. Moving from one item directly onto an
  // adjacent one fires the new item's enter before the old one's leave in
  // some browsers and after in others, so a plain boolean could
  // momentarily read "not hovering" between the two events; a count that's
  // incremented/decremented and only reads as false at zero is immune to
  // that ordering.
  const hoverCountRef = useRef(0);
  const isDraggingRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const [isGrabbing, setIsGrabbing] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targetBase = prefersReducedMotion ? 0 : baseSpeed;
    velocityRef.current = targetBase;

    const measure = () => {
      setWidthRef.current = track.scrollWidth / 2;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);

    const wrapOffset = (value: number) => {
      const width = setWidthRef.current;
      if (width <= 0) return value;
      let wrapped = value % width;
      if (wrapped < 0) wrapped += width;
      return wrapped;
    };

    const applyTransform = () => {
      // Rounded to a whole pixel, not the raw fractional offset: this
      // track keeps drifting continuously even while a tile is hovered
      // (see hoverSpeed above), so a fractional sub-pixel position was
      // being fed into the transform on every single animation frame.
      // Items whose shell has its own CSS circular clip stacked on top of
      // an already-circular source image (GalleryCarousel's "circle"
      // shape) rasterize those two independent clips slightly differently
      // at different sub-pixel offsets — with the offset changing every
      // frame, that mismatch visibly shimmered right at the boundary
      // instead of settling on one (imperceptible) fixed offset. Snapping
      // to whole pixels removes that frame-to-frame variance entirely;
      // at these speeds the rounding itself is not perceptible.
      track.style.transform = `translate3d(${-Math.round(offsetRef.current)}px, 0, 0)`;
    };

    let pointerId: number | null = null;
    let pointerStartX = 0;
    let lastPointerX = 0;
    let lastPointerTime = 0;
    let dragDistance = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointerId = event.pointerId;
      pointerStartX = event.clientX;
      dragDistance = 0;
      lastPointerX = event.clientX;
      lastPointerTime = performance.now();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      const threshold = getDragThreshold(event.pointerType);

      if (!isDraggingRef.current) {
        if (Math.abs(event.clientX - pointerStartX) < threshold) return;
        isDraggingRef.current = true;
        velocityRef.current = 0;
        setIsGrabbing(true);
        if (!track.hasPointerCapture(event.pointerId)) track.setPointerCapture(event.pointerId);
      }

      const now = performance.now();
      const dx = event.clientX - lastPointerX;
      const dtMs = Math.max(8, now - lastPointerTime);
      const dt = dtMs / 1000;

      dragDistance += Math.abs(dx);
      offsetRef.current = wrapOffset(offsetRef.current - dx);
      applyTransform();

      const instantaneous = -dx / dt;
      velocityRef.current = clamp(
        velocityRef.current * 0.58 + instantaneous * 0.42,
        -MAX_ABS_VELOCITY,
        MAX_ABS_VELOCITY,
      );

      lastPointerX = event.clientX;
      lastPointerTime = now;
    };

    const onWheel = (event: WheelEvent) => {
      const width = setWidthRef.current;
      if (width <= 0 || event.ctrlKey) return;
      const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.15 || event.shiftKey;
      if (!horizontalIntent) return;
      const wheelDelta = event.shiftKey && Math.abs(event.deltaX) < 0.01 ? event.deltaY : event.deltaX;
      if (Math.abs(wheelDelta) < 0.1) return;
      event.preventDefault();
      offsetRef.current = wrapOffset(offsetRef.current + wheelDelta * 0.95);
      velocityRef.current = clamp(wheelDelta * 1.45, -MAX_ABS_VELOCITY, MAX_ABS_VELOCITY);
    };

    const endDrag = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      if (isDraggingRef.current && track.hasPointerCapture(event.pointerId)) {
        track.releasePointerCapture(event.pointerId);
      }
      const threshold = getDragThreshold(event.pointerType);
      if (isDraggingRef.current && dragDistance > threshold) {
        suppressClickUntilRef.current = performance.now() + 220;
      }
      if (isDraggingRef.current) {
        const releaseTarget = isHoveringRef.current ? hoverSpeed : targetBase;
        velocityRef.current = clamp(velocityRef.current * 0.52 + releaseTarget * 0.48, -920, 920);
      }
      isDraggingRef.current = false;
      pointerId = null;
      setIsGrabbing(false);
    };

    track.addEventListener("pointerdown", onPointerDown);
    track.addEventListener("pointermove", onPointerMove);
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("wheel", onWheel, { passive: false });

    let rafId = 0;
    let lastTime = performance.now();
    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      const isHovering = isHoveringRef.current;
      const target = isHovering ? hoverSpeed : targetBase;
      if (!isDraggingRef.current) {
        // Converging on the hover target several times faster than the
        // resume-to-base-speed case on mouseleave: PortfolioCarousel pairs
        // a slow (not zero — see HOVER_SPEED there) hover target with a
        // text panel that fades in over just 150ms (see .pc-meta), and the
        // base 1.6 rate took several hundred ms to approach that target —
        // long enough that the panel's own backdrop-filter was still
        // resampling a perceptibly moving background early in the hover,
        // reading as a lag/gap at its edge. A much faster (but still
        // exponential, still eased) rate here means the slowdown is mostly
        // done by the time the panel is visible — still a real
        // deceleration curve, just compressed into roughly the panel's own
        // reveal timeframe instead of stretching well past it.
        const dampingRate = isHovering ? 8 : 1.6;
        const damping = Math.exp(-dt * dampingRate);
        velocityRef.current = clamp(
          velocityRef.current * damping + target * (1 - damping),
          -MAX_ABS_VELOCITY,
          MAX_ABS_VELOCITY,
        );
        offsetRef.current = wrapOffset(offsetRef.current + velocityRef.current * dt);
      }
      applyTransform();
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      track.removeEventListener("pointerdown", onPointerDown);
      track.removeEventListener("pointermove", onPointerMove);
      track.removeEventListener("pointerup", endDrag);
      track.removeEventListener("pointercancel", endDrag);
      track.removeEventListener("wheel", onWheel);
    };
  }, [baseSpeed, hoverSpeed]);

  return {
    trackRef,
    isGrabbing,
    onMouseEnter: () => {
      hoverCountRef.current += 1;
      isHoveringRef.current = true;
    },
    onMouseLeave: () => {
      hoverCountRef.current = Math.max(0, hoverCountRef.current - 1);
      isHoveringRef.current = hoverCountRef.current > 0;
    },
    onClickCapture: (event: { preventDefault: () => void; stopPropagation: () => void }) => {
      if (performance.now() < suppressClickUntilRef.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
