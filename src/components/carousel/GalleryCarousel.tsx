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
  colorful = false,
}: {
  items: GalleryCarouselItem[];
  shape?: Shape;
  // Opts out of the shape's own default desaturate-at-rest/reveal-on-hover
  // filter — see content.config.ts's "carousel" colorful field.
  colorful?: boolean;
}) {
  const isDraggingRef = useRef(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const loopItems = useMemo(() => [...items, ...items], [items]);
  // Matches PortfolioCarousel/LogoCarousel exactly — every drag carousel on
  // the site shares the same speed/hover feel now, regardless of shape.
  // Shape keeps its own visual treatment (shell radius, bare styling, the
  // icon pixel-grid lightbox) below, just not its own physics anymore.
  const { trackRef, isGrabbing, onMouseEnter, onMouseLeave, onClickCapture } = useDragCarousel({
    baseSpeed: 42,
    hoverSpeed: 9,
  });
  isDraggingRef.current = isGrabbing;

  return (
    <div
      className={`gallery-carousel gallery-carousel--${shape}${colorful ? " gallery-carousel--colorful" : ""}${isGrabbing ? " is-grabbing" : ""}`}
      onClickCapture={onClickCapture}
    >
      <div ref={trackRef} className="gallery-carousel__track">
        {loopItems.map((item, index) =>
          colorful ? (
            // No hover, no slowdown, no lightbox, no eye cursor — this
            // variant is a set of product renders meant to just sit there
            // and be dragged, not individually interactive tiles. Plain
            // img in a plain div, none of the button/EyeCursorItem/hover-
            // handler machinery the interactive shapes need.
            <div className="gallery-carousel__item" key={`${item.src}-${index}`} aria-hidden={index >= items.length}>
              <img className="gallery-carousel__image" src={item.src} alt={item.alt} draggable={false} />
            </div>
          ) : (
            <div
              className="gallery-carousel__item"
              key={`${item.src}-${index}`}
              aria-hidden={index >= items.length}
              // Per-item, not on the padded outer track (see
              // useDragCarousel's own hoverCountRef comment) — the track's
              // cursor-headroom padding otherwise counted as "hovering the
              // carousel" before the pointer reached an actual tile.
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
            >
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
          ),
        )}
      </div>

      {!colorful && (
        <Lightbox
          items={items}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          pixelGrid={shape === "icon"}
          shape={shape}
        />
      )}

      <style>{`
        .gallery-carousel {
          overflow: hidden;
          min-width: 0;
          width: 100%;
          /* pan-y (not the bare default) hands vertical scroll to the
             native page while useDragCarousel's JS claims horizontal drag —
             but touch-action's allowed-gesture list is exhaustive, so
             pan-y alone silently also blocks pinch-zoom over this element
             (the one place on the site users most want to pinch into an
             image for detail). Appending pinch-zoom restores it without
             giving back the horizontal axis. */
          touch-action: pan-y pinch-zoom;
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
        /* Opts out of the shape's own desaturate-at-rest/reveal-on-hover
           filter entirely — full colour always, no hover-driven change (no
           button/hover-state even exists for this variant — see the item
           markup above). */
        .gallery-carousel--colorful .gallery-carousel__image {
          filter: none;
          transition: none;
        }
        /* No cursor headroom needed (colorful items skip EyeCursorItem
           entirely, so there's no cursor sprite to clip). */
        .gallery-carousel--colorful .gallery-carousel__track {
          gap: clamp(48px, 9.6vw, 108px);
          padding-block: 16px;
        }
        /* Width follows the image's own aspect ratio at a fixed height,
           not a fixed square — .pc-image-frame's own object-fit: contain
           approach would otherwise leave a lot of empty side-padding
           inside each tile for artwork this narrow/tall (product bottle
           renders), which read as extra gap on top of the track's own and
           worked against "standing close together". */
        .gallery-carousel--colorful .gallery-carousel__item {
          width: auto;
          height: 560px;
        }
        .gallery-carousel--colorful .gallery-carousel__image {
          width: auto;
          height: 100%;
          object-fit: contain;
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
          /* No border-radius here: the portrait SVGs already self-mask to
             an identical circle internally. Stacking a second,
             independently-rasterized CSS circular clip on top caused the
             hover filter transition below to visibly shimmer/flicker right
             at the boundary on portraits with a bright, saturated edge
             color — the two anti-aliased edges don't quite agree pixel-for-
             pixel, and the saturate/grayscale transition made that
             mismatch visible exactly where it was brightest. */
          filter: grayscale(1) saturate(0.3);
          transition: filter var(--duration-base) var(--ease-standard);
          will-change: filter;
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
        /* inset matches .gallery-carousel__image's own padding (both are
           positioned against the same .eye-cursor-item__shell), not 0 —
           the image is object-fit:contain within that padded content box,
           so a grid spanning the full unpadded shell doesn't line its
           cells up with the icon's own edges. */
        .gallery-carousel__pixel-grid {
          position: absolute;
          inset: var(--space-3);
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
          /* Colorful carousels also carry --square (shape defaults to
             "square"), so without this override the rule above would clamp
             these tall/narrow bottle renders down to a small square instead
             of just scaling the same auto-width/fixed-height box down. */
          .gallery-carousel--colorful .gallery-carousel__item {
            width: auto;
            height: min(70vh, 480px);
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
