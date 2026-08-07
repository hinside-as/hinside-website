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
      track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
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
      const target = isHoveringRef.current ? hoverSpeed : targetBase;
      if (!isDraggingRef.current) {
        const damping = Math.exp(-dt * 1.6);
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
      isHoveringRef.current = true;
    },
    onMouseLeave: () => {
      isHoveringRef.current = false;
    },
    onClickCapture: (event: { preventDefault: () => void; stopPropagation: () => void }) => {
      if (performance.now() < suppressClickUntilRef.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
