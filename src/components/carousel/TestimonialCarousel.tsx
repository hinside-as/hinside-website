import { useEffect, useRef, useState } from "react";

export type TestimonialCarouselItem = { quote: string; name: string; role: string };

// How long each quote holds before crossfading to the next — long enough to
// read a short quote without feeling rushed, short enough that the slide
// doesn't feel static if someone lingers on it.
const HOLD_MS = 7000;

/**
 * A single focal quote centered on the slide, crossfading to the next one
 * on a timer — replaces the earlier side-scrolling drag-carousel treatment
 * shared with Portfolio/Logo, which never suited testimonials: with one
 * quote at a time being the point (unlike browsing several portfolio
 * tiles), a horizontal strip just showed the same card twice while
 * dragging. All quotes are stacked in the same CSS grid cell (grid-area:
 * 1 / 1) so the container's height always matches the tallest one without
 * any manual measurement, and only opacity/pointer-events change to
 * crossfade — no transform, no drag physics, nothing native scrolling
 * would need to fight with. --duration-slow (and prefers-reduced-motion's
 * override of it to 0ms, see tokens.css) drives the fade, so this already
 * degrades to an instant swap under reduced motion for free.
 */
export default function TestimonialCarousel({ items }: { items: TestimonialCarouselItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const isPausedRef = useRef(false);

  useEffect(() => {
    if (items.length < 2) return;
    const id = window.setInterval(() => {
      if (isPausedRef.current) return;
      setActiveIndex((current) => (current + 1) % items.length);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [items.length]);

  return (
    <section
      className="tc-carousel-section"
      aria-label="Testimonials"
      // Pausing on hover/focus keeps a mid-read quote from being swapped
      // out from under whoever's actually reading it.
      onMouseEnter={() => (isPausedRef.current = true)}
      onMouseLeave={() => (isPausedRef.current = false)}
      onFocus={() => (isPausedRef.current = true)}
      onBlur={() => (isPausedRef.current = false)}
    >
      <div className="tc-stack">
        {items.map((item, index) => (
          <blockquote className="tc-card" key={item.name} data-active={index === activeIndex} aria-hidden={index !== activeIndex}>
            <svg className="tc-mark tc-mark--open" viewBox="0 0 40 32" aria-hidden="true">
              <path d="M8 16H16V32H0V8H8V16Z" />
              <path d="M32 16H40V32H24V8H32V16Z" />
              <path d="M16 8H8V0H16V8Z" />
              <path d="M40 8H32V0H40V8Z" />
            </svg>
            <p>{item.quote}</p>
            <svg className="tc-mark tc-mark--close" viewBox="0 0 40 32" aria-hidden="true">
              <path d="M8 32H0V24H8V32Z" />
              <path d="M32 32H24V24H32V32Z" />
              <path d="M16 24H8V16H0V0H16V24Z" />
              <path d="M40 24H32V16H24V0H40V24Z" />
            </svg>
            <footer>
              <span className="tc-name">{item.name}</span>
              <span className="tc-role">{item.role}</span>
            </footer>
          </blockquote>
        ))}
      </div>

      <style>{`
        .tc-carousel-section {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: var(--space-6) 0;
        }
        /* Every card occupies the same single grid cell — the container's
           own height is then just "as tall as the tallest card" for free,
           with no JS measuring needed, and swapping which card is opaque
           is the entire crossfade. */
        .tc-stack {
          position: relative;
          display: grid;
          width: 100%;
          max-width: 34rem;
          padding-inline: var(--space-4);
        }
        .tc-card {
          grid-area: 1 / 1;
          margin: 0;
          text-align: left;
          user-select: none;
          opacity: 0;
          pointer-events: none;
          transition: opacity var(--duration-slow) var(--ease-standard);
        }
        .tc-card[data-active="true"] {
          opacity: 1;
          pointer-events: auto;
        }
        .tc-mark {
          display: block;
          width: 40px;
          height: 32px;
          fill: var(--color-fg-muted);
        }
        .tc-mark--open {
          margin: 0 0 var(--space-3);
        }
        .tc-mark--close {
          /* Trails the quote at its own line's end, not flush-left like the
             opening mark — margin-left: auto pushes it to the right edge
             within the card's block layout. */
          margin: var(--space-3) 0 0 auto;
        }
        .tc-card p {
          margin: 0;
          font-size: var(--text-sm);
          line-height: var(--leading-normal);
        }
        .tc-card footer {
          margin-top: var(--space-4);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          font-size: var(--text-xs);
        }
        .tc-name {
          color: var(--color-fg);
        }
        .tc-role {
          color: var(--color-fg-muted);
        }
      `}</style>
    </section>
  );
}
