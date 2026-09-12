import { useEffect, useRef, type CSSProperties } from "react";
import EyeCursorItem from "./EyeCursorItem";
import type { PortfolioItem } from "./PortfolioCarousel";
import { caseCoverTransitionName } from "../../lib/viewTransitions";

export type PinnedPortfolioItem = PortfolioItem & { slug: string };

/**
 * The homepage's Work section: a pinned viewport whose track moves
 * horizontally in lockstep with the page's own vertical scroll (the
 * caiguangxi.com reference the design brief pointed at), then releases into
 * the next section once the track runs out — no drag, no momentum, no
 * hijacked wheel/touch events. This is still 100% native scrolling; the only
 * thing JS does is read the real scroll position every frame and mirror it
 * into a horizontal transform. See the effect below for exactly how the pin
 * height and the 1:1 scroll->translate mapping are derived.
 */
export default function PinnedPortfolioCarousel({ items }: { items: PinnedPortfolioItem[] }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const track = trackRef.current;
    if (!section || !sticky || !track) return;

    // Reduced motion gets the honest fallback instead of a faked-still
    // version of the same effect: no pin, no scroll-linked transform — just
    // a plain block that the CSS below turns into a native horizontally
    // scrollable strip (overflow-x: auto on .pppc-sticky). Skipping the
    // whole effect (rather than running it with animations disabled) means
    // no extra scroll distance is ever added to the page for a visitor who
    // asked for less motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let sectionTop = 0;
    let maxTranslate = 0;

    // 1px of vertical scroll == 1px of horizontal track movement, and the
    // section's own height is sized to exactly match that (one viewport for
    // the pin itself, plus however far the track has left to travel) — so
    // the sticky element releases at the exact instant the track finishes,
    // never a moment early or late. No separate "progress" fraction or
    // easing curve to keep in sync with a hand-picked section height.
    const measure = () => {
      sectionTop = section.offsetTop;
      maxTranslate = Math.max(0, track.scrollWidth - sticky.clientWidth);
      section.style.height = `${sticky.clientHeight + maxTranslate}px`;
    };

    const apply = () => {
      const raw = window.scrollY - sectionTop;
      const clamped = Math.min(Math.max(raw, 0), maxTranslate);
      track.style.transform = `translate3d(${-clamped}px, 0, 0)`;
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
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="pppc-card"
              aria-label={`${item.title} — ${item.subtitle}`}
              style={item.accent ? ({ "--accent": item.accent } as CSSProperties) : undefined}
            >
              <div className="pppc-image-frame">
                <EyeCursorItem isCarouselDragging={() => false}>
                  <img
                    className="pppc-image"
                    src={item.image}
                    alt={item.imageAlt}
                    style={{ viewTransitionName: caseCoverTransitionName(item.slug) }}
                  />
                </EyeCursorItem>
              </div>
              <div className="pppc-meta">
                <div className="pppc-title">{item.title}</div>
                <p className="pppc-subtitle">{item.subtitle}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <style>{`
        .pppc-pin {
          position: relative;
          width: 100%;
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
          width: max-content;
          gap: clamp(24px, 4vw, 64px);
          padding-inline: clamp(1rem, 6vw, var(--space-8, 6rem));
          will-change: transform;
        }
        .pppc-card {
          --card-size: clamp(280px, 34vw, 480px);
          position: relative;
          display: block;
          text-decoration: none;
          color: var(--color-fg);
          width: var(--card-size);
          flex: 0 0 auto;
        }
        .pppc-image-frame {
          width: 100%;
          aspect-ratio: 4 / 5;
        }
        .pppc-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: grayscale(1) saturate(0.28);
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
          color: var(--color-fg);
          transition: color var(--duration-fast) var(--ease-standard);
        }
        .pppc-card:hover .pppc-title,
        .pppc-card:focus-visible .pppc-title {
          color: var(--accent, var(--color-fg));
        }
        .pppc-subtitle {
          margin: 0;
          font-size: var(--text-sm);
          color: var(--color-fg-muted);
        }
        .pppc-card:focus-visible {
          outline: 2px solid var(--color-fg);
          outline-offset: 6px;
        }
        @media (max-width: 720px), (hover: none), (pointer: coarse) {
          .pppc-image {
            transition: none;
            filter: grayscale(0) saturate(1.04);
          }
          .pppc-title {
            transition: none;
          }
        }
        /* Reduced-motion fallback: no pin, no JS-driven transform (see the
           effect above, which bails out entirely under this same query) —
           just a normal block whose track becomes a native horizontally
           scrollable strip, so the content is still fully reachable. */
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
        }
      `}</style>
    </section>
  );
}
