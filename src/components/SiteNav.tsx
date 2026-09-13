import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useActiveNavSection } from "../hooks/useActiveNavSection";

export type NavLink = { href: string; label: string };

type Props = {
  links: NavLink[];
  menuLabel: string;
  closeLabel: string;
  otherLocaleHref: string;
  otherLocaleLabel: string;
};

// Two stacked bars that splay into an X. Both <line>s keep the exact same
// x1/y1/x2/y2 the whole time (centered through the icon's own middle) —
// only `transform` ever changes, never the underlying coordinates. An
// earlier version instead changed y1/y2 directly between states: SVG
// geometry attributes set as plain JSX props snap instantly on re-render,
// they don't ease — so that version had the *rotation* animating smoothly
// via CSS transform while the *position* jumped with no interpolation at
// all, two different motions on the same element reading as sluggish/
// incoherent. Doing the whole motion (offset apart -> centered + rotated)
// through transform alone keeps it one continuous, synchronized move.
// transform-origin: 12px 12px (not "center", which for SVG resolves
// against the element's own bounding box rather than the icon's) rotates
// around the icon's actual center regardless of each line's own bounds.
function MenuIcon({ open }: { open: boolean }) {
  const line = (rotateDeg: number, closedOffsetY: number): React.CSSProperties => ({
    transformOrigin: "12px 12px",
    transform: open ? `rotate(${rotateDeg}deg)` : `translateY(${closedOffsetY}px)`,
    transition: "transform var(--duration-fast) var(--ease-out-expressive)",
  });
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" style={line(45, -5)} />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" style={line(-45, 5)} />
    </svg>
  );
}

export default function SiteNav({
  links,
  menuLabel,
  closeLabel,
  otherLocaleHref,
  otherLocaleLabel,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // #mobile-nav-panel-target is an Astro-rendered element already in the
  // server HTML (see Header.astro), not something this component creates —
  // read it via a ref-callback / effect rather than calling
  // document.getElementById directly during render, so this stays safe
  // under SSR (no `document` at render time) and still catches it as soon
  // as the client-side tree is up.
  const [panelTarget, setPanelTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPanelTarget(document.getElementById("mobile-nav-panel-target"));
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    // The panel is a position: absolute overlay now (see Header.astro/its
    // own #mobile-nav-panel rule) rather than content that pushes the page
    // down, so whatever's behind it — the homepage's own carousel included
    // — is still reachable through any gap around the panel unless a tap
    // there closes the menu first. toggleRef is excluded so this doesn't
    // fight the toggle button's own onClick over the same tap.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (toggleRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  // Measured height, not the grid-template-rows: 0fr -> 1fr trick this used
  // before switching #mobile-nav-panel to position: absolute (see
  // Header.astro's own comment on why it's absolute now) — a 1fr track only
  // resolves against a *known* available height, and an absolutely
  // positioned box with no explicit height/bottom doesn't reliably give it
  // one, so the "expanded" state could collapse to nothing instead of
  // opening. scrollHeight always reports the panel's true content height
  // regardless of what height is currently applied to it (even 0, clipped
  // by overflow: hidden), so animating a real measured pixel value sidesteps
  // that ambiguity entirely.
  const [panelHeight, setPanelHeight] = useState(0);
  useLayoutEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;
    const measure = () => setPanelHeight(panel.scrollHeight);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isOpen]);

  // Only ever finds sections on pages that actually mark them up (currently
  // just the homepage, via [data-nav-section] — see HomeExperience.tsx) —
  // resolves to null everywhere else, so the underline simply never
  // renders there. No prop needed to opt in/out per page.
  const activeSection = useActiveNavSection();

  // Measured position, not a CSS-only approach (e.g. :has() + sibling
  // selectors): the underline has to slide continuously between whichever
  // two links are active, and their widths differ ("Arbeid" vs "Kontakt"),
  // so its left/width need the real rendered geometry — same technique the
  // case-study TOC's own rail-fill already uses for an identical reason
  // (see CaseStudyExperience.tsx).
  const listRef = useRef<HTMLUListElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [underline, setUnderline] = useState<{
    left: number;
    width: number;
    top: number;
    direction: "left-to-right" | "right-to-left";
  } | null>(null);
  // Which way the underline is about to travel — read once at the top of
  // the position effect below (comparing this to the freshly measured
  // left) and written back after, so the trail's gradient (see
  // .site-nav__underline-trail) can always put its brightest color on
  // whichever edge ends up adjacent to the solid bar's own new position,
  // rather than a fixed left-to-right order that's only correct half the
  // time depending on which link comes before which.
  const prevLeftRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const wrap = wrapRef.current;
    const link = activeSection ? linkRefs.current[activeSection] : null;
    if (!list || !wrap || !link) {
      setUnderline(null);
      return;
    }
    const measure = () => {
      const wrapRect = wrap.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      // Vertically, the underline sits partway between the link text's own
      // bottom edge and the header row's bottom edge — not flush with
      // either. GAP_FRACTION of the way down that gap (rather than the
      // exact halfway point) keeps it closer to the text itself. Both
      // reference points depend on the row's real height and the link's
      // own rendered line height, neither a clean constant to compute in
      // pure CSS, so it's measured live the same way left/width already
      // are. .closest() reaches up to Header.astro's row element, which
      // this component has no other reference to (it's a plain DOM
      // ancestor, not something passed down as a prop). The extra -1
      // afterwards is a plain manual nudge, not part of that fraction.
      const GAP_FRACTION = 0.3;
      const row = wrap.closest<HTMLElement>(".site-header__row");
      const rowRect = row?.getBoundingClientRect();
      const midpointY = rowRect
        ? linkRect.bottom + (rowRect.bottom - linkRect.bottom) * GAP_FRACTION
        : linkRect.bottom;
      const left = linkRect.left - listRect.left;
      const direction: "left-to-right" | "right-to-left" =
        prevLeftRef.current === null || left >= prevLeftRef.current ? "left-to-right" : "right-to-left";
      prevLeftRef.current = left;
      setUnderline({
        left,
        width: linkRect.width,
        top: midpointY - wrapRect.top - 1,
        direction,
      });
    };
    measure();
    // Link positions shift if the window resizes (e.g. rotating a tablet,
    // or a locale swap changing label lengths) — re-measure rather than
    // let the underline drift out of sync.
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeSection]);

  // Replays the trail's fade-in-then-out (see .site-nav__underline-trail
  // below) every time the underline actually moves to a new section — not
  // on the resize-triggered re-measurements above, which just correct
  // position after a viewport change rather than mark a genuine move.
  // Toggling the animation via a CSS class on the *same* element (rather
  // than remounting it, e.g. via a React `key`) is deliberate: remounting
  // would also restart the trail's own position transition from scratch,
  // snapping it to the new spot instead of lagging toward it — this needs
  // the element to persist across the change. Removing the class, forcing
  // a synchronous reflow (the offsetWidth read), then re-adding it is the
  // standard way to make a CSS animation replay on an element that never
  // left the DOM.
  useEffect(() => {
    const trailEl = trailRef.current;
    if (!trailEl) return;
    trailEl.classList.remove("site-nav__underline-trail--active");
    void trailEl.offsetWidth;
    trailEl.classList.add("site-nav__underline-trail--active");
  }, [activeSection]);

  return (
    <nav className="site-nav" aria-label="Main">
      {/* position: relative lives on this wrapper, not the <ul> itself —
          the underline is a decorative sibling of the list, not a list
          item, so it stays out of the <ul>'s own valid-children rules
          (only <li>/<script>/<template> may appear there directly). */}
      <div className="site-nav__desktop-wrap" ref={wrapRef}>
        <ul className="site-nav__desktop" ref={listRef}>
          {links.map((link) => {
            const hash = link.href.split("#")[1];
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  data-nav-hash={hash}
                  data-active={hash === activeSection}
                  ref={(el) => {
                    if (hash) linkRefs.current[hash] = el;
                  }}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
          <li>
            {/* data-astro-reload: a locale switch is still "the homepage"
                at the URL level, so both ends carry the exact same
                case-cover-<slug> view-transition-name on each portfolio
                image (see src/lib/viewTransitions.ts) — meant to morph a
                clicked card into that project's hero on a *different*
                page, not to run between two locale variants of the *same*
                page. Without this, switching language made every card
                image visibly reflow/re-crop for a frame as the browser
                tried to morph each one into its own (identically named,
                already-correct) counterpart. */}
            <a href={otherLocaleHref} data-astro-reload>
              {otherLocaleLabel}
            </a>
          </li>
        </ul>
        {underline && (
          <>
            {/* Colorful "ghost" of the underline, sharing the same target
                left/width/top but with its own slower, delayed transition
                (see .site-nav__underline-trail's own comment) — it visibly
                lags behind the solid bar below as both move, which is what
                actually reads as "color caused by motion" rather than a
                timed flash on the bar itself. --trail-direction flips the
                gradient's own direction keyword (see that rule) so the
                brightest segment always ends up on whichever edge is
                adjacent to the solid bar's new position, regardless of
                which way the underline is actually traveling. */}
            <span
              ref={trailRef}
              className="site-nav__underline-trail"
              aria-hidden="true"
              style={
                {
                  left: `${underline.left}px`,
                  width: `${underline.width}px`,
                  top: `${underline.top}px`,
                  "--trail-direction": underline.direction === "left-to-right" ? "to left" : "to right",
                } as CSSProperties
              }
            />
            <span
              className="site-nav__underline"
              aria-hidden="true"
              style={{ left: `${underline.left}px`, width: `${underline.width}px`, top: `${underline.top}px` }}
            />
          </>
        )}
      </div>

      <button
        ref={toggleRef}
        type="button"
        className="site-nav__toggle"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-panel"
        aria-label={isOpen ? closeLabel : menuLabel}
        onClick={() => setIsOpen((open) => !open)}
      >
        <MenuIcon open={isOpen} />
      </button>

      {panelTarget &&
        createPortal(
          // Portalled into #mobile-nav-panel-target (an Astro-rendered
          // sibling of .site-header__row, see Header.astro) — this panel is
          // position: absolute there, overlaying whatever's below the
          // header rather than pushing it down (see Header.astro's own
          // comment on #mobile-nav-panel-target), so it needs to land
          // inside that same positioning context, not escape to
          // document.body.
          //
          // Always mounted (not isOpen && ...) rather than mounting only
          // while open: an element that unmounts immediately has nothing
          // to animate a close transition against. data-open + the
          // height/opacity CSS below handle showing and hiding instead;
          // tabIndex/aria-hidden keep the always-present links out of the
          // tab order and off screen readers while closed.
          <div
            ref={panelRef}
            id="mobile-nav-panel"
            data-open={isOpen}
            role="dialog"
            aria-modal={isOpen}
            aria-hidden={!isOpen}
            style={{ height: isOpen ? `${panelHeight}px` : "0px" }}
          >
            <ul>
              {links.map((link, index) => (
                <li key={link.href} style={{ transitionDelay: isOpen ? `${index * 40}ms` : "0ms" }}>
                  <a
                    href={link.href}
                    data-nav-hash={link.href.split("#")[1]}
                    tabIndex={isOpen ? 0 : -1}
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li style={{ transitionDelay: isOpen ? `${links.length * 40}ms` : "0ms" }}>
                {/* data-astro-reload — see the desktop locale link's own
                    comment above. */}
                <a href={otherLocaleHref} tabIndex={isOpen ? 0 : -1} data-astro-reload>
                  {otherLocaleLabel}
                </a>
              </li>
            </ul>
          </div>,
          panelTarget,
        )}

      <style>{`
        .site-nav__desktop-wrap {
          position: relative;
          display: none;
        }
        .site-nav__desktop {
          display: flex;
          list-style: none;
          margin: 0;
          padding: 0;
          gap: var(--space-4);
        }
        .site-nav__desktop a {
          text-decoration: none;
          font-size: var(--text-xs);
          opacity: 0.7;
          transition: opacity var(--duration-base) var(--ease-standard);
        }
        .site-nav__desktop a:hover,
        .site-nav__desktop a:focus-visible,
        .site-nav__desktop a[data-active="true"] {
          opacity: 1;
        }
        /* Absolutely positioned within the wrap (relative, above), not a
           border/box-shadow on the active link itself — its left/width/top
           are all driven by real measured geometry (see the component's
           own useLayoutEffect) so it can slide continuously between two
           links of different widths ("Arbeid" vs "Kontakt") rather than
           jumping, and sit closer to the text's own bottom edge than to
           the header row's bottom edge rather than flush with either. */
        .site-nav__underline {
          position: absolute;
          height: 1px;
          background: var(--color-fg);
          transition:
            left var(--duration-base) var(--ease-standard),
            width var(--duration-base) var(--ease-standard),
            top var(--duration-base) var(--ease-standard);
        }
        /* A first pass animated the whole bar's own color through a flat
           time-based keyframe — every letter of it flashing through the
           spectrum in unison read as the underline just blinking, with no
           visible connection to the fact that it had moved. This instead
           shares the underline's own target left/width/top but on a
           slower, delayed transition, so it visibly lags behind the solid
           bar rather than arriving with it — a real trailing "ghost" whose
           color only ever shows up as a consequence of that lag, not a
           timer. Same 1px height as the solid bar and no blur — a blurred,
           thicker trail read as a second, mismatched line rather than a
           color the same underline was briefly showing, and blur mixes
           adjacent hard-edged segments at their boundary, undoing the flat,
           fully saturated bands below. opacity is 0 by default;
           .site-nav__underline-trail--active (toggled via a classList
           restart in the component's own effect, replaying it on every
           real section change) fades it in as the lag begins and back out
           once it's caught up. */
        /* Hard-edged bands, not a smooth multi-stop blend — linear-gradient
           interpolates between hue stops in raw RGB by default, and wide
           hue jumps (red toward green, blue toward violet) pass through
           dull, grayish-brown zones on the way rather than staying vivid.
           Giving each color a flat, same-color-to-same-color span removes
           every blended transition entirely, so the full saturation below
           is what's actually visible instead of being diluted by muddy
           in-between tones. Ordered brightest-first (yellow leading, violet
           trailing), and --trail-direction (set inline per the component's
           own measured travel direction) points the gradient so that
           leading edge always lands next to the solid underline's own new
           position — "to left" when the underline is moving rightward puts
           yellow on the trail's right edge (the one catching up to the bar
           now to its right), and vice versa; a fixed direction would only
           have gotten this right for travel one way. Lightness is tuned
           per hue, not a flat value, since green/cyan read as pale at the
           same lightness that makes yellow/orange/red look vivid — pure
           perceptual luminance, not a typo. */
        .site-nav__underline-trail {
          position: absolute;
          height: 1px;
          opacity: 0;
          background: linear-gradient(
            var(--trail-direction, to right),
            hsl(50, 100%, 55%) 0%,
            hsl(50, 100%, 55%) 16.66%,
            hsl(30, 100%, 55%) 16.66%,
            hsl(30, 100%, 55%) 33.33%,
            hsl(350, 100%, 60%) 33.33%,
            hsl(350, 100%, 60%) 50%,
            hsl(120, 100%, 40%) 50%,
            hsl(120, 100%, 40%) 66.66%,
            hsl(195, 100%, 45%) 66.66%,
            hsl(195, 100%, 45%) 83.33%,
            hsl(270, 100%, 60%) 83.33%,
            hsl(270, 100%, 60%) 100%
          );
          transition:
            left var(--duration-slow) var(--ease-standard) 60ms,
            width var(--duration-slow) var(--ease-standard) 60ms,
            top var(--duration-slow) var(--ease-standard) 60ms;
        }
        .site-nav__underline-trail--active {
          animation: site-nav-underline-trail-fade var(--duration-slow) ease-out 60ms;
        }
        @keyframes site-nav-underline-trail-fade {
          0% {
            opacity: 0;
          }
          /* Fully opaque at the peak, same as the solid underline itself —
             anything less let the dark header background bleed through and
             mute the segments underneath. */
          25% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        .site-nav__toggle {
          display: flex;
          background: none;
          border: none;
          color: var(--color-fg);
          cursor: pointer;
          padding: var(--space-2);
        }
        /* position: absolute (anchored to #mobile-nav-panel-target, see
           Header.astro), not normal in-flow content — this panel used to
           grow the header's own box downward, which meant opening it
           pushed everything below the header down the page instead of
           overlaying it. Carries its own background/radius/shadow now
           since it no longer shares a box with .site-header (which has
           stopped clipping overflow specifically so this can extend past
           its row without being cut off) — border-radius only on the
           bottom corners so it reads as one continuous shape with the row
           still visible above it.
           Height is a real measured pixel value set inline by the
           component (see its own useLayoutEffect + scrollHeight), not the
           grid-template-rows: 0fr -> 1fr trick used before this became
           position: absolute — a 1fr track needs a *known* available
           height to resolve against, and an absolutely positioned box with
           no explicit height/bottom doesn't reliably provide one, so the
           "open" state could collapse to nothing instead of expanding. A
           measured pixel target sidesteps that ambiguity entirely; overflow:
           hidden here is what makes animating toward it read as a height
           reveal instead of content just appearing abruptly at 0. */
        #mobile-nav-panel {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1;
          overflow: hidden;
          background: var(--color-bg);
          border-radius: 0 0 8px 8px;
          transition: height var(--duration-base) var(--ease-standard);
        }
        /* Shadow only while open, not on the base rule above — collapsed to
           height: 0 it's still a real (if invisible) box, and a blurred
           box-shadow paints past even a zero-size box's own edges, which
           showed up as a faint persistent line under the header even fully
           closed. */
        #mobile-nav-panel[data-open="true"] {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
        }
        #mobile-nav-panel ul {
          list-style: none;
          margin: 0;
          padding: var(--space-4) var(--space-4) calc(var(--space-4) * 2);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        /* Each link fades/lifts in with a per-index delay set inline (see
           the component's own style={{transitionDelay}}) — staggered on
           the way open, but delay resets to 0 on close so the panel
           collapses as one quick uniform motion rather than the last item
           lagging behind the grid-row collapse above it. */
        #mobile-nav-panel li {
          opacity: 0;
          transform: translateY(-4px);
          transition:
            opacity var(--duration-base) var(--ease-standard),
            transform var(--duration-base) var(--ease-standard);
        }
        #mobile-nav-panel[data-open="true"] li {
          opacity: 1;
          transform: none;
        }
        #mobile-nav-panel a {
          text-decoration: none;
          font-size: var(--text-xs);
          color: var(--color-fg);
          opacity: 0.7;
          transition: opacity var(--duration-base) var(--ease-standard);
        }
        #mobile-nav-panel a:hover,
        #mobile-nav-panel a:focus-visible {
          opacity: 1;
        }
        @media (min-width: 48rem) {
          .site-nav__desktop-wrap {
            display: block;
          }
          .site-nav__toggle {
            display: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .site-nav__underline-trail {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}
