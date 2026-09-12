import { useEffect, useRef, type CSSProperties } from "react";
import EyeCursorItem from "./EyeCursorItem";
import type { PortfolioItem } from "./PortfolioCarousel";
import { caseCoverTransitionName } from "../../lib/viewTransitions";

export type PinnedPortfolioItem = PortfolioItem & { slug: string };

type TrackEntry =
  | { kind: "text"; key: string; text: string }
  | { kind: "project"; key: string; item: PinnedPortfolioItem };

// How far (in px) an image is allowed to drift inside its own frame as the
// track scrolls it past center — see .pppc-image's oversized 140%/-20%
// sizing below, which exists purely to give this room without exposing the
// frame's edges. Kept comfortably inside that 20%-per-side budget (~56px on
// the smallest card this ever renders at, the min(384px, 78vw) mobile floor)
// rather than pushing all the way to it.
const PARALLAX_RANGE_PX = 48;

/**
 * The homepage's Work section: a pinned viewport whose track moves
 * horizontally in lockstep with the page's own vertical scroll (the
 * caiguangxi.com reference the design brief pointed at), then releases into
 * the next section once the track runs out — no drag, no momentum, no
 * hijacked wheel/touch events. This is still 100% native scrolling; the only
 * thing JS does is read the real scroll position every frame and mirror it
 * into a horizontal transform (and, from that same position, a small
 * per-image parallax offset — see below). Every card shares this one
 * transform, so they all move at the same pixels-per-second by construction;
 * nothing here gives any individual card its own speed.
 */
export default function PinnedPortfolioCarousel({
  items,
  introText,
  outroText,
}: {
  items: PinnedPortfolioItem[];
  /** Text-only bookend slots woven into the same track as the project cards
   * (see the Figma spec) — not links, just the track's first and last
   * entries. */
  introText: string;
  outroText: string;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const imageRefs = useRef<Map<string, HTMLImageElement>>(new Map());

  const entries: TrackEntry[] = [
    { kind: "text", key: "intro", text: introText },
    ...items.map((item): TrackEntry => ({ kind: "project", key: item.slug, item })),
    { kind: "text", key: "outro", text: outroText },
  ];

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const track = trackRef.current;
    if (!section || !sticky || !track) return;

    // Reduced motion gets the honest fallback instead of a faked-still
    // version of the same effect: no pin, no scroll-linked transform, no
    // parallax — just a plain block that the CSS below turns into a native
    // horizontally scrollable strip (overflow-x: auto on .pppc-sticky).
    // Skipping the whole effect (rather than running it with animations
    // disabled) means no extra scroll distance is ever added to the page
    // for a visitor who asked for less motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let maxTranslate = 0;

    // 1px of vertical scroll == 1px of horizontal track movement, and the
    // section's own height is sized to exactly match that (one viewport for
    // the pin itself, plus however far the track has left to travel) — so
    // the sticky element releases at the exact instant the track finishes,
    // never a moment early or late. No separate "progress" fraction or
    // easing curve to keep in sync with a hand-picked section height.
    const measure = () => {
      maxTranslate = Math.max(0, track.scrollWidth - sticky.clientWidth);
      section.style.height = `${sticky.clientHeight + maxTranslate}px`;
    };

    const apply = () => {
      // getBoundingClientRect().top, not a cached window.scrollY minus a
      // once-measured section.offsetTop: an earlier version cached that
      // offset at mount, which silently went stale the moment anything
      // above this section reflowed afterward (a web font swapping in, an
      // image finishing its load) — scrollY would then map to the wrong
      // point in the section's own travel, and the track could render
      // permanently pinned at one end instead of animating. Reading the
      // live rect is unaffected by any offsetParent chain, is intrinsically
      // always current, and costs nothing this function wasn't already
      // paying for its own parallax measurement below.
      const raw = -section.getBoundingClientRect().top;
      const clamped = Math.min(Math.max(raw, 0), maxTranslate);
      track.style.transform = `translate3d(${-clamped}px, 0, 0)`;

      // Parallax: each image drifts opposite its own card's position
      // relative to the sticky viewport's center — zero exactly at center,
      // growing as the card approaches either edge — so it reads as the
      // photo lagging slightly behind the frame carrying it, not a fixed
      // offset. Same technique BaseLayout's own [data-parallax] elements
      // use for vertical drift (a distance-from-center factor written to a
      // CSS custom property), just measured horizontally here since that's
      // the axis this carousel actually moves on.
      //
      // Normalized against the card's own width, not the sticky viewport's —
      // a 384px card only ever travels roughly one card-width either side of
      // center before it's off-screen, so dividing by the *viewport's* half
      // width (easily 1000px+) kept the result pinned near zero for a
      // card's entire visible transit and the drift never read as anything.
      // Dividing by the card's own width means a card reaches full drift by
      // the time it's about a card-width off center — exactly the span it's
      // actually visible for. (/1.4 undoes .pppc-image's own 140% oversize,
      // since getBoundingClientRect() reports that inflated box, not the
      // frame's true width.)
      const stickyRect = sticky.getBoundingClientRect();
      const stickyCenter = stickyRect.left + stickyRect.width / 2;
      imageRefs.current.forEach((img) => {
        const cardRect = img.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const frameWidth = cardRect.width / 1.4;
        const normalized = (cardCenter - stickyCenter) / frameWidth;
        const offset = Math.max(-1, Math.min(1, normalized)) * PARALLAX_RANGE_PX;
        img.style.setProperty("--pppc-parallax", `${offset.toFixed(1)}px`);
      });
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        apply();
        ticking = false;
      });
    };

    measure();
    apply();

    const resizeObserver = new ResizeObserver(() => {
      measure();
      apply();
    });
    resizeObserver.observe(track);
    resizeObserver.observe(sticky);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, [items]);

  return (
    <section ref={sectionRef} className="pppc-pin" aria-label="Portfolio">
      <div ref={stickyRef} className="pppc-sticky">
        <div ref={trackRef} className="pppc-track">
          {entries.map((entry) =>
            entry.kind === "text" ? (
              <p key={entry.key} className="pppc-quote">
                {entry.text}
              </p>
            ) : (
              <a
                key={entry.key}
                href={entry.item.href}
                className="pppc-card"
                aria-label={`${entry.item.title} — ${entry.item.subtitle}`}
                style={entry.item.accent ? ({ "--accent": entry.item.accent } as CSSProperties) : undefined}
              >
                <div className="pppc-image-frame">
                  <EyeCursorItem isCarouselDragging={() => false}>
                    <img
                      ref={(el) => {
                        if (el) imageRefs.current.set(entry.key, el);
                        else imageRefs.current.delete(entry.key);
                      }}
                      className="pppc-image"
                      src={entry.item.image}
                      alt={entry.item.imageAlt}
                      style={{ viewTransitionName: caseCoverTransitionName(entry.item.slug) }}
                    />
                  </EyeCursorItem>
                </div>
                <div className="pppc-meta">
                  <div className="pppc-title">{entry.item.title}</div>
                  <p className="pppc-subtitle">{entry.item.subtitle}</p>
                </div>
              </a>
            ),
          )}
        </div>
      </div>

      <style>{`
        .pppc-pin {
          position: relative;
          width: 100%;
          background: #ebebeb;
          color: #141414;
        }
        .pppc-sticky {
          position: sticky;
          top: 0;
          height: 100svh;
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        .pppc-track {
          display: flex;
          align-items: center;
          width: max-content;
          gap: 24px;
          padding-inline: clamp(1rem, 6vw, var(--space-8, 6rem));
          will-change: transform;
        }
        /* Fixed 384px per the Figma spec (desktop), not a fluid clamp() —
           min() only steps in to keep it from overflowing a narrow phone
           screen, it never grows past 384px on anything wider. */
        .pppc-card {
          --card-size: min(384px, 78vw);
          position: relative;
          display: block;
          text-decoration: none;
          color: inherit;
          width: var(--card-size);
          flex: 0 0 auto;
        }
        .pppc-image-frame {
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
        }
        /* Oversized relative to its frame (140%, recentered with a -20%
           inset) purely so the parallax transform below has room to pan
           without ever revealing an edge — see PARALLAX_RANGE_PX's own
           comment in the component for the budget this stays inside. */
        .pppc-image {
          display: block;
          width: 140%;
          height: 140%;
          margin: -20%;
          max-width: none;
          object-fit: cover;
          filter: grayscale(1) saturate(0.28);
          transform: translateX(var(--pppc-parallax, 0px));
          transition: filter var(--duration-base) var(--ease-standard);
        }
        .pppc-card:hover .pppc-image,
        .pppc-card:focus-visible .pppc-image {
          filter: grayscale(0) saturate(1.04);
        }
        .pppc-meta {
          margin-top: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .pppc-title {
          font-size: var(--text-base);
          font-weight: var(--weight-regular);
          transition: color var(--duration-fast) var(--ease-standard);
        }
        .pppc-card:hover .pppc-title,
        .pppc-card:focus-visible .pppc-title {
          color: var(--accent, inherit);
        }
        .pppc-subtitle {
          margin: 0;
          font-size: var(--text-sm);
          opacity: 0.65;
        }
        .pppc-card:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 6px;
        }
        /* Half a card's width, matching the Figma spec exactly (384/2) —
           short enough that the line wraps into a handful of short lines
           rather than one long one, same visual weight as the image cards
           either side of it. */
        .pppc-quote {
          width: min(192px, 48vw);
          flex: 0 0 auto;
          margin: 0;
          font-size: var(--text-base);
          font-weight: var(--weight-thin);
          font-style: italic;
          line-height: 1.5;
        }
        @media (max-width: 720px), (hover: none), (pointer: coarse) {
          .pppc-image {
            transition: none;
            filter: grayscale(0) saturate(1.04);
          }
        }
        /* Reduced-motion fallback: no pin, no JS-driven transform or
           parallax (see the effect above, which bails out entirely under
           this same query) — just a normal block whose track becomes a
           native horizontally scrollable strip, so the content is still
           fully reachable. */
        @media (prefers-reduced-motion: reduce) {
          .pppc-sticky {
            position: static;
            height: auto;
            overflow-x: auto;
            padding-block: var(--space-4);
          }
          .pppc-track {
            transform: none !important;
          }
          .pppc-image {
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
}
