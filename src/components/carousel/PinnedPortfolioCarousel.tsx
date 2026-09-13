import { useEffect, useRef, type CSSProperties } from "react";
import EyeCursorItem from "./EyeCursorItem";
import type { PortfolioItem } from "./PortfolioCarousel";
import { caseCoverTransitionName } from "../../lib/viewTransitions";

export type PinnedPortfolioItem = PortfolioItem & { slug: string };

type TrackEntry =
  | { kind: "text"; key: string; text: string }
  | { kind: "project"; key: string; item: PinnedPortfolioItem };

// How far (in px) every image is allowed to drift inside its own frame — a
// deliberately modest value relative to even the smallest card this ever
// renders at (the min(384px, 78vw) mobile floor), since object-fit: contain
// (see .pppc-image below) only has its own letterbox space to absorb the
// pan in before it'd start revealing the frame's bare background on the
// trailing edge.
const PARALLAX_RANGE_PX = 70;


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
  const introRef = useRef<HTMLParagraphElement | null>(null);
  const outroRef = useRef<HTMLParagraphElement | null>(null);

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
      // Leading/trailing padding is computed, not the flat CSS clamp() it
      // used to be, so the *first project card's* left edge lands exactly
      // at viewport-center when the track is untransformed, and the *last
      // project card's* right edge lands there too once fully scrolled —
      // both ends framed the same way, with the intro/outro quote peeking
      // in from off-center rather than the cards themselves starting
      // mid-screen. Solving for it: card1.left = padding + introWidth + gap
      // must equal half the viewport width, so padding = half width minus
      // introWidth minus gap (and symmetrically for the trailing side,
      // since maxTranslate itself falls out of the track's total width —
      // see the comment below on why that's enough to also place the last
      // card correctly with no separate calculation needed there).
      const gapPx = parseFloat(getComputedStyle(track).columnGap) || 0;
      const viewportWidth = sticky.clientWidth;
      const introWidth = introRef.current?.getBoundingClientRect().width ?? 0;
      const outroWidth = outroRef.current?.getBoundingClientRect().width ?? 0;
      const paddingStart = Math.max(0, viewportWidth / 2 - gapPx - introWidth);
      const paddingEnd = Math.max(0, viewportWidth / 2 - gapPx - outroWidth);
      track.style.paddingInlineStart = `${paddingStart}px`;
      track.style.paddingInlineEnd = `${paddingEnd}px`;

      maxTranslate = Math.max(0, track.scrollWidth - sticky.clientWidth);
      section.style.height = `${sticky.clientHeight + maxTranslate}px`;
    };

    const apply = () => {
      // getBoundingClientRect().top, not window.scrollY directly: this is
      // robust to whatever sits above the section (see HomeExperience's own
      // negative margin-top on .hs__work, which cancels the header's
      // reserved space so this section's top already sits at the viewport's
      // top edge from the very first frame — without that, there's a window
      // where the section hasn't reached position: sticky's stuck state yet
      // but this was already translating the track, reading as the whole
      // carousel drifting diagonally instead of purely sideways). Live
      // getBoundingClientRect() also can't go stale the way a once-measured
      // offsetTop can (see this function's git history for that bug).
      const raw = -section.getBoundingClientRect().top;
      const clamped = Math.min(Math.max(raw, 0), maxTranslate);
      track.style.transform = `translate3d(${-clamped}px, 0, 0)`;

      // Parallax: one shared value, the same for every image at every
      // instant, not a per-card calculation — two earlier versions tied it
      // to each card's own distance from the sticky viewport's center
      // (first the card's own width, then the viewport's), and both still
      // made a card's drift depend on *where it currently sat on screen*.
      // That meant different cards visible at once were at different points
      // in their own individual curve — one barely moving, another mid-
      // swing — which reads as inconsistent rates even though each one's
      // own math was internally consistent. What was actually wanted is
      // simpler: every photo sits on one shared depth plane behind the
      // cards' frames, so the *same* offset applies to all of them
      // regardless of position, the way a background layer in any
      // multi-plane parallax scrolls independently of the foreground
      // elements passing in front of it rather than reacting to each one.
      //
      // A repeating wave (tried next) was still wrong in a different way:
      // it reset/reversed every couple thousand pixels of scroll, so the
      // same conceptual point in the shared background swung back and
      // forth locally instead of drifting in one direction across the
      // *entire* carousel. A single linear ramp from -PARALLAX_RANGE_PX at
      // the very start of the pin to +PARALLAX_RANGE_PX at the very end —
      // driven by clamped/maxTranslate, the same 0..1 progress already
      // used for everything else here — has no reversal and no easing,
      // just one continuous sweep for the whole scroll journey. Setting it
      // once here on .pppc-track lets ordinary CSS custom-property
      // inheritance carry it down to every .pppc-image at once instead of
      // writing it to each one individually.
      const progress = maxTranslate > 0 ? clamped / maxTranslate : 0;
      const parallaxOffset = (progress * 2 - 1) * PARALLAX_RANGE_PX;
      track.style.setProperty("--pppc-parallax", `${parallaxOffset.toFixed(1)}px`);
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
              <p
                key={entry.key}
                className="pppc-quote"
                ref={entry.key === "intro" ? introRef : outroRef}
              >
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
          background: var(--color-white);
          color: var(--color-black);
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
          /* Static fallback only — the effect above overrides both sides
             via inline style once mounted, computing them so the first/last
             project card lands flush with viewport-center at either end of
             the scroll (see measure()'s own comment). This value only ever
             shows pre-hydration or under prefers-reduced-motion, where the
             effect bails out entirely and this becomes a plain scrollable
             strip instead. */
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
          aspect-ratio: 3 / 4;
          overflow: hidden;
        }
        /* .pppc-card's own height (what .pppc-track's align-items: center
           actually aligns by) is deliberately just the image frame's —
           title/subtitle live outside normal flow (see .pppc-meta's
           position: absolute below) instead of stacking underneath it, so
           a card whose title happens to wrap to a second line can't make
           that one card's box taller than the others and throw off
           everyone's shared center. Every card uses the same --card-size,
           so with meta out of the height calculation entirely, all four
           are now exactly the same height by construction, not just
           usually the same height. */
        /* object-fit: contain, not cover — a project's hero photo isn't
           always close to the frame's own 3:4 portrait ratio (a wide
           landscape shot, say), and cropping it to fill would cut away
           most of the image rather than showing what it actually is. The
           frame's own background shows through as letterboxing on
           whichever axis the photo doesn't reach — same reference-site
           behavior as a photo inset on its own matte, not force-cropped to
           a fixed frame. No oversizing trick needed either (an earlier
           version scaled this to 160%/-30% purely to give the parallax
           pan room without ever exposing cover's cropped edge) — contain's
           own letterbox space already absorbs a small pan without needing
           that. */
        .pppc-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: grayscale(1) saturate(0.28);
          transform: translateX(var(--pppc-parallax, 0px));
          transition: filter var(--duration-base) var(--ease-standard);
        }
        .pppc-card:hover .pppc-image,
        .pppc-card:focus-visible .pppc-image {
          filter: grayscale(0) saturate(1.04);
        }
        .pppc-meta {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
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
