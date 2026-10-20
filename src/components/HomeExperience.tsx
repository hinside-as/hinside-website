import { useEffect, useRef, useState } from "react";
import AsciiLogo from "./AsciiLogo";
import ContactForm from "./ContactForm";
import TypewriterHero from "./TypewriterHero";
import PinnedPortfolioCarousel, { type PinnedPortfolioItem } from "./carousel/PinnedPortfolioCarousel";
import LogoCarousel, { type LogoCarouselItem } from "./carousel/LogoCarousel";
import TestimonialCarousel, { type TestimonialCarouselItem } from "./carousel/TestimonialCarousel";

type FormLabels = {
  name: string;
  email: string;
  message: string;
  submit: string;
  note: string;
  success: string;
  error: string;
};

type Props = {
  heroHeadlineStatic: string;
  heroHeadlineReveal: string;
  studioParagraphs: string[];
  workIntro: string;
  workOutro: string;
  clientsHeading: string;
  clientsIntro: string;
  contactHeading: string;
  contactIntro: string;
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
  studioParagraphs,
  workIntro,
  workOutro,
  clientsHeading,
  clientsIntro,
  contactHeading,
  contactIntro,
  portfolioItems,
  clientItems,
  testimonials,
  formLabels,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Which studio paragraph is showing. Purely observed from native scroll
  // position (the tall section's invisible step markers crossing the
  // viewport centre) — nothing here drives or intercepts scrolling.
  const [studio, setStudio] = useState<{ index: number; dir: "forward" | "back" }>({ index: 0, dir: "forward" });
  const studioIndex = studio.index;
  const studioStepsRef = useRef<HTMLDivElement>(null);
  const studioTrailRef = useRef<HTMLSpanElement>(null);
  // Replays the trail's fade every time the bar actually moves — toggling
  // the class on the same element (not remounting) so its position
  // transition keeps lagging toward the new spot instead of snapping.
  useEffect(() => {
    const trail = studioTrailRef.current;
    if (!trail) return;
    trail.classList.remove("hs__studio-trail--active");
    void trail.offsetWidth;
    trail.classList.add("hs__studio-trail--active");
  }, [studioIndex]);
  useEffect(() => {
    const steps = Array.from(studioStepsRef.current?.children ?? []);
    if (steps.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const next = steps.indexOf(entry.target);
          setStudio((prev) => (prev.index === next ? prev : { index: next, dir: next > prev.index ? "forward" : "back" }));
        }
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );
    steps.forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, [studioParagraphs.length]);

  return (
    <div className="hs" ref={containerRef}>
      {/* data-nav-section groups sections under whichever nav link they
          count as being "part of" for the underline (several sections can
          share one — see useActiveNavSection).
          data-header-theme is a SEPARATE, coarser grouping for the header's
          own black/white color: a light-section flip was tried here once
          before and dropped for a flat dark pill everywhere — now that the
          pill itself is gone (see Header.astro), the header needs some way
          to stay legible against both this page's dark sections and its
          white ones, and true continuous background-driven inversion
          (mix-blend-mode) turned out not to work across a position: sticky
          boundary in current browsers (confirmed by isolated testing, not
          assumed) — Header.astro's own script watches these attributes via
          IntersectionObserver and switches --header-fg accordingly. One
          known, accepted gap: .hs__work's photos can be both light and dark
          under the header at once, which a per-section switch can't follow
          pixel-for-pixel — everywhere else here is one flat color, so the
          switch reads as seamless. */}
      {/* Portfolio opens the page (matching the Figma flow — the nav sits
          directly on this section from the very first frame, no separate
          hero screen ahead of it) rather than following a headline/identity
          lead-in. */}
      <section id="work" className="hs__step hs__work" data-nav-section="work" data-header-theme="light">
        <PinnedPortfolioCarousel items={portfolioItems} introText={workIntro} outroText={workOutro} />
      </section>

      <section className="hs__step hs__hero" data-header-theme="dark">
        <TypewriterHero navSection="work" staticText={heroHeadlineStatic} revealText={heroHeadlineReveal} />
      </section>

      {/* The studio storytelling section: white, directly after the
          typewriter hero's own animated quote. A tall section (one step
          of scroll per paragraph) with a sticky full-height stage inside
          it: the browser's ordinary scrolling carries the visitor through
          the paragraphs, one at a time — the step markers below are
          invisible and only observed (see studioIndex), never used to
          hijack scroll. */}
      <section
        id="studio"
        className="hs__step hs__studio"
        data-nav-section="studio"
        data-header-theme="light"
        style={{ "--studio-steps": studioParagraphs.length } as React.CSSProperties}
      >
        <div className="hs__studio-pin">
          <div className="hs__content">
            <div className="hs__studio-stage" data-dir={studio.dir}>
              {studioParagraphs.map((paragraph, index) => (
                <p
                  key={paragraph}
                  data-state={index < studioIndex ? "past" : index === studioIndex ? "active" : "future"}
                  aria-hidden={index !== studioIndex}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
          {/* Progress line, in the style of the nav's own underline: thin
              segments, one per paragraph, with a solid 1px bar that slides
              to the current one and a colourful trail that lags behind it
              (the only colour on the page, and only while moving). */}
          <div className="hs__content hs__studio-progress" aria-hidden="true">
            <div className="hs__studio-track">
              {studioParagraphs.map((paragraph) => (
                <span key={paragraph} />
              ))}
              <span
                ref={studioTrailRef}
                className="hs__studio-trail"
                style={
                  {
                    left: `calc(${studioIndex} * (var(--seg) + var(--gap)))`,
                    "--trail-direction": studio.dir === "forward" ? "to left" : "to right",
                  } as React.CSSProperties
                }
              />
              <span className="hs__studio-bar" style={{ left: `calc(${studioIndex} * (var(--seg) + var(--gap)))` }} />
            </div>
          </div>
        </div>
        <div className="hs__studio-steps" ref={studioStepsRef} aria-hidden="true">
          {studioParagraphs.map((paragraph) => (
            <div key={paragraph} />
          ))}
        </div>
      </section>

      {/* No heading here on purpose — the ASCII mark is the whole moment,
          not illustrating a title next to it. */}
      <section className="hs__step hs__ascii" data-nav-section="studio" data-header-theme="dark">
        <AsciiLogo />
      </section>

      <section className="hs__step hs__clients" data-nav-section="studio" data-header-theme="light">
        <div className="hs__content">
          <h2>{clientsHeading}</h2>
          <p className="hs__clients-intro">{clientsIntro}</p>
        </div>
        <LogoCarousel items={clientItems} />
      </section>

      {testimonials.length > 0 && (
        <section className="hs__step hs__testimonials" data-nav-section="studio" data-header-theme="dark">
          <TestimonialCarousel items={testimonials} />
        </section>
      )}

      <section id="contact" className="hs__step hs__contact" data-nav-section="contact" data-header-theme="light">
        <div className="hs__content hs__contact-grid">
          <div className="hs__contact-head">
            <h2>{contactHeading}</h2>
            <p className="hs__contact-intro">{contactIntro}</p>
          </div>
          <div className="hs__contact-form">
            <ContactForm labels={formLabels} />
          </div>
          {/* Was the site-wide Footer's own content (see BaseLayout's
              hideFooter) — same contact details/socials, not localized
              (real-world facts, identical in both languages). */}
          <div className="hs__contact-info">
            <div className="hs__contact-group">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Verkstedveien+13%2C+6517+Kristiansund+N"
                target="_blank"
                rel="noopener noreferrer"
              >
                Verkstedveien 13
                <br />
                6517 Kristiansund N
              </a>
            </div>
            <div className="hs__contact-group">
              <a href="tel:+4746661240">+47 466 61 240</a>
              <a href="mailto:hei@hinside.as">hei@hinside.as</a>
            </div>
            <div className="hs__contact-group">
              <div className="hs__contact-socials">
                <a href="https://www.linkedin.com/company/hinside" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11v5" /><path d="M8 8v.01" /><path d="M12 16v-5" /><path d="M16 16v-3a2 2 0 1 0 -4 0" /><path d="M3 7a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4z" /></svg>
                </a>
                <a href="https://www.instagram.com/hinsidedesign" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z" /><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /><path d="M16.5 7.5v.01" /></svg>
                </a>
                <a href="https://www.tiktok.com/hinsidedesign" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 7.917v4.034a9.948 9.948 0 0 1 -5 -1.951v4.5a6.5 6.5 0 1 1 -8 -6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917z" /></svg>
                </a>
                <a href="https://www.youtube.com/@hinsidedesign" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 8a4 4 0 0 1 4 -4h12a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-12a4 4 0 0 1 -4 -4z" /><path d="M10 9l5 3l-5 3z" /></svg>
                </a>
              </div>
            </div>
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
          /* Light, straight after the black ASCII section. The client
             logo files are all white artwork, so this flips them to
             black (see LogoCarousel's --logo-filter). */
          background: var(--color-white);
          --color-fg: var(--color-black);
          --color-fg-muted: color-mix(in srgb, var(--color-black) 65%, transparent);
          --logo-filter: brightness(0);
          /* Solid black, no colour change on hover (the size change and
             cursor already carry it). */
          --logo-rest-opacity: 1;
          color: var(--color-fg);
        }
        .hs__clients > .hs__content {
          position: absolute;
          top: calc(var(--header-height) + var(--space-6));
          left: 0;
          right: 0;
        }
        .hs__clients h2 {
          font-size: var(--text-xl);
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
        /* Tall by design: one 80svh scroll step per paragraph, plus 20svh
           so the sticky stage (100svh) releases while the last step is
           still centred. Overrides the shared .hs__step centering/padding
           — the stage centres its own content instead. */
        .hs__studio {
          display: block;
          min-height: 0;
          padding-block: 0;
          height: calc(var(--studio-steps) * 80svh + 20svh);
        }
        .hs__studio-pin {
          position: sticky;
          top: 0;
          height: 100svh;
          display: flex;
          align-items: center;
        }
        /* All paragraphs share one grid cell. Scrolling forward, the
           current one lifts up and out while the next rises in from below
           (the new one pushes the old one out); the incoming one waits a
           beat so the two never overlap mid-move. Scrolling back does NOT
           replay that in reverse — the story only ever moves forward, so
           going back just swaps the paragraph in place with a short fade
           (see data-dir). */
        .hs__studio-stage {
          display: grid;
          max-width: 40rem;
        }
        .hs__studio-stage p {
          grid-area: 1 / 1;
          align-self: center;
          font-size: clamp(1.25rem, 1.05rem + 0.7vw, 1.75rem);
          line-height: 1.5;
          color: var(--color-fg);
          opacity: 0;
          transition:
            opacity 300ms var(--ease-standard),
            transform var(--duration-slow) var(--ease-standard);
        }
        .hs__studio-stage p[data-state="past"] {
          transform: translateY(-6rem);
        }
        .hs__studio-stage p[data-state="future"] {
          transform: translateY(6rem);
        }
        .hs__studio-stage p[data-state="active"] {
          opacity: 1;
          transform: none;
          transition:
            opacity var(--duration-slow) var(--ease-standard) 250ms,
            transform var(--duration-slow) var(--ease-out-expressive) 150ms;
        }
        .hs__studio-stage[data-dir="back"] p {
          transition: none;
        }
        .hs__studio-stage[data-dir="back"] p[data-state="active"] {
          transition: opacity 250ms var(--ease-standard);
        }
        .hs__studio-progress {
          position: absolute;
          left: 0;
          right: 0;
          bottom: var(--space-6);
          display: flex;
          justify-content: center;
          gap: var(--space-2);
        }
        .hs__studio-track {
          --seg: 2.5rem;
          --gap: 0.5rem;
          position: relative;
          display: flex;
          gap: var(--gap);
        }
        .hs__studio-track > span:not(.hs__studio-bar):not(.hs__studio-trail) {
          width: var(--seg);
          height: 1px;
          background: var(--color-fg);
          opacity: 0.18;
        }
        .hs__studio-bar,
        .hs__studio-trail {
          position: absolute;
          top: 0;
          width: var(--seg);
          height: 1px;
          transition: left var(--duration-base) var(--ease-standard);
        }
        .hs__studio-bar {
          background: var(--color-fg);
        }
        /* Same hard-edged six-hue trail as the nav underline, lagging
           behind the bar on a slower, delayed transition and fading in
           then out on every move. */
        .hs__studio-trail {
          opacity: 0;
          background: linear-gradient(
            var(--trail-direction, to left),
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
          transition: left var(--duration-slow) var(--ease-standard) 60ms;
        }
        .hs__studio-trail--active {
          animation: hs-studio-trail-fade var(--duration-slow) ease-out 60ms;
        }
        @keyframes hs-studio-trail-fade {
          0% { opacity: 0; }
          25% { opacity: 1; }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hs__studio-trail { display: none; }
        }
        .hs__studio-steps {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          pointer-events: none;
        }
        .hs__studio-steps > div {
          flex: 0 0 80svh;
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
          /* Content starts at the same distance from the top as the
             Experience section's title (see .hs__clients > .hs__content),
             so the two section titles line up. */
          align-items: flex-start;
          padding-block: calc(var(--header-height) + var(--space-6)) var(--space-6);
        }
        /* Heading + intro on top, form left, details right — the form
           is underline-only fields (see ContactForm), the details are
           small muted group headings over plain links. */
        .hs__contact-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          grid-template-areas:
            "head head"
            "form info";
          column-gap: var(--space-8);
          row-gap: var(--space-6);
          align-items: start;
        }
        .hs__contact-head {
          grid-area: head;
        }
        .hs__contact-head h2 {
          font-size: var(--text-xl);
        }
        .hs__contact-intro {
          max-width: 28rem;
          font-size: var(--text-base);
          color: var(--color-fg-muted);
        }
        .hs__contact-form {
          grid-area: form;
          max-width: 32rem;
        }
        .hs__contact-info {
          grid-area: info;
          justify-self: end;
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
          font-size: var(--text-sm);
          min-width: 14rem;
        }
        .hs__contact-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .hs__contact-info a {
          color: var(--color-fg);
          text-decoration: none;
          opacity: 0.85;
          transition: opacity var(--duration-base) var(--ease-standard);
        }
        .hs__contact-info a:hover,
        .hs__contact-info a:focus-visible {
          opacity: 1;
        }
        .hs__contact-socials {
          display: flex;
          gap: var(--space-3);
        }
        .hs__contact-socials svg {
          width: 1.25rem;
          height: 1.25rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        @media (max-width: 48rem) {
          .hs__contact-grid {
            grid-template-columns: minmax(0, 1fr);
            grid-template-areas: "head" "form" "info";
          }
          .hs__contact-info {
            justify-self: start;
          }
        }
      `}</style>
    </div>
  );
}
