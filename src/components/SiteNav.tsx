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

  // The panel is now a full-viewport overlay (see its own comment below),
  // unrelated to the header's own box — it portals straight to
  // document.body rather than into a target inside .site-header (a
  // fixed-position descendant only needs a stable containing block, which
  // body always is; document isn't available at SSR render time, hence
  // the effect rather than reading it during render).
  const [panelTarget, setPanelTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPanelTarget(document.body);
  }, []);

  // Resizing past the desktop breakpoint (same 48rem the CSS below uses
  // to swap .site-nav__toggle for .site-nav__desktop-wrap) while the
  // mobile panel happens to be open left it stuck open with no way to
  // close it — the toggle button that would close it is exactly the
  // element that breakpoint hides. matchMedia's change event, not a
  // plain resize listener, since it only fires when the query's own
  // result actually flips (crossing 48rem), not on every pixel of window
  // resizing.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 48rem)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // The panel now covers the full viewport while open (see its own
  // comment below) and document.body.style.overflow already makes
  // everything behind it unreachable, so there's no "outside" left to
  // listen for a click on — a tap on the blurred backdrop itself closes
  // it directly (see .mobile-nav-panel-surface's own onClick), and
  // Escape/link-selection cover the rest.
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
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
          // Portalled straight to document.body (see the panelTarget
          // effect above) — a full-viewport fixed overlay, not content
          // anchored to the header's own box.
          //
          // Always mounted (not isOpen && ...) rather than mounting only
          // while open: an element that unmounts immediately has nothing
          // to animate a close transition against. data-open + the
          // opacity/visibility CSS below handle showing and hiding
          // instead; tabIndex/aria-hidden keep the always-present links
          // out of the tab order and off screen readers while closed.
          <div ref={panelRef} id="mobile-nav-panel" data-open={isOpen} role="dialog" aria-modal={isOpen} aria-hidden={!isOpen}>
            {/* Covers the full viewport and sits BELOW the header in
                z-index (see the CSS below) — the header (logo + toggle)
                stays visibly pinned on top of the blur rather than being
                blurred itself, so it's still legible and the toggle still
                closes the menu. A tap anywhere on this backdrop closes the
                menu directly, since nothing behind it is reachable while
                it's open (document.body.style.overflow is already
                hidden — see the effect above). */}
            <div className="mobile-nav-panel-surface" aria-hidden="true" onClick={() => setIsOpen(false)} />
            <ul className="mobile-nav-panel-links">
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
          /* --header-fg is set on .site-header (see Header.astro) and
             switches black/white per section as the page scrolls —
             mix-blend-mode: difference was the first approach tried here
             but confirmed NOT to work: it doesn't blend against scrolled
             page content when the blending element is a descendant of a
             position: sticky ancestor (a real browser compositing
             limitation, not something tunable away — see Header.astro's
             own comment for the full explanation). Dimmed via the color's
             own alpha (color-mix against transparent) purely to match the
             rest of the site's hover-dim convention. */
          color: color-mix(in srgb, var(--header-fg, var(--color-white)) 70%, transparent);
          transition: color var(--duration-base) var(--ease-standard);
        }
        .site-nav__desktop a:hover,
        .site-nav__desktop a:focus-visible,
        .site-nav__desktop a[data-active="true"] {
          color: var(--header-fg, var(--color-white));
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
          background: var(--header-fg, var(--color-white));
          transition:
            background-color var(--duration-base) var(--ease-standard),
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
        /* While the mobile menu is open the header sits over its dark
           backdrop, whatever section is behind it — so logo and toggle go
           white regardless of the page's current light/dark theme (see
           Header.astro's --header-fg). Higher specificity than the theme
           rule's own attribute selector. */
        header.site-header:has(.site-nav__toggle[aria-expanded="true"]) {
          --header-fg: var(--color-white);
        }
        .site-nav__toggle {
          display: flex;
          background: none;
          border: none;
          color: var(--header-fg, var(--color-white));
          cursor: pointer;
          padding: var(--space-2);
          transition: color var(--duration-base) var(--ease-standard);
        }
        /* Full-viewport blurred takeover, not the old compact dropdown
           anchored under the header row — position: fixed + inset: 0
           regardless of where it sits in the DOM (it's portalled to
           document.body, see the component's own panelTarget effect).
           z-index sits BELOW .site-header's own 50 (see Header.astro) so
           the header row — logo, nav toggle — stays visibly pinned on
           top of the blur instead of being blurred itself; that's also
           what keeps the toggle clickable to close the menu again.
           opacity/visibility, not height — there's no content-driven
           height to animate toward anymore, just a full-screen show/hide,
           so this sidesteps Safari's backdrop-filter/height-transition
           bug entirely rather than working around it.
           No visibility toggle here (an earlier version had one) —
           pointer-events: none and each link's own tabIndex/aria-hidden
           (see the component's own JSX) already fully cover interaction
           and a11y while closed, and visibility: hidden let the browser
           skip painting the panel entirely while invisible. That meant
           the full-viewport backdrop-filter blur below had never actually
           been rasterized before the very first frame it needed to be
           visible, so opening the menu forced that expensive blur
           computation synchronously right as the fade was supposed to
           start — a visible stutter, not a smooth ramp, since only
           opacity was ever actually being animated. Leaving the panel
           continuously painted (just transparent) keeps that blur warm at
           all times, so there's nothing left to compute when it opens.
           No will-change here — a first pass added will-change: opacity,
           which promotes this element to its own isolated compositing
           layer, and (same class of bug as mix-blend-mode breaking across
           a position: sticky boundary — see Header.astro's own comment)
           that risks cutting the CHILD .mobile-nav-panel-surface's
           backdrop-filter off from the real page content it needs to
           sample, particularly in Safari/WebKit, which already has a
           documented history of exactly this kind of backdrop-filter
           regression in this codebase. Not worth the risk for a hint that
           was never confirmed necessary. */
        #mobile-nav-panel {
          position: fixed;
          inset: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        #mobile-nav-panel[data-open="true"] {
          pointer-events: auto;
        }
        /* Full-bleed backdrop behind the link list — a separate element
           (not #mobile-nav-panel's own background) purely so a tap on it
           can close the menu (see the component's own onClick) without
           also catching taps on the links stacked in front of it. */
        .mobile-nav-panel-surface {
          position: absolute;
          inset: 0;
          background: color-mix(in srgb, var(--color-black) 0%, transparent);
          backdrop-filter: blur(0px);
          -webkit-backdrop-filter: blur(0px);
          transition:
            background-color var(--duration-base) var(--ease-standard),
            backdrop-filter var(--duration-base) var(--ease-standard),
            -webkit-backdrop-filter var(--duration-base) var(--ease-standard);
        }
        /* The blur radius itself is what animates, NOT the panel's
           opacity: an element with opacity < 1 is a "backdrop root", so
           a backdrop-filter on a child of one can't see the page behind
           it — the blur only appeared at the very end, once opacity hit 1,
           and snapped in. With no opacity on any ancestor the filter
           samples the real page the whole way. */
        #mobile-nav-panel[data-open="true"] .mobile-nav-panel-surface {
          background: color-mix(in srgb, var(--color-black) 88%, transparent);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .mobile-nav-panel-links {
          position: relative;
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-4);
        }
        /* Each link fades/lifts in with a per-index delay set inline (see
           the component's own style={{transitionDelay}}) — staggered on
           the way open, but delay resets to 0 on close so the panel
           closes as one quick uniform motion rather than the last item
           lagging behind. */
        .mobile-nav-panel-links li {
          opacity: 0;
          transform: translateY(8px);
          transition:
            opacity var(--duration-base) var(--ease-standard),
            transform var(--duration-base) var(--ease-standard);
        }
        #mobile-nav-panel[data-open="true"] .mobile-nav-panel-links li {
          opacity: 1;
          transform: none;
        }
        /* Plain white, not --header-fg (the persistent header bar's own
           switchable color, see Header.astro) — this panel is its own
           opaque-ish blurred surface rather than a strip floating over
           arbitrary page content, so a flat readable color is the correct
           choice here, not a value that tracks whatever's currently
           behind the header row above it. */
        .mobile-nav-panel-links a {
          text-decoration: none;
          font-size: var(--text-xl);
          color: var(--color-white);
          opacity: 0.8;
          transition: opacity var(--duration-base) var(--ease-standard);
        }
        .mobile-nav-panel-links a:hover,
        .mobile-nav-panel-links a:focus-visible {
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
