import { useEffect, useRef, useState } from "react";
import { navigate } from "astro:transitions/client";
import GalleryCarousel, { type GalleryCarouselItem } from "./carousel/GalleryCarousel";

export type CaseStudySlideMedia =
  | {
      type: "image";
      src: string;
      // Real pixel size of src / mobileSrc (see [slug].astro's
      // resolveImage) — reserves the image's aspect ratio before it loads
      // so nothing below it jumps as it arrives.
      width?: number;
      height?: number;
      mobileWidth?: number;
      mobileHeight?: number;
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
      // Size of poster / mobilePoster, for the same reason as the image
      // fields above — a <video> with no size of its own is 300x150 until
      // its metadata arrives.
      width?: number;
      height?: number;
      mobileWidth?: number;
      mobileHeight?: number;
      poster?: string;
      mobileSrc?: string;
      mobilePoster?: string;
      allowUnmute?: boolean;
      // A clip genuinely taller than wide (no landscape "desktop" cut) —
      // see content.config.ts's own comment. Rendered inside a fixed
      // 2560×1440 black stage on desktop instead of stretching to the full
      // content column width at native aspect ratio: the clip sits
      // contained (letterboxed) at its own aspect within that stage, like
      // a phone screen recording centered on a black background, rather
      // than a giant edge-to-edge portrait slab.
      portrait?: boolean;
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
  nextLabel: string;
  muteLabel: string;
  unmuteLabel: string;
};

export type CaseStudyNextProject = {
  href: string;
  title: string;
  subtitle?: string;
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
            width={media.width}
            height={media.height}
          />
          <video
            ref={registerRef}
            {...baseProps}
            className="cse__media cse__media--mobile"
            src={media.mobileSrc}
            poster={media.mobilePoster ?? media.poster}
            width={media.mobileWidth ?? media.width}
            height={media.mobileHeight ?? media.height}
          />
        </>
      ) : (
        <video
          ref={registerRef}
          {...baseProps}
          className={media.portrait ? "cse__media--portrait-video" : "cse__media"}
          src={media.src}
          poster={media.poster}
          width={media.width}
          height={media.height}
        />
      )}
    </>
  );
}

function Media({
  media,
  isMuted,
  transitionName,
  eager = false,
}: {
  media?: CaseStudySlideMedia;
  isMuted: boolean;
  transitionName?: string;
  /** The first media on the page: loaded straight away, not lazily. */
  eager?: boolean;
}) {
  if (!media) return null;
  if (media.type === "video") {
    if (media.portrait) {
      return (
        <div className="cse__media cse__media--portrait-stage">
          <VideoMedia media={media} isMuted={isMuted} transitionName={transitionName} />
        </div>
      );
    }
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
        <source
          media="(max-width: 720px)"
          srcSet={media.mobileSrc}
          width={media.mobileWidth}
          height={media.mobileHeight}
        />
        <img
          className={className}
          src={media.src}
          width={media.width}
          height={media.height}
          alt={media.alt}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : undefined}
          decoding="async"
          style={style}
        />
      </picture>
    );
  }
  return (
    <img
      className={className}
      src={media.src}
      width={media.width}
      height={media.height}
      alt={media.alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
      style={style}
    />
  );
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

  // Autoplay a video only while it's substantially visible, pausing it
  // otherwise — observed directly on each <video> rather than derived from
  // a single "active slide" index. Case-study slides are plain flowing
  // content now, each only as tall as its own content (no per-slide
  // viewport-height floor), so a short section — the video's included —
  // can cross the viewport within a single fast-scroll frame; a shared
  // active-index computed from a collapsed 1px center line can skip a
  // section that short entirely, silently leaving its video's poster
  // showing (a static frame that happens to double as the same photo the
  // homepage's portfolio carousel uses) even though the visitor scrolled
  // right past it. Watching each video's own intersection ratio instead —
  // a real threshold band, not a 1px line — means a fast scroll still
  // reliably crosses it and triggers play/pause. This also folds in what
  // used to be a separate resize listener: a mobileSrc pair's two <video>
  // elements toggle display:none across the 720px breakpoint (see Media
  // above), and IntersectionObserver already reports a display:none
  // element as not intersecting, so the newly-revealed element gets its
  // own play() call for free on resize, no extra wiring needed.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const videos = Array.from(container.querySelectorAll<HTMLVideoElement>("[data-cse-video]"));
    if (videos.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            // Autoplay policies check the live `muted` DOM property, not
            // just the `muted` JSX prop/attribute — React doesn't always
            // get the property itself set before this effect's first
            // play() call, and a video whose property lags the attribute
            // gets its autoplay silently rejected. Setting it here
            // immediately before play() is the reliable fix.
            video.muted = true;
            video.play().catch(() => {
              // Autoplay can still be blocked (e.g. data-saver mode) — poster (if any) stays visible.
            });
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.5 },
    );
    videos.forEach((video) => observer.observe(video));
    return () => observer.disconnect();
  }, []);

  // The page's ending: an announcement of the next case study, entered by
  // pushing past the end of the page. Once the visitor is at the very
  // bottom, further downward scroll input (wheel/trackpad, or a swipe up)
  // charges a bar across the teaser; it drains again when the input stops,
  // and reaching full navigates to the next project (the root slide+fade
  // view transition takes it from there — see global.css's
  // [data-case-study-linked] rules).
  // This only ever *observes* the input: nothing here calls preventDefault,
  // scrollTo or scrollIntoView, so native scrolling is untouched. The
  // whole block stays a real <a>, so a click or Enter navigates
  // immediately regardless of the bar.
  useEffect(() => {
    const link = nextRef.current;
    if (!link) return;
    // Reduced motion: a plain, static link — no charge, no auto-navigation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Scroll input (px of wheel delta / swipe distance) to fill the bar
    // from empty — "scroll hard", not a casual nudge.
    const CHARGE_PX = 700;
    const IDLE_MS = 300; // input pause before the bar starts draining
    const DRAIN_PER_SECOND = 0.55;

    let charge = 0;
    let momentum = 0;
    let prevCharge = 0;
    let lastInput = 0;
    let lastFrame = 0;
    let rafId = 0;
    let navigated = false;
    let touchY = 0;

    const atBottom = () =>
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;

    const paint = () => {
      link.style.setProperty("--next-progress", charge.toFixed(4));
      link.style.setProperty("--next-momentum", momentum.toFixed(4));
    };

    const frame = (now: number) => {
      // rAF's timestamp can precede the performance.now() that armed
      // lastFrame, so the very first dt can be slightly negative.
      const dt = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.05);
      lastFrame = now;
      if (now - lastInput > IDLE_MS) charge = Math.max(0, charge - DRAIN_PER_SECOND * dt);
      // Momentum: how fast the bar is filling right now (0 = still or
      // draining, 1 = a hard push). Snaps up quickly, eases off slowly, so
      // the spectrum flares with each shove and settles when it stops.
      const stepDt = Math.max(dt, 1 / 60);
      const target = Math.min(Math.max((charge - prevCharge) / stepDt / 1.6, 0), 1);
      prevCharge = charge;
      momentum += (target - momentum) * Math.min(stepDt * (target > momentum ? 30 : 4), 1);
      paint();
      if (charge >= 1 && !navigated) {
        navigated = true;
        // A beat on the full bar before leaving, so it registers.
        window.setTimeout(() => {
          // Tells the next page a hard push brought us here, so it can
          // swallow that push's leftover trackpad momentum (see
          // BaseLayout's astro:after-swap listener).
          try {
            sessionStorage.setItem("cse-pushed", String(Date.now()));
          } catch {
            // Storage unavailable — the momentum just isn't swallowed.
          }
          navigate(nextProject.href);
        }, 140);
      }
      if (charge > 0 && !navigated) rafId = requestAnimationFrame(frame);
      else {
        rafId = 0;
        momentum = 0;
        paint();
      }
    };

    const push = (amount: number) => {
      if (navigated) return;
      // Pushing back up (or away from the bottom) drains it instead.
      if (amount > 0 && !atBottom()) return;
      charge = Math.min(Math.max(charge + amount / CHARGE_PX, 0), 1);
      lastInput = performance.now();
      if (!rafId) {
        lastFrame = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    };

    // Arrival at the bottom isn't a push. A fast scroll (or its trackpad
    // momentum) that carries the page to the very end is still delivering
    // wheel events on arrival — counting those would fill the bar without
    // the visitor ever pushing past the end. So input only counts once
    // it's a fresh gesture: the first wheel event at the bottom after a
    // pause (judged by the events' own timestamps). Anything arriving
    // while the page is still travelling, or in the wake of that travel,
    // just keeps the "not yet" state.
    const ARM_QUIET_MS = 200;
    let armed = false;
    let lastWheelStamp = 0;
    const onWheel = (event: WheelEvent) => {
      const gap = event.timeStamp - lastWheelStamp;
      lastWheelStamp = event.timeStamp;
      if (!atBottom()) {
        armed = false;
        return;
      }
      if (!armed) {
        if (gap <= ARM_QUIET_MS) return;
        armed = true;
      }
      push(event.deltaY);
    };
    // Same rule for touch: only a swipe that started while already at the
    // bottom counts; momentum after a finger lifts sends no touch events.
    let touchArmed = false;
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0].clientY;
      touchArmed = atBottom();
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0].clientY;
      if (touchArmed) push(touchY - y);
      touchY = y;
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [nextProject.href]);

  return (
    <div className="cse">
      {/* First in the markup on purpose: the browser draws content as soon as
          it's parsed, so styles placed after it (as they used to be) let the
          whole page render unstyled for a moment and then snap into layout —
          the jumping on load. */}
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
          /* Rises into place from behind the hero image rather than just
             appearing — .cse__intro's own bottom padding to the image
             below is small (--space-3, 1rem), so a 48px starting offset
             is enough to put the title's PRE-animation position past its
             own box, under where the image begins. .cse__intro comes
             before .cse__slides in the DOM with no z-index on either, so
             normal paint order alone (later elements paint over earlier
             ones) is what hides the overlapping portion behind the photo
             — no stacking-context trick needed. Delayed rather than
             immediate so it doesn't compete with the hero image's own
             view-transition morph (see global.css's own
             ::view-transition-group(*) — 380ms) settling first; animation
             (not transition) since there's no JS state driving this, just
             a one-shot entrance on mount. */
          animation: cse-title-rise var(--duration-slow) var(--ease-out-expressive) both;
          animation-delay: 450ms;
        }
        @keyframes cse-title-rise {
          from {
            opacity: 0;
            transform: translateY(48px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        /* Reduced motion gets the honest fallback: title present
           immediately, no rise, no wait — --duration-slow already
           collapses to 0ms under reduced motion (tokens.css), but
           animation-delay isn't a duration token, so it needs its own
           override or a reduced-motion visitor would still sit through
           the full 450ms delay before the (now instant) animation "plays". */
        @media (prefers-reduced-motion: reduce) {
          .cse__title {
            animation-delay: 0ms;
          }
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
        /* Desktop: one fixed distance between one section and the next
           (6rem, --space-7), not each section's own generous top/bottom
           padding stacked together. */
        /* Another slide of the same section as the previous one: pulled up from the full
           section distance to the 2rem "belongs together" distance. */
        .cse__step--continued {
          margin-top: calc(2rem - var(--space-8));
          padding-top: 0;
        }
        @media (min-width: 721px) {
          .cse__step--continued {
            margin-top: calc(2rem - var(--space-7));
          }
          .cse__slides {
            display: flex;
            flex-direction: column;
            gap: var(--space-7);
          }
          .cse__step,
          .cse__recognition,
          .cse__credits {
            padding-block: 0;
          }
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
        /* Vertical inset for the padded image inside its own backdrop
           panel (the slide itself no longer carries padding). */
        /* Padded images lift off their surface with a very faint, soft
           shadow (desktop and mobile alike). On mobile the image is the
           full width of the page column, and the shadow's own spread stays
           inside the page's side padding, so nothing clips it. */
        .cse__media--padded {
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.04),
            0 6px 20px rgba(0, 0, 0, 0.06);
        }
        /* A padded image sits in a box (the slide's own backdrop colour) on
           desktop, centred at its own size; on mobile there's no box — the
           image just fills the width like any other. */
        @media (min-width: 721px) {
          .cse__media-wrap--padded {
            display: flex;
            justify-content: center;
            padding: var(--space-7) var(--space-6);
          }
          .cse__media-wrap--padded .cse__media--padded {
            width: auto;
            max-width: 100%;
            margin-inline: 0;
          }
        }
        @media (max-width: 720px) {
          .cse__media-wrap--padded {
            background: none !important;
          }
          .cse__media-wrap--padded .cse__media--padded {
            width: 100%;
            margin-inline: 0;
          }
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
        /* See the video type's own "portrait" field (content.config.ts) —
           a 9:16 clip with no separate landscape cut. On mobile it's left
           alone (full width, native aspect — a portrait clip already suits
           a portrait screen). On desktop it's contained inside a fixed
           2560×1440 black stage instead of stretching to the full content
           column width at native aspect ratio, which would make the slide
           absurdly tall: the clip plays at the stage's full height,
           centered, like a phone screen recording sitting on a black
           background — a mobile-shaped player, not an edge-to-edge slab. */
        .cse__media--portrait-video {
          display: block;
          width: 100%;
          height: auto;
        }
        @media (min-width: 721px) {
          .cse__media--portrait-stage {
            display: flex;
            align-items: center;
            justify-content: center;
            aspect-ratio: 2560 / 1440;
            background: #000;
          }
          .cse__media--portrait-video {
            width: auto;
            height: 100%;
            max-width: 100%;
          }
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
          background: #0a1114;
        }
        /* Desktop: the carousel area is a fixed 2560 x 1400 frame, so every
           carousel section is the same shape regardless of its items. */
        @media (min-width: 721px) {
          .cse__media--carousel {
            aspect-ratio: 2560 / 1400;
            padding-block: 0;
          }
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
        /* One tile size for all three carousels (illustrations, portraits,
           icons), so they share the same rhythm: the drag physics and
           speed (px/s) were already identical, but different tile sizes
           made the same px/s read as different speeds — big tiles glide,
           small ones rush. Same size + same gap (see GalleryCarousel)
           means the same number of tiles pass per second, too. */
        .cse__media--carousel .gallery-carousel--square .gallery-carousel__item,
        .cse__media--carousel .gallery-carousel--circle .gallery-carousel__item,
        .cse__media--carousel .gallery-carousel--icon .gallery-carousel__item {
          width: min(34vh, 340px);
          height: min(34vh, 340px);
        }
        @media (max-width: 720px) {
          .cse__media--carousel .gallery-carousel--square .gallery-carousel__item,
          .cse__media--carousel .gallery-carousel--circle .gallery-carousel__item,
          .cse__media--carousel .gallery-carousel--icon .gallery-carousel__item {
            width: min(21vh, 170px);
            height: min(21vh, 170px);
          }
        }
        /* Proximity hierarchy: a slide's text sits close under its own
           media (2rem), a third of the gap between one section and the next
           (6rem, --space-7, see .cse__slides), and the heading sits
           tighter still to its own paragraph — so what belongs together
           reads as one group and separate sections read as separate. */
        .cse__text {
          padding-block: 2rem 0;
          max-width: 42rem;
        }
        .cse__text h2 {
          font-size: var(--text-xl);
          margin-bottom: var(--space-2);
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
           BaseLayout's hideFooter prop. --next-progress (0-1, written from
           JS as the visitor pushes past the end of the page, and draining
           back when they stop — see the component's own effect) drives how
           much of the spectrum bar below is revealed; full navigates. */
        /* A blank, full-height section of its own: the line sits at its
           exact vertical centre (the rows either side share the leftover
           height equally), with the caption hanging just below it. */
        .cse__next {
          display: grid;
          grid-template-rows: 1fr auto 1fr;
          min-height: 100svh;
          text-decoration: none;
          color: inherit;
        }
        /* Grey track; the filled part is black; the colour spectrum (the
           typewriter reveal, the nav underline's trail) only trails the
           very tip of the fill, so it reads as the line being drawn rather
           than a rainbow bar. */
        .cse__next-bar {
          position: relative;
          overflow: hidden;
          width: 100%;
          height: 1px;
          background: var(--color-border);
        }
        .cse__next-bar-fill {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: calc(var(--next-progress, 0) * 100%);
          background: var(--color-fg);
        }
        .cse__next-bar-tip {
          position: absolute;
          top: 0;
          bottom: 0;
          right: calc((1 - var(--next-progress, 0)) * 100%);
          /* Length and intensity follow the momentum of the push
             (--next-momentum, see the component's effect): a hard shove
             throws the spectrum far back along the line, easing off pulls
             it in and fades it, and when the bar is still it's gone —
             just the black line. */
          width: calc(1.5rem + var(--next-momentum, 0) * 60%);
          /* Bright end at the tip, fading back through the hues behind it. */
          background: linear-gradient(
            to left,
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
          /* Vivid as soon as there's any real momentum; only the last
             bit of easing-off fades it out. */
          opacity: calc(clamp(0, calc(var(--next-progress, 0) * 12), 1) * clamp(0, calc(var(--next-momentum, 0) * 3), 1));
        }
        .cse__next-bar {
          grid-row: 2;
        }
        .cse__next-caption {
          grid-row: 3;
          align-self: start;
          margin-top: var(--space-3);
          font-size: var(--text-xs);
          color: var(--color-fg-muted);
        }
        .cse__next-caption-name {
          color: var(--color-fg);
        }
        @media (prefers-reduced-motion: reduce) {
          .cse__next-bar {
            display: none;
          }
        }
      `}</style>

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
            className={`cse__step${slide.recognition ? " cse__recognition" : slide.credits ? " cse__credits" : ""}${
              // A slide of the same section as the one before it (several
              // images of one section) is grouped with it: the close "belongs
              // together" distance instead of a new section's distance, with
              // the section's text following the whole group.
              index > 0 && slide.media && slides[index - 1].chapterId === slide.chapterId ? " cse__step--continued" : ""
            }`}
            data-slide-index={index}
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
                {/* The padded image's own backdrop colour belongs to the
                    media panel only — it used to be painted on the whole
                    slide, so the heading/paragraph beneath it (dark text)
                    ended up on that dark backdrop, overlapping the image's
                    panel and unreadable. */}
                <div
                  className={`cse__media-wrap${slide.media?.type === "image" && slide.media.padded ? " cse__media-wrap--padded" : ""}`}
                  style={
                    slide.media?.type === "image" && slide.media.padded && slide.media.background
                      ? { background: slide.media.background }
                      : undefined
                  }
                >
                  <Media
                    media={slide.media}
                    isMuted={isMuted}
                    transitionName={index === firstMediaIndex ? coverTransitionName : undefined}
                    eager={index === firstMediaIndex}
                  />
                  {slide.media?.type === "video" && slide.media.allowUnmute && (
                    <button
                      type="button"
                      className="cse__media-mute"
                      aria-label={isMuted ? meta.unmuteLabel : meta.muteLabel}
                      aria-pressed={!isMuted}
                      onClick={() => setIsMuted((muted) => !muted)}
                    >
                      <MuteIcon muted={isMuted} />
                    </button>
                  )}
                </div>
                {Boolean(slide.heading || slide.body?.length) && (
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

      <a ref={nextRef} href={nextProject.href} className="cse__next">
        <div className="cse__next-bar">
          <div className="cse__next-bar-fill" />
          <div className="cse__next-bar-tip" />
        </div>
        <p className="cse__next-caption">
          {meta.nextLabel}: <span className="cse__next-caption-name">{nextProject.title}</span>
        </p>
      </a>
    </div>
  );
}
