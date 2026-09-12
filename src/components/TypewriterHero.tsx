import { useEffect, useRef, useState } from "react";

// Tuning knob, not a derived value (unlike the portfolio carousel's own
// scroll-travel distance, which falls out of real content width) — there's
// no natural quantity to measure here, just a feel for how much scroll one
// character of typing should cost.
const PX_PER_CHARACTER = 24;

/**
 * The homepage's headline: the opening clause ("Design is solving
 * problems, not decoration") is already fully written by the time this
 * section scrolls into view, with a blinking caret at the end of it. Once
 * the section pins (its sticky viewport reaches the top of the screen),
 * further scrolling types out the rest of the sentence one character at a
 * time — the pin releases into the next section only once the whole thing
 * is written. Same pin-and-scrub technique as PinnedPortfolioCarousel
 * (section height set via JS to reserve exactly enough extra scroll, a
 * live getBoundingClientRect().top read every frame rather than a cached
 * offset), just driving a character count instead of a horizontal
 * transform.
 */
export default function TypewriterHero({
  navSection,
  staticText,
  revealText,
}: {
  navSection?: string;
  staticText: string;
  revealText: string;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    if (!section || !sticky) return;

    // Reduced motion gets the honest fallback: the full sentence, already
    // there, no pin, no typing, no color sweep, no extra scroll distance
    // added to the page for it.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealCount(revealText.length);
      return;
    }

    const travelDistance = revealText.length * PX_PER_CHARACTER;

    const measure = () => {
      section.style.height = `${sticky.clientHeight + travelDistance}px`;
    };

    const apply = () => {
      // getBoundingClientRect().top, not a cached scroll offset — see
      // PinnedPortfolioCarousel's own identical comment for why a cached
      // measurement here would go stale the moment anything above this
      // section reflows (a font swap, an image finishing its load).
      const raw = -section.getBoundingClientRect().top;
      const clamped = Math.min(Math.max(raw, 0), travelDistance);
      const progress = travelDistance > 0 ? clamped / travelDistance : 1;
      setRevealCount(Math.round(progress * revealText.length));
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
    resizeObserver.observe(sticky);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, [revealText]);

  const isComplete = revealCount >= revealText.length;

  return (
    <section ref={sectionRef} className="th-pin" data-nav-section={navSection}>
      <div ref={stickyRef} className="th-sticky">
        <div className="th-content">
          <h1 className="th-headline">
            {/* The animated, letter-by-letter version is decorative — a
                screen reader gets the complete, stable sentence from the
                visually-hidden span below instead of narrating individual
                characters as they "type" in. */}
            <span aria-hidden="true">
              {staticText}
              {Array.from(revealText.slice(0, revealCount)).map((char, i) => (
                <span key={i} className="th-letter">
                  {char}
                </span>
              ))}
              {!isComplete && <span className="th-cursor" aria-hidden="true" />}
            </span>
            <span className="visually-hidden">
              {staticText}
              {revealText}
            </span>
          </h1>
        </div>
      </div>

      <style>{`
        .th-pin {
          position: relative;
          width: 100%;
          background: #000000;
        }
        .th-sticky {
          position: sticky;
          top: 0;
          height: 100svh;
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        /* Same box model as .hs__content elsewhere on the homepage (own
           copy, not a shared class, to keep this component self-contained
           the way PinnedPortfolioCarousel is) — caps and centers the
           column, with the headline itself left-aligned inside it rather
           than centered on the full viewport. */
        .th-content {
          width: 100%;
          max-width: var(--content-max-width);
          margin-inline: auto;
          padding-inline: var(--space-5);
        }
        /* Matches the original .hs__hero-headline treatment exactly —
           --text-4xl with a fairly tight max-width so the sentence wraps
           into several short lines, which is what actually fills the
           vertical space, not font-size alone. */
        .th-headline {
          font-size: var(--text-4xl);
          font-weight: var(--weight-regular);
          letter-spacing: var(--tracking-tighter);
          line-height: var(--leading-tight);
          max-width: 20ch;
          color: var(--color-fg);
        }
        @media (min-width: 60rem) {
          .th-headline {
            max-width: 22ch;
          }
        }
        /* Runs once per letter, the moment its span first mounts — "both"
           applies the 0% color immediately (no flash of the final white
           before the sweep starts) and holds the 100% color afterwards.
           Scrolling back up past this section unmounts these spans (see
           the component's own revealText.slice), so scrubbing back down
           replays the sweep — a deliberate consequence of driving this
           purely off live scroll position rather than tracking "already
           seen" state, and consistent with how the portfolio carousel's
           own parallax behaves under the same back-and-forth scrubbing. */
        .th-letter {
          animation: th-letter-reveal 650ms ease-out both;
        }
        @keyframes th-letter-reveal {
          0% {
            color: hsl(0, 90%, 60%);
          }
          16% {
            color: hsl(45, 95%, 55%);
          }
          33% {
            color: hsl(90, 85%, 50%);
          }
          50% {
            color: hsl(160, 80%, 55%);
          }
          66% {
            color: hsl(210, 90%, 60%);
          }
          83% {
            color: hsl(270, 85%, 65%);
          }
          100% {
            color: var(--color-fg);
          }
        }
        .th-cursor {
          display: inline-block;
          width: 0.06em;
          height: 0.85em;
          margin-left: 0.06em;
          background: var(--color-fg);
          vertical-align: -0.05em;
          animation: th-cursor-blink 1s step-end infinite;
        }
        @keyframes th-cursor-blink {
          50% {
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .th-sticky {
            position: static;
            height: auto;
          }
          .th-letter {
            animation: none;
            color: var(--color-fg);
          }
        }
      `}</style>
    </section>
  );
}
