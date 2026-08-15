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
// A slow drift, not a full stop — hovering eases the track down toward
// this rather than to 0, via the same exponential damping curve
// useDragCarousel already applies everywhere (no separate animation
// system, no gesture interception — this is still native pointer/wheel
// input driving a physically-damped velocity, same as before). Kept
// deliberately slow: .pc-meta's backdrop-filter: blur has to resample
// whatever's moving behind it every frame, and a fast hover speed here
// previously showed up as a visible flicker at the panel's edge — see the
// transition-delay on .pc-meta below, which gives this speed change time
// to actually settle before the blurred panel becomes prominent. Raised
// slightly from an earlier, even slower value: useDragCarousel's transform
// rounds to whole pixels every frame (see its own comment), so a target
// this close to 0 advanced well under a pixel per frame and only "moved"
// once every dozen-odd frames — visibly jaggy, stepping rather than
// gliding. Still well below BASE_SPEED, just no longer slow enough to
// under-run the pixel grid.
const HOVER_SPEED = 9;

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
              // Per-card, not on the padded outer viewport (see
              // useDragCarousel's own hoverCountRef comment) — the
              // viewport's box included the track's cursor-headroom
              // padding, so hovering visually-empty space around a card
              // already slowed the carousel down before the pointer
              // reached the card itself.
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
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
          /* .pc-title's own accent color is otherwise only a :hover/
             :focus-visible state (see above) — there's no hover on a
             touch device to ever trigger it, so without this override the
             title just sits at the plain --color-fg permanently. Always-
             on here matches the image's own always-color treatment right
             above: touch gets the "revealed" state by default instead of
             a state it can never reach. */
          .pc-title {
            color: var(--accent, var(--color-fg));
            transition: none;
          }
        }
        /* Desktop-only (real hover + fine pointer, matching the inverse of
           the touch override above): the title/subtitle/meta block moves
           from sitting below the image (the base/mobile layout, untouched)
           to overlaying its bottom edge, hidden until hover/focus.
           Hidden via opacity + a small translateY, not a full
           translateY(100%)-off-the-bottom slide — .pc-meta is absolutely
           positioned (removed from flow), so .pc-card's height at this
           breakpoint is just the image's; a full-height slide-out would
           rest one whole panel-height below the card, overlapping
           whatever sits in the track's gap after it (or the next card
           outright, since the panel is taller than the inter-card gap),
           and clipping it with overflow:hidden would also clip
           EyeCursorItem's own cursor sprite, which deliberately extends
           past the image's box (see .pc-track's padding comment above —
           same root cause, different symptom). A small offset plus
           opacity avoids needing to clip anything, while still reading as
           the text rising into place on hover.

           min-width: 721px on top of the hover/pointer check (mirroring
           the touch override's own max-width: 720px) matters for a
           different reason than device detection: a mouse user who's just
           narrowed their desktop browser window still reports
           hover:hover/pointer:fine, so without this the overlay would
           apply at "mobile" widths too, hiding the text below a narrow
           card entirely with no hover to reveal it (nothing to hover on a
           touch device, but also easy to trigger by simply resizing a
           desktop window). Tying it to the same 720px breakpoint the
           image-filter override already uses keeps "mobile" meaning the
           same width consistently across this component. */
        @media (min-width: 721px) and (hover: hover) and (pointer: fine) {
          /* Restores the same 32px cursor-sprite clearance at the bottom
             edge that the top edge already has (see .pc-track's own
             comment) — previously provided for free by .pc-meta's normal-
             flow height below the image, which this overlay treatment
             removes. */
          .pc-track {
            padding-bottom: 32px;
          }
          /* pointer-events: none unconditionally (not just while hidden)
             — this panel has no interactive content of its own, the whole
             .pc-card is already the link, and EyeCursorItem's hover
             tracking underneath needs pointermove/pointerenter/leave to
             keep reaching .eye-cursor-item__shell uninterrupted. Toggling
             this to auto once revealed (an earlier version did, treating
             "visible" and "interactive" as the same thing) made the panel
             itself start capturing pointer events the moment it faded in,
             which reads to the shell underneath as the pointer leaving it
             — the eye cursor would blink out the instant it crossed into
             the text panel's own area, exactly backwards from "stays
             visible while hovering the card." */
          .pc-meta {
            position: absolute;
            inset-inline: 0;
            bottom: 0;
            margin-top: 0;
            padding: var(--space-4) var(--space-3) var(--space-3);
            background: color-mix(in srgb, var(--color-bg) 78%, transparent);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            opacity: 0;
            pointer-events: none;
            transform: translateY(0.5rem);
            transition:
              transform var(--duration-fast) var(--ease-standard),
              opacity var(--duration-fast) var(--ease-standard);
          }
          .pc-card:hover .pc-meta,
          .pc-card:focus-visible .pc-meta {
            opacity: 1;
            transform: translateY(0);
            /* Delay applies only in this direction — a transition's timing
               comes from the rule being transitioned *into*, so leaving
               (back to the base .pc-meta rule above, which has no delay)
               still hides immediately. The delay gives the track's now-fast
               hover deceleration (see useDragCarousel) a moment to actually
               settle before the panel's own backdrop-filter starts
               rendering over it — without it, the blur could still catch a
               few frames of real motion right as it appears. */
            transition-delay: 100ms;
          }
        }
      `}</style>
    </section>
  );
}
