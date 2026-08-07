import { useEffect, useState } from "react";

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

  // Active section state — same IntersectionObserver approach as
  // AnchorMenu.astro (the case-study page's section nav), ported here
  // rather than shared, since it's small and the two live in different
  // component types (Astro vs. React island).
  useEffect(() => {
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-nav-hash]"));
    const tracked = anchors
      .map((anchor) => ({ anchor, section: document.getElementById(anchor.dataset.navHash ?? "") }))
      .filter((entry): entry is { anchor: HTMLAnchorElement; section: HTMLElement } => entry.section !== null);

    if (tracked.length === 0) return;

    const setActive = (id: string) => {
      for (const { anchor } of tracked) {
        anchor.dataset.active = String(anchor.dataset.navHash === id);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        setActive(topMost.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    tracked.forEach(({ section }) => observer.observe(section));
    return () => observer.disconnect();
  }, [links]);

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

      {isOpen && (
        <div id="mobile-nav-panel" className="site-nav__panel" role="dialog" aria-modal="true">
          <ul>
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} data-nav-hash={link.href.split("#")[1]} onClick={() => setIsOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a href={otherLocaleHref}>{otherLocaleLabel}</a>
            </li>
          </ul>
        </div>
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
          opacity: 1;
          transition: opacity var(--duration-fast) var(--ease-standard);
        }
        .site-nav__desktop a:hover,
        .site-nav__desktop a:focus-visible {
          opacity: 0.75;
        }
        .site-nav__desktop a[data-active="true"] {
          text-decoration: underline;
          text-underline-offset: 0.3em;
        }
        .site-nav__toggle {
          background: none;
          border: none;
          font: inherit;
          color: var(--color-fg);
          cursor: pointer;
          padding: var(--space-2);
        }
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
          z-index: 40;
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
          opacity: 1;
          transition: opacity var(--duration-fast) var(--ease-standard);
        }
        .site-nav__panel a:hover,
        .site-nav__panel a:focus-visible {
          opacity: 0.75;
        }
        .site-nav__panel a[data-active="true"] {
          text-decoration: underline;
          text-underline-offset: 0.3em;
        }
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
