import { useMemo, useRef, type CSSProperties } from "react";
import { useDragCarousel } from "../../hooks/useDragCarousel";
import EyeCursorItem from "./EyeCursorItem";

export type PortfolioItem = {
  href: string;
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  /** Case study's own accent color (e.g. "#126CB2") — used on hover so
   * each card reads as a link into that specific project's identity. */
  accent?: string;
};

const BASE_SPEED = 42;
const HOVER_SPEED = 12;

export default function PortfolioCarousel({ items }: { items: PortfolioItem[] }) {
  const isDraggingForCursorRef = useRef(false);
  const loopItems = useMemo(() => [...items, ...items], [items]);
  const { trackRef, isGrabbing, onMouseEnter, onMouseLeave, onClickCapture } = useDragCarousel({
    baseSpeed: BASE_SPEED,
    hoverSpeed: HOVER_SPEED,
  });
  isDraggingForCursorRef.current = isGrabbing;

  return (
    <section className="pc-carousel-section" aria-label="Portfolio carousel">
      <div
        className={`pc-viewport${isGrabbing ? " is-grabbing" : ""}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClickCapture={onClickCapture}
      >
        <div ref={trackRef} className="pc-track">
          {loopItems.map((item, index) => (
            <a
              key={`${item.href}-${index}`}
              href={item.href}
              className="pc-card"
              aria-label={`${item.title} — ${item.subtitle}`}
              aria-hidden={index >= items.length}
              tabIndex={index >= items.length ? -1 : 0}
              draggable={false}
              style={item.accent ? ({ "--accent": item.accent } as CSSProperties) : undefined}
            >
              <div className="pc-image-frame">
                <EyeCursorItem isCarouselDragging={() => isDraggingForCursorRef.current}>
                  <img className="pc-image" src={item.image} alt={item.imageAlt} draggable={false} />
                </EyeCursorItem>
              </div>
              <div className="pc-meta">
                <div className="pc-title">{item.title}</div>
                <p className="pc-subtitle">{item.subtitle}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
      <div className="pc-carousel-mask" aria-hidden="true" />

      <style>{`
        .pc-carousel-section {
          --card-size: clamp(220px, 28vw, 360px);
          position: relative;
          isolation: isolate;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          overflow: visible;
          padding: var(--space-6) 0;
        }
        .pc-carousel-section::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: radial-gradient(120% 90% at 50% 50%, var(--color-bg-raised), var(--color-bg));
        }
        .pc-carousel-mask {
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 2;
          background: linear-gradient(90deg, var(--color-bg) 0%, transparent 8%, transparent 92%, var(--color-bg) 100%);
        }
        .pc-viewport {
          position: relative;
          z-index: 1;
          width: 100%;
          min-width: 0;
          overflow: hidden;
          touch-action: pan-y;
          user-select: none;
          cursor: grab;
        }
        .pc-viewport.is-grabbing {
          cursor: grabbing;
        }
        .pc-track {
          position: relative;
          display: flex;
          width: max-content;
          will-change: transform;
          gap: clamp(18px, 2.6vw, 40px);
          /* Top padding is headroom, not spacing: EyeCursorItem's cursor
             sprite can extend up to 28px above the card image when the
             pointer sits right at the image's own top edge. .pc-viewport
             clips this track to make the horizontal loop work, and without
             this padding that same clip silently cropped the cursor too —
             same root cause as the logo carousel's arrow-cropping bug.
             (Bottom needs no equivalent: .pc-meta's title/subtitle text
             already gives more than 28px of slack below the image.) */
          padding: 32px clamp(16px, 4vw, 48px) 0;
        }
        .pc-card {
          position: relative;
          display: block;
          text-decoration: none;
          color: var(--color-fg);
          width: var(--card-size);
          flex: 0 0 auto;
          user-select: none;
        }
        .pc-image-frame {
          width: 100%;
          aspect-ratio: 1 / 1;
        }
        .pc-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: grayscale(1) saturate(0.28);
          transition: filter var(--duration-base) var(--ease-standard);
        }
        .pc-card:hover .pc-image,
        .pc-card:focus-visible .pc-image {
          filter: grayscale(0) saturate(1.04);
        }
        .pc-meta {
          margin-top: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .pc-title {
          font-size: var(--text-sm);
          font-weight: var(--weight-regular);
          color: var(--color-fg);
          transition: color var(--duration-fast) var(--ease-standard);
        }
        .pc-card:hover .pc-title,
        .pc-card:focus-visible .pc-title {
          color: var(--accent, var(--color-fg));
        }
        .pc-subtitle {
          margin: 0;
          font-size: var(--text-sm);
          font-style: italic;
          color: var(--color-fg-muted);
        }
        .pc-card:focus-visible {
          outline: 2px solid var(--color-fg);
          outline-offset: 6px;
        }
        @media (max-width: 720px), (hover: none), (pointer: coarse) {
          .pc-image {
            transition: none;
            filter: grayscale(0) saturate(1.04);
          }
        }
      `}</style>
    </section>
  );
}
