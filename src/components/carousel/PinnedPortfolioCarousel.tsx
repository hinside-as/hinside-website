import { useEffect, useRef, type CSSProperties } from "react";
import EyeCursorItem from "./EyeCursorItem";
import type { PortfolioItem } from "./PortfolioCarousel";
import { caseCoverTransitionName } from "../../lib/viewTransitions";

export type PinnedPortfolioItem = PortfolioItem & { slug: string };

type TrackEntry =
  | { kind: "text"; key: string; text: string }
  | { kind: "project"; key: string; item: PinnedPortfolioItem };

// The max distance (in px) any card's image is allowed to drift from
// center — each card reaches exactly this, in either direction, right as
// its own edge crosses the viewport's edge (see apply()'s own per-card
// rate calculation), and exactly 0 when the card is centered. See
// .pppc-image's own width-only oversize below (220%/-60%) for the OTHER
// constraint on this number — it's NOT free to keep pushing up, despite
// width-only oversizing being safe from the both-axes bug an earlier
// version had (see .pppc-image's own comment): it has its OWN ceiling.
// Oversizing width changes the img box's own aspect ratio away from the
// frame's 3:4 — push it far enough (past source photo's aspect ÷ frame's
// aspect, 16:9 ÷ 3:4 ≈ 2.37, i.e. 237%) and the box becomes proportionally
// WIDER than the source photo itself, which flips which axis object-fit:
// cover treats as the tight one. Once width is the tight axis, cover crops
// the photo's TOP/BOTTOM to compensate — the exact "why is this cropped
// vertically again" bug, just from pushing this value instead of
// oversizing height. 220% (safely under 237%, with margin for a hero
// photo that isn't pixel-exactly 16:9) is the practical ceiling for how
// generous the oversize — and so this range — can get while every
// project's hero photo stays around the documented 2560x1440 — see
// docs/case-study-assets.md.
const PARALLAX_RANGE_PX = 140;


/**
 * The homepage's Work section: a pinned viewport whose track moves
 * horizontally in lockstep with the page's own vertical scroll (the
 * caiguangxi.com reference the design brief pointed at), then releases into
 * the next section once the track runs out — no drag, no momentum, no
 * hijacked wheel/touch events. This is still 100% native scrolling; the only
 * thing JS does is read the real scroll position every frame and mirror it
 * into a horizontal transform (and, from each card's own live on-screen
 * position, a small per-card parallax offset — see apply()'s own comment).
 * Every card shares this one track transform, so they all move at the same
 * pixels-per-second by construction; nothing here gives any individual
 * card its own speed through the viewport, even though each one's own
 * parallax *value* differs by where it currently sits on screen.
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
    let stickyLeft = 0;
    let stickyWidth = 0;
    let cardWidth = 0;
    // Each card's offset from the track's own left edge — transform-
    // invariant (a translateX shifts the track and everything inside it by
    // the same amount, so the *difference* between a card's edge and the
    // track's own edge never changes because of it), which is exactly what
    // makes it safe to measure once here instead of every scroll frame.
    let cardOffsets: number[] = [];
    let cardEls: HTMLElement[] = [];

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

      // Everything the per-frame parallax math (in apply(), the actual
      // scroll hot path) needs, measured once here instead of via its own
      // getBoundingClientRect() calls every frame. That distinction matters:
      // apply() already writes track.style.transform earlier in the same
      // frame, and a getBoundingClientRect() read right after a style write
      // forces the browser to synchronously flush layout to answer it
      // accurately — six-plus forced reflows a frame (sticky, every card)
      // stacked on top of that write is real main-thread work, exactly the
      // kind that shows up as dropped frames / a less smooth scroll. None of
      // these values actually change mid-scroll (sticky's own left/width are
      // fixed by the page layout; a card's offset from the track's own edge
      // is transform-invariant — see cardOffsets' own comment), so there's
      // nothing lost by only ever measuring them here, on mount and resize.
      const stickyRect = sticky.getBoundingClientRect();
      stickyLeft = stickyRect.left;
      stickyWidth = stickyRect.width;
      const trackRect = track.getBoundingClientRect();
      cardEls = Array.from(track.querySelectorAll<HTMLElement>(".pppc-card"));
      cardWidth = cardEls[0]?.getBoundingClientRect().width ?? 0;
      cardOffsets = cardEls.map((card) => card.getBoundingClientRect().left - trackRect.left);
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

      // Parallax: a per-card value — each card's image should read as
      // centered exactly when that card itself is centered in the
      // viewport, which a single shared value (an earlier version's
      // approach) can only ever be true for at most one card at a time.
      // What makes this still read as one consistent effect rather than
      // each card doing its own independent thing is the RATE, not the
      // value: every card moves through the viewport at the exact same
      // pixels-per-scroll (the whole track is one rigid transform — see
      // above), and this offset is a strictly linear function of a card's
      // own live distance from viewport-center, so its own rate of change
      // is identical to every other card's at every instant, even though
      // the resulting values differ by position (a card near either edge
      // sits near ±PARALLAX_RANGE_PX, one centered sits at 0). `halfSpan`
      // is solved so that distance, not a fixed range, so a card hits
      // exactly ±PARALLAX_RANGE_PX right as its own leading/trailing edge
      // crosses the viewport's edge — the offset is actively changing for
      // the entire time a card is visible at all, not just somewhere in
      // the middle of its pass.
      //
      // Every position used here is computed from cardOffsets/stickyLeft/
      // stickyWidth (measure()'s own cached values) plus the clamped/
      // -clamped already worked out above — no getBoundingClientRect() in
      // this function at all, deliberately: a read right after the
      // transform write above would force a synchronous layout flush to
      // answer it, once per card, every single scroll frame.
      const viewportCenter = stickyLeft + stickyWidth / 2;
      const halfSpan = stickyWidth / 2 + cardWidth / 2;
      const rate = halfSpan > 0 ? PARALLAX_RANGE_PX / halfSpan : 0;
      const trackLeft = stickyLeft - clamped;
      cardEls.forEach((card, i) => {
        const cardCenter = trackLeft + cardOffsets[i] + cardWidth / 2;
        const offset = Math.max(
          -PARALLAX_RANGE_PX,
          Math.min(PARALLAX_RANGE_PX, (cardCenter - viewportCenter) * rate),
        );
        card.style.setProperty("--pppc-parallax", `${offset.toFixed(1)}px`);
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
        /* Oversized on WIDTH ONLY (not both axes, unlike an earlier 160%/
           -30% version) — see PARALLAX_RANGE_PX's own comment for the
           ceiling this has to stay under (220% is deliberately well inside
           it, not pushed to the edge). object-fit: cover's own scale is
           set by whichever axis needs more zoom to fully cover the box:
           height, as long as the box stays proportionally narrower than
           the source photo. Leaving height at a plain 100% keeps that true
           regardless of how much extra WIDTH room this gives the parallax
           pan below — the full height always shows, cropping only ever
           eats into the sides. Oversizing height too (an earlier version's
           mistake) changes the box's own aspect ratio the same way pushing
           width too far does — either one flips cover's tight axis and
           crops the top/bottom instead. Margin only on the inline axis to
           recenter the extra width; no vertical margin needed since height
           was never oversized. */
        .pppc-image {
          display: block;
          width: 220%;
          height: 100%;
          margin-inline: -60%;
          max-width: none;
          object-fit: cover;
          filter: grayscale(1) saturate(0.28);
          transform: translateX(var(--pppc-parallax, 0px));
          transition: filter var(--duration-base) var(--ease-standard);
          /* This is the element actually getting a new transform every
             scroll frame (the per-card --pppc-parallax custom property) —
             .pppc-track's own will-change only promotes the track itself,
             not each image, to its own compositor layer. Without this, the
             browser can end up repainting instead of purely compositing
             the transform change on scroll. */
          will-change: transform;
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
