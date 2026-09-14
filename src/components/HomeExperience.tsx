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
  identityHeading: string;
  workIntro: string;
  workOutro: string;
  studioHeading: string;
  studioParagraph: string;
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
  identityHeading,
  workIntro,
  workOutro,
  studioHeading,
  studioParagraph,
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

      <section className="hs__step hs__ascii" data-nav-section="work">
        <div className="hs__content">
          <h2>{identityHeading}</h2>
        </div>
        <AsciiLogo />
      </section>

      <section id="studio" className="hs__step hs__studio" data-nav-section="studio">
        <div className="hs__content">
          <h2>{studioHeading}</h2>
          <p className="hs__studio-paragraph">{studioParagraph}</p>
        </div>
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
          flex-direction: column;
          gap: var(--space-6);
          background: var(--color-black);
          padding-inline: clamp(1rem, 3vw, var(--space-6));
        }
        /* .hs__content here holds nothing but the heading (no paragraph
           below it to use the margin for) — without this, its own
           margin-bottom: var(--space-4) (see the shared h2 rule) would
           stack on top of .hs__ascii's own gap above, doubling the space
           before the mark. */
        .hs__ascii h2 {
          margin-bottom: 0;
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
        .hs__contact {
          background: #1f1f1f;
          min-height: 100svh;
          padding-block: var(--space-6);
        }
        /* Only one child now (the form) — justify-content:flex-end is
           what actually puts it on the right; .hs__contact-main's own
           max-width keeps it from stretching to fill the row once it's
           the row's only flex item. */
        .hs__contact-grid {
          display: flex;
          justify-content: flex-end;
        }
        .hs__contact-main {
          width: 100%;
          max-width: 32rem;
        }
      `}</style>
    </div>
  );
}
