import { useRef } from "react";
import AsciiLogo from "./AsciiLogo";
import ContactForm from "./ContactForm";
import TypewriterHero from "./TypewriterHero";
import PinnedPortfolioCarousel, { type PinnedPortfolioItem } from "./carousel/PinnedPortfolioCarousel";
import LogoCarousel, { type LogoCarouselItem } from "./carousel/LogoCarousel";
import TestimonialCarousel, { type TestimonialCarouselItem } from "./carousel/TestimonialCarousel";

type FormLabels = {
  email: string;
  emailPlaceholder: string;
  message: string;
  messagePlaceholder: string;
  submit: string;
  note: string;
  success: string;
  error: string;
};

type Props = {
  heroHeadlineStatic: string;
  heroHeadlineReveal: string;
  workIntro: string;
  workOutro: string;
  clientsHeading: string;
  clientsIntro: string;
  contactHeading: string;
  portfolioItems: PinnedPortfolioItem[];
  clientItems: LogoCarouselItem[];
  testimonials: TestimonialCarouselItem[];
  formLabels: FormLabels;
};

/**
 * The homepage as a sequence of full-bleed sections in plain continuous
 * scroll — no scroll-snap paging. Each .hs__step still reserves at least
 * one viewport (min-height: 100svh) so every section reads as "one idea,
 * one screen" at rest, but nothing forces the browser to stop there: the
 * user's own scroll physics carry through uninterrupted from top to
 * bottom, same as the rest of the web.
 */
export default function HomeExperience({
  heroHeadlineStatic,
  heroHeadlineReveal,
  workIntro,
  workOutro,
  clientsHeading,
  clientsIntro,
  contactHeading,
  portfolioItems,
  clientItems,
  testimonials,
  formLabels,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="hs" ref={containerRef}>
      {/* data-nav-section groups sections under whichever nav link they
          count as being "part of" for the underline (several sections can
          share one — see useActiveNavSection). The header itself no longer
          adapts to what's behind it (a light-section flip was tried on
          Portfolio below and then deliberately dropped — it stays a fixed
          dark pill everywhere), so nothing else needs to know a section's
          light/dark intent except the section's own internal styling. */}
      {/* Portfolio opens the page (matching the Figma flow — the nav sits
          directly on this section from the very first frame, no separate
          hero screen ahead of it) rather than following a headline/identity
          lead-in. */}
      <section id="work" className="hs__step hs__work" data-nav-section="work">
        <PinnedPortfolioCarousel items={portfolioItems} introText={workIntro} outroText={workOutro} />
      </section>

      <section className="hs__step hs__hero">
        <TypewriterHero navSection="work" staticText={heroHeadlineStatic} revealText={heroHeadlineReveal} />
      </section>

      {/* The studio storytelling section: white, directly after the
          typewriter hero's own animated quote — not after the ASCII/
          identity break below, which sits after it instead now.
          Deliberately empty for the moment — the real storytelling
          content isn't written yet; this is the section itself, not a
          placeholder heading standing in for it. Still a full hs__step
          (min-height: 100svh via the shared rule) so it reads as its own
          deliberate pause rather than a collapsed gap. */}
      <section id="studio" className="hs__step hs__studio" data-nav-section="studio" />

      {/* No heading here on purpose — the ASCII mark is the whole moment,
          not illustrating a title next to it. */}
      <section className="hs__step hs__ascii" data-nav-section="work">
        <AsciiLogo />
      </section>

      <section className="hs__step hs__clients" data-nav-section="contact">
        <div className="hs__content">
          <h2>{clientsHeading}</h2>
          <p className="hs__clients-intro">{clientsIntro}</p>
        </div>
        <LogoCarousel items={clientItems} />
      </section>

      {testimonials.length > 0 && (
        <section className="hs__step hs__testimonials" data-nav-section="contact">
          <TestimonialCarousel items={testimonials} />
        </section>
      )}

      <section id="contact" className="hs__step hs__contact" data-nav-section="contact">
        <div className="hs__content hs__contact-grid">
          {/* Was the site-wide Footer's own content (see BaseLayout's
              hideFooter, now set for the homepage in index.astro) — moved
              here instead of duplicated in both places. Same contact
              details/socials, not localized (real-world facts, identical
              in both languages), same reason Footer.astro never localized
              them either. */}
          <div className="hs__contact-info">
            <div className="hs__contact-links">
              <a href="mailto:hei@hinside.as">hei@hinside.as</a>
              <a href="tel:+4746661240">+47 466 61 240</a>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Verkstedveien+13%2C+6517+Kristiansund+N"
                target="_blank"
                rel="noopener noreferrer"
              >
                Verkstedveien 13
              </a>
              <a href="https://virksomhet.brreg.no/nb/oppslag/enheter/937170602" target="_blank" rel="noopener noreferrer">
                937 170 602 MVA
              </a>
            </div>
            <div className="hs__contact-socials">
              <a href="https://www.linkedin.com/company/hinside" target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
              <a href="https://www.instagram.com/hinsidedesign" target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
              <a href="https://www.tiktok.com/hinsidedesign" target="_blank" rel="noopener noreferrer">
                TikTok
              </a>
              <a href="https://www.youtube.com/@hinsidedesign" target="_blank" rel="noopener noreferrer">
                YouTube
              </a>
            </div>
          </div>
          <div className="hs__contact-main">
            <h2>{contactHeading}</h2>
            <ContactForm labels={formLabels} />
          </div>
        </div>
      </section>

      <style>{`
        .hs {
          width: 100%;
        }
        /* min-height, not a fixed height, unlike the case-study template's
           .cse__step — these are text-heavy sections that can genuinely
           need more room on a short viewport, and clipping content is
           worse than a section occasionally running taller than 100svh.
           svh, not dvh: dvh tracks the *current* viewport live, which
           shrinks/grows continuously as mobile Chrome's toolbar hides and
           reveals on scroll — every section using it as a min-height floor
           visibly resized in step, reading as the whole page jumping. svh
           is the viewport size with the toolbar fully expanded (the
           smallest it's ever going to be), so a floor sized off it never
           has to move; a section can still grow taller than that floor
           when its own content needs to, same as before. */
        .hs__step {
          position: relative;
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-block: var(--space-8);
        }
        /* Lets a same-page nav-hash click (or a hard navigation landing
           directly on e.g. /#work) rest with the header's own height
           clear above it, instead of scrolling the target flush to the
           very top of the viewport where the header would sit on top of
           it. */
        #work,
        #studio,
        #contact {
          scroll-margin-top: var(--header-height);
        }
        /* Same left/right inset at every breakpoint, matching the
           case-study sidebar/footer's own --space-5 desktop margin rather
           than the site's plainer --space-4 default used elsewhere. */
        .hs__content {
          width: 100%;
          max-width: var(--content-max-width);
          margin-inline: auto;
          padding-inline: var(--space-5);
        }
        /* TypewriterHero owns its own pin/height/typography entirely (see
           that component) — this wrapper just zeroes the padding-block
           .hs__step would otherwise add before/after it, which would
           otherwise read as a dead gap before the pin engages. */
        .hs__hero {
          padding-block: 0;
        }
        /* Shared heading treatment for every section below the hero —
           consistent size/spacing rather than each section tuning its own. */
        .hs__step h2 {
          font-size: var(--text-2xl);
          margin-bottom: var(--space-4);
        }
        /* Column, not the base .hs__step row: heading above the mark. */
        .hs__ascii {
          background: var(--color-black);
          padding-inline: clamp(1rem, 3vw, var(--space-6));
        }
        /* Light section (per the Figma spec) inside an otherwise-dark
           homepage — redefining --color-fg/-muted locally rather than a
           separate rule set lets every descendant that already reads those
           tokens (PinnedPortfolioCarousel's own component included) adapt
           for free. The header itself doesn't react to this (it stays a
           fixed dark pill everywhere — an earlier adaptive version was
           deliberately dropped), so this override only ever affects this
           section's own content. The carousel is this section's only child
           now (no heading/dek above it), so it's free to fill the whole
           step. */
        .hs__work {
          align-items: stretch;
          background: var(--color-white);
          padding-block: 0;
          --color-fg: var(--color-black);
          --color-fg-muted: color-mix(in srgb, var(--color-black) 65%, transparent);
          color: var(--color-fg);
          /* Cancels the header's own reserved flow space (position: sticky
             still reserves its natural, un-offset box — see Header.astro's
             own comment) so this section's top sits at the document's true
             y:0 instead of one header-height down. Without this, the
             pinned carousel's sticky viewport hadn't actually reached its
             "stuck" state for the first --header-height px of scroll — it
             was still scrolling normally while PinnedPortfolioCarousel's
             own transform had already started sliding the track, reading
             as the whole thing drifting diagonally before settling into
             pure sideways motion. Margin collapses straight through .hs and
             <main> (both plain, unpadded, unbordered block boxes) up to
             <header>'s own reserved box, same technique the case-study
             template's .cse__text-box-anchor already uses for an identical
             reason. */
          margin-top: calc(-1 * var(--header-height));
        }
        /* The carousel still needs to read as centered on the *slide*, not
           "centered in whatever space the heading/intro happen to leave
           behind" (which sits visibly below true center, pushed down by
           their own height). Taking .hs__content out of flow entirely
           (absolute, pinned near the bottom) leaves LogoCarousel as the
           slide's only in-flow child, so .hs__step's own inherited flex
           centering centers *it* directly against the full viewport
           instead of against a shorter remaining box. */
        .hs__clients {
          position: relative;
          padding-block: var(--space-6);
          background: #0a0a0a;
        }
        .hs__clients > .hs__content {
          position: absolute;
          bottom: var(--space-6);
          left: 0;
          right: 0;
        }
        /* Light section — the studio storytelling break right after the
           ASCII/identity visual break above, same local-cascade-override
           technique .hs__work already uses for its own light section: the
           two tokens most things actually read (--color-fg, its own
           -muted variant) are redefined here, so the shared .hs__step h2
           rule and this section's own paragraph both adapt for free via
           normal inheritance, no separate light-mode rule needed for
           either. */
        .hs__studio {
          background: var(--color-white);
          --color-fg: var(--color-black);
          --color-fg-muted: color-mix(in srgb, var(--color-black) 65%, transparent);
          color: var(--color-fg);
        }
        .hs__studio-paragraph {
          font-size: var(--text-base);
          line-height: var(--leading-normal);
          color: var(--color-fg-muted);
          max-width: 56ch;
        }
        .hs__clients-intro {
          max-width: 34rem;
          margin: 0;
          font-size: var(--text-base);
          color: var(--color-fg-muted);
        }
        .hs__testimonials {
          background: #141414;
        }
        /* Light section, same as .hs__work/.hs__studio — the site-wide
           Footer used to close the page after this section in the old
           dark theme; now that its own contact/social links live inside
           .hs__contact-info below instead, this needed the fuller set of
           tokens .cse (the case-study template) overrides, not just
           --color-fg/-muted like the simpler text-only light sections —
           ContactForm itself reads --color-bg-raised/--color-border/
           --color-border-strong for its inputs, so those need real light-
           theme values here too or the form would still render with dark
           inputs on a light page. */
        .hs__contact {
          background: var(--color-white);
          --color-bg: var(--color-white);
          --color-bg-raised: var(--color-grey-100);
          --color-fg: var(--color-black);
          --color-fg-muted: color-mix(in srgb, var(--color-black) 65%, transparent);
          --color-border: var(--color-grey-300);
          --color-border-strong: var(--color-grey-500);
          color: var(--color-fg);
          min-height: 100svh;
          padding-block: var(--space-6);
        }
        .hs__contact-grid {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: var(--space-6);
        }
        .hs__contact-info {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
          font-size: var(--text-sm);
        }
        .hs__contact-links,
        .hs__contact-socials {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .hs__contact-info a {
          color: var(--color-fg);
          text-decoration: none;
          opacity: 0.7;
          transition: opacity var(--duration-base) var(--ease-standard);
        }
        .hs__contact-info a:hover,
        .hs__contact-info a:focus-visible {
          opacity: 1;
        }
        .hs__contact-main {
          width: 100%;
          max-width: 32rem;
        }
      `}</style>
    </div>
  );
}
