import { useEffect, useRef, useState } from "react";

/**
 * A bottom-center "keep scrolling" nudge for the site's native-scroll-snap
 * pages (home + case studies — see BaseLayout's own scrollSnap prop, which
 * gates whether this mounts at all).
 *
 * Document-scroll-driven, not tied to any one component's own scroll
 * container: this project's scroll-snap experiences scroll the real
 * document (html[data-scroll-snap="true"]), not a nested overflow:auto div
 * — see global.css's own comment on that — so a single window-level
 * listener already covers every scroll-snap page without per-page wiring.
 *
 * The chevron is the same pixel glyph as Lightbox.tsx's own ARROW_RIGHT
 * (see that file), rotated 90° — same asset, not a separate one, matching
 * the source Figma file's own two "arrow-left"/"arrow-right" nodes (which
 * are themselves the same shape mirrored, not independently drawn). Sized
 * and positioned only — no scale/frame-cycling, per explicit direction to
 * keep the glyph at its native size.
 */
const IDLE_BEFORE_SHOW_MS = 10000;
// Matches the CSS animation's own total duration below (fade in, two
// bounces, fade out) — kept as one constant so the JS reset and the CSS
// timing can't silently drift apart.
const SEQUENCE_DURATION_MS = 2100;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function ScrollCue({ centerInContent = false }: { centerInContent?: boolean }) {
  const [visible, setVisible] = useState(false);
  const idleTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const clearIdleTimer = () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
    const clearResetTimer = () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };

    const isNearBottom = () =>
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;

    const show = () => {
      if (isNearBottom()) return;
      setVisible(true);
      clearResetTimer();
      // The CSS animation runs once (fade in → bounce → bounce → fade out)
      // and holds at opacity 0 — this just un-mounts the animation after
      // it's finished, so the next idle period retriggers it from a clean
      // start rather than replaying mid-sequence.
      resetTimerRef.current = window.setTimeout(() => setVisible(false), SEQUENCE_DURATION_MS);
    };

    const handleScroll = () => {
      clearIdleTimer();
      clearResetTimer();
      setVisible(false);
      idleTimerRef.current = window.setTimeout(show, IDLE_BEFORE_SHOW_MS);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearIdleTimer();
      clearResetTimer();
    };
  }, []);

  return (
    <div className="scroll-cue" data-visible={visible} data-center-in-content={centerInContent} aria-hidden="true">
      <svg className="scroll-cue__arrow" viewBox="0 0 32 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 56H0V48H8V56Z" fill="currentColor" />
        <path d="M16 48H8V40H16V48Z" fill="currentColor" />
        <path d="M24 40H16V32H24V40Z" fill="currentColor" />
        <path d="M32 32H24V24H32V32Z" fill="currentColor" />
        <path d="M24 24H16V16H24V24Z" fill="currentColor" />
        <path d="M16 16H8V8H16V16Z" fill="currentColor" />
        <path d="M8 8H0V0H8V8Z" fill="currentColor" />
      </svg>
      <style>{`
        .scroll-cue {
          position: fixed;
          left: 50%;
          bottom: var(--space-5);
          transform: translateX(-50%);
          color: var(--color-fg);
          /* No opacity here — .scroll-cue__arrow's own base opacity:0 +
             animation already fully own the fade in/out. An opacity here
             too (left over from an earlier pass) was multiplying against
             the arrow's own, permanently at 0 with nothing ever setting
             this wrapper back to 1 — the arrow was animating correctly the
             whole time, just invisible inside an invisible parent. */
          pointer-events: none;
          /* Above .cse__text-box-anchor's z-index: 20 (CaseStudyExperience)
             — on mobile the floating show/hide-text card sits at the same
             bottom-of-screen position this cue does, and without this the
             card's own solid background painted over the arrow entirely. */
          z-index: 25;
        }
        /* Case-study pages carry a 25%-wide sticky sidebar (see
           CaseStudyExperience's own .cse__sidebar, same 60rem breakpoint)
           alongside the slides — centering on the full viewport there
           visually centers on the sidebar boundary, not the actual content
           column. 62.5% = 25% (sidebar) + half of the remaining 75%. Below
           60rem the sidebar is hidden and content spans the full width, so
           this falls back to the same 50% the homepage always uses. */
        @media (min-width: 60rem) {
          .scroll-cue[data-center-in-content="true"] {
            left: 62.5%;
          }
        }
        .scroll-cue[data-visible="true"] .scroll-cue__arrow {
          animation: scroll-cue-sequence ${SEQUENCE_DURATION_MS}ms ease-in-out;
        }
        .scroll-cue__arrow {
          display: block;
          width: 32px;
          height: 56px;
          transform: rotate(90deg);
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
          opacity: 0;
        }
        /* Two down-up bounces, with the fade riding along on the outer legs
           only: the first descent (0-25%) carries the fade-in, the last
           ascent (75-100%) carries the fade-out, and the bounce-back-up/
           bounce-down-again in between (25-75%) stays fully opaque — so the
           motion and the fade read as one gesture ("drops in bouncing,
           bounces again, rises out fading") rather than a fade sitting still
           followed by a separate, disconnected bounce. Opacity isn't
           restated at 50% because CSS interpolates unspecified properties
           between the nearest keyframes that do set them — 25% and 75% both
           say opacity:1, so it holds steady at 1 across 50% for free.
           Translating along X, not Y: the SVG's own artwork points right,
           and rotate(90deg) is applied first in this transform list, meaning
           it's evaluated *after* the translate (CSS composes right-to-left)
           — so a local +X move (across the un-rotated artwork) is what maps
           to screen-space +Y (down) once the rotation lands, matching the
           direction the now-downward arrow actually points. Using
           translateY here would instead bounce it sideways on screen. */
        @keyframes scroll-cue-sequence {
          0% {
            opacity: 0;
            transform: rotate(90deg) translateX(-6px);
          }
          25% {
            opacity: 1;
            transform: rotate(90deg) translateX(6px);
          }
          50% {
            transform: rotate(90deg) translateX(-6px);
          }
          75% {
            opacity: 1;
            transform: rotate(90deg) translateX(6px);
          }
          100% {
            opacity: 0;
            transform: rotate(90deg) translateX(-6px);
          }
        }
      `}</style>
    </div>
  );
}
