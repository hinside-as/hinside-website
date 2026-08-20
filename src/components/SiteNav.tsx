import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type NavLink = { href: string; label: string };

type Props = {
  links: NavLink[];
  menuLabel: string;
  closeLabel: string;
  otherLocaleHref: string;
  otherLocaleLabel: string;
};

export default function SiteNav({
  links,
  menuLabel,
  closeLabel,
  otherLocaleHref,
  otherLocaleLabel,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <nav className="site-nav" aria-label="Main">
      <ul className="site-nav__desktop">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} data-nav-hash={link.href.split("#")[1]}>
              {link.label}
            </a>
          </li>
        ))}
        <li>
          <a href={otherLocaleHref}>{otherLocaleLabel}</a>
        </li>
      </ul>

      <button
        type="button"
        className="site-nav__toggle"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-panel"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? closeLabel : menuLabel}
      </button>

      {isOpen &&
        createPortal(
          // Portalled straight to <body>, not rendered inline under
          // .site-header: this panel is position: fixed and needs the real
          // viewport as its containing block. .site-header[data-solid="true"]
          // applies its own `transform` for the scroll-reveal effect (see
          // Header.astro's comment on why backdrop-filter had to move off
          // that same element for the identical reason) — transform, like
          // backdrop-filter, makes an element a containing block for any
          // position: fixed descendant, which would trap this panel inside
          // the header's small bar instead of covering the screen. Porting
          // it out sidesteps that regardless of what else ever lands on
          // .site-header.
          <div id="mobile-nav-panel" className="site-nav__panel" role="dialog" aria-modal="true">
            <ul>
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    data-nav-hash={link.href.split("#")[1]}
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a href={otherLocaleHref}>{otherLocaleLabel}</a>
              </li>
            </ul>
            <style>{`
              .site-nav__panel {
                position: fixed;
                inset: 0;
                top: var(--header-height);
                background: color-mix(in srgb, var(--color-bg) 82%, transparent);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                display: flex;
                align-items: center;
                justify-content: center;
                /* Above .site-header's z-index: 50 — this panel now lives
                   under document.body rather than inside the header, so it
                   no longer wins ties by DOM order alone. */
                z-index: 60;
              }
              .site-nav__panel ul {
                list-style: none;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                gap: var(--space-4);
                text-align: center;
              }
              .site-nav__panel a {
                text-decoration: none;
                font-size: var(--text-2xl);
                color: var(--color-fg);
                opacity: 0.7;
                transition: opacity var(--duration-base) var(--ease-standard);
              }
              .site-nav__panel a:hover,
              .site-nav__panel a:focus-visible {
                opacity: 1;
              }
            `}</style>
          </div>,
          document.body,
        )}

      <style>{`
        .site-nav__desktop {
          display: none;
          list-style: none;
          margin: 0;
          padding: 0;
          gap: var(--space-4);
        }
        .site-nav__desktop a {
          text-decoration: none;
          font-size: var(--text-sm);
          opacity: 0.7;
          transition: opacity var(--duration-base) var(--ease-standard);
        }
        .site-nav__desktop a:hover,
        .site-nav__desktop a:focus-visible {
          opacity: 1;
        }
        .site-nav__toggle {
          background: none;
          border: none;
          font: inherit;
          color: var(--color-fg);
          cursor: pointer;
          padding: var(--space-2);
        }
        /* .site-nav__panel's own rules live with the portalled markup below
           — it renders under document.body, not this <nav>, so keeping its
           styles next to that JSX (rather than here) matches where it
           actually lives in the DOM. */
        @media (min-width: 48rem) {
          .site-nav__desktop {
            display: flex;
          }
          .site-nav__toggle {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}
