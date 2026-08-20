import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useActiveSection } from "../hooks/useActiveSection";
import { useHeaderReveal } from "../hooks/useHeaderReveal";
import { useFooterHeight } from "../hooks/useFooterHeight";
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
      // See content.config.ts's sectionMedia "video" fields for the full
      // reasoning on both — unset means "behave exactly as before" either
      // way.
      desktopFit?: "cover" | "contain";
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
  // below instead of the generic Media + floating-text-box treatment every
  // other slide uses; see the .cse__step map in the component body.
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
  hideTextLabel: string;
  showTextLabel: string;
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
  // Mobile always stays the default cover (see content.config.ts's own
  // comment on desktopFit for why) — the attribute is only ever present on
  // the desktop element, and only when contain was actually requested.
  const desktopFitAttr = media.desktopFit === "contain" ? "contain" : undefined;

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
            data-desktop-fit={desktopFitAttr}
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
        <video
          ref={registerRef}
          {...baseProps}
          className="cse__media"
          data-desktop-fit={desktopFitAttr}
          src={media.src}
          poster={media.poster}
        />
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
// the slide (the floating .cse__text-box overlay stays hidden for them,
// since hasText below only checks heading+body, and these slides never set
// body). A grid, not a single list, for recognition specifically: award
// counts vary a lot project to project (a handful vs. a dozen+), and a grid
// wraps into columns instead of one tall column, which matters since
// .cse__credits/.cse__recognition override .cse__step's fixed height:100dvh
// with an auto one — see that CSS for why height:auto matters more here
// than almost anywhere else in this template.
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
  // direct response to a TOC click. All slide-to-slide movement is native
  // browser scrolling with CSS scroll-snap (see .cse__step below).
  const activeIndex = useActiveSection(containerRef, ".cse__step");

  // One global toggle, not per-slide: hiding the text is a reading
  // preference for the whole piece, not something that resets on
  // navigation — see .cse__text-box's data-expanded in the JSX below.
  const [textHidden, setTextHidden] = useState(false);

  // The collapsed pill's width used to be guessed via a ch-based calc
  // (9ch + a fudge buffer for letter-spacing) on the assumption that a
  // monospace font's `ch` unit exactly matches its own rendered glyph
  // advance width. It doesn't, reliably: text-transform:uppercase changes
  // which glyphs actually render, `ch` is defined off the "0" glyph
  // specifically (not guaranteed identical to every other glyph even in a
  // monospace face), and letter-spacing's own trailing-edge handling
  // varies — the combined error consistently left visible slack on the
  // pill's right side no amount of buffer-tweaking fully closed. Measuring
  // the real rendered label (an offscreen clone using the exact same
  // font-size/letter-spacing/text-transform/padding, see
  // .cse__text-box-toggle-measure) and feeding that pixel width straight
  // into --toggle-collapsed-width sidesteps guessing entirely — whatever
  // the browser actually rendered is exactly what sizes the pill.
  const textBoxRef = useRef<HTMLDivElement>(null);
  const toggleMeasureRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const measure = toggleMeasureRef.current;
    const textBox = textBoxRef.current;
    if (!measure || !textBox) return;
    const width = Math.ceil(measure.getBoundingClientRect().width);
    textBox.style.setProperty("--toggle-collapsed-width", `${width}px`);
  }, [meta.showTextLabel]);

  // Purely cosmetic idle tracking for the collapsed "Show text" pill (see
  // data-idle below) — it dims slightly once the cursor's been still for a
  // while, so it doesn't sit at full visual weight over the media
  // underneath when nobody's actually about to interact with it. Doesn't
  // read or affect scroll in any way.
  const [cursorIdle, setCursorIdle] = useState(false);
  useEffect(() => {
    const IDLE_MS = 2500;
    let timer = 0;
    const onActivity = () => {
      setCursorIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setCursorIdle(true), IDLE_MS);
    };
    onActivity();
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("touchstart", onActivity);
    window.addEventListener("focusin", onActivity);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("focusin", onActivity);
    };
  }, []);

  const isPromoActive = hasPromo && activeIndex === slides.length;
  const activeChapterId = slides[Math.min(activeIndex, slides.length - 1)]?.chapterId ?? chapters[0]?.id ?? "";

  // The active slide's own text, if it has any — undefined (not clamped to
  // the last real slide) once activeIndex reaches the promo slide, so that
  // slide correctly reads as textless rather than showing stale copy.
  const activeSlide = activeIndex < slides.length ? slides[activeIndex] : undefined;
  const hasText = Boolean(activeSlide?.heading && activeSlide?.body?.length);
  // Lifted out of VideoMedia (which just renders <video> elements and syncs
  // this value onto them) so the mute button itself can live next to the
  // show/hide-text toggle instead of floating over the media — see
  // .cse__text-box-anchor's own row wrapper below. One shared value rather
  // than per-slide state: only one slide is ever active/audible at a time,
  // so there's nothing to keep separate.
  const [isMuted, setIsMuted] = useState(true);
  const activeVideoMedia =
    activeSlide?.media?.type === "video" && activeSlide.media.allowUnmute ? activeSlide.media : undefined;

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

  // .cse__promo's own min-height (see its CSS below) needs the real,
  // current footer height to guarantee promo+footer together always reach
  // a full viewport — see useFooterHeight.
  useFooterHeight();

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
        {/* A zero-height sticky anchor rather than position:fixed on the box
            itself — fixed is always relative to the viewport, which would
            let the box drift outside .cse__slides' own column (overlapping
            the sidebar) and keep it on screen even past the last slide.
            Sticky, scoped to this element's containing block (.cse__slides),
            keeps it within that column horizontally and lets it naturally
            leave once .cse__slides itself ends, rather than floating over
            the footer. overflow:visible is what lets the real box (its
            child, sized and positioned normally) render outside this
            anchor's own 0-height box. */}
        <div className="cse__text-box-anchor">
          {/* Row on desktop (mute button to the left of the text box),
              column on mobile (button stacked above it) — see
              .cse__text-box-row's own comment. Only rendered when the
              active slide is actually a video with allowUnmute, so it
              takes up no space (no stray gap) on every other slide. */}
          <div className="cse__text-box-row">
            {/* Always rendered (not conditionally mounted) so switching
                between a video-with-allowUnmute slide and one without can
                actually fade — an element that mounts/unmounts has nothing
                to transition between. data-visible follows the exact same
                pattern .cse__text-box already uses for the same reason. */}
            <button
              type="button"
              className="cse__media-mute"
              aria-label={isMuted ? "Unmute video" : "Mute video"}
              aria-pressed={!isMuted}
              aria-hidden={!activeVideoMedia}
              tabIndex={activeVideoMedia ? 0 : -1}
              data-visible={Boolean(activeVideoMedia)}
              data-idle={cursorIdle}
              onClick={() => setIsMuted((muted) => !muted)}
            >
              <MuteIcon muted={isMuted} />
            </button>
            <div
              ref={textBoxRef}
              className="cse__text-box"
              data-visible={hasText}
              data-expanded={!textHidden}
              data-idle={textHidden && cursorIdle}
            >
              <div className="cse__text-box-body">
                <h2>{activeSlide?.heading}</h2>
                {activeSlide?.body?.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
              </div>
              <button
                type="button"
                className="cse__text-box-toggle"
                onClick={() => setTextHidden((hidden) => !hidden)}
              >
                {textHidden ? meta.showTextLabel : meta.hideTextLabel}
              </button>
              {/* Offscreen twin of the toggle, always showing the "show text"
                  label specifically (the one visible while collapsed, which
                  is what --toggle-collapsed-width needs to match) regardless
                  of which label the real button currently renders. Same
                  padding/typography as .cse__text-box-toggle so its measured
                  width is the real pill's width, not an approximation. */}
              <span ref={toggleMeasureRef} className="cse__text-box-toggle-measure" aria-hidden="true">
                {meta.showTextLabel}
              </span>
            </div>
          </div>
        </div>
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
              <Media media={slide.media} isMuted={isMuted} />
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

        /* Each step is a plain full-viewport block in normal document flow
           — real native scrolling, real momentum, real keyboard paging.
           scroll-snap-align/-stop (opted into page-wide via html[data-
           scroll-snap], see global.css) just tells the browser where a
           scroll gesture should come to rest; it never intercepts, cancels,
           or redirects the gesture itself. */
        .cse__step {
          position: relative;
          height: 100dvh;
          overflow: hidden;
          background: var(--color-bg-raised);
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }
        /* Overrides .cse__step's own height:100dvh and default
           background — consolidated with the homepage's own work-slide
           treatment (.hs__work in HomeExperience.tsx) rather than a
           bespoke, smaller version: same --card-size below, and
           min-height sized to "100dvh minus the footer" (see
           useFooterHeight) rather than a fixed height:auto, so this slide
           uses all the room it can while still guaranteeing promo+footer
           together add up to exactly one viewport — which is what lets
           reaching this last slide and the footer coming into view happen
           as a single scroll beat, without needing to shrink the carousel
           down to force it.

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
        /* No horizontal padding, unlike other slides' text/media inset —
           PortfolioCarousel already has its own internal edge-fade mask
           tuned to sit flush with whatever container it fills (the same
           one the homepage uses full-bleed); adding padding here just
           inset the whole carousel a further --space-4 short of the
           slide's actual edge instead of letting that mask do its job. */
        .cse__promo {
          min-height: calc(100dvh - var(--footer-height, 0px));
          height: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          /* Tighter than the --space-6 other slides get: at the larger
             --card-size below (consolidated with the homepage's own
             carousel), --space-6 padding pushed this slide's natural
             content height past "100dvh minus the footer" rather than
             just meeting it — min-height is a floor, not a cap, so
             content taller than that floor simply renders taller,
             pushing the footer that much further below the fold instead
             of following immediately. Trimming the padding (not the
             cards) reclaims that overshoot without shrinking the tiles
             back down. */
          padding-block: var(--space-3);
          background: var(--color-bg);
        }
        .cse__promo .pc-carousel-section {
          --card-size: clamp(260px, 32vw, 420px);
        }
        /* Mobile gets its own full slide instead of sharing one screen with
           the footer — same reasoning and breakpoint as the homepage's own
           .hs__contact mobile split: a narrow column doesn't have room to
           lay both the carousel and the footer's link groups out without
           feeling cramped. The footer becomes its own snap slide too (see
           Footer's fullSlideMobile prop, enabled on this page). */
        @media (max-width: 720px) {
          .cse__promo {
            min-height: 100dvh;
          }
        }
        /* PortfolioCarousel's own background band (a radial-gradient panel
           behind the cards) is tuned for sitting inside the homepage's own
           section background — here it's the whole slide's plain
           background instead, so it would just show up as an out-of-place
           horizontal stripe. */
        .cse__promo .pc-carousel-section::before {
          display: none;
        }
        /* Overrides .cse__step's fixed height:100dvh + overflow:hidden —
           the one real hazard in this whole template is a fixed-height
           slide silently clipping content with no visual sign anything's
           missing (see docs/text-length-limits.md's ".cse__text-box-body"
           section for the same failure mode elsewhere). Recognition and
           credit lists both vary a lot in length project to project — a
           handful of awards vs. a dozen+, two credits vs. ten — so letting
           these two slides grow taller than one viewport when they need to
           is a far safer default than clipping the bottom of a list
           nobody would notice was cut short. */
        .cse__recognition,
        .cse__credits {
          height: auto;
          min-height: 100dvh;
          overflow: visible;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-8) var(--space-6);
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
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        /* Only takes effect at desktop widths (see VideoMedia's own
           comment) — mobile keeps the default cover above unconditionally.
           The slide's own background (--color-bg-raised) already shows
           through as letterboxing, no separate fill needed. */
        @media (min-width: 721px) {
          .cse__media[data-desktop-fit="contain"] {
            object-fit: contain;
          }
        }
        /* galleryImage's "padded" field — the slide's own background
           (--color-bg-raised) shows through the inset as a margin, same
           letterboxing idea as desktopFit:"contain" above, but for images
           that also need real inset space rather than just edge-to-edge
           letterboxing (e.g. a UI mockup screenshot where cropping tight to
           the frame is worse than showing it smaller, whole). */
        .cse__media--padded {
          inset: var(--space-4);
          width: calc(100% - var(--space-4) * 2);
          height: calc(100% - var(--space-4) * 2);
          object-fit: contain;
        }
        @media (min-width: 721px) {
          .cse__media--padded {
            inset: var(--space-6);
            width: calc(100% - var(--space-6) * 2);
            height: calc(100% - var(--space-6) * 2);
          }
        }
        .cse__media-mute {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          /* height: auto + aspect-ratio: 1 (rather than a fixed length on
             both axes) is what keeps this a true square as its content
             determines the height, instead of hardcoding a redundant
             matching width. 1.125rem (18px) padding + the 24px icon = 60px
             total — deliberately matched to equal
             .cse__text-box-toggle's own collapsed height (--space-4 × 2 +
             --text-xs at line-height: 1 = 24+24+12 = 60px) exactly, so the
             two sit flush at the same height rather than the icon's fixed
             size just happening to land wherever. */
          height: auto;
          aspect-ratio: 1;
          padding: 1.125rem;
          box-sizing: border-box;
          border: none;
          cursor: pointer;
          opacity: 0;
          pointer-events: none;
          color: var(--color-fg-muted);
          background: color-mix(in srgb, var(--color-bg) 78%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition:
            color var(--duration-fast) var(--ease-standard),
            opacity var(--duration-base) var(--ease-standard);
        }
        /* Fades in/out switching between a slide with an unmute-able video
           and one without, rather than snapping in/out with the mount —
           same mechanism as .cse__text-box's own data-visible. */
        .cse__media-mute[data-visible="true"] {
          opacity: 1;
          pointer-events: auto;
        }
        /* Same idle-dim courtesy as .cse__text-box's own collapsed-pill
           treatment (see its comment) — any mouse/touch/focus activity
           clears it immediately via the same cursorIdle state. Gated on
           data-visible too, same as .cse__text-box's own pairing of the
           two attributes: without it, a stale data-idle="true" left over
           from before the button faded out could win the cascade over the
           hidden state's opacity: 0 the moment the button is invisible. */
        .cse__media-mute[data-visible="true"][data-idle="true"] {
          opacity: 0.5;
        }
        .cse__media-mute:hover,
        .cse__media-mute:focus-visible {
          color: var(--color-fg);
        }
        /* Row on desktop — row-reverse, not row: the button is the first
           child in markup (so mobile's column stacking below puts it
           above the text box without needing its own override), but on
           desktop it belongs on the *right* of the box, so the row's
           direction is flipped instead of the DOM order. Bottom-aligned
           so a square button matches the collapsed pill's height exactly
           rather than centering against the box's own (possibly taller,
           once expanded) height. Column (not column-reverse) on mobile —
           button above the box, both left-aligned to the same edge (this
           wrapper doesn't center anything, so the anchor's own
           align-items: flex-start already keeps them flush). */
        .cse__text-box-row {
          display: flex;
          flex-direction: row-reverse;
          align-items: flex-end;
          gap: var(--space-2);
        }
        @media (max-width: 720px) {
          .cse__text-box-row {
            flex-direction: column;
            align-items: flex-start;
          }
        }
        .cse__media--carousel {
          display: flex;
          align-items: center;
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
        /* A top-anchored sticky flex area — the same sticky mechanics as
           .cse__sidebar below (top: header-height, height: one viewport
           below the header) — with the actual box bottom-aligned inside it
           via flexbox. That indirection is what makes this work at all:
           the box's own height changes (collapsed pill vs. full card), and
           a bottom-anchored position:sticky element whose static position
           sits at the very top of a many-viewports-tall container never
           actually engages (there's nothing below it to "release" from) —
           confirmed by testing it in isolation. Sticking from the top and
           letting flexbox push the child to the bottom sidesteps needing to
           know the box's height up front, and naturally scopes it to this
           column (not the full viewport) and lets it release once
           .cse__slides itself ends, matching the sidebar's own behavior.

           Unlike the sidebar, this element is a normal block child *inside*
           .cse__slides, stacked in the same vertical flow as every
           .cse__step — so its own height (needed for the sticky/flexbox
           trick above to work at all) would otherwise add a whole extra
           viewport's worth of real, scrollable height before slide 0 even
           starts, silently pushing every single slide (and the footer)
           down by that amount. The equal-and-opposite negative margin
           cancels that contribution back out to zero — the box still
           renders at its full height for sticky/flex purposes, but nothing
           after it in the document is actually pushed down by it. */
        .cse__text-box-anchor {
          position: sticky;
          top: var(--header-height);
          height: calc(100dvh - var(--header-height));
          margin-bottom: calc(-100dvh + var(--header-height));
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-end;
          padding: 0 0 var(--space-4) var(--space-4);
          pointer-events: none;
          z-index: 20;
        }
        /* Grown from the bottom-left corner: the toggle is always the LAST
           row, right above the box's own bottom edge, so it stays at the
           exact same spot whether the box is collapsed or expanded, only
           the body row above it grows/shrinks. Padding lives on the
           children (.cse__text-box-body / .cse__text-box-toggle), not here,
           so the toggle's own box — not just its text — spans the full
           width and height of the visible pill when collapsed, making the
           whole thing a real, hoverable, equally-padded click target rather
           than just the glyphs. Collapsed width comes from
           --toggle-collapsed-width, a pixel value the component measures
           off a hidden clone of the toggle (see .cse__text-box-toggle-
           measure and the useLayoutEffect above) rather than a ch-based
           calc — this has to be an explicit length rather than fit-content/
           auto specifically so it can be animated (CSS transitions can't
           smoothly interpolate to or from an intrinsic-sizing keyword,
           they just snap instantly, which reintroduced the exact "text
           reflows taller while still visible" glitch this project has
           already been bitten by once), but a ch-based guess consistently
           left visible slack on the pill's right edge — text-
           transform:uppercase, letter-spacing's trailing-edge handling, and
           the ch unit being defined off the "0" glyph specifically all make
           "N characters wide" an unreliable stand-in for the label's actual
           rendered width. The ch-based value below is only a same-frame
           fallback for the instant before the layout effect runs. */
        .cse__text-box {
          width: var(--toggle-collapsed-width, calc(9ch + 0.5rem + var(--space-4) * 2));
          max-width: min(88vw, 32rem);
          background: color-mix(in srgb, var(--color-bg) 78%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          opacity: 0;
          transform: translateY(1rem);
          pointer-events: none;
          /* Width and the body's content-reveal (max-height/opacity, below)
             are in two strictly non-overlapping phases, not just similarly
             timed — even with width and max-height moving at the exact
             same duration/delay, a real paragraph re-wraps differently at
             in-between widths than at either the start or end width, and
             that in-between wrapping is sometimes *taller* than the final,
             settled wrap. With both properties visible and animating at
             once, that shows up as the box's height overshooting past its
             resting value and springing back — a real overshoot from text
             reflow, not from the (non-overshooting) easing curve, but
             reading exactly like a bounce. Sequencing them with zero time
             overlap — grow width FIRST while content stays fully hidden,
             then reveal it only once width is done — means the text only
             ever wraps at a width that isn't changing anymore, so it can't
             reflow while visible. Collapsing mirrors this: hide the content
             first at the current (still full) width, then shrink width
             only once nothing is left to reflow. Same duration/easing
             tokens as the header's hide transition and the sidebar's own
             reflow (--duration-base, --ease-standard), with the second
             phase delayed by exactly one full --duration-base so the two
             phases never run concurrently. */
          transition:
            opacity var(--duration-base) var(--ease-standard),
            transform var(--duration-base) var(--ease-standard),
            width var(--duration-base) var(--ease-standard) var(--duration-base);
        }
        .cse__text-box[data-visible="true"] {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        /* Dims the collapsed pill once the cursor's been idle for a while —
           purely a visual courtesy so it doesn't sit at full weight over
           the media when no one's about to touch it. Reuses the same
           opacity transition above; any mouse/touch/focus activity (see
           the component's cursorIdle effect) clears it immediately. */
        .cse__text-box[data-visible="true"][data-idle="true"] {
          opacity: 0.5;
        }
        .cse__text-box[data-expanded="true"] {
          width: min(88vw, 32rem);
          transition:
            opacity var(--duration-base) var(--ease-standard),
            transform var(--duration-base) var(--ease-standard),
            width var(--duration-base) var(--ease-standard);
        }
        /* max-height rather than height: the actual content height varies
           per slide (body copy length differs) and isn't known up front —
           overflow:hidden + max-height:0 hides it when collapsed without
           needing to know that height. Width and padding are constant
           (always 100%/always padded) rather than toggled — the parent's
           own width no longer depends on this element's content (it's a
           fixed ch-based calc, see .cse__text-box above), so there's
           nothing left for a collapsed width:0 to protect against. It
           actively caused a bug when combined with the delay above: width
           has no transition of its own, so it used to snap to 0 instantly
           while max-height was still animating on its 90ms delay — for
           that window the (now zero-width) paragraph would try to wrap
           into an extremely tall column and render right up to
           max-height's still-large pre-transition value before the clip
           caught up, a visible flash of reflow. Leaving width alone means
           the text just re-wraps gradually in step with .cse__text-box's
           own already-smooth width transition instead. */
        .cse__text-box-body {
          width: 100%;
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          padding: 0 var(--space-4);
          /* Runs during phase one (0 to --duration-base) while width stays
             fixed at its current value — see the width comment above for
             why that separation matters. Opacity and max-height share the
             same timing here since there's no reflow risk left to guard
             against with width already out of the picture. */
          transition:
            opacity var(--duration-base) var(--ease-standard),
            max-height var(--duration-base) var(--ease-standard);
        }
        .cse__text-box[data-expanded="true"] .cse__text-box-body {
          max-height: 40rem;
          opacity: 1;
          /* Phase two: delayed a full --duration-base so it only starts
             once .cse__text-box's own width has completely finished
             growing (phase one). */
          transition:
            max-height var(--duration-base) var(--ease-standard) var(--duration-base),
            opacity var(--duration-base) var(--ease-standard) var(--duration-base);
        }
        /* 40rem is close to a whole phone screen's height once expanded —
           at ~88vw width (see .cse__text-box's own max-width) a heading
           plus a couple of paragraphs routinely reaches it, burying most of
           the slide's own media behind the box. Capping to half the slide
           on mobile leaves the media visibly present around it. This can't
           just shrink the cap in place, though: docs/text-length-limits.md
           documents the *current* 40rem as the actual basis for this site's
           established body-copy length limit ("hard technical ceiling"),
           so existing content that's already within that documented limit
           would start silently clipping — the exact silent-content-loss
           failure mode that doc calls out as the one real hazard of this
           element. overflow-y: auto turns any content past the smaller cap
           into an in-box scroll instead of a clip. */
        @media (max-width: 720px) {
          .cse__text-box[data-expanded="true"] .cse__text-box-body {
            max-height: 50dvh;
            overflow-y: auto;
          }
        }
        .cse__text-box-body h2 {
          font-size: var(--text-xl);
          margin-top: var(--space-4);
          margin-bottom: var(--space-3);
        }
        .cse__text-box-body p {
          font-size: var(--text-base);
          line-height: var(--leading-normal);
          color: var(--color-fg-muted);
        }
        .cse__text-box-body p + p {
          margin-top: var(--space-2);
        }
        /* display:block + width:100% + its own equal padding (rather than
           inline text with padding on the parent) is what makes the entire
           collapsed pill clickable and hoverable, not just the glyphs.
           Always left-aligned, never centered: the box's own fit-content
           width (above) is what keeps the padding visually even, so the
           label's start position never has to shift between collapsed and
           expanded — a centered label would jump sideways the moment the
           box resized instead of staying anchored to that shared left edge. */
        .cse__text-box-toggle {
          all: unset;
          display: block;
          width: 100%;
          box-sizing: border-box;
          padding: var(--space-4);
          cursor: pointer;
          white-space: nowrap;
          text-align: left;
          line-height: 1;
          font-size: var(--text-xs);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--color-fg-muted);
          transition: color var(--duration-base) var(--ease-standard);
        }
        .cse__text-box-toggle:hover,
        .cse__text-box-toggle:focus-visible {
          color: var(--color-fg);
        }
        /* Same padding/typography as .cse__text-box-toggle (minus the
           width:100% that makes the real button fill its pill) so its
           natural, unconstrained width is exactly what the collapsed pill
           should measure — see the useLayoutEffect above.
           position:fixed takes it out of flow regardless of any ancestor's
           own positioning, so it can't affect .cse__text-box's height or
           be mistaken for visible content. */
        .cse__text-box-toggle-measure {
          position: fixed;
          top: 0;
          left: 0;
          visibility: hidden;
          pointer-events: none;
          display: inline-block;
          box-sizing: border-box;
          padding: var(--space-4);
          white-space: nowrap;
          line-height: 1;
          font-size: var(--text-xs);
          letter-spacing: 0.04em;
          text-transform: uppercase;
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
          .cse__text-box-anchor {
            padding: 0 0 var(--space-6) var(--space-6);
          }
          .cse__text-box {
            max-width: 26rem;
          }
          .cse__text-box[data-expanded="true"] {
            width: 26rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cse__text-box,
          .cse__text-box-body,
          .cse__sidebar {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
