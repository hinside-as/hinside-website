import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useActiveSection } from "../hooks/useActiveSection";
import { useHeaderReveal } from "../hooks/useHeaderReveal";
import GalleryCarousel, { type GalleryCarouselItem } from "./carousel/GalleryCarousel";
import PortfolioCarousel, { type PortfolioItem } from "./carousel/PortfolioCarousel";

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

export type CaseStudyChapter = { id: string; label: string };

export type CaseStudyMeta = {
  title: string;
  description: string;
  // Still used by CreditsSlide's own "Client" row — studio (also part of
  // the content model, see content.config.ts) isn't surfaced anywhere in
  // this component; the Credits slide's own credit entries are what keep
  // legacy agency authorship transparent instead (e.g. a "Design studio"
  // credit line), see docs/case-study-assets.md.
  client: string;
  backHref: string;
  backLabel: string;
  clientLabel: string;
};

type Props = {
  meta: CaseStudyMeta;
  chapters: CaseStudyChapter[];
  slides: CaseStudySlide[];
  otherProjects: PortfolioItem[];
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
}: {
  media: Extract<CaseStudySlideMedia, { type: "video" }>;
  // Only meaningful (and only ever read) when media.allowUnmute is set —
  // the actual toggle button lives outside this component now, next to
  // the show/hide-text control, so this is just the value to mirror onto
  // whichever <video> element(s) this instance renders.
  isMuted: boolean;
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

function Media({ media, isMuted }: { media?: CaseStudySlideMedia; isMuted: boolean }) {
  if (!media) return null;
  if (media.type === "video") {
    return <VideoMedia media={media} isMuted={isMuted} />;
  }
  if (media.type === "carousel") {
    return (
      <div className="cse__media cse__media--carousel">
        <GalleryCarousel items={media.items} shape={media.shape} colorful={media.colorful} />
      </div>
    );
  }
  const className = media.padded ? "cse__media cse__media--padded" : "cse__media";
  if (media.mobileSrc) {
    return (
      <picture>
        <source media="(max-width: 720px)" srcSet={media.mobileSrc} />
        <img className={className} src={media.src} alt={media.alt} loading="lazy" />
      </picture>
    );
  }
  return <img className={className} src={media.src} alt={media.alt} loading="lazy" />;
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

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function CaseStudyExperience({ meta, chapters, slides, otherProjects }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasPromo = otherProjects.length > 0;

  // The only thing tracked here is *which* section the visitor has scrolled
  // to, purely by observation — nothing in this component ever reads a
  // wheel/touch/keyboard event or calls scrollTo/scrollIntoView except in
  // direct response to a TOC click. All slide-to-slide movement is plain
  // continuous native scrolling.
  const activeIndex = useActiveSection(containerRef, ".cse__step");

  const isPromoActive = hasPromo && activeIndex === slides.length;
  const activeChapterId = slides[Math.min(activeIndex, slides.length - 1)]?.chapterId ?? chapters[0]?.id ?? "";

  // One shared value rather than per-slide state: only one slide is ever
  // active/audible at a time (see the video autoplay-sync effect below), so
  // there's nothing to keep separate.
  const [isMuted, setIsMuted] = useState(true);

  // Rail fill jumps to the vertical middle of the active chapter's own
  // label (of the whole wrapped block, for the ones spanning two lines —
  // not per-line) rather than interpolating smoothly as a fraction of
  // total chapters/slides — the rail is meant to point at a specific line
  // of text, not describe continuous scroll position. Measured in px off
  // the DOM (not derived from index/chapters.length) since chapter labels
  // don't all take the same number of lines, so a percentage-of-N-chapters
  // formula wouldn't land on the actual text.
  const tocRailRef = useRef<HTMLDivElement | null>(null);
  const chapterButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [railFillHeight, setRailFillHeight] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      // activeChapterId already resolves to the last chapter while the
      // promo slide is active (see its own Math.min clamp above), so no
      // separate isPromoActive branch is needed here.
      const rail = tocRailRef.current;
      const button = chapterButtonRefs.current[activeChapterId];
      if (!rail || !button) return;
      const railRect = rail.getBoundingClientRect();
      // The last chapter fills the whole bar rather than stopping at its
      // own label's middle (which would leave a visible gap below it) —
      // reaching the last chapter reads as "done," same idea as the promo
      // slide's own fully-parked fill.
      const isLastChapter = chapters.length > 0 && activeChapterId === chapters[chapters.length - 1].id;
      if (isLastChapter) {
        setRailFillHeight(railRect.height);
      } else {
        const buttonRect = button.getBoundingClientRect();
        setRailFillHeight(buttonRect.top + buttonRect.height / 2 - railRect.top);
      }
    };
    measure();
    // Chapter labels can reflow (wrap onto a different number of lines) on
    // viewport resize, which moves every button below the resized one —
    // re-measure rather than let the fill drift out of sync with the text.
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [chapters, activeChapterId]);

  // Autoplay the active slide's video only, pausing any others — a video
  // scrolled out of view has no business consuming decode/playback
  // resources. Driven by the same observed activeIndex as everything else;
  // this reacts to scroll position, it doesn't create it.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reducedMotion = prefersReducedMotion();

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

  // Visible only on the first slide, hidden for every slide after it — see
  // useHeaderReveal for why this is driven continuously by scroll position
  // rather than by activeIndex's discrete flip plus a CSS transition. The
  // sidebar's own padding-top below reads the same --header-reveal value
  // this sets, so the two can never fall out of sync with each other.
  useHeaderReveal(containerRef, '[data-slide-index="0"]');

  const scrollToChapter = (chapterId: string) => {
    const slideIndex = slides.findIndex((slide) => slide.chapterId === chapterId);
    if (slideIndex === -1) return;
    const target = containerRef.current?.querySelector<HTMLElement>(`[data-slide-index="${slideIndex}"]`);
    target?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="cse">
      <aside className="cse__sidebar">
        <h1 className="cse__title">{meta.title}</h1>
        <p className="cse__description">{meta.description}</p>
        <a className="cse__back" href={meta.backHref}>
          &larr; {meta.backLabel}
        </a>
        <nav className="cse__toc" aria-label="Chapters">
          <div className="cse__toc-rail" ref={tocRailRef}>
            <div
              className="cse__toc-rail-fill"
              data-parked={isPromoActive}
              style={{ height: `${railFillHeight}px` }}
            />
          </div>
          <ol>
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <button
                  type="button"
                  ref={(el) => {
                    chapterButtonRefs.current[chapter.id] = el;
                  }}
                  // The promo slide (cross-project carousel) has no chapter
                  // of its own — activeChapterId keeps resolving to the last
                  // real chapter there (see its own Math.min clamp) so the
                  // rail still has somewhere to park fully extended, but
                  // that chapter's *label* shouldn't keep reading as the
                  // current one once you've scrolled past it into other
                  // projects.
                  data-active={!isPromoActive && chapter.id === activeChapterId}
                  onClick={() => scrollToChapter(chapter.id)}
                >
                  {chapter.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </aside>

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
                  <Media media={slide.media} isMuted={isMuted} />
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
        {hasPromo && (
          <section className="cse__step cse__promo" data-slide-index={slides.length}>
            <PortfolioCarousel items={otherProjects} />
          </section>
        )}
      </div>

      <style>{`
        .cse {
          width: 100%;
        }
        .cse__sidebar {
          padding: var(--space-6) var(--space-4);
          background: var(--color-bg);
        }
        /* Below the same 60rem breakpoint that turns .cse into a sidebar +
           slides row further down, the sidebar doesn't get a mobile
           layout of its own — it's hidden outright, matching this
           template's original intent (full-bleed media + the floating
           show/hide text card carry the experience on mobile, not a
           second stacked block of title/back-link/TOC/credits-nav ahead
           of slide 0). The back link and title info aren't lost: the
           site header (still visible on slide 0) already provides a way
           back, and the chapter TOC has no mobile equivalent yet if this
           ever needs one. */
        @media (max-width: 59.9375rem) {
          .cse__sidebar {
            display: none;
          }
        }
        .cse__title {
          font-size: var(--text-xl);
          font-weight: var(--weight-regular);
          letter-spacing: var(--tracking-tighter);
          margin-bottom: var(--space-4);
        }
        .cse__description {
          font-size: var(--text-sm);
          color: var(--color-fg-muted);
          line-height: var(--leading-normal);
          margin-bottom: var(--space-5);
        }
        .cse__back {
          display: inline-block;
          margin-bottom: var(--space-5);
          color: var(--color-fg-muted);
          text-decoration: none;
          font-size: var(--text-sm);
          transition: color var(--duration-base) var(--ease-standard);
        }
        .cse__back:hover {
          /* Plain neutral brighten, not the per-project --accent — this
             link leaves the project rather than navigating within it, so
             it shouldn't borrow that project's own accent color. */
          color: var(--color-fg);
        }
        .cse__toc {
          display: flex;
          gap: var(--space-3);
          margin-bottom: var(--space-5);
        }
        .cse__toc-rail {
          position: relative;
          flex: 0 0 2px;
          width: 2px;
          background: var(--color-border);
        }
        .cse__toc-rail-fill {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          background: var(--accent, var(--color-fg));
          opacity: 1;
          transition:
            height var(--duration-base) var(--ease-standard),
            background-color var(--duration-base) var(--ease-standard),
            opacity var(--duration-base) var(--ease-standard);
        }
        /* Past the last real slide (the cross-project promo carousel) no
           chapter reads as active anymore — see data-active on the TOC
           buttons above — so the fill shouldn't keep pointing at the last
           chapter in that chapter's own accent color either. Fades to the
           same neutral grey the inactive labels themselves use (see
           .cse__toc button above), rather than just disappearing, since
           the rail itself stays parked full-length. Opacity is lower than
           the labels' own 0.7, not matched to it: a solid 2px fill reads
           far more saturated than the same color used as thin,
           anti-aliased text strokes with page background showing through
           the gaps, so matching the raw value made the line visibly
           brighter than the "equally muted" text next to it. */
        .cse__toc-rail-fill[data-parked="true"] {
          background: var(--color-fg-muted);
          opacity: 0.4;
        }
        .cse__toc ol {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .cse__toc button {
          all: unset;
          cursor: pointer;
          font-size: var(--text-sm);
          font-weight: var(--weight-regular);
          color: var(--color-fg-muted);
          opacity: 0.7;
          /* Same duration/easing as .cse__toc-rail-fill's own height
             transition — was --duration-fast, noticeably quicker than the
             rail, so the previous chapter's label snapped back to muted
             the instant the new one activated instead of fading in step
             with the rail's own glide, reading as a blink. font-weight is
             in the list too (not just color/opacity): JetBrains Mono
             Variable makes it a genuinely interpolatable axis rather than
             a value that jumps at the transition's midpoint. */
          transition:
            color var(--duration-base) var(--ease-standard),
            opacity var(--duration-base) var(--ease-standard),
            font-weight var(--duration-base) var(--ease-standard);
        }
        .cse__toc button[data-active="true"] {
          color: var(--accent, var(--color-fg));
          font-weight: var(--weight-medium);
          opacity: 1;
        }
        .cse__toc button:hover:not([data-active="true"]) {
          color: var(--accent, var(--color-fg));
          opacity: 1;
        }
        /* A real outline, not a color match to [data-active="true"]: a
           button clicked with the mouse keeps DOM focus afterwards, and
           switching to keyboard arrow keys to keep scrolling (which
           doesn't move focus off it) promotes that lingering focus to
           :focus-visible — coloring it the same as the *actual* active
           chapter made it look permanently stuck highlighted even after
           scrolling elsewhere. Focus and "is the current chapter" are two
           different facts; only the outline should track the former. */
        .cse__toc button:focus-visible {
          outline: 2px solid var(--color-fg);
          outline-offset: 4px;
        }

        /* min-height, not a fixed height: a floor, not a cap. The sidebar
           (desktop) is position: sticky; height: 100dvh alongside
           .cse__slides — its sticky-release depends on .cse__slides' total
           height being at least one viewport, which this floor guarantees
           even for a case study with very few/short slides; content that
           needs more room than one viewport (an image plus a full
           paragraph, say) simply grows past it. Real native scrolling, real
           momentum, real keyboard paging — nothing here intercepts,
           cancels, or redirects a scroll gesture. */
        .cse__step {
          position: relative;
          min-height: 100dvh;
          background: var(--color-bg-raised);
        }
        .cse__media-wrap {
          position: relative;
        }
        /* No horizontal padding, unlike other slides' text inset —
           PortfolioCarousel already has its own internal edge-fade mask
           tuned to sit flush with whatever container it fills (the same
           one the homepage uses full-bleed); adding padding here just
           inset the whole carousel a further --space-4 short of the
           slide's actual edge instead of letting that mask do its job.

           Background is --color-bg specifically, not the --color-bg-raised
           every other .cse__step gets by default: PortfolioCarousel's own
           card "shell" (EyeCursorItem) is itself --color-bg-raised with a
           box-shadow meant to read as a subtly raised tile against a
           *different*-colored background. With this slide also at
           --color-bg-raised, the shell's background stopped contrasting
           with the page behind it at all, leaving the box-shadow as the
           only remaining cue — which then reads as a sudden, out-of-place
           dark halo around each tile instead of a subtle lift. --color-bg
           restores the same contrast the homepage's own carousel already
           has, matching CLAUDE.md's "header, sidebar, and footer share one
           flat background" spirit in reverse: slides are their own
           surface, distinct from the chrome around them. */
        /* min-height: 0 overrides .cse__step's own 100dvh floor — that
           floor exists to guarantee the sidebar's sticky-release has at
           least one viewport of content to release against, which the ~10
           other regular slides already satisfy on their own. Without this
           override, the promo carousel (much shorter than one viewport)
           would flex-center inside a forced extra viewport, leaving a
           large dead gap before the footer instead of flowing straight
           into it. */
        .cse__promo {
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-block: var(--space-6);
          background: var(--color-bg);
        }
        .cse__promo .pc-carousel-section {
          --card-size: clamp(260px, 32vw, 420px);
        }
        /* PortfolioCarousel's own background band (a radial-gradient panel
           behind the cards) is tuned for sitting inside the homepage's own
           section background — here it's the whole slide's plain
           background instead, so it would just show up as an out-of-place
           horizontal stripe. */
        .cse__promo .pc-carousel-section::before {
          display: none;
        }
        .cse__recognition,
        .cse__credits {
          padding: var(--space-8) var(--space-6);
        }
        .cse__list-slide {
          width: 100%;
          max-width: 48rem;
          margin-inline: auto;
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
           than showing it smaller, whole). */
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
           still scale up to better fill the full-bleed slide. */
        .cse__media--carousel .gallery-carousel--circle .gallery-carousel__item,
        .cse__media--carousel .gallery-carousel--icon .gallery-carousel__item {
          width: min(34vh, 340px);
          height: min(34vh, 340px);
        }
        .cse__text {
          padding: var(--space-6) var(--space-4);
          max-width: 42rem;
        }
        @media (min-width: 721px) {
          .cse__text {
            padding-inline: var(--space-6);
          }
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

        @media (min-width: 60rem) {
          .cse {
            display: flex;
            align-items: flex-start;
          }
          .cse__sidebar {
            width: 25%;
            flex: 0 0 25%;
            position: sticky;
            /* top:0, not header-height: the header sits visually on top
               (higher z-index, same solid background) rather than the
               sidebar starting below it. */
            top: 0;
            height: 100dvh;
            overflow-y: auto;
            /* Top padding clears the header's own height while it's visible,
               since the header sits on top of this box rather than beside
               it — see the top:0 comment above. --header-reveal (see the
               component's own scroll effect) interpolates this continuously
               between --space-5 (header fully hidden) and header-height +
               --space-5 (header fully visible), in lockstep with the
               header's own transform (see Header.astro's [data-solid]
               rule) — same driving value, so the two can never fall out of
               sync or lag behind one another regardless of scroll speed,
               the same continuous, untransitioned quality the sidebar's
               own footer-end position:sticky release already has for free. */
            padding-top: calc(var(--space-5) + var(--header-height) * var(--header-reveal, 1));
            padding-inline: var(--space-5);
            padding-bottom: var(--space-5);
          }
          .cse__slides {
            width: 75%;
            flex: 0 0 75%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cse__sidebar {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
