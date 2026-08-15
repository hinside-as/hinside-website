import { useRef } from "react";
import AsciiLogo from "./AsciiLogo";
import ContactForm from "./ContactForm";
import PortfolioCarousel, { type PortfolioItem } from "./carousel/PortfolioCarousel";
import LogoCarousel, { type LogoCarouselItem } from "./carousel/LogoCarousel";
import TestimonialCarousel, { type TestimonialCarouselItem } from "./carousel/TestimonialCarousel";
import { useHeaderReveal } from "../hooks/useHeaderReveal";
import { useFooterHeight } from "../hooks/useFooterHeight";

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
  heroDek: string;
  studioHeading: string;
  studioParagraph: string;
  clientsIntro: string;
  portfolioItems: PortfolioItem[];
  clientItems: LogoCarouselItem[];
  testimonials: TestimonialCarouselItem[];
  formLabels: FormLabels;
};

/**
 * The homepage as a sequence of full-bleed, scroll-snapped slides — the
 * same native-scroll + CSS scroll-snap architecture as the case-study
 * template (see CaseStudyExperience.tsx and the "Case-study scroll
 * experience" section of CLAUDE.md), minus the sidebar/TOC: there's no
 * chapter list to show here, just the sections themselves in sequence,
 * one idea per slide rather than several stacked in one scroll.
 */
export default function HomeExperience({
  heroHeadline,
  heroDek,
  studioHeading,
  studioParagraph,
  clientsIntro,
  portfolioItems,
  clientItems,
  testimonials,
  formLabels,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Header visible only on the big headline slide, hidden from the dek
  // slide onward — see useHeaderReveal for why this is a continuous
  // scroll-coupled value rather than a discrete flag + CSS transition.
  useHeaderReveal(containerRef, ".hs__hero");

  // .hs__contact's own min-height (see its CSS below) needs the real,
  // current footer height to guarantee contact+footer together always
  // reach a full viewport — see useFooterHeight.
  useFooterHeight();

  return (
    <div className="hs" ref={containerRef}>
      <section className="hs__step hs__hero">
        <div className="hs__content">
          <h1 className="hs__hero-headline" data-reveal>
            {heroHeadline}
          </h1>
        </div>
      </section>

      <section id="work" className="hs__step hs__work">
        <PortfolioCarousel items={portfolioItems} />
      </section>

      <section className="hs__step hs__ascii">
        <AsciiLogo />
      </section>

      <section className="hs__step hs__dek">
        <div className="hs__content">
          <p className="hs__hero-dek">{heroDek}</p>
        </div>
      </section>

      <section id="studio" className="hs__step hs__studio">
        <div className="hs__content">
          <h2>{studioHeading}</h2>
          <p className="hs__studio-paragraph">{studioParagraph}</p>
        </div>
      </section>

      <section className="hs__step hs__clients">
        <div className="hs__content">
          <p className="hs__clients-intro">{clientsIntro}</p>
        </div>
        <LogoCarousel items={clientItems} />
      </section>

      {testimonials.length > 0 && (
        <section className="hs__step hs__testimonials">
          <TestimonialCarousel items={testimonials} />
        </section>
      )}

      <section id="contact" className="hs__step hs__contact">
        <div className="hs__content hs__contact-grid">
          <div className="hs__contact-main">
            <ContactForm labels={formLabels} />
          </div>
        </div>
      </section>

      <style>{`
        .hs {
          width: 100%;
        }
        /* min-height, not a fixed height, unlike the case-study template's
           .cse__step — those are single images/videos that always fill
           exactly one viewport; these are text-heavy sections that can
           genuinely need more room on a short viewport, and clipping
           content is worse than a slide occasionally running taller than
           100dvh — the same reasoning already applied to the case-study
           template's own promo slide. */
        .hs__step {
          position: relative;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          padding-block: var(--space-8);
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
          padding-block: var(--space-6);
        }
        .hs__hero-headline {
          font-size: var(--text-4xl);
          font-weight: var(--weight-regular);
          letter-spacing: var(--tracking-tighter);
          line-height: var(--leading-tight);
          max-width: 20ch;
        }
        .hs__dek {
          background: var(--color-bg);
        }
        .hs__hero-dek {
          font-size: var(--text-lg);
          line-height: var(--leading-normal);
          color: var(--color-fg-muted);
          max-width: 42ch;
        }
        .hs__ascii {
          background: var(--color-bg);
          padding-inline: clamp(1rem, 3vw, var(--space-6));
        }
        /* No heading on this slide — the carousel is the whole slide, so
           plain centering (inherited from .hs__step) puts it dead center
           with no text block to offset it. padding-block: 0 overrides
           .hs__step's own --space-8 (144px top+bottom, sized for
           text-heavy slides) — PortfolioCarousel already carries its own
           internal spacing (.pc-carousel-section's padding, .pc-track's
           cursor-clearance padding), and stacking .hs__step's padding on
           top of that pushed this slide's total content past one
           viewport on any screen shorter than ~900px (i.e. most laptop
           browser windows), overflowing the min-height floor. That
           extra, unreachable-in-one-gesture height under mandatory
           scroll-snap is what read as the carousel "not lining up"/being
           scrollable in place. */
        .hs__work {
          background: var(--color-bg);
          padding-block: 0;
        }
        /* Unlike .hs__work's own history with this same problem (see its
           comment above), .hs__clients keeps its intro text rather than
           dropping it — but the carousel still needs to read as centered
           on the *slide*, not "centered in whatever space the intro
           happens to leave behind" (which sits visibly below true center,
           pushed down by the intro's own height). Taking .hs__content out
           of flow entirely (absolute, pinned near the bottom) leaves
           LogoCarousel as the slide's only in-flow child, so .hs__step's
           own inherited flex centering centers *it* directly against the
           full viewport instead of against a shorter remaining box. */
        .hs__clients {
          position: relative;
          padding-block: var(--space-6);
          background: var(--color-bg-raised);
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
           100dvh for this (min-height, not height, on .hs__step) rather
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
          background: var(--color-bg-raised);
        }
        .hs__studio h2 {
          font-size: var(--text-2xl);
          margin-bottom: var(--space-4);
        }
        .hs__studio-paragraph {
          font-size: var(--text-lg);
          line-height: var(--leading-normal);
          max-width: 56ch;
        }
        .hs__clients-intro {
          max-width: 34rem;
          margin: 0;
          font-size: var(--text-sm);
          color: var(--color-fg-muted);
        }
        .hs__testimonials {
          background: var(--color-bg);
        }
        .hs__contact {
          background: var(--color-bg-raised);
          /* min-height is calc(100dvh - footer height), not auto and not
             the shared 100dvh: this is the last slide, and its own
             scroll-snap-align:start point is only physically reachable
             (see the general truism about a document's *last* snap point
             in CLAUDE.md) if the remaining document height from this
             slide's own top to the true end is at least one full
             viewport. Undershoot that and the browser clamps to the max
             scrollable position instead, landing short of this slide's
             top — visible as a band of the *previous* slide bleeding in
             above it, which is exactly the bug this replaced (an earlier
             version tried to fix the same symptom by shrinking this
             slide's own padding, which just reduced the shortfall rather
             than eliminating it). Sizing this slide to exactly fill
             "one viewport minus the footer" guarantees contact + footer
             always add up to precisely one viewport, at any viewport
             height or footer content length — see the --footer-height
             ResizeObserver above. */
          min-height: calc(100dvh - var(--footer-height, 0px));
          padding-block: var(--space-6);
        }
        /* Mobile gets its own full slide instead of sharing one screen
           with the footer — a narrow column doesn't have the horizontal
           room desktop does to lay the footer's link groups out
           compactly, so cramming the whole form *and* the whole footer
           into one short mobile viewport reads as cramped rather than
           efficient. Same breakpoint PortfolioCarousel's own touch
           override uses, for one consistent "mobile" width across the
           site rather than a bespoke threshold here. */
        @media (max-width: 720px) {
          .hs__contact {
            min-height: 100dvh;
          }
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
