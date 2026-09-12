import { useRef } from "react";
import AsciiLogo from "./AsciiLogo";
import ContactForm from "./ContactForm";
import PortfolioCarousel, { type PortfolioItem } from "./carousel/PortfolioCarousel";
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
  heroHeadline: string;
  identityHeading: string;
  workHeading: string;
  heroDek: string;
  studioHeading: string;
  studioParagraph: string;
  clientsHeading: string;
  clientsIntro: string;
  contactHeading: string;
  portfolioItems: PortfolioItem[];
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
  heroHeadline,
  identityHeading,
  workHeading,
  heroDek,
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
          share one — see useActiveNavSection); data-section-theme is a
          separate, per-section axis driving the header's own adaptive
          light/dark color (see Header.astro's script). All "dark" for now
          — every section here still assumes a dark background internally
          (AsciiLogo's glyph fill, PortfolioCarousel/LogoCarousel's card
          shells, ContactForm's inputs all read --color-fg etc.), so
          flipping any of them to the new soft-cream ground has to wait
          until each is individually reviewed for that, not bundled into
          the nav work. */}
      <section className="hs__step hs__hero" data-nav-section="work" data-section-theme="dark">
        <div className="hs__content">
          <h1 className="hs__hero-headline" data-reveal>
            {heroHeadline}
          </h1>
        </div>
      </section>

      <section className="hs__step hs__ascii" data-nav-section="work" data-section-theme="dark">
        <div className="hs__content">
          <h2>{identityHeading}</h2>
        </div>
        <AsciiLogo />
      </section>

      <section id="work" className="hs__step hs__work" data-nav-section="work" data-section-theme="dark">
        <div className="hs__content">
          <h2>{workHeading}</h2>
          <p className="hs__hero-dek">{heroDek}</p>
        </div>
        <PortfolioCarousel items={portfolioItems} />
      </section>

      <section id="studio" className="hs__step hs__studio" data-nav-section="studio" data-section-theme="dark">
        <div className="hs__content">
          <h2>{studioHeading}</h2>
          <p className="hs__studio-paragraph">{studioParagraph}</p>
        </div>
      </section>

      <section className="hs__step hs__clients" data-nav-section="contact" data-section-theme="dark">
        <div className="hs__content">
          <h2>{clientsHeading}</h2>
          <p className="hs__clients-intro">{clientsIntro}</p>
        </div>
        <LogoCarousel items={clientItems} />
      </section>

      {testimonials.length > 0 && (
        <section className="hs__step hs__testimonials" data-nav-section="contact" data-section-theme="dark">
          <TestimonialCarousel items={testimonials} />
        </section>
      )}

      <section
        id="contact"
        className="hs__step hs__contact"
        data-nav-section="contact"
        data-section-theme="dark"
      >
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
        /* Big typography, almost filling the slide: --text-4xl (the site's
           largest display-scale token) with a fairly tight max-width so
           the sentence wraps into several short lines rather than a few
           long ones — the wrap count is what actually fills the vertical
           space, not font-size alone. Tighter padding-block than the
           default .hs__step (--space-6, not --space-8) leaves more of the
           viewport for the headline itself. */
        .hs__hero {
          background: #000000;
          padding-block: var(--space-6);
        }
        .hs__hero-headline {
          font-size: var(--text-4xl);
          font-weight: var(--weight-regular);
          letter-spacing: var(--tracking-tighter);
          line-height: var(--leading-tight);
          max-width: 20ch;
        }
        /* Shared heading treatment for every section below the hero —
           consistent size/spacing rather than each section tuning its own. */
        .hs__step h2 {
          font-size: var(--text-2xl);
          margin-bottom: var(--space-4);
        }
        .hs__hero-dek {
          font-size: var(--text-base);
          line-height: var(--leading-normal);
          color: var(--color-fg-muted);
          max-width: 42ch;
        }
        /* Column, not the base .hs__step row: heading above the mark. */
        .hs__ascii {
          flex-direction: column;
          gap: var(--space-6);
          background: #000000;
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
        /* Column, not the base .hs__step row: heading + dek copy above the
           carousel. */
        .hs__work {
          flex-direction: column;
          gap: var(--space-6);
          background: #000000;
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
        /* Larger than PortfolioCarousel's own default card size (up to
           360px) — this slide's whole point is the carousel filling the
           view, so it's sized to dominate rather than to fit tidily
           beneath the heading. The slide is allowed to run taller than
           100svh for this (min-height, not height, on .hs__step) rather
           than shrinking the carousel to force a single-screen fit. */
        .hs__work .pc-carousel-section {
          --card-size: clamp(260px, 32vw, 420px);
        }
        /* The portfolio carousel's own radial-gradient background panel
           (.pc-carousel-section::before) is tuned for sitting inside the
           old stacked homepage's section background — here the slide's
           own plain background already does that job, so the panel would
           just show up as an out-of-place patch. Same override the
           case-study promo slide already uses. */
        .hs__work .pc-carousel-section::before {
          display: none;
        }
        .hs__studio {
          background: #0a0a0a;
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

        @media (min-width: 60rem) {
          .hs__hero-headline {
            max-width: 22ch;
          }
        }
      `}</style>
    </div>
  );
}
