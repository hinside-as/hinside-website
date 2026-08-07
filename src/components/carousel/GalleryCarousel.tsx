import { useMemo, useRef, useState } from "react";
import { useDragCarousel } from "../../hooks/useDragCarousel";
import EyeCursorItem from "./EyeCursorItem";
import Lightbox from "./Lightbox";

export type GalleryCarouselItem = {
  src: string;
  alt: string;
};

type Shape = "square" | "circle" | "icon";

const SHELL_RADIUS: Record<Shape, string> = {
  square: "8px",
  circle: "50%",
  icon: "8px",
};

export default function GalleryCarousel({
  items,
  shape = "square",
}: {
  items: GalleryCarouselItem[];
  shape?: Shape;
}) {
  const isDraggingRef = useRef(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const loopItems = useMemo(() => [...items, ...items], [items]);
  const { trackRef, isGrabbing, onMouseEnter, onMouseLeave, onClickCapture } = useDragCarousel({
    baseSpeed: shape === "icon" ? 22 : 26,
    hoverSpeed: 7,
  });
  isDraggingRef.current = isGrabbing;

  return (
    <div
      className={`gallery-carousel gallery-carousel--${shape}${isGrabbing ? " is-grabbing" : ""}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClickCapture={onClickCapture}
    >
      <div ref={trackRef} className="gallery-carousel__track">
        {loopItems.map((item, index) => (
          <div className="gallery-carousel__item" key={`${item.src}-${index}`} aria-hidden={index >= items.length}>
            <button
              type="button"
              className="gallery-carousel__button"
              aria-label={`View ${item.alt}`}
              tabIndex={index >= items.length ? -1 : 0}
              onClick={() => {
                if (!isDraggingRef.current) setLightboxIndex(index % items.length);
              }}
            >
              <EyeCursorItem isCarouselDragging={() => isDraggingRef.current} bare radius={SHELL_RADIUS[shape]}>
                <img className="gallery-carousel__image" src={item.src} alt={item.alt} draggable={false} />
                {shape === "icon" && <span className="gallery-carousel__pixel-grid" aria-hidden="true" />}
              </EyeCursorItem>
            </button>
          </div>
        ))}
      </div>

      <Lightbox
        items={items}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
        pixelGrid={shape === "icon"}
        shape={shape}
      />

      <style>{`
        .gallery-carousel {
          overflow: hidden;
          min-width: 0;
          width: 100%;
          touch-action: pan-y;
          user-select: none;
          cursor: grab;
        }
        .gallery-carousel.is-grabbing {
          cursor: grabbing;
        }
        .gallery-carousel__track {
          display: flex;
          width: max-content;
          gap: clamp(18px, 2.6vw, 40px);
          /* Vertical padding is headroom, not spacing: EyeCursorItem's
             cursor sprite can extend up to 28px past the shell it's
             hovering (its hotspot offset) when the pointer sits right at
             the shell's own top/bottom edge. .gallery-carousel clips this
             track to make the horizontal loop work, and without this
             padding that same clip silently cropped the cursor too — same
             root cause as the logo carousel's arrow-cropping bug. */
          padding: 32px clamp(16px, 4vw, 48px);
          will-change: transform;
        }
        .gallery-carousel__item {
          flex: 0 0 auto;
        }
        .gallery-carousel__button {
          display: block;
          width: 100%;
          height: 100%;
          background: none;
          border: none;
          padding: 0;
          margin: 0;
          cursor: pointer;
        }
        .gallery-carousel__button:focus-visible {
          outline: 2px solid var(--color-fg);
          outline-offset: 6px;
        }

        /* Illustrations: full colour, revealed from mono on hover — same
           language as the homepage portfolio carousel. Matches the
           original's 384px stage. */
        .gallery-carousel--square .gallery-carousel__item {
          width: 384px;
          height: 384px;
        }
        .gallery-carousel--square .gallery-carousel__image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: grayscale(1) saturate(0.28);
          transition: filter var(--duration-base) var(--ease-standard);
        }
        .gallery-carousel--square .gallery-carousel__button:hover .gallery-carousel__image,
        .gallery-carousel--square .gallery-carousel__button:focus-visible .gallery-carousel__image {
          filter: grayscale(0) saturate(1.04);
        }

        /* Portraits: circular, same colour reveal, matches the original's
           192px stage. */
        .gallery-carousel--circle .gallery-carousel__item {
          width: 192px;
          height: 192px;
        }
        .gallery-carousel--circle .gallery-carousel__image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          filter: grayscale(1) saturate(0.3);
          transition: filter var(--duration-base) var(--ease-standard);
        }
        .gallery-carousel--circle .gallery-carousel__button:hover .gallery-carousel__image,
        .gallery-carousel--circle .gallery-carousel__button:focus-visible .gallery-carousel__image {
          filter: grayscale(0) saturate(1.05);
        }

        /* Icons: small, always monochrome, dim-to-bright on hover rather
           than a colour reveal, plus a pointer-tracked pixel-grid overlay
           evoking the icon system's native 24×24 grid. Matches the
           original's 192px stage. */
        .gallery-carousel--icon .gallery-carousel__item {
          width: 192px;
          height: 192px;
        }
        .gallery-carousel--icon .gallery-carousel__image {
          width: 100%;
          height: 100%;
          /* A little breathing room: the source icons don't share consistent
             internal padding, so some (e.g. a bare download glyph) touch the
             tile edges at 100% while others sit comfortably inset. */
          padding: var(--space-3);
          object-fit: contain;
          filter: grayscale(1) saturate(0) brightness(0.68) contrast(1.05);
          transition: filter var(--duration-base) var(--ease-standard);
          image-rendering: pixelated;
        }
        .gallery-carousel--icon .gallery-carousel__button:hover .gallery-carousel__image,
        .gallery-carousel--icon .gallery-carousel__button:focus-visible .gallery-carousel__image {
          filter: grayscale(1) saturate(0) brightness(1.45) contrast(1.08);
        }
        .gallery-carousel__pixel-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(to right, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 1px, transparent 1px);
          background-size: calc(100% / 24) calc(100% / 24);
          -webkit-mask-image: radial-gradient(150% 120% at var(--glint-x, 50%) var(--glint-y, 50%),
            rgba(0, 0, 0, 0.94) 0%, rgba(0, 0, 0, 0.72) 34%, rgba(0, 0, 0, 0.24) 68%, transparent 100%);
          mask-image: radial-gradient(150% 120% at var(--glint-x, 50%) var(--glint-y, 50%),
            rgba(0, 0, 0, 0.94) 0%, rgba(0, 0, 0, 0.72) 34%, rgba(0, 0, 0, 0.24) 68%, transparent 100%);
          mix-blend-mode: screen;
          opacity: 0;
          transition: opacity var(--duration-base) var(--ease-standard);
        }
        .gallery-carousel--icon .gallery-carousel__button:hover .gallery-carousel__pixel-grid,
        .gallery-carousel--icon .gallery-carousel__button:focus-visible .gallery-carousel__pixel-grid {
          opacity: 0.3;
        }

        @media (max-width: 720px) {
          .gallery-carousel--square .gallery-carousel__item {
            width: min(70vw, 320px);
            height: min(70vw, 320px);
          }
          .gallery-carousel--circle .gallery-carousel__item,
          .gallery-carousel--icon .gallery-carousel__item {
            width: min(40vw, 160px);
            height: min(40vw, 160px);
          }
        }
        @media (max-width: 720px), (hover: none), (pointer: coarse) {
          .gallery-carousel__image {
            transition: none;
          }
          .gallery-carousel--square .gallery-carousel__image,
          .gallery-carousel--circle .gallery-carousel__image {
            filter: grayscale(0) saturate(1.05);
          }
          .gallery-carousel--icon .gallery-carousel__image {
            filter: grayscale(1) saturate(0) brightness(1.1) contrast(1.05);
          }
        }
      `}</style>
    </div>
  );
}
