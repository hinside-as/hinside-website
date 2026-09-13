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
              {/* Every character of revealText is always in the DOM, not
                  just the ones "typed" so far — only .th-letter--pending's
                  visibility toggles per character. A word whose letters are
                  still arriving one at a time has to reserve its own full,
                  final width from the very first letter, or the browser's
                  line-wrapping decision (does this word fit on the current
                  line?) keeps being made against a shorter, still-growing
                  word — and once enough of it is "typed" to no longer fit,
                  the whole word visibly jumps to the next line mid-reveal.
                  Rendering the complete text up front means wrapping is
                  computed once, against the final text, and never changes
                  as revealCount increases; visibility:hidden (not
                  display:none) is what lets a not-yet-revealed character
                  still occupy that reserved space invisibly. */}
              {Array.from(revealText).flatMap((char, i) => [
                // The cursor sits as its own sibling exactly at the reveal
                // boundary, not nested inside the (invisible) pending
                // character's span — visibility: hidden is inherited, so a
                // cursor nested inside a pending span would disappear
                // along with it.
                i === revealCount && !isComplete ? (
                  <span key={`cursor-${i}`} className="th-cursor" aria-hidden="true" />
                ) : null,
                <span key={i} className={i < revealCount ? "th-letter" : "th-letter th-letter--pending"}>
                  {char}
                </span>,
              ])}
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
          align-items: flex-start;
          overflow: hidden;
          /* Top-anchored, not vertically centered — centering meant the
             whole block re-centered itself every time typing added a
             wrapped line, so already-written text visibly jumped upward
             each time the sentence grew. Anchoring the top instead means
             new lines only ever extend downward; nothing already on
             screen ever moves. */
          padding-top: var(--space-8);
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
        /* A smaller local scale, not the shared --text-4xl (up to 10rem)
           the original centered .hs__hero-headline used — that size was
           tuned for a layout with the *full* 100svh to grow into
           symmetrically. Top-anchored with a fixed padding-top eating into
           that budget, the complete multi-line sentence at 10rem/line could
           run past the bottom of .th-sticky's own overflow: hidden on
           anything shorter than a tall desktop display, clipping the last
           line's actual letters. An 8.25rem cap (the midpoint between that
           10rem and a first, over-corrected pass at 6.5rem — floor and
           vw-scaling averaged the same way) still leaves comfortable room
           on ordinary desktop viewport heights without giving up as much
           presence as the smaller version did. */
        .th-headline {
          font-size: clamp(3rem, 1.65rem + 7vw, 8.25rem);
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
        /* Every character span exists in the DOM from the start (see the
           component's own comment on why — locking in word-wrap ahead of
           time); .th-letter--pending is what actually keeps a not-yet-
           revealed one invisible and un-animated. Overriding animation:
           none there matters, not just visibility — without it every
           letter's sweep would start at mount and finish while still
           hidden, so by the time revealCount actually reached it there'd
           be nothing left to see. Removing that class (revealCount catches
           up to it) changes animation-name from none to a real keyframe,
           which reliably starts a fresh play — no reflow-restart trick
           needed the way the nav underline's own trail effect needs one,
           since here the value is genuinely changing each time rather than
           being re-applied. Scrolling back up past this section re-adds
           th-letter--pending to already-revealed letters, so scrubbing
           back down replays their sweep — a deliberate consequence of
           driving this purely off live scroll position rather than
           tracking "already seen" state, consistent with how the
           portfolio carousel's own parallax behaves under the same
           back-and-forth scrubbing. */
        /* The exact same six hues, in the same brightest-first order, as
           the nav underline's own trail (see .site-nav__underline-trail in
           SiteNav.tsx) — one shared chromatic signature for the site's
           single color rule: color only ever shows up as a byproduct of
           something being *made* or *moved* (a letter being written here,
           the underline sliding to a new section there), settling back to
           the site's usual monochrome the instant that action finishes.
           Reusing the identical spectrum in both places is what actually
           makes that legible as one rule rather than two coincidentally
           similar rainbow effects. */
        .th-letter {
          animation: th-letter-reveal 650ms ease-out both;
        }
        .th-letter--pending {
          animation: none;
          visibility: hidden;
        }
        @keyframes th-letter-reveal {
          0% {
            color: hsl(50, 100%, 55%);
          }
          16% {
            color: hsl(30, 100%, 55%);
          }
          33% {
            color: hsl(350, 100%, 60%);
          }
          50% {
            color: hsl(120, 100%, 40%);
          }
          66% {
            color: hsl(195, 100%, 45%);
          }
          83% {
            color: hsl(270, 100%, 60%);
          }
          100% {
            color: var(--color-fg);
          }
        }
        /* Zero width itself — the visible bar is an absolutely positioned
           ::after instead of the cursor's own box. Every letter's width is
           reserved up front (see .th-letter--pending's own comment), but
           the cursor moves to a new position in the text every time
           revealCount advances; if it were a real, width-having inline
           element, its own ~0.12em could still be the deciding factor in
           whether the word right after it fits on the current line,
           depending on exactly where that happened to land — a residual
           source of the same mid-word line jump the letter fix was meant
           to eliminate, just caused by the cursor instead of the letters.
           Taking it out of the flow entirely removes that. */
        .th-cursor {
          position: relative;
          display: inline-block;
          width: 0;
          height: 0.85em;
          vertical-align: -0.05em;
        }
        .th-cursor::after {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          width: 0.06em;
          height: 100%;
          background: var(--color-fg);
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
