import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [underline, setUnderline] = useState<{ left: number; width: number; top: number } | null>(null);

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
      // Vertically, the underline sits halfway between the link text's own
      // bottom edge and the header row's bottom edge — not flush with
      // either. That midpoint depends on the row's real height and the
      // link's own rendered line height, neither a clean constant to
      // compute in pure CSS, so it's measured live the same way left/width
      // already are. .closest() reaches up to Header.astro's row element,
      // which this component has no other reference to (it's a plain DOM
      // ancestor, not something passed down as a prop).
      const row = wrap.closest<HTMLElement>(".site-header__row");
      const rowRect = row?.getBoundingClientRect();
      const midpointY = rowRect ? (linkRect.bottom + rowRect.bottom) / 2 : linkRect.bottom;
      setUnderline({
        left: linkRect.left - listRect.left,
        width: linkRect.width,
        top: midpointY - wrapRect.top,
      });
    };
    measure();
    // Link positions shift if the window resizes (e.g. rotating a tablet,
    // or a locale swap changing label lengths) — re-measure rather than
    // let the underline drift out of sync.
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
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
            <a href={otherLocaleHref}>{otherLocaleLabel}</a>
          </li>
        </ul>
        {underline && (
          <span
            className="site-nav__underline"
            aria-hidden="true"
            style={{ left: `${underline.left}px`, width: `${underline.width}px`, top: `${underline.top}px` }}
          />
        )}
      </div>

      <button
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
          // sibling of .site-header__row, see Header.astro), not
          // document.body: this panel is normal in-flow content now, not
          // its own position: fixed overlay — it grows the header's own
          // floating-pill box downward rather than covering the screen, so
          // it needs to land inside that same box, not escape it.
          //
          // Always mounted (not isOpen && ...) rather than mounting only
          // while open: an element that unmounts immediately has nothing
          // to animate a close transition against. data-open + the grid-
          // rows/opacity CSS below handle showing and hiding instead;
          // tabIndex/aria-hidden keep the always-present links out of the
          // tab order and off screen readers while closed.
          <div id="mobile-nav-panel" data-open={isOpen} role="dialog" aria-modal={isOpen} aria-hidden={!isOpen}>
            <div className="site-nav__panel-inner">
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
                  <a href={otherLocaleHref} tabIndex={isOpen ? 0 : -1}>
                    {otherLocaleLabel}
                  </a>
                </li>
              </ul>
            </div>
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
           jumping, and sit at the exact midpoint between the text's own
           bottom edge and the header row's bottom edge rather than flush
           with either. */
        .site-nav__underline {
          position: absolute;
          height: 1px;
          background: var(--color-fg);
          transition:
            left var(--duration-base) var(--ease-standard),
            width var(--duration-base) var(--ease-standard),
            top var(--duration-base) var(--ease-standard);
        }
        .site-nav__toggle {
          display: flex;
          background: none;
          border: none;
          color: var(--color-fg);
          cursor: pointer;
          padding: var(--space-2);
        }
        /* grid-template-rows: 0fr -> 1fr, not height: 0 -> auto — height
           can't be transitioned to/from auto at all, and a fixed pixel
           target would need re-measuring every time the link count or
           label lengths change (locale swap, adding a nav item). A single
           grid row whose fr size animates does the same job natively: the
           row's own track size interpolates smoothly, and the actual
           content dictates what "1fr" resolves to without any JS
           measurement. .site-nav__panel-inner's overflow: hidden is
           required for this to read as a height animation rather than the
           content just clipping abruptly at 0fr — a grid row can size to
           0 while its content stays its natural height unless something
           inside clips to the row's own shrunk size. */
        #mobile-nav-panel {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows var(--duration-base) var(--ease-standard);
        }
        #mobile-nav-panel[data-open="true"] {
          grid-template-rows: 1fr;
        }
        .site-nav__panel-inner {
          overflow: hidden;
          min-height: 0;
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
      `}</style>
    </nav>
  );
}
