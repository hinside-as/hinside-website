import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export type LightboxItem = {
  src: string;
  alt: string;
};

const ARROW_LEFT = (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="56" viewBox="0 0 32 56" fill="none">
    <path d="M24 56H32V48H24V56Z" fill="white" />
    <path d="M16 48H24V40H16V48Z" fill="white" />
    <path d="M8 40H16V32H8V40Z" fill="white" />
    <path d="M0 32H8V24H0V32Z" fill="white" />
    <path d="M8 24H16V16H8V24Z" fill="white" />
    <path d="M16 16H24V8H16V16Z" fill="white" />
    <path d="M24 8H32V0H24V8Z" fill="white" />
  </svg>
);

const ARROW_RIGHT = (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="56" viewBox="0 0 32 56" fill="none">
    <path d="M8 56H0V48H8V56Z" fill="white" />
    <path d="M16 48H8V40H16V48Z" fill="white" />
    <path d="M24 40H16V32H24V40Z" fill="white" />
    <path d="M32 32H24V24H32V32Z" fill="white" />
    <path d="M24 24H16V16H24V24Z" fill="white" />
    <path d="M16 16H8V8H16V16Z" fill="white" />
    <path d="M8 8H0V0H8V8Z" fill="white" />
  </svg>
);

/**
 * Full-screen viewer for carousel items: prev/next click zones, keyboard
 * nav, a position indicator, and — for the icon carousel — a pointer-
 * tracked pixel-grid overlay evoking the icon system's native 24×24 grid.
 */
export default function Lightbox({
  items,
  currentIndex,
  onClose,
  onNavigate,
  pixelGrid = false,
  shape = "square",
}: {
  items: LightboxItem[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  pixelGrid?: boolean;
  shape?: "square" | "circle" | "icon";
}) {
  const [isUiIdle, setIsUiIdle] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentIndex === null) return;

    const markActive = () => {
      setIsUiIdle(false);
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => setIsUiIdle(true), 1350);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      markActive();
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onNavigate((currentIndex - 1 + items.length) % items.length);
      if (event.key === "ArrowRight") onNavigate((currentIndex + 1) % items.length);
    };

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointermove", markActive, { passive: true });
    markActive();
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointermove", markActive);
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      document.body.style.overflow = "";
    };
  }, [currentIndex, items.length, onClose, onNavigate]);

  if (currentIndex === null) return null;
  const item = items[currentIndex];

  const goPrevious = () => onNavigate((currentIndex - 1 + items.length) % items.length);
  const goNext = () => onNavigate((currentIndex + 1) % items.length);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const bounds = stage.getBoundingClientRect();
    stage.style.setProperty("--lb-grid-x", `${event.clientX - bounds.left}px`);
    stage.style.setProperty("--lb-grid-y", `${event.clientY - bounds.top}px`);
  };

  return (
    <div className={`carousel-lightbox${isUiIdle ? " is-idle" : ""}`}>
      <button type="button" className="carousel-lightbox__hit carousel-lightbox__hit--left" aria-label="Previous" onClick={goPrevious}>
        <span className="carousel-lightbox__arrow">{ARROW_LEFT}</span>
      </button>
      <button type="button" className="carousel-lightbox__hit carousel-lightbox__hit--center" aria-label="Close" onClick={onClose} />
      <button type="button" className="carousel-lightbox__hit carousel-lightbox__hit--right" aria-label="Next" onClick={goNext}>
        <span className="carousel-lightbox__arrow">{ARROW_RIGHT}</span>
      </button>

      <div className="carousel-lightbox__content">
        <div
          ref={stageRef}
          className={`carousel-lightbox__stage carousel-lightbox__stage--${shape}`}
          onPointerMove={pixelGrid ? handlePointerMove : undefined}
          onClick={onClose}
        >
          {pixelGrid && <div className="carousel-lightbox__grid" aria-hidden="true" />}
          <img className="carousel-lightbox__image" src={item.src} alt={item.alt} />
        </div>
      </div>

      <div className="carousel-lightbox__indicator" aria-live="polite">
        {items.map((_, index) => (
          <span key={index} className={`carousel-lightbox__notch${index === currentIndex ? " is-current" : ""}`} />
        ))}
      </div>

      <style>{`
        .carousel-lightbox {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(120% 92% at 50% 50%, rgba(20, 20, 20, 0.6), rgba(6, 6, 6, 0.85));
          backdrop-filter: blur(12px) saturate(1.08);
          -webkit-backdrop-filter: blur(12px) saturate(1.08);
        }
        @media (prefers-reduced-motion: no-preference) {
          .carousel-lightbox {
            animation: carousel-lightbox-fade 200ms ease;
          }
          .carousel-lightbox__content {
            animation: carousel-lightbox-scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
          }
        }
        @keyframes carousel-lightbox-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes carousel-lightbox-scale {
          from { opacity: 0; transform: scale(0.94); }
          to { opacity: 1; transform: scale(1); }
        }
        .carousel-lightbox__content {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
          pointer-events: none;
        }
        .carousel-lightbox__stage {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          /* Re-enable pointer events (the parent is pointer-events: none so
             clicks in the surrounding padding fall through to the hit
             zones) so the stage can both track the pointer for the pixel
             grid and close the lightbox when clicked directly. */
          pointer-events: auto;
          cursor: pointer;
        }
        .carousel-lightbox__stage--square {
          width: min(90vw, 60rem);
          height: min(85vh, 60rem);
        }
        .carousel-lightbox__stage--circle {
          width: min(70vw, 32rem);
          height: min(70vw, 32rem);
        }
        .carousel-lightbox__stage--icon {
          width: min(60vw, 28rem);
          height: min(60vw, 28rem);
        }
        .carousel-lightbox__image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
        }
        .carousel-lightbox__stage--circle .carousel-lightbox__image {
          border-radius: 50%;
          object-fit: cover;
        }
        .carousel-lightbox__stage--icon .carousel-lightbox__image {
          image-rendering: pixelated;
        }
        .carousel-lightbox__grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          --lb-grid-x: 50%;
          --lb-grid-y: 50%;
          background-image:
            linear-gradient(to right, rgba(255, 255, 255, 0.14) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.14) 1px, transparent 1px);
          background-size: calc(100% / 24) calc(100% / 24);
          -webkit-mask-image: radial-gradient(135% 120% at var(--lb-grid-x) var(--lb-grid-y),
            rgba(0, 0, 0, 0.96) 0%, rgba(0, 0, 0, 0.7) 34%, rgba(0, 0, 0, 0.18) 70%, transparent 100%);
          mask-image: radial-gradient(135% 120% at var(--lb-grid-x) var(--lb-grid-y),
            rgba(0, 0, 0, 0.96) 0%, rgba(0, 0, 0, 0.7) 34%, rgba(0, 0, 0, 0.18) 70%, transparent 100%);
          mix-blend-mode: screen;
          opacity: 0.4;
          z-index: 2;
        }
        .carousel-lightbox__hit {
          position: absolute;
          top: 0;
          bottom: 0;
          background: none;
          border: none;
          padding: 0;
          margin: 0;
          cursor: pointer;
          z-index: 2;
          display: flex;
          align-items: center;
        }
        .carousel-lightbox__hit--left {
          left: 0;
          width: 25vw;
          justify-content: flex-start;
          padding-left: clamp(12px, 2vw, 26px);
        }
        .carousel-lightbox__hit--center {
          left: 25vw;
          width: 50vw;
        }
        .carousel-lightbox__hit--right {
          right: 0;
          width: 25vw;
          justify-content: flex-end;
          padding-right: clamp(12px, 2vw, 26px);
        }
        .carousel-lightbox__arrow {
          display: block;
          width: 2rem;
          opacity: 0.4;
          transition: opacity var(--duration-base) var(--ease-standard), transform var(--duration-base) var(--ease-standard);
        }
        .carousel-lightbox.is-idle .carousel-lightbox__arrow {
          opacity: 0;
        }
        .carousel-lightbox__hit:hover .carousel-lightbox__arrow,
        .carousel-lightbox__hit:focus-visible .carousel-lightbox__arrow {
          opacity: 1;
        }
        .carousel-lightbox__indicator {
          position: absolute;
          left: 50%;
          bottom: clamp(14px, 3vh, 32px);
          transform: translateX(-50%);
          z-index: 3;
          display: flex;
          gap: 3px;
          align-items: flex-end;
          height: 0.75rem;
          pointer-events: none;
          transition: opacity var(--duration-base) var(--ease-standard);
        }
        .carousel-lightbox.is-idle .carousel-lightbox__indicator {
          opacity: 0.35;
        }
        .carousel-lightbox__notch {
          width: 3px;
          height: 35%;
          background: rgba(255, 255, 255, 0.4);
          transition: height var(--duration-base) var(--ease-standard), background var(--duration-base) var(--ease-standard);
        }
        .carousel-lightbox__notch.is-current {
          height: 100%;
          background: rgba(255, 255, 255, 0.92);
        }

        @media (max-width: 720px) {
          .carousel-lightbox__stage--square {
            width: 92vw;
            height: 78vh;
          }
        }
      `}</style>
    </div>
  );
}
