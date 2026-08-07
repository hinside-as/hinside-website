import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import GalleryCarousel, { type GalleryCarouselItem } from "./carousel/GalleryCarousel";
import PortfolioCarousel, { type PortfolioItem } from "./carousel/PortfolioCarousel";

export type CaseStudySlideMedia =
  | { type: "image"; src: string; alt: string }
  | { type: "video"; src: string; poster?: string }
  | { type: "carousel"; items: GalleryCarouselItem[]; shape: "square" | "circle" | "icon" };

export type CaseStudySlide = {
  chapterId: string;
  heading?: string;
  body?: string[];
  media?: CaseStudySlideMedia;
};

export type CaseStudyChapter = { id: string; label: string };

export type CaseStudyMeta = {
  title: string;
  client: string;
  year: number;
  dek: string;
  credits: { role: string; name: string }[];
  backHref: string;
  backLabel: string;
  clientLabel: string;
  yearLabel: string;
  hideTextLabel: string;
  showTextLabel: string;
};

type Props = {
  meta: CaseStudyMeta;
  chapters: CaseStudyChapter[];
  slides: CaseStudySlide[];
  otherProjects: PortfolioItem[];
  moreProjectsLabel: string;
};

function Media({ media }: { media?: CaseStudySlideMedia }) {
  if (!media) return null;
  if (media.type === "video") {
    return (
      <video
        className="cse__media"
        data-cse-video
        src={media.src}
        poster={media.poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
    );
  }
  if (media.type === "carousel") {
    return (
      <div className="cse__media cse__media--carousel">
        <GalleryCarousel items={media.items} shape={media.shape} />
      </div>
    );
  }
  return <img className="cse__media" src={media.src} alt={media.alt} loading="lazy" />;
}

export default function CaseStudyExperience({ meta, chapters, slides, otherProjects, moreProjectsLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimatingRef = useRef(false);
  const reducedMotionRef = useRef(false);
  // Refs so a wheel burst's "already triggered a jump" state survives
  // regardless of when exactly the gesture effect below happens to
  // re-run — it currently only runs once (see that effect's own comment),
  // but tying this to a ref rather than an effect-local variable means it
  // stays correct even if that ever changes.
  const wheelStreamHandledRef = useRef(false);
  const wheelStreamTimerRef = useRef(0);
  const hasPromo = otherProjects.length > 0;
  const totalSlides = slides.length + (hasPromo ? 1 : 0);

  // -1 is a "peek" state: a look at the header above slide 1. totalSlides
  // (one past the last real slide/index) is the symmetric peek at the
  // footer below the last slide. Both are reached only by scrolling past
  // the corresponding end — there's nowhere else to go. 0..totalSlides-1
  // are the slides themselves, the last being the cross-promo carousel
  // when there is one. Text panels no longer have their own dismiss beat
  // — that felt wrong triggered by scrolling; see `textHidden` below for
  // the manual show/hide toggle that replaced it.
  const [position, setPosition] = useState(0);
  // One global toggle, not per-slide: hiding the text is a reading
  // preference for the whole piece, not something that should reset every
  // time you move to a new slide.
  const [textHidden, setTextHidden] = useState(false);

  // Read by event handlers that must always see the latest position
  // without forcing those handlers (and the effect that attaches them) to
  // be recreated on every navigation — see the comment on the main gesture
  // effect below for why that recreation was itself a bug.
  const positionRef = useRef(position);
  positionRef.current = position;

  const isFooterRevealed = position === totalSlides;
  const currentSlideIndex = Math.min(Math.max(0, position), totalSlides - 1);
  const headerRevealed = position === -1;
  const isPromoActive = hasPromo && currentSlideIndex === slides.length;
  const activeChapterId = slides[Math.min(currentSlideIndex, slides.length - 1)]?.chapterId ?? chapters[0]?.id ?? "";
  const headerHidden = !headerRevealed;

  const progressPct = useMemo(() => {
    if (headerRevealed) return 0;
    if (isPromoActive) return 100;
    const chapterIndex = chapters.findIndex((chapter) => chapter.id === activeChapterId);
    if (chapterIndex === -1) return 0;
    // Fraction through the *current chapter's own* slides specifically (a
    // chapter can span more than one slide — e.g. a gallery section
    // flattened into one slide per image) — not the whole page.
    const chapterSlideIndices = slides.reduce<number[]>((acc, slide, i) => {
      if (slide.chapterId === activeChapterId) acc.push(i);
      return acc;
    }, []);
    const positionInChapter = chapterSlideIndices.indexOf(currentSlideIndex);
    const fraction = chapterSlideIndices.length > 0 ? (positionInChapter + 1) / chapterSlideIndices.length : 1;
    return ((chapterIndex + fraction) / chapters.length) * 100;
  }, [slides, chapters, activeChapterId, currentSlideIndex, isPromoActive, headerRevealed]);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // The header is a shared, site-wide component (Header.astro) that isn't
  // otherwise aware of this experience — it normally hides itself by
  // watching window scroll, but window scroll never happens here (all
  // navigation is the track's transform, not native scrolling), so it's
  // driven directly instead, reusing the data-hidden attribute/CSS it
  // already ships with.
  useEffect(() => {
    const header = document.querySelector("[data-site-header]");
    header?.setAttribute("data-hidden", String(headerHidden));
  }, [headerHidden]);

  // Autoplay videos on the active slide only — a video several slides away
  // (off-track) has no business consuming decode/playback resources.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || reducedMotionRef.current) return;
    const active = container.querySelector<HTMLElement>(`[data-slide-index="${currentSlideIndex}"]`);
    const video = active?.querySelector<HTMLVideoElement>("[data-cse-video]");
    video?.play().catch(() => {
      // Autoplay can be blocked (e.g. data-saver mode) — poster stays visible.
    });
  }, [currentSlideIndex]);

  const lockDuration = () => (reducedMotionRef.current ? 60 : 650);

  // Stable across renders (only ever change if totalSlides changes, which
  // it doesn't for a mounted page) — critical for the main gesture effect
  // below, which attaches its listeners once and must keep calling the
  // *current* version of these without needing to re-subscribe. They read
  // the live position from positionRef rather than closing over the
  // `position` state value directly, which is what makes that possible.
  const goTo = useCallback(
    (nextPosition: number): boolean => {
      if (nextPosition < -1 || nextPosition > totalSlides) return false;
      if (isAnimatingRef.current) return true; // mid-jump: swallow the input, don't bubble it either
      isAnimatingRef.current = true;
      setPosition(nextPosition);
      window.setTimeout(() => {
        isAnimatingRef.current = false;
      }, lockDuration());
      return true;
    },
    [totalSlides],
  );

  const handleForward = useCallback(() => goTo(positionRef.current + 1), [goTo]);
  const handleBackward = useCallback(() => goTo(positionRef.current - 1), [goTo]);

  // Wheel + touch + keyboard all funnel through the same handleForward/
  // handleBackward pair, so "one gesture = one jump" behaves identically
  // regardless of input device. Returning false (couldn't move — already
  // at the first/last position) means the caller should NOT preventDefault,
  // letting the gesture fall through to the outer page: scrolling down past
  // the last slide reveals the footer; scrolling up past the "header peek"
  // state reaches whatever's above (nothing, in practice — a harmless no-op).
  //
  // This effect's dependency array is [handleForward, handleBackward] —
  // both stable — rather than [position, totalSlides], deliberately: with
  // position as a dependency, every single jump tore this whole effect
  // down and rebuilt it (new listeners, new closures), which reset several
  // pieces of gesture-tracking state (the embedded-carousel pointer axis
  // map, the touch-decision variables) mid-gesture, and briefly detached
  // the actual event listeners on every navigation — occasionally leaving
  // the container not listening for the next scroll until the pointer left
  // and re-entered it. Attaching once and reading fresh state through refs
  // avoids that whole class of problem.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isWithinEmbeddedCarousel = (target: EventTarget | null) =>
      target instanceof Element && target.closest(".gallery-carousel") !== null;

    // Trackpads (and some mice) fire a long burst of wheel events for a
    // single physical swipe, and macOS/browser momentum keeps firing more
    // of them for a good while after fingers actually leave the trackpad —
    // sometimes well past a fixed lock duration. Gate on *continuity*
    // instead: once a burst has triggered one jump, ignore the rest of
    // that same burst (including its momentum tail) no matter how long it
    // runs, and only arm for a new jump once wheel events actually stop
    // for a beat (WHEEL_STREAM_GAP_MS) — i.e. a genuinely new gesture.
    const WHEEL_STREAM_GAP_MS = 180;

    const onWheel = (event: WheelEvent) => {
      if (isWithinEmbeddedCarousel(event.target) && Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return; // horizontal intent over an embedded carousel: let it scroll the carousel, not the page
      }
      if (Math.abs(event.deltaY) < 1) return;

      window.clearTimeout(wheelStreamTimerRef.current);
      wheelStreamTimerRef.current = window.setTimeout(() => {
        wheelStreamHandledRef.current = false;
      }, WHEEL_STREAM_GAP_MS);

      if (wheelStreamHandledRef.current) {
        event.preventDefault(); // still the same burst/momentum tail — swallow it
        return;
      }

      const handled = event.deltaY > 0 ? handleForward() : handleBackward();
      if (handled) {
        wheelStreamHandledRef.current = true;
        event.preventDefault();
      }
    };

    let touchStartY = 0;
    let touchStartX = 0;
    let touchDecided = false;
    let touchIsHorizontal = false;

    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0].clientY;
      touchStartX = event.touches[0].clientX;
      touchDecided = false;
      touchIsHorizontal = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (isAnimatingRef.current) {
        event.preventDefault();
        return;
      }
      const dy = touchStartY - event.touches[0].clientY;
      const dx = touchStartX - event.touches[0].clientX;

      if (!touchDecided) {
        // Let a horizontal drag that started on an embedded carousel pass
        // through untouched — that's the carousel's own drag, not a page jump.
        if (isWithinEmbeddedCarousel(event.target) && Math.abs(dx) > Math.abs(dy)) {
          touchIsHorizontal = true;
          touchDecided = true;
          return;
        }
        if (Math.abs(dy) < 12 && Math.abs(dx) < 12) {
          event.preventDefault(); // small movement: hold still while intent is unclear
          return;
        }
        touchDecided = true;
      }
      if (touchIsHorizontal) return;

      const threshold = 48;
      if (Math.abs(dy) > threshold) {
        const handled = dy > 0 ? handleForward() : handleBackward();
        if (handled) {
          event.preventDefault();
          touchStartY = event.touches[0].clientY; // require a fresh full swipe for the next jump
        }
      } else {
        event.preventDefault();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        if (handleForward()) event.preventDefault();
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        if (handleBackward()) event.preventDefault();
      }
    };

    // useDragCarousel's own pointer-drag (inside an embedded GalleryCarousel)
    // has no axis check at all — any few pixels of movement in any
    // direction starts its horizontal drag and captures the pointer, which
    // fought with page navigation on anything but a near-perfectly
    // vertical swipe (the touchmove handler above has its own axis logic,
    // but that's a *different* event stream from the carousel's pointer
    // events, so it can't stop the carousel by itself). This intercepts at
    // the capture phase — which runs on this ancestor before the event
    // ever reaches the carousel's own track element — and once a gesture
    // that started on a carousel turns out to be vertical-dominant, stops
    // it from propagating any further, so the carousel never sees it.
    const AXIS_DECISION_PX = 4;
    const carouselGestureAxis = new Map<number, { x: number; y: number; decided: boolean; vertical: boolean }>();

    const onPointerDownCapture = (event: PointerEvent) => {
      if (!isWithinEmbeddedCarousel(event.target)) return;
      carouselGestureAxis.set(event.pointerId, { x: event.clientX, y: event.clientY, decided: false, vertical: false });
    };

    const onPointerMoveCapture = (event: PointerEvent) => {
      const state = carouselGestureAxis.get(event.pointerId);
      if (!state) return;
      if (state.decided) {
        if (state.vertical) event.stopPropagation();
        return;
      }
      const dx = event.clientX - state.x;
      const dy = event.clientY - state.y;
      if (Math.abs(dx) < AXIS_DECISION_PX && Math.abs(dy) < AXIS_DECISION_PX) return;
      state.decided = true;
      state.vertical = Math.abs(dy) > Math.abs(dx);
      if (state.vertical) event.stopPropagation();
    };

    const onPointerUpCapture = (event: PointerEvent) => {
      carouselGestureAxis.delete(event.pointerId);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("pointerdown", onPointerDownCapture, { capture: true });
    container.addEventListener("pointermove", onPointerMoveCapture, { capture: true });
    container.addEventListener("pointerup", onPointerUpCapture, { capture: true });
    container.addEventListener("pointercancel", onPointerUpCapture, { capture: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("pointerdown", onPointerDownCapture, { capture: true });
      container.removeEventListener("pointermove", onPointerMoveCapture, { capture: true });
      container.removeEventListener("pointerup", onPointerUpCapture, { capture: true });
      container.removeEventListener("pointercancel", onPointerUpCapture, { capture: true });
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleForward, handleBackward]);

  // Footer symmetry with the header peek: reaching one past the last slide
  // reveals the footer (scrolled into view explicitly, not left to ambient
  // page scroll), and scrolling up while it's showing hides it again and
  // returns to the last slide — rather than just being normal page scroll
  // that happens to leave the footer on screen with no way back except
  // scrolling further, which is what plain boundary-bubbling gave for free
  // but didn't let you undo.
  useEffect(() => {
    if (!isFooterRevealed) return;
    const behavior = reducedMotionRef.current ? "auto" : "smooth";
    document.querySelector(".site-footer")?.scrollIntoView({ behavior, block: "start" });

    const hideFooter = () => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      setPosition(totalSlides - 1);
      window.setTimeout(() => {
        isAnimatingRef.current = false;
      }, lockDuration());
    };

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < -1) {
        event.preventDefault();
        hideFooter();
      }
    };
    let touchStartY = 0;
    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0].clientY;
    };
    const onTouchMove = (event: TouchEvent) => {
      const dy = touchStartY - event.touches[0].clientY;
      if (dy < -48) {
        event.preventDefault();
        hideFooter();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      // Whenever this state is left (whether via the handler above or a
      // direct TOC jump elsewhere), land back inside the experience rather
      // than stranded mid-page next to the footer.
      containerRef.current
        ?.closest(".cse")
        ?.scrollIntoView({ behavior: reducedMotionRef.current ? "auto" : "smooth", block: "start" });
    };
  }, [isFooterRevealed, totalSlides]);

  const scrollToChapter = (chapterId: string) => {
    const slideIndex = slides.findIndex((slide) => slide.chapterId === chapterId);
    if (slideIndex === -1) return;
    isAnimatingRef.current = false; // a direct jump always wins over any in-flight lock
    setPosition(slideIndex);
  };

  return (
    <div
      className="cse"
      style={
        headerHidden
          ? ({ "--cse-vh": "100svh", marginTop: "calc(-1 * var(--header-height))" } as CSSProperties)
          : undefined
      }
    >
      <aside className="cse__sidebar">
        <a className="cse__back" href={meta.backHref}>
          &larr; {meta.backLabel}
        </a>
        <h1 className="cse__title">{meta.title}</h1>
        <dl className="cse__meta">
          <div>
            <dt>{meta.clientLabel}</dt>
            <dd>{meta.client}</dd>
          </div>
          <div>
            <dt>{meta.yearLabel}</dt>
            <dd>{meta.year}</dd>
          </div>
        </dl>
        <p className="cse__dek">{meta.dek}</p>
        {meta.credits.length > 0 && (
          <dl className="cse__meta cse__meta--credits">
            {meta.credits.map((credit) => (
              <div key={`${credit.role}-${credit.name}`}>
                <dt>{credit.role}</dt>
                <dd>{credit.name}</dd>
              </div>
            ))}
          </dl>
        )}
        <nav className="cse__toc" aria-label="Chapters">
          <div className="cse__toc-rail">
            <div className="cse__toc-rail-fill" style={{ height: `${progressPct}%` }} />
          </div>
          <ol>
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <button
                  type="button"
                  data-active={chapter.id === activeChapterId}
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
        <div
          className="cse__track"
          style={{ transform: `translateY(calc(var(--cse-vh) * -${currentSlideIndex}))` }}
        >
          {slides.map((slide, index) => {
            const hasText = Boolean(slide.heading && slide.body?.length);
            const isActive = index === currentSlideIndex;
            const showCard = hasText && isActive && !textHidden;
            return (
              <section key={`${slide.chapterId}-${index}`} className="cse__step" data-slide-index={index}>
                <Media media={slide.media} />
                {hasText && (
                  <>
                    <div className="cse__panel">
                      <div className="cse__panel-card" data-hidden={!showCard}>
                        <h2>{slide.heading}</h2>
                        {slide.body!.map((paragraph, i) => (
                          <p key={i}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cse__text-toggle"
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setTextHidden((hidden) => !hidden)}
                    >
                      {textHidden ? meta.showTextLabel : meta.hideTextLabel}
                    </button>
                  </>
                )}
              </section>
            );
          })}
          {hasPromo && (
            <section className="cse__step cse__promo" data-slide-index={slides.length}>
              <h2 className="cse__promo-heading">{moreProjectsLabel}</h2>
              <PortfolioCarousel items={otherProjects} />
            </section>
          )}
        </div>
      </div>

      <style>{`
        .cse {
          width: 100%;
          --cse-vh: calc(100svh - var(--header-height));
          margin-top: 0;
          /* Header.astro hides itself via transform (see the effect above),
             which doesn't reclaim its layout space since it's position:
             sticky, not fixed — this negative margin is what actually pulls
             the experience (and the footer after it) up to fill that space
             once the header's gone, in step with --cse-vh growing to the
             full viewport. */
          transition: margin-top var(--duration-base) var(--ease-standard);
        }
        .cse__sidebar {
          padding: var(--space-6) var(--space-4);
        }
        .cse__back {
          display: inline-block;
          margin-bottom: var(--space-3);
          color: var(--color-fg-muted);
          text-decoration: none;
          font-size: var(--text-sm);
          transition: color var(--duration-fast) var(--ease-standard);
        }
        .cse__back:hover {
          color: var(--accent, var(--color-fg));
        }
        .cse__title {
          font-size: var(--text-xl);
          font-weight: var(--weight-regular);
          letter-spacing: var(--tracking-tighter);
          line-height: var(--leading-tight);
          margin-bottom: var(--space-3);
        }
        .cse__meta {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          margin: 0 0 var(--space-3);
        }
        .cse__meta dt {
          font-size: var(--text-xs);
          color: var(--color-fg-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .cse__meta dd {
          margin: 0;
        }
        .cse__dek {
          font-size: var(--text-sm);
          color: var(--color-fg-muted);
          line-height: var(--leading-normal);
          margin-bottom: var(--space-3);
        }
        .cse__toc {
          display: flex;
          gap: var(--space-3);
          margin-top: var(--space-4);
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
          transition: height var(--duration-base) var(--ease-standard);
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
          color: var(--color-fg-muted);
          transition: color var(--duration-fast) var(--ease-standard);
        }
        .cse__toc button[data-active="true"] {
          color: var(--color-fg);
          font-weight: var(--weight-medium);
        }

        /* The visible window: exactly one viewport tall, everything else
           (the track's other slides) clipped outside it. Jumping between
           slides is purely .cse__track's transform — there is no native
           scrolling here at all, which is deliberate: it's what makes each
           jump a real, controlled "cut" to the next slide rather than a
           browser-driven momentum scroll. */
        .cse__slides {
          position: relative;
          height: var(--cse-vh);
          overflow: hidden;
          touch-action: none;
          transition: height var(--duration-base) var(--ease-standard);
        }
        .cse__track {
          display: flex;
          flex-direction: column;
          will-change: transform;
          transition: transform var(--duration-slow) var(--ease-out-expressive);
        }
        .cse__step {
          position: relative;
          flex: 0 0 var(--cse-vh);
          height: var(--cse-vh);
          overflow: hidden;
          background: var(--color-bg-raised);
          transition: flex-basis var(--duration-base) var(--ease-standard);
        }
        .cse__promo {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-5);
          padding: var(--space-6) var(--space-4);
        }
        .cse__promo-heading {
          font-size: var(--text-2xl);
          text-align: center;
        }
        .cse__media {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cse__media--carousel {
          display: flex;
          align-items: center;
          background: var(--color-bg-raised);
        }
        /* GalleryCarousel's own item sizes (384px / 192px) are tuned for
           sitting in a content column elsewhere — here it's the entire
           full-bleed slide, so items scale up relative to the viewport to
           actually fill that space instead of floating small in the middle. */
        .cse__media--carousel .gallery-carousel--square .gallery-carousel__item {
          width: min(60vh, 640px);
          height: min(60vh, 640px);
        }
        .cse__media--carousel .gallery-carousel--circle .gallery-carousel__item,
        .cse__media--carousel .gallery-carousel--icon .gallery-carousel__item {
          width: min(34vh, 340px);
          height: min(34vh, 340px);
        }
        .cse__panel {
          position: absolute;
          inset: 0;
        }
        .cse__panel-card {
          position: absolute;
          left: var(--space-4);
          right: var(--space-4);
          bottom: var(--space-4);
          max-width: 32rem;
          padding: var(--space-4);
          background: color-mix(in srgb, var(--color-bg) 78%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          opacity: 1;
          transform: translateY(0);
          /* Deliberately slower than .cse__track's jump (var(--duration-slow),
             600ms): the background is already in its final position by the
             time the card is still visibly sliding/fading the rest of the
             way in, reading as two layers moving at different speeds rather
             than one flat cut — a parallax effect suited to a jump-based
             navigation rather than the usual continuous-scroll kind. */
          transition:
            opacity 850ms var(--ease-out-expressive),
            transform 850ms var(--ease-out-expressive);
        }
        .cse__panel-card[data-hidden="true"] {
          opacity: 0;
          transform: translateY(3rem);
          pointer-events: none;
        }
        .cse__panel-card h2 {
          font-size: var(--text-xl);
          margin-bottom: var(--space-3);
        }
        .cse__panel-card p {
          font-size: var(--text-base);
          line-height: var(--leading-normal);
          color: var(--color-fg-muted);
        }
        .cse__panel-card p + p {
          margin-top: var(--space-2);
        }
        .cse__text-toggle {
          all: unset;
          position: absolute;
          top: var(--space-4);
          right: var(--space-4);
          cursor: pointer;
          font-size: var(--text-xs);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--color-fg-muted);
          padding: var(--space-2) var(--space-3);
          background: color-mix(in srgb, var(--color-bg) 78%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition: color var(--duration-fast) var(--ease-standard);
        }
        .cse__text-toggle:hover,
        .cse__text-toggle:focus-visible {
          color: var(--color-fg);
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
            top: var(--header-height);
            height: var(--cse-vh);
            overflow-y: auto;
            padding: var(--space-5) var(--space-5);
          }
          .cse__slides {
            width: 75%;
            flex: 0 0 75%;
          }
          .cse__panel-card {
            left: var(--space-6);
            right: auto;
            bottom: var(--space-6);
            max-width: 26rem;
          }
          .cse__text-toggle {
            top: var(--space-6);
            right: var(--space-6);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cse,
          .cse__track,
          .cse__slides,
          .cse__step {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
