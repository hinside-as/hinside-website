import { useEffect, useRef, useState, type CSSProperties } from "react";
import { navigate } from "astro:transitions/client";
import { useActiveSection } from "../hooks/useActiveSection";
import GalleryCarousel, { type GalleryCarouselItem } from "./carousel/GalleryCarousel";

export type CaseStudySlideMedia =
  | {
      type: "image";
      src: string;
      alt: string;
      // Optional art-directed crop for narrow viewports — a single image
      // stretched full-bleed across both a wide desktop slide and a tall
      // mobile one crops very differently on each (object-fit: cover has
      // no way to know what matters in the frame), so this is a genuinely
      // different source image, not a resized/responsive variant of the
      // same one. alt text isn't swapped alongside it: <picture>'s <source>
      // has no alt of its own, the accessible name always comes from the
      // fallback <img>, so the same alt has to describe both crops.
      mobileSrc?: string;
      // See content.config.ts's galleryImage "padded" field — renders
      // inset/contain instead of the default full-bleed cover.
      padded?: boolean;
      // See content.config.ts's galleryImage "background" field — overrides
      // this slide's own background, only meaningful alongside padded.
      background?: string;
    }
  | {
      type: "video";
      src: string;
      poster?: string;
      mobileSrc?: string;
      mobilePoster?: string;
      allowUnmute?: boolean;
    }
  | { type: "carousel"; items: GalleryCarouselItem[]; shape: "square" | "circle" | "icon"; colorful?: boolean };

export type CaseStudyRecognitionItem = { name: string; award?: string; year: number };
export type CaseStudyCreditItem = { role: string; name: string };

export type CaseStudySlide = {
  chapterId: string;
  heading?: string;
  body?: string[];
  media?: CaseStudySlideMedia;
  // Mutually exclusive with media/body — a slide carries at most one of
  // media, recognition, or credits. Presence of either here (rather than
  // body.length) is what routes rendering to RecognitionSlide/CreditsSlide
  // below instead of the generic media+text treatment every other slide
  // uses; see the .cse__step map in the component body.
  recognition?: CaseStudyRecognitionItem[];
  credits?: CaseStudyCreditItem[];
};

export type CaseStudyMeta = {
  title: string;
  // Still used by CreditsSlide's own "Client" row — studio (also part of
  // the content model, see content.config.ts) isn't surfaced anywhere in
  // this component; the Credits slide's own credit entries are what keep
  // legacy agency authorship transparent instead (e.g. a "Design studio"
  // credit line), see docs/case-study-assets.md.
  client: string;
  clientLabel: string;
};

export type CaseStudyNextProject = {
  href: string;
  title: string;
  subtitle?: string;
  image: string;
  imageAlt: string;
  accent?: string;
};

type Props = {
  meta: CaseStudyMeta;
  slides: CaseStudySlide[];
  nextProject: CaseStudyNextProject;
  /** Matches the `view-transition-name` the homepage's PinnedPortfolioCarousel
   * declares on this project's cover image — see src/lib/viewTransitions.ts.
   * Applied only to slide 0's own media below, so the clicked card visually
   * expands into becoming this page's hero rather than the whole page just
   * appearing. */
  coverTransitionName?: string;
};

// Speaker glyph + either two sound-wave arcs (unmuted) or a slash through
// them (muted) — a standard, immediately-recognizable mute control rather
// than a custom glyph; this is a functional a11y control, not decoration,
// so legibility wins over matching the site's playful custom cursors.
function MuteIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" />
      {muted ? (
        <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      ) : (
        <path
          d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}

function VideoMedia({
  media,
  isMuted,
  transitionName,
}: {
  media: Extract<CaseStudySlideMedia, { type: "video" }>;
  // Only meaningful (and only ever read) when media.allowUnmute is set —
  // the actual toggle button lives outside this component now, next to
  // the show/hide-text control, so this is just the value to mirror onto
  // whichever <video> element(s) this instance renders.
  isMuted: boolean;
  transitionName?: string;
}) {
  const videoRefs = useRef<HTMLVideoElement[]>([]);

  const registerRef = (el: HTMLVideoElement | null) => {
    if (el && !videoRefs.current.includes(el)) videoRefs.current.push(el);
  };

  useEffect(() => {
    if (!media.allowUnmute) return;
    videoRefs.current.forEach((video) => {
      video.muted = isMuted;
    });
  }, [isMuted, media.allowUnmute]);

  const baseProps = {
    "data-cse-video": true,
    muted: true,
    loop: true,
    playsInline: true,
    preload: "metadata" as const,
    "aria-hidden": "true" as const,
    // Safe to set on both the desktop/mobile <video> elements below even
    // though only one is ever visible at a time (CSS toggles display:none
    // between them at 720px) — a display:none element has no box to
    // capture, so the browser's View Transition only ever picks up
    // whichever one is actually rendered.
    style: transitionName ? { viewTransitionName: transitionName } : undefined,
  };

  return (
    <>
      {media.mobileSrc ? (
        // Two whole <video> elements, not one with media-queried <source>s
        // (the image mobileSrc case's approach) — unlike src, poster is an
        // attribute of <video> itself with no per-<source> equivalent, so a
        // single element can't show a different poster frame per
        // breakpoint. CSS toggles which one is display:none at the same
        // 720px breakpoint used everywhere else on the site; the autoplay
        // effect below skips whichever one is currently hidden.
        <>
          <video
            ref={registerRef}
            {...baseProps}
            className="cse__media cse__media--desktop"
            src={media.src}
            poster={media.poster}
          />
          <video
            ref={registerRef}
            {...baseProps}
            className="cse__media cse__media--mobile"
            src={media.mobileSrc}
            poster={media.mobilePoster ?? media.poster}
          />
        </>
      ) : (
        <video ref={registerRef} {...baseProps} className="cse__media" src={media.src} poster={media.poster} />
      )}
    </>
  );
}

function Media({
  media,
  isMuted,
  transitionName,
}: {
  media?: CaseStudySlideMedia;
  isMuted: boolean;
  transitionName?: string;
}) {
  if (!media) return null;
  if (media.type === "video") {
    return <VideoMedia media={media} isMuted={isMuted} transitionName={transitionName} />;
  }
  if (media.type === "carousel") {
    return (
      <div className="cse__media cse__media--carousel">
        <GalleryCarousel items={media.items} shape={media.shape} colorful={media.colorful} />
      </div>
    );
  }
  const style = transitionName ? { viewTransitionName: transitionName } : undefined;
  const className = media.padded ? "cse__media cse__media--padded" : "cse__media";
  if (media.mobileSrc) {
    return (
      <picture>
        <source media="(max-width: 720px)" srcSet={media.mobileSrc} />
        <img className={className} src={media.src} alt={media.alt} loading="lazy" style={style} />
      </picture>
    );
  }
  return <img className={className} src={media.src} alt={media.alt} loading="lazy" style={style} />;
}

// Recognition and credits are the two slides that carry no image/video —
// unlike every other .cse__step, they render their own heading directly in
// the slide instead of the generic media+text treatment. A grid, not a
// single list, for recognition specifically: award counts vary a lot
// project to project (a handful vs. a dozen+), and a grid wraps into
// columns instead of one tall column.
function RecognitionSlide({ heading, items }: { heading?: string; items: CaseStudyRecognitionItem[] }) {
  return (
    <div className="cse__list-slide">
      {heading && <h2 className="cse__list-slide-heading">{heading}</h2>}
      <ul className="cse__recognition-list">
        {items.map((item, i) => (
          <li key={i} className="cse__recognition-item">
            <span className="cse__recognition-name">{item.name}</span>
            {item.award && <span className="cse__recognition-award">{item.award}</span>}
            <span className="cse__recognition-year">{item.year}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CreditsSlide({
  heading,
  clientLabel,
  client,
  items,
}: {
  heading?: string;
  clientLabel: string;
  client: string;
  items: CaseStudyCreditItem[];
}) {
  return (
    <div className="cse__list-slide">
      {heading && <h2 className="cse__list-slide-heading">{heading}</h2>}
      <dl className="cse__credits-list">
        <div>
          <dt>{clientLabel}</dt>
          <dd>{client}</dd>
        </div>
        {items.map((item, i) => (
          <div key={i}>
            <dt>{item.role}</dt>
            <dd>{item.name}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function CaseStudyExperience({ meta, slides, nextProject, coverTransitionName }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLAnchorElement>(null);
  const [nextProgress, setNextProgress] = useState(0);

  // The only thing tracked here now is which video should autoplay — the
  // chapter TOC that used to be this observer's other consumer is gone
  // (see CaseStudyExperience's history: a sidebar with a chapter rail used
  // to read activeIndex too). Purely observational, same as before: nothing
  // here reads a wheel/touch/keyboard event or calls scrollTo/scrollIntoView.
  const activeIndex = useActiveSection(containerRef, ".cse__step");

  // The homepage's own card picks whichever media this same slide happens
  // to render first (see src/lib/caseStudyHero.ts) — not always slide 0,
  // since a text-only opening slide (no media of its own) pushes the first
  // real image/video further down. Matching that here is what makes the
  // clicked card's view-transition-name actually land on a real element.
  const firstMediaIndex = slides.findIndex((slide) => slide.media);

  // One shared value rather than per-slide state: only one slide is ever
  // active/audible at a time (see the video autoplay-sync effect below), so
  // there's nothing to keep separate.
  const [isMuted, setIsMuted] = useState(true);

  // Autoplay the active slide's video only, pausing any others — a video
  // scrolled out of view has no business consuming decode/playback
  // resources. Driven by the same observed activeIndex as everything else;
  // this reacts to scroll position, it doesn't create it.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const syncVideoPlayback = () => {
      container.querySelectorAll<HTMLVideoElement>("[data-cse-video]").forEach((video) => {
        const step = video.closest<HTMLElement>(".cse__step");
        const isActive = Number(step?.dataset.slideIndex) === activeIndex;
        // A slide with a mobileSrc/mobilePoster pair renders two <video>
        // elements (see Media above), only one of which is display:none'd by
        // CSS at any given width — offsetParent is null for a display:none
        // element, the cheapest way to check without duplicating the 720px
        // breakpoint into a matchMedia call here too. Without this, both the
        // visible and the off-breakpoint video would autoplay, decoding one
        // nobody can see.
        const isVisible = video.offsetParent !== null;
        if (isActive && isVisible && !reducedMotion) {
          video.play().catch(() => {
            // Autoplay can be blocked (e.g. data-saver mode) — poster stays visible.
          });
        } else {
          video.pause();
        }
      });
    };

    syncVideoPlayback();
    // Resizing across the 720px breakpoint swaps which of the two
    // desktop/mobile elements CSS shows via display:none — that changes
    // offsetParent (and so isVisible above) without touching activeIndex,
    // so without also re-running this on resize, the newly-revealed
    // element never gets its own .play() call and just sits there paused
    // (this is exactly what "scale down to mobile and back, video stopped"
    // was: resizing back to desktop reveals the desktop element, which was
    // paused when it went offscreen the first time and nothing told it to
    // resume).
    window.addEventListener("resize", syncVideoPlayback);
    return () => window.removeEventListener("resize", syncVideoPlayback);
  }, [activeIndex]);

  // Replaces the old cross-promo carousel as the page's ending: scrolling
  // the "next project" teaser into view fills a bar across it, announcing
  // the next case study before you reach it — reaching full triggers the
  // actual navigation. Purely a read of scroll position via
  // getBoundingClientRect (same technique as BaseLayout's own parallax
  // effect), never a hijacked wheel/touch event; the anchor is a real link
  // the whole time, so a click or keyboard Enter navigates immediately
  // regardless of scroll progress.
  useEffect(() => {
    const link = nextRef.current;
    if (!link) return;
    // Reduced motion gets the honest fallback: a plain, static link with no
    // fill animation and no scroll-triggered auto-navigation — the user
    // decides when to go, same as every other link on the site.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setNextProgress(1);
      return;
    }

    let navigated = false;
    let ticking = false;

    const apply = () => {
      const rect = link.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      // 0 the moment the teaser's top edge appears at the bottom of the
      // viewport, 1 a full viewport-height of scrolling later (its top
      // edge has reached the top of the viewport) — viewport-relative, not
      // tied to the teaser's own height, so it feels the same regardless
      // of how tall the section renders at a given breakpoint.
      const progress = Math.min(Math.max((viewportHeight - rect.top) / viewportHeight, 0), 1);
      setNextProgress(progress);
      if (progress >= 1 && !navigated) {
        navigated = true;
        navigate(nextProject.href);
      }
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [nextProject.href]);

  return (
    <div className="cse">
      {/* Renders on every viewport width, unlike the old sidebar's title,
          which only ever showed up at >=60rem — there is no longer a
          dedicated back-link or chapter TOC (the persistent header nav is
          the only way back now, a deliberate choice). */}
      <header className="cse__intro">
        <h1 className="cse__title">{meta.title}</h1>
      </header>

      <div className="cse__slides" ref={containerRef}>
        {slides.map((slide, index) => (
          <section
            key={`${slide.chapterId}-${index}`}
            className={`cse__step${slide.recognition ? " cse__recognition" : slide.credits ? " cse__credits" : ""}`}
            data-slide-index={index}
            style={
              slide.media?.type === "image" && slide.media.padded && slide.media.background
                ? { background: slide.media.background }
                : undefined
            }
          >
            {slide.recognition ? (
              <RecognitionSlide heading={slide.heading} items={slide.recognition} />
            ) : slide.credits ? (
              <CreditsSlide
                heading={slide.heading}
                clientLabel={meta.clientLabel}
                client={meta.client}
                items={slide.credits}
              />
            ) : (
              <>
                <div className="cse__media-wrap">
                  <Media
                    media={slide.media}
                    isMuted={isMuted}
                    transitionName={index === firstMediaIndex ? coverTransitionName : undefined}
                  />
                  {slide.media?.type === "video" && slide.media.allowUnmute && (
                    <button
                      type="button"
                      className="cse__media-mute"
                      aria-label={isMuted ? "Unmute video" : "Mute video"}
                      aria-pressed={!isMuted}
                      onClick={() => setIsMuted((muted) => !muted)}
                    >
                      <MuteIcon muted={isMuted} />
                    </button>
                  )}
                </div>
                {(slide.heading || slide.body?.length) && (
                  <div className="cse__text">
                    {slide.heading && <h2>{slide.heading}</h2>}
                    {slide.body?.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
                  </div>
                )}
              </>
            )}
          </section>
        ))}
      </div>

      <a
        ref={nextRef}
        href={nextProject.href}
        className="cse__next"
        style={{ "--next-progress": nextProgress } as CSSProperties}
      >
        <span className="cse__next-eyebrow">Next project</span>
        <h2 className="cse__next-title">{nextProject.title}</h2>
        <div className="cse__next-media">
          <img src={nextProject.image} alt={nextProject.imageAlt} loading="lazy" />
        </div>
        <div className="cse__next-bar">
          <div className="cse__next-bar-fill" />
        </div>
      </a>

      <style>{`
        /* A light theme, distinct from the site's dark-by-default root —
           redefined locally on .cse (not the global [data-theme="light"]
           toggle, which is a user preference, not a per-page choice) so
           every descendant reading these same tokens (the recognition/
           credits borders, the next-project bar's own --color-border
           track, etc.) adapts for free via normal CSS cascade — same
           technique HomeExperience.tsx's own .hs__work section already
           uses for its light Portfolio section. */
        .cse {
          width: 100%;
          max-width: var(--content-max-width);
          margin-inline: auto;
          padding-inline: var(--space-5);
          --color-bg: var(--color-soft-cream);
          --color-fg: var(--color-soft-black);
          --color-fg-muted: color-mix(in srgb, var(--color-soft-black) 65%, transparent);
          --color-bg-raised: var(--color-grey-100);
          --color-border: var(--color-grey-300);
          color: var(--color-fg);
        }
        .cse__intro {
          padding-block: var(--space-8) var(--space-3);
        }
        .cse__title {
          font-size: var(--text-2xl);
          font-weight: var(--weight-regular);
          letter-spacing: var(--tracking-tighter);
          line-height: var(--leading-tight);
        }
        /* No viewport-height floor and no per-step background — that floor
           only ever existed to guarantee the old sidebar's sticky-release
           point, and every step sharing one flat surface with the page
           (rather than each getting its own --color-bg-raised) is what the
           reference's clean, continuous white actually looks like. Vertical
           rhythm between sections now comes from padding-block alone. */
        .cse__step {
          position: relative;
          padding-block: var(--space-8);
        }
        /* Tighter than every other slide's own top padding — the hero
           should sit close under the title, not have the same generous gap
           used to separate later, unrelated slides from each other. */
        .cse__slides > .cse__step:first-child {
          padding-top: 0;
        }
        .cse__media-wrap {
          position: relative;
        }
        .cse__recognition,
        .cse__credits {
          padding-block: var(--space-8);
        }
        .cse__list-slide {
          width: 100%;
          max-width: 48rem;
        }
        .cse__list-slide-heading {
          font-size: var(--text-2xl);
          font-weight: var(--weight-regular);
          margin-bottom: var(--space-6);
        }
        .cse__recognition-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--space-4) var(--space-6);
        }
        .cse__recognition-item {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          padding-bottom: var(--space-3);
          border-bottom: 1px solid var(--color-border);
        }
        .cse__recognition-name {
          font-size: var(--text-base);
          color: var(--color-fg);
        }
        .cse__recognition-award {
          font-size: var(--text-sm);
          color: var(--accent, var(--color-fg-muted));
        }
        .cse__recognition-year {
          font-size: var(--text-xs);
          color: var(--color-fg-muted);
        }
        .cse__credits-list {
          margin: 0;
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-4);
        }
        .cse__credits-list > div {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          padding-bottom: var(--space-3);
          border-bottom: 1px solid var(--color-border);
        }
        .cse__credits-list dt {
          font-size: var(--text-xs);
          color: var(--color-fg-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .cse__credits-list dd {
          margin: 0;
          font-size: var(--text-lg);
          color: var(--color-fg);
        }
        @media (min-width: 40rem) {
          .cse__credits-list {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .cse__media {
          display: block;
          width: 100%;
          height: auto;
        }
        /* galleryImage's "padded" field — the slide's own background
           (set inline via style={{background: media.background}} above)
           shows through as a margin around the media, for images that need
           real inset space rather than sitting edge-to-edge (e.g. a UI
           mockup screenshot where cropping tight to the frame is worse
           than showing it smaller, whole). Extra inset *within* the
           already-inset page column, not an alternative to it. */
        .cse__media--padded {
          width: calc(100% - var(--space-4) * 2);
          margin-inline: var(--space-4);
        }
        @media (min-width: 721px) {
          .cse__media--padded {
            width: calc(100% - var(--space-6) * 2);
            margin-inline: var(--space-6);
          }
        }
        .cse__media-mute {
          position: absolute;
          /* top, not bottom: media is no longer always exactly one
             viewport tall now that it's in normal flow rather than
             absolute-filling a fixed-height slide — some clips run taller
             than the viewport, and a bottom-anchored button would sit far
             below the fold until the very end of a tall clip scrolled
             past. Anchoring to the top instead means it's visible from the
             moment the video itself comes into view. */
          right: var(--space-4);
          top: var(--space-4);
          display: flex;
          align-items: center;
          justify-content: center;
          height: auto;
          aspect-ratio: 1;
          padding: 1.125rem;
          box-sizing: border-box;
          border: none;
          cursor: pointer;
          color: var(--color-fg-muted);
          background: color-mix(in srgb, var(--color-bg) 78%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition: color var(--duration-fast) var(--ease-standard);
        }
        .cse__media-mute:hover,
        .cse__media-mute:focus-visible {
          color: var(--color-fg);
        }
        .cse__media--carousel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding-block: var(--space-6);
          background: var(--color-bg-raised);
        }
        /* Same 720px breakpoint as everywhere else on the site — see the
           Media component's own comment for why a video with a distinct
           mobile poster needs two whole elements instead of one <video>
           with media-queried <source>s. */
        @media (max-width: 720px) {
          .cse__media--desktop {
            display: none;
          }
        }
        @media (min-width: 721px) {
          .cse__media--mobile {
            display: none;
          }
        }
        /* Square-shape items (the value-feature illustrations) render at
           their own native 384px size — that's the illustrations' actual
           intrinsic artwork size, not an arbitrary default, so scaling them
           up to fill more of the slide would just blow up flat vector
           linework past the size it was drawn at. Circle/icon items (real
           photography/product screenshots) don't have that constraint and
           still scale up to better fill the slide. */
        .cse__media--carousel .gallery-carousel--circle .gallery-carousel__item,
        .cse__media--carousel .gallery-carousel--icon .gallery-carousel__item {
          width: min(34vh, 340px);
          height: min(34vh, 340px);
        }
        .cse__text {
          padding-block: var(--space-6) 0;
          max-width: 42rem;
        }
        .cse__text h2 {
          font-size: var(--text-xl);
          margin-bottom: var(--space-3);
        }
        .cse__text p {
          font-size: var(--text-base);
          line-height: var(--leading-normal);
          color: var(--color-fg-muted);
        }
        .cse__text p + p {
          margin-top: var(--space-2);
        }

        /* Closes the page in place of the site-wide footer — see
           BaseLayout's hideFooter prop. --next-progress (0-1, set from JS as
           this link scrolls into view) drives .cse__next-bar-fill's width;
           reaching 1 triggers the actual navigation (see the component's own
           effect for why this is a read of scroll position, not a hijack of
           it) — but the whole block stays a real <a>, so clicking or
           tabbing to it and pressing Enter navigates immediately regardless
           of scroll progress. */
        .cse__next {
          display: block;
          width: 100%;
          padding-block: var(--space-10) var(--space-8);
          text-decoration: none;
          color: inherit;
        }
        .cse__next-eyebrow {
          display: block;
          font-size: var(--text-sm);
          color: var(--color-fg-muted);
          margin-bottom: var(--space-2);
        }
        .cse__next-title {
          font-size: var(--text-3xl);
          font-weight: var(--weight-regular);
          letter-spacing: var(--tracking-tighter);
          line-height: var(--leading-tight);
          margin-bottom: var(--space-6);
          transition: color var(--duration-base) var(--ease-standard);
        }
        .cse__next:hover .cse__next-title,
        .cse__next:focus-visible .cse__next-title {
          color: var(--accent, var(--color-fg));
        }
        .cse__next-media {
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          margin-bottom: var(--space-4);
        }
        .cse__next-media img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cse__next-bar {
          width: 100%;
          height: 2px;
          background: var(--color-border);
        }
        .cse__next-bar-fill {
          height: 100%;
          width: calc(var(--next-progress, 0) * 100%);
          background: var(--accent, var(--color-fg));
        }
      `}</style>
    </div>
  );
}
