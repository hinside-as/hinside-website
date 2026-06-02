import { useEffect, useMemo, useRef } from "react";

type PortfolioItem = {
  href: string;
  title: string;
  subtitle: string;
  image: string;
};

const BASE_SPEED = 42;
const HOVER_SLOW_SPEED = 12;
const MAX_ABS_VELOCITY = 2400;
const DRAG_START_THRESHOLD_MOUSE_PX = 6;
const DRAG_START_THRESHOLD_TOUCH_PX = 2;
const BLINK_SEQUENCE_SINGLE = [0, 1, 2, 1, 0] as const;
const BLINK_SEQUENCE_DOUBLE = [0, 1, 2, 1, 0, 1, 2, 1, 0] as const;
const BLINK_TIMINGS_MS = [0, 120, 185, 250, 330, 410, 475, 540, 620] as const;
const BLINK_DOUBLE_PROBABILITY = 0.32;
const BLINK_NEXT_DELAY_MIN_MS = 2600;
const BLINK_NEXT_DELAY_RANGE_MS = 2800;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getDragStartThreshold(pointerType: string): number {
  return pointerType === "mouse" ? DRAG_START_THRESHOLD_MOUSE_PX : DRAG_START_THRESHOLD_TOUCH_PX;
}

function applyTrackTransform(track: HTMLDivElement | null, offset: number): void {
  if (!track) {
    return;
  }

  track.style.transform = `translate3d(${-offset}px, 0, 0)`;
}

function isExternalLink(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//");
}

function isHashLink(href: string): boolean {
  return href.startsWith("#");
}

function createSquareImageDataUri(colors: [string, string]): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='640' viewBox='0 0 640 640'>
    <defs>
      <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='${colors[0]}'/>
        <stop offset='100%' stop-color='${colors[1]}'/>
      </linearGradient>
    </defs>
    <rect width='640' height='640' fill='url(#g)'/>
    <circle cx='540' cy='110' r='140' fill='rgba(255,255,255,0.18)'/>
    <circle cx='110' cy='550' r='180' fill='rgba(0,0,0,0.15)'/>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const HOVER_CURSOR_DATA_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="56" viewBox="0 0 96 56" fill="none">
  <path d="M64 48V56H32V48H64Z" fill="white"/>
  <path d="M32 48H16V40H32V48Z" fill="white"/>
  <path d="M80 48H64V40H80V48Z" fill="white"/>
  <path d="M16 40H8V32H16V40Z" fill="white"/>
  <path d="M88 40H80V32H88V40Z" fill="white"/>
  <path d="M56 36H40V20H56V36Z" fill="white"/>
  <path d="M8 32H0V24H8V32Z" fill="white"/>
  <path d="M96 32H88V24H96V32Z" fill="white"/>
  <path d="M16 24H8V16H16V24Z" fill="white"/>
  <path d="M88 24H80V16H88V24Z" fill="white"/>
  <path d="M32 16H16V8H32V16Z" fill="white"/>
  <path d="M80 16H64V8H80V16Z" fill="white"/>
  <path d="M64 8H32V0H64V8Z" fill="white"/>
</svg>`)}`;

const HOVER_CURSOR_BLINK_MID_DATA_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="24" viewBox="0 0 96 24" fill="none">
  <path d="M80 8H56V16H80V24H16V16H40V8H16V0H80V8Z" fill="white"/>
  <path d="M16 16H0V8H16V16Z" fill="white"/>
  <path d="M96 8V16H80V8H96Z" fill="white"/>
</svg>`)}`;

const HOVER_CURSOR_BLINK_CLOSED_DATA_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="8" viewBox="0 0 96 8" fill="none">
  <path d="M96 0V8H0V0H96Z" fill="white"/>
</svg>`)}`;

const HOVER_CURSOR_FRAMES = [
  {
    src: HOVER_CURSOR_DATA_URI,
    width: 96,
    height: 56,
    hotX: 48,
    hotY: 28,
  },
  {
    src: HOVER_CURSOR_BLINK_MID_DATA_URI,
    width: 96,
    height: 24,
    hotX: 48,
    hotY: 12,
  },
  {
    src: HOVER_CURSOR_BLINK_CLOSED_DATA_URI,
    width: 96,
    height: 8,
    hotX: 48,
    hotY: 4,
  },
] as const;

const ITEMS: PortfolioItem[] = [
  {
    href: "/samspill",
    title: "Samspill: World Cup 2026",
    subtitle: "Event visual identity",
    image: "https://res.cloudinary.com/dmornfz49/image/upload/q_auto/f_auto/v1779658264/hinside-samspill-cover_nknfqy.png"
  },
  {
    href: "/grieg",
    title: "Grieg Connect",
    subtitle: "Product design system",
    image: "https://res.cloudinary.com/dmornfz49/image/upload/v1780253719/hinside-grieg-cover_vrfycd.png"
  },
  {
    href: "/portfolio-arktisk",
    title: "Arktisk Form",
    subtitle: "Brand direction and campaign",
    image: createSquareImageDataUri(["#3151ff", "#f9cb28"])
  },
  {
    href: "/portfolio-nordhavn",
    title: "Nordhavn Studio",
    subtitle: "Digital product storytelling",
    image: createSquareImageDataUri(["#023047", "#ffb703"])
  },
  {
    href: "/portfolio-aura",
    title: "Aura Live",
    subtitle: "Experience and motion concept",
    image: createSquareImageDataUri(["#7b2cbf", "#ff7d00"])
  }
];

function PortfolioCard({ item, isCarouselDragging }: { item: PortfolioItem; isCarouselDragging: () => boolean }) {
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const blinkTimerRef = useRef<number | null>(null);
  const positionRafRef = useRef<number | null>(null);
  const currentFrameRef = useRef(0);
  const pointerXRef = useRef(0);
  const pointerYRef = useRef(0);
  const cardRef = useRef<HTMLAnchorElement | null>(null);
  const imageShellRef = useRef<HTMLDivElement | null>(null);
  const isImageHoveringRef = useRef(false);
  const isHoveringRef = useRef(false);
  const isPointerDownRef = useRef(false);

  const isEyeCursorEnabled = (): boolean => {
    if (typeof window === "undefined") {
      return true;
    }

    return !window.matchMedia("(max-width: 720px), (hover: none), (pointer: coarse)").matches;
  };

  const syncCursorPositionFromPointer = () => {
    const cursor = cursorRef.current;
    const card = cardRef.current;
    const imageShell = imageShellRef.current;
    if (!cursor || !card || !imageShell) {
      return;
    }

    const cardBounds = card.getBoundingClientRect();
    const relativeX = pointerXRef.current - cardBounds.left;
    const relativeY = pointerYRef.current - cardBounds.top;

    const imageBounds = imageShell.getBoundingClientRect();
    const imageRelativeX = pointerXRef.current - imageBounds.left;
    const imageRelativeY = pointerYRef.current - imageBounds.top;
    const frame = HOVER_CURSOR_FRAMES[currentFrameRef.current] ?? HOVER_CURSOR_FRAMES[0];

    cursor.style.left = `${relativeX - frame.hotX}px`;
    cursor.style.top = `${relativeY - frame.hotY}px`;
    card.style.setProperty("--glint-x", `${imageRelativeX}px`);
    card.style.setProperty("--glint-y", `${imageRelativeY}px`);
  };

  const applyCursorFrame = (frameIndex: number) => {
    const cursor = cursorRef.current;
    const frame = HOVER_CURSOR_FRAMES[frameIndex];
    if (!cursor || !frame) {
      return;
    }

    currentFrameRef.current = frameIndex;
    cursor.style.width = `${frame.width}px`;
    cursor.style.height = `${frame.height}px`;
    cursor.style.marginLeft = "0px";
    cursor.style.marginTop = "0px";
    cursor.style.backgroundImage = `url("${frame.src}")`;

    if (isImageHoveringRef.current) {
      syncCursorPositionFromPointer();
    }
  };

  const stopBlink = () => {
    if (blinkTimerRef.current !== null) {
      window.clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = null;
    }
  };

  const setPressedVisualState = (pressed: boolean) => {
    isPointerDownRef.current = pressed;
    const card = cardRef.current;
    if (!card) {
      return;
    }

    if (pressed) {
      card.classList.add("is-pointer-down");
    } else {
      card.classList.remove("is-pointer-down");
    }
  };

  const stopCursorTracking = () => {
    if (positionRafRef.current !== null) {
      window.cancelAnimationFrame(positionRafRef.current);
      positionRafRef.current = null;
    }
  };

  const startBlink = () => {
    stopBlink();

    const sequence = Math.random() < BLINK_DOUBLE_PROBABILITY
      ? BLINK_SEQUENCE_DOUBLE
      : BLINK_SEQUENCE_SINGLE;

    const step = (index: number) => {
      if (!isHoveringRef.current || isCarouselDragging()) {
        return;
      }

      applyCursorFrame(sequence[index]);

      if (index < sequence.length - 1) {
        blinkTimerRef.current = window.setTimeout(() => step(index + 1), BLINK_TIMINGS_MS[index + 1] - BLINK_TIMINGS_MS[index]);
      } else {
        const nextBlinkDelay = BLINK_NEXT_DELAY_MIN_MS + Math.random() * BLINK_NEXT_DELAY_RANGE_MS;
        blinkTimerRef.current = window.setTimeout(() => {
          if (isHoveringRef.current && !isCarouselDragging()) {
            startBlink();
          }
        }, nextBlinkDelay);
      }
    };

    step(0);
  };

  const syncCursorPosition = (event: { clientX: number; clientY: number; currentTarget: EventTarget | null }) => {
    pointerXRef.current = event.clientX;
    pointerYRef.current = event.clientY;
    syncCursorPositionFromPointer();
  };

  const startCursorTracking = () => {
    stopCursorTracking();

    const tick = () => {
      if (!isHoveringRef.current || isCarouselDragging()) {
        isImageHoveringRef.current = false;
        positionRafRef.current = null;
        return;
      }

      const cursor = cursorRef.current;
      const card = cardRef.current;
      const imageShell = imageShellRef.current;
      if (cursor && card && imageShell && isImageHoveringRef.current) {
        syncCursorPositionFromPointer();
      }

      positionRafRef.current = window.requestAnimationFrame(tick);
    };

    positionRafRef.current = window.requestAnimationFrame(tick);
  };

  useEffect(() => {
    const handlePointerUp = (event: PointerEvent) => {
      if (!isPointerDownRef.current) {
        return;
      }

      if (isCarouselDragging()) {
        isImageHoveringRef.current = false;
        setPressedVisualState(false);
        stopBlink();
        stopCursorTracking();
        return;
      }

      pointerXRef.current = event.clientX;
      pointerYRef.current = event.clientY;

      setPressedVisualState(false);

      const imageShell = imageShellRef.current;
      const imageBounds = imageShell?.getBoundingClientRect();
      const isStillInsideImage = !!imageBounds &&
        event.clientX >= imageBounds.left &&
        event.clientX <= imageBounds.right &&
        event.clientY >= imageBounds.top &&
        event.clientY <= imageBounds.bottom;

      isImageHoveringRef.current = isStillInsideImage;

      if (isImageHoveringRef.current && isHoveringRef.current) {
        syncCursorPositionFromPointer();
        applyCursorFrame(0);
        startBlink();
        startCursorTracking();
      } else {
        stopBlink();
        stopCursorTracking();
      }
    };

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  const handleClick = (event: { preventDefault: () => void }) => {
    if (isHashLink(item.href)) {
      event.preventDefault();
      const id = item.href.slice(1);
      if (!id) {
        return;
      }

      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <a
      ref={cardRef}
      href={item.href}
      className="pc-card"
      aria-label={`${item.title} - ${item.subtitle}`}
      draggable={false}
      data-no-link-style
      onClick={handleClick}
      {...(isExternalLink(item.href)
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      onPointerEnter={() => {
        isHoveringRef.current = true;
      }}
      onPointerLeave={() => {
        isHoveringRef.current = false;
        stopBlink();
        stopCursorTracking();
        isImageHoveringRef.current = false;
        setPressedVisualState(false);
      }}
    >
      <div
        ref={imageShellRef}
        className="pc-image-shell"
        onPointerDown={(event) => {
          if (!isEyeCursorEnabled() || isCarouselDragging() || event.pointerType !== "mouse" || event.button !== 0) {
            return;
          }

          syncCursorPosition(event);
          setPressedVisualState(true);
          stopBlink();
          stopCursorTracking();
        }}
        onPointerEnter={(event) => {
          if (!isEyeCursorEnabled() || isCarouselDragging() || event.pointerType !== "mouse") {
            return;
          }

          isImageHoveringRef.current = true;
          syncCursorPosition(event);
          applyCursorFrame(0);
          startBlink();
          startCursorTracking();
        }}
        onPointerMove={(event) => {
          if (!isEyeCursorEnabled() || isCarouselDragging() || event.pointerType !== "mouse") {
            return;
          }

          syncCursorPosition(event);
        }}
        onPointerLeave={() => {
          if (isPointerDownRef.current) {
            return;
          }

          isImageHoveringRef.current = false;
          setPressedVisualState(false);
          stopBlink();
          stopCursorTracking();
        }}
      >
        <img className="pc-image" src={item.image} alt={item.title} loading="lazy" draggable={false} />
      </div>
      <span aria-hidden="true" className="pc-card-cursor" ref={cursorRef} />
      <div className="pc-meta">
        <div className="pc-title" style={{ fontStyle: "normal" }}>{item.title}</div>
        <p className="pc-subtitle" style={{ fontStyle: "italic" }}>{item.subtitle}</p>
      </div>
    </a>
  );
}

export default function PortfolioCarousel() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const firstSetRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const setWidthRef = useRef(0);
  const velocityRef = useRef(BASE_SPEED);
  const isHoveringRef = useRef(false);
  const isDraggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const pointerStartXRef = useRef(0);
  const lastPointerXRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const suppressClickUntilRef = useRef(0);

  const doubledItems = useMemo(() => [...ITEMS, ...ITEMS], []);

  useEffect(() => {
    const measure = () => {
      setWidthRef.current = firstSetRef.current?.offsetWidth ?? 0;
    };

    measure();

    const observer = new ResizeObserver(measure);
    if (firstSetRef.current) {
      observer.observe(firstSetRef.current);
    }

    const wrapOffset = (value: number) => {
      const width = setWidthRef.current;
      if (width <= 0) {
        return value;
      }

      let wrapped = value % width;
      if (wrapped < 0) {
        wrapped += width;
      }
      return wrapped;
    };

    const viewport = viewportRef.current;

    const onPointerDown = (event: PointerEvent) => {
      if (!viewport) {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      suppressClickUntilRef.current = 0;
      pointerIdRef.current = event.pointerId;
      pointerStartXRef.current = event.clientX;
      dragDistanceRef.current = 0;
      lastPointerXRef.current = event.clientX;
      lastPointerTimeRef.current = performance.now();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      const dragStartThreshold = getDragStartThreshold(event.pointerType);

      if (!isDraggingRef.current) {
        const moved = Math.abs(event.clientX - pointerStartXRef.current);
        if (moved < dragStartThreshold) {
          return;
        }

        isDraggingRef.current = true;
        velocityRef.current = 0;
        sectionRef.current?.classList.add("is-carousel-dragging");
        if (viewport && !viewport.hasPointerCapture(event.pointerId)) {
          viewport.setPointerCapture(event.pointerId);
        }
      }

      const now = performance.now();
      const dx = event.clientX - lastPointerXRef.current;
      const dtMs = Math.max(8, now - lastPointerTimeRef.current);
      const dt = dtMs / 1000;

      dragDistanceRef.current += Math.abs(dx);
      offsetRef.current = wrapOffset(offsetRef.current - dx);
      applyTrackTransform(trackRef.current, offsetRef.current);
      const instantaneousVelocity = -dx / dt;
      velocityRef.current = clamp(
        velocityRef.current * 0.58 + instantaneousVelocity * 0.42,
        -MAX_ABS_VELOCITY,
        MAX_ABS_VELOCITY
      );

      lastPointerXRef.current = event.clientX;
      lastPointerTimeRef.current = now;
    };

    const onWheel = (event: WheelEvent) => {
      const width = setWidthRef.current;
      if (width <= 0) {
        return;
      }

      if (event.ctrlKey) {
        return;
      }

      const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.15 || event.shiftKey;
      if (!horizontalIntent) {
        return;
      }

      const wheelDelta = event.shiftKey && Math.abs(event.deltaX) < 0.01 ? event.deltaY : event.deltaX;
      if (Math.abs(wheelDelta) < 0.1) {
        return;
      }

      event.preventDefault();
      offsetRef.current = wrapOffset(offsetRef.current + wheelDelta * 0.95);
      velocityRef.current = clamp(wheelDelta * 1.45, -MAX_ABS_VELOCITY, MAX_ABS_VELOCITY);
    };

    const endDrag = (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      if (isDraggingRef.current && viewport && viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }

      const dragEndThreshold = getDragStartThreshold(event.pointerType);

      if (isDraggingRef.current && dragDistanceRef.current > dragEndThreshold) {
        suppressClickUntilRef.current = performance.now() + 220;
      }

      if (isDraggingRef.current) {
        const releaseTarget = isHoveringRef.current ? HOVER_SLOW_SPEED : BASE_SPEED;
        velocityRef.current = clamp(
          velocityRef.current * 0.52 + releaseTarget * 0.48,
          -920,
          920
        );
      }

      isDraggingRef.current = false;
      pointerIdRef.current = null;
      sectionRef.current?.classList.remove("is-carousel-dragging");
    };

    const onMouseEnter = () => {
      isHoveringRef.current = true;
    };

    const onMouseLeave = () => {
      isHoveringRef.current = false;
    };

    if (viewport) {
      viewport.addEventListener("pointerdown", onPointerDown);
      viewport.addEventListener("pointermove", onPointerMove);
      viewport.addEventListener("pointerup", endDrag);
      viewport.addEventListener("pointercancel", endDrag);
      viewport.addEventListener("mouseenter", onMouseEnter);
      viewport.addEventListener("mouseleave", onMouseLeave);
      viewport.addEventListener("wheel", onWheel, { passive: false });
    }

    let rafId = 0;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const targetSpeed = isHoveringRef.current ? HOVER_SLOW_SPEED : BASE_SPEED;
      if (!isDraggingRef.current) {
        const damping = Math.exp(-dt * 1.6);
        velocityRef.current = clamp(
          velocityRef.current * damping + targetSpeed * (1 - damping),
          -MAX_ABS_VELOCITY,
          MAX_ABS_VELOCITY
        );
      }

      const width = setWidthRef.current;
      if (trackRef.current && width > 0) {
        if (!isDraggingRef.current) {
          offsetRef.current = wrapOffset(offsetRef.current + velocityRef.current * dt);
        }

        applyTrackTransform(trackRef.current, offsetRef.current);
      }

      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      sectionRef.current?.classList.remove("is-carousel-dragging");

      if (viewport) {
        viewport.removeEventListener("pointerdown", onPointerDown);
        viewport.removeEventListener("pointermove", onPointerMove);
        viewport.removeEventListener("pointerup", endDrag);
        viewport.removeEventListener("pointercancel", endDrag);
        viewport.removeEventListener("mouseenter", onMouseEnter);
        viewport.removeEventListener("mouseleave", onMouseLeave);
        viewport.removeEventListener("wheel", onWheel);
      }
    };
  }, []);

  return (
    <section ref={sectionRef} className="pc-carousel-section" aria-label="Portfolio carousel">
      <style>{`
        .pc-carousel-section {
          --section-vpad: 96px;
          --card-size: clamp(220px, 28vw, 360px);
          --meta-block-height: 62px;
          position: relative;
          isolation: isolate;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          min-height: calc((var(--section-vpad) * 2) + var(--card-size) + var(--meta-block-height));
          overflow: visible;
          padding: var(--section-vpad) 0;
          box-sizing: border-box;
        }

        .pc-carousel-section::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-color: #050505;
          background-image: radial-gradient(120% 90% at 50% 50%, #151515, #050505);
          background-repeat: no-repeat;
          background-size: cover;
        }

        .pc-carousel-mask {
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 2;
          background: linear-gradient(90deg, #050505 0%, rgba(5, 5, 5, 0) 8%, rgba(5, 5, 5, 0) 92%, #050505 100%);
        }

        .pc-track {
          position: relative;
          z-index: 1;
          display: flex;
          width: max-content;
          will-change: transform;
          gap: clamp(18px, 2.6vw, 40px);
          padding: 0 clamp(16px, 4vw, 48px);
        }

        .pc-viewport {
          position: relative;
          z-index: 1;
          width: 100%;
          margin-block: auto;
          overflow: visible;
          touch-action: pan-y;
          user-select: none;
          -webkit-user-select: none;
        }

        .pc-set {
          display: flex;
          gap: clamp(18px, 2.6vw, 40px);
        }

        .pc-card {
          position: relative;
          --glint-x: 50%;
          --glint-y: 30%;
          text-decoration: none;
          color: #f6f6f6;
          width: var(--card-size);
          flex: 0 0 auto;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
        }

        .pc-meta {
          cursor: pointer;
        }

        .pc-image-shell {
          cursor: none;
        }

        .pc-card-cursor {
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
          transform: translate3d(0, 0, 0);
          transition: opacity 120ms ease;
          will-change: left, top, width, height, margin-left, margin-top, background-image;
        }

        .pc-image-shell:hover ~ .pc-card-cursor,
        .pc-image-shell:active ~ .pc-card-cursor,
        .pc-image-shell:focus-visible ~ .pc-card-cursor {
          opacity: 1;
        }

        .pc-card.is-pointer-down .pc-card-cursor {
          opacity: 0 !important;
        }

        .pc-carousel-section.is-carousel-dragging .pc-card-cursor {
          opacity: 0 !important;
        }

        .pc-carousel-section.is-carousel-dragging .pc-viewport,
        .pc-carousel-section.is-carousel-dragging .pc-card,
        .pc-carousel-section.is-carousel-dragging .pc-image-shell,
        .pc-carousel-section.is-carousel-dragging .pc-meta {
          cursor: grabbing !important;
        }

        .pc-carousel-section.is-carousel-dragging .pc-image-shell,
        .pc-carousel-section.is-carousel-dragging .pc-image,
        .pc-carousel-section.is-carousel-dragging .pc-image-shell::after {
          transition: none !important;
        }

        .pc-image-shell {
          position: relative;
          overflow: hidden;
          background: #0f0f0f;
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.28);
          transition: box-shadow 260ms ease;
        }

        .pc-image-shell::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              120% 96% at var(--glint-x) var(--glint-y),
              rgba(255, 255, 255, 0.2) 0%,
              rgba(255, 255, 255, 0.1) 32%,
              rgba(255, 255, 255, 0.03) 52%,
              rgba(255, 255, 255, 0) 74%
            ),
            radial-gradient(
              170% 120% at 50% 8%,
              rgba(255, 255, 255, 0.16) 0%,
              rgba(255, 255, 255, 0.06) 34%,
              rgba(255, 255, 255, 0) 72%
            ),
            linear-gradient(
              160deg,
              rgba(255, 255, 255, 0.08) 0%,
              rgba(255, 255, 255, 0.02) 34%,
              rgba(255, 255, 255, 0) 58%
            );
          opacity: 0;
          transition: opacity 260ms ease;
        }

        .pc-image {
          display: block;
          width: 100%;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          filter: grayscale(1) saturate(0.28);
          transition: filter 220ms ease;
          -webkit-user-drag: none;
        }

        .pc-image-shell:hover .pc-image,
        .pc-image-shell:active .pc-image,
        .pc-image-shell:focus-visible .pc-image {
          filter: grayscale(0) saturate(1.04);
        }

        .pc-image-shell:hover,
        .pc-image-shell:focus-visible {
          box-shadow: 0 22px 40px rgba(0, 0, 0, 0.38);
        }

        .pc-image-shell:hover::after,
        .pc-image-shell:active::after,
        .pc-image-shell:focus-visible::after {
          opacity: 0.78;
        }

        .pc-meta {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-family: "JetBrains Mono", monospace;
          font-style: normal;
        }

        .pc-title {
          margin: 0;
          line-height: 1.35;
          font-size: clamp(14px, 1.3vw, 17px);
          font-family: ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-weight: 100;
          font-style: normal;
          font-synthesis: none;
          color: #ffffff;
        }

        .pc-card .pc-title,
        .pc-card .pc-title * {
          font-style: normal !important;
          font-variation-settings: "slnt" 0 !important;
        }

        .pc-subtitle {
          margin: 0;
          line-height: 1.35;
          font-size: clamp(13px, 1.2vw, 16px);
          font-family: "JetBrains Mono", monospace;
          font-weight: 100;
          font-style: italic;
          color: rgba(255, 255, 255, 0.6);
        }

        .pc-card .pc-subtitle,
        .pc-card .pc-subtitle * {
          font-style: italic !important;
        }

        @media (min-width: 721px) {
          .pc-title {
            font-size: 16px;
          }

          .pc-subtitle {
            font-size: 16px;
          }
        }

        .pc-card:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.9);
          outline-offset: 6px;
        }

        @media (max-width: 720px) {
          .pc-carousel-section {
            --section-vpad: 96px;
            --card-size: min(74vw, 320px);
            --meta-block-height: 55px;
          }

          .pc-card-cursor {
            display: none !important;
          }

          .pc-image-shell {
            cursor: auto;
            box-shadow: 0 16px 32px rgba(0, 0, 0, 0.28);
          }

          .pc-image {
            filter: grayscale(0) saturate(1.04);
          }

          .pc-image-shell::after {
            opacity: 0.52;
          }

          .pc-image-shell:hover .pc-image,
          .pc-image-shell:active .pc-image,
          .pc-image-shell:focus-visible .pc-image {
            filter: grayscale(0) saturate(1.04);
          }

          .pc-image-shell:hover::after,
          .pc-image-shell:active::after,
          .pc-image-shell:focus-visible::after {
            opacity: 0.52;
          }
        }

        @media (hover: none), (pointer: coarse) {
          .pc-card-cursor {
            display: none !important;
          }

          .pc-image-shell {
            cursor: auto;
            box-shadow: 0 16px 32px rgba(0, 0, 0, 0.28);
          }

          .pc-image {
            filter: grayscale(0) saturate(1.04);
          }

          .pc-image-shell::after {
            opacity: 0.52;
          }

          .pc-image-shell:hover .pc-image,
          .pc-image-shell:active .pc-image,
          .pc-image-shell:focus-visible .pc-image {
            filter: grayscale(0) saturate(1.04);
          }

          .pc-image-shell:hover::after,
          .pc-image-shell:active::after,
          .pc-image-shell:focus-visible::after {
            opacity: 0.52;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pc-track {
            transform: translate3d(0, 0, 0) !important;
          }

          .pc-image {
            transition: filter 0s ease;
          }

          .pc-image-shell {
            transition: none;
          }
        }
      `}</style>

      <div
        ref={viewportRef}
        className="pc-viewport"
        onClickCapture={(event) => {
          if (performance.now() < suppressClickUntilRef.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <div ref={trackRef} className="pc-track">
        <div ref={firstSetRef} className="pc-set">
          {ITEMS.map((item) => (
            <PortfolioCard key={item.href} item={item} isCarouselDragging={() => isDraggingRef.current} />
          ))}
        </div>

        <div className="pc-set" aria-hidden="true">
          {doubledItems.slice(ITEMS.length).map((item, index) => (
            <PortfolioCard key={`${item.href}-${index}`} item={item} isCarouselDragging={() => isDraggingRef.current} />
          ))}
        </div>
        </div>
      </div>

      <div className="pc-carousel-mask" aria-hidden="true" />
    </section>
  );
}
