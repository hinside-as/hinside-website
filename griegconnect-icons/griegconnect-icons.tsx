import { type ComponentType, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const CLOUDINARY_ILLUSTRATION_URLS: Record<number, string> = {
  1: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239553/icon-30_nvyqdl.svg",
  2: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239554/icon-32_p1czrl.svg",
  3: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239553/icon-31_vtmpkt.svg",
  4: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239553/icon-29_unrqe2.svg",
  5: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239553/icon-28_b4tkyl.svg",
  6: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239552/icon-27_gbnpsa.svg",
  7: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239552/icon-26_acymq7.svg",
  8: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239551/icon-25_gjamjf.svg",
  9: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239551/icon-24_dr8tsq.svg",
  10: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239551/icon-23_gji0ot.svg",
  11: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239550/icon-21_jd7xgd.svg",
  12: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239550/icon-22_wonqcs.svg",
  13: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239550/icon-20_xto86m.svg",
  14: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239549/icon-19_zoajfa.svg",
  15: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239549/icon-18_im260d.svg",
  16: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239549/icon-15_n3fri7.svg",
  17: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239549/icon-16_o7jhrr.svg",
  18: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239549/icon-17_ggnj6t.svg",
  19: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239548/icon-14_chcvyk.svg",
  20: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239548/icon-13_m4sdah.svg",
  21: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239547/icon-11_bjtr7z.svg",
  22: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239547/icon-10_o3d50j.svg",
  23: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239547/icon-12_fsog96.svg",
  24: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239547/icon-07_vskrqh.svg",
  25: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239547/icon-09_pbchi7.svg",
  26: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239547/icon-08_ahvjp2.svg",
  27: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239546/icon-06_xx4but.svg",
  28: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239546/icon-05_eam7we.svg",
  29: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239546/icon-04_rjraxq.svg",
  30: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239545/icon-02_djnlq6.svg",
  31: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239545/icon-03_erqrpa.svg",
  32: "https://res.cloudinary.com/dmornfz49/image/upload/v1780239545/icon-01_nbkswr.svg",
};

const createCloudinaryIllustration = (src: string, id: string) => {
  return function Illustration() {
    return <img src={src} alt={id} loading="lazy" decoding="async" draggable={false} />;
  };
};
type IllustrationItem = {
  id: string;
  Component: ComponentType;
};

const BASE_SPEED = 42;
const HOVER_SLOW_SPEED = 12;
const MAX_ABS_VELOCITY = 2400;
const DRAG_START_THRESHOLD_MOUSE_PX = 6;
const DRAG_START_THRESHOLD_TOUCH_PX = 2;
const BLINK_SEQUENCE_SINGLE = [0, 1, 2, 1, 0] as const;
const BLINK_SEQUENCE_DOUBLE = [0, 1, 2, 1, 0, 1, 2, 1, 0] as const;
const BLINK_TIMINGS_MS = [0, 120, 185, 250, 330, 410, 475, 540, 620] as const;
const BLINK_DOUBLE_PROBABILITY = 0.32;
const BLINK_NEXT_DELAY_MIN_MS = 2600;
const BLINK_NEXT_DELAY_RANGE_MS = 2800;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getDragStartThreshold(pointerType: string): number {
  return pointerType === "mouse" ? DRAG_START_THRESHOLD_MOUSE_PX : DRAG_START_THRESHOLD_TOUCH_PX;
}

function applyTrackTransform(track: HTMLDivElement | null, offset: number): void {
  if (!track) {
    return;
  }

  track.style.transform = `translate3d(${-offset}px, 0, 0)`;
}

const HOVER_CURSOR_DATA_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="56" viewBox="0 0 96 56" fill="none">
  <path d="M64 48V56H32V48H64Z" fill="white"/>
  <path d="M32 48H16V40H32V48Z" fill="white"/>
  <path d="M80 48H64V40H80V48Z" fill="white"/>
  <path d="M16 40H8V32H16V40Z" fill="white"/>
  <path d="M88 40H80V32H88V40Z" fill="white"/>
  <path d="M56 36H40V20H56V36Z" fill="white"/>
  <path d="M8 32H0V24H8V32Z" fill="white"/>
  <path d="M96 32H88V24H96V32Z" fill="white"/>
  <path d="M16 24H8V16H16V24Z" fill="white"/>
  <path d="M88 24H80V16H88V24Z" fill="white"/>
  <path d="M32 16H16V8H32V16Z" fill="white"/>
  <path d="M80 16H64V8H80V16Z" fill="white"/>
  <path d="M64 8H32V0H64V8Z" fill="white"/>
</svg>`)}`;

const HOVER_CURSOR_BLINK_MID_DATA_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="24" viewBox="0 0 96 24" fill="none">
  <path d="M80 8H56V16H80V24H16V16H40V8H16V0H80V8Z" fill="white"/>
  <path d="M16 16H0V8H16V16Z" fill="white"/>
  <path d="M96 8V16H80V8H96Z" fill="white"/>
</svg>`)}`;

const HOVER_CURSOR_BLINK_CLOSED_DATA_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="8" viewBox="0 0 96 8" fill="none">
  <path d="M96 0V8H0V0H96Z" fill="white"/>
</svg>`)}`;

const HOVER_CURSOR_FRAMES = [
  {
    src: HOVER_CURSOR_DATA_URI,
    width: 96,
    height: 56,
    hotX: 48,
    hotY: 28,
  },
  {
    src: HOVER_CURSOR_BLINK_MID_DATA_URI,
    width: 96,
    height: 24,
    hotX: 48,
    hotY: 12,
  },
  {
    src: HOVER_CURSOR_BLINK_CLOSED_DATA_URI,
    width: 96,
    height: 8,
    hotX: 48,
    hotY: 4,
  },
] as const;

const ITEMS: IllustrationItem[] = Array.from({ length: Object.keys(CLOUDINARY_ILLUSTRATION_URLS).length }, (_, index) => {
  const number = index + 1;
  const padded = String(number).padStart(2, "0");
  const id = `icon-${padded}`;
  return {
    id,
    Component: createCloudinaryIllustration(CLOUDINARY_ILLUSTRATION_URLS[number], id),
  };
});

function Lightbox({
  items,
  currentIndex,
  onClose,
  onNavigate,
}: {
  items: IllustrationItem[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  const [isUiActive, setIsUiActive] = useState(true);
  const [isKeyboardInputActive, setIsKeyboardInputActive] = useState(false);
  const lightboxStageRef = useRef<HTMLDivElement | null>(null);
  const uiIdleTimerRef = useRef<number | null>(null);
  const indicatorAnimationTimerRef = useRef<number | null>(null);
  const indicatorCollapseTimerRef = useRef<number | null>(null);
  const indicatorCollapseTimerIdsRef = useRef<number[]>([]);
  const previousIndexRef = useRef<number | null>(null);
  const [indicatorCellGlyphs, setIndicatorCellGlyphs] = useState<string[]>([]);
  const [indicatorAnimatingIndex, setIndicatorAnimatingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (currentIndex === null) return;

    const clearUiIdleTimer = () => {
      if (uiIdleTimerRef.current !== null) {
        window.clearTimeout(uiIdleTimerRef.current);
        uiIdleTimerRef.current = null;
      }
    };

    const markUiActive = () => {
      setIsUiActive(true);
      clearUiIdleTimer();
      uiIdleTimerRef.current = window.setTimeout(() => {
        setIsUiActive(false);
      }, 1350);
    };

    const markPointerInput = () => {
      setIsKeyboardInputActive(false);
      markUiActive();
    };

    const handleEscape = (e: KeyboardEvent) => {
      setIsKeyboardInputActive(true);
      markUiActive();

      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "ArrowLeft") {
        const nextIndex = (currentIndex - 1 + items.length) % items.length;
        onNavigate(nextIndex);
        return;
      }

      if (e.key === "ArrowRight") {
        const nextIndex = (currentIndex + 1) % items.length;
        onNavigate(nextIndex);
      }
    };

    document.addEventListener("keydown", handleEscape);
    window.addEventListener("pointermove", markPointerInput, { passive: true });
    window.addEventListener("touchstart", markPointerInput, { passive: true });

    markUiActive();
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("pointermove", markPointerInput);
      window.removeEventListener("touchstart", markPointerInput);
      clearUiIdleTimer();
      document.body.style.overflow = "";
    };
  }, [currentIndex, items.length, onClose, onNavigate]);

  useLayoutEffect(() => {
    if (currentIndex === null || !lightboxStageRef.current) {
      return;
    }

    const stage = lightboxStageRef.current;
    let resizeFrame = 0;

    const updateGridSizing = () => {
      const bounds = stage.getBoundingClientRect();
      const squareSide = Math.max(24, Math.floor(Math.min(bounds.width, bounds.height) / 24) * 24);
      const cell = squareSide / 24;
      stage.style.setProperty("--lb-grid-cell", `${cell}px`);
      stage.style.setProperty("--lb-artwork-size", `${squareSide}px`);
      stage.style.setProperty("--lb-grid-x", `${bounds.width / 2}px`);
      stage.style.setProperty("--lb-grid-y", `${bounds.height / 2}px`);
      stage.style.setProperty("--lb-grid-offset-x", `${(bounds.width - squareSide) / 2}px`);
      stage.style.setProperty("--lb-grid-offset-y", `${(bounds.height - squareSide) / 2}px`);
    };

    updateGridSizing();
    resizeFrame = window.requestAnimationFrame(() => {
      updateGridSizing();
      window.requestAnimationFrame(updateGridSizing);
    });

    const observer = new ResizeObserver(updateGridSizing);
    observer.observe(stage);
    window.addEventListener("resize", updateGridSizing);
    window.addEventListener("orientationchange", updateGridSizing);

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      window.removeEventListener("resize", updateGridSizing);
      window.removeEventListener("orientationchange", updateGridSizing);
    };
  }, [currentIndex]);

  const clearIndicatorTimers = () => {
    if (indicatorAnimationTimerRef.current !== null) {
      window.clearTimeout(indicatorAnimationTimerRef.current);
      indicatorAnimationTimerRef.current = null;
    }

    indicatorCollapseTimerIdsRef.current.forEach((timerId: number) => {
      window.clearTimeout(timerId);
    });
    indicatorCollapseTimerIdsRef.current = [];

    if (indicatorCollapseTimerRef.current !== null) {
      window.clearTimeout(indicatorCollapseTimerRef.current);
      indicatorCollapseTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (currentIndex === null) {
      clearIndicatorTimers();
      setIndicatorAnimatingIndex(null);
      setIndicatorCellGlyphs(Array.from({ length: items.length }, () => "▁"));
      previousIndexRef.current = null;
      return;
    }

    const previousIndex = previousIndexRef.current;
    previousIndexRef.current = currentIndex;

    clearIndicatorTimers();

    const sequence = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "▆", "▇"] as const;
    const reverseSequence = ["▇", "▆", "▅", "▄", "▃", "▂", "▁", "▂", "▁"] as const;
    const progressFilled = Math.max(1, Math.min(items.length, currentIndex + 1));
    const shouldResetOnWrap = previousIndex === items.length - 1 && currentIndex === 0;
    const shouldStaggerFillToLast = previousIndex === 0 && currentIndex === items.length - 1;
    const shouldReverseOnLeftBrowse = previousIndex !== null && currentIndex < previousIndex && !shouldResetOnWrap;
    const pulseIndex = progressFilled - 1;

    if (shouldResetOnWrap) {
      setIndicatorCellGlyphs(Array.from({ length: items.length }, () => "▇"));
      setIndicatorAnimatingIndex(null);

      indicatorCollapseTimerRef.current = window.setTimeout(() => {
        const collapseSequence = ["▇", "▆", "▅", "▄", "▃", "▂", "▁"] as const;

        loadingBarNotches.forEach((_, index) => {
          if (index === 0) {
            return;
          }

          collapseSequence.forEach((glyph, frameIndex) => {
            const timerId = window.setTimeout(() => {
              setIndicatorCellGlyphs((currentCells: string[]) => {
                const nextCells = [...currentCells];
                nextCells[index] = glyph;
                return nextCells;
              });
            }, index * 28 + frameIndex * 30);

            indicatorCollapseTimerIdsRef.current.push(timerId);
          });
        });
      }, 180);

      return;
    }

    if (shouldStaggerFillToLast) {
      const fillSequence = ["▁", "▂", "▃", "▄", "▅", "▆", "▇"] as const;
      setIndicatorCellGlyphs(Array.from({ length: items.length }, () => "▁"));
      setIndicatorAnimatingIndex(null);

      for (let reverseIndex = 0; reverseIndex < items.length; reverseIndex += 1) {
        const index = items.length - 1 - reverseIndex;
        fillSequence.forEach((glyph, frameIndex) => {
          const timerId = window.setTimeout(() => {
            setIndicatorAnimatingIndex(index);
            setIndicatorCellGlyphs((currentCells: string[]) => {
              const nextCells = [...currentCells];
              nextCells[index] = glyph;
              return nextCells;
            });

            if (reverseIndex === items.length - 1 && frameIndex === fillSequence.length - 1) {
              setIndicatorAnimatingIndex(null);
            }
          }, reverseIndex * 36 + frameIndex * 28);

          indicatorCollapseTimerIdsRef.current.push(timerId);
        });
      }

      return;
    }

    if (shouldReverseOnLeftBrowse) {
      const drainIndex = previousIndex;
      const startCells = Array.from({ length: items.length }, (_, index) => (index <= currentIndex ? "▇" : "▁"));
      startCells[drainIndex] = reverseSequence[0] ?? "▇";
      setIndicatorCellGlyphs(startCells);
      setIndicatorAnimatingIndex(drainIndex);

      let frameIndex = 0;
      const runReverseFrame = () => {
        setIndicatorCellGlyphs((currentCells: string[]) => {
          const nextCells = [...currentCells];
          nextCells[drainIndex] = reverseSequence[frameIndex] ?? reverseSequence[reverseSequence.length - 1] ?? reverseSequence[0];
          return nextCells;
        });
        frameIndex += 1;

        if (frameIndex < reverseSequence.length) {
          indicatorAnimationTimerRef.current = window.setTimeout(runReverseFrame, frameIndex === 5 ? 58 : 36);
          return;
        }

        indicatorAnimationTimerRef.current = window.setTimeout(() => {
          setIndicatorCellGlyphs((currentCells: string[]) => {
            const nextCells = [...currentCells];
            nextCells[drainIndex] = "▁";
            return nextCells;
          });
          setIndicatorAnimatingIndex(null);
        }, 180);
      };

      runReverseFrame();
      return;
    }

    const startCells = Array.from({ length: items.length }, (_, index) => (index < pulseIndex ? "▇" : "▁"));
    startCells[pulseIndex] = sequence[0] ?? "▁";
    setIndicatorCellGlyphs(startCells);
    setIndicatorAnimatingIndex(pulseIndex);

    let frameIndex = 0;
    const runFrame = () => {
      setIndicatorCellGlyphs((currentCells: string[]) => {
        const nextCells = [...currentCells];
        nextCells[pulseIndex] = sequence[frameIndex] ?? sequence[sequence.length - 1] ?? sequence[0];
        return nextCells;
      });
      frameIndex += 1;

      if (frameIndex < sequence.length) {
        indicatorAnimationTimerRef.current = window.setTimeout(runFrame, frameIndex === 5 ? 58 : 36);
        return;
      }

      indicatorAnimationTimerRef.current = window.setTimeout(() => {
        setIndicatorCellGlyphs((currentCells: string[]) => {
          const nextCells = [...currentCells];
          nextCells[pulseIndex] = "▇";
          return nextCells;
        });
        setIndicatorAnimatingIndex(null);

      }, 180);
    };

    runFrame();
  }, [currentIndex, items.length]);

  if (currentIndex === null) return null;

  const item = items[currentIndex];
  const currentPosition = currentIndex + 1;
  const loadingBarNotches = Array.from({ length: items.length }, (_, index) => {
    return {
      key: `notch-${index + 1}`,
      glyph: indicatorCellGlyphs[index] ?? "▁",
      isCurrent: indicatorAnimatingIndex === index,
    };
  });

  const { Component } = item;

  const goPrevious = () => {
    const nextIndex = (currentIndex - 1 + items.length) % items.length;
    onNavigate(nextIndex);
  };

  const goNext = () => {
    const nextIndex = (currentIndex + 1) % items.length;
    onNavigate(nextIndex);
  };

  const handleLightboxPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const stage = lightboxStageRef.current;
    if (!stage) {
      return;
    }

    const bounds = stage.getBoundingClientRect();
    const x = Math.min(bounds.width, Math.max(0, event.clientX - bounds.left));
    const y = Math.min(bounds.height, Math.max(0, event.clientY - bounds.top));

    stage.style.setProperty("--lb-grid-x", `${x}px`);
    stage.style.setProperty("--lb-grid-y", `${y}px`);
  };

  return (
    <div
      className={`lightbox-overlay ${isUiActive ? "" : "is-ui-idle"} ${isKeyboardInputActive ? "is-keyboard-input" : ""}`}
      onPointerMove={handleLightboxPointerMove}
    >
      <button
        type="button"
        className="lightbox-hit lightbox-hit-left"
        aria-label="Previous illustration"
        onClick={goPrevious}
      >
        <span className="lightbox-hit-arrow" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="56" viewBox="0 0 32 56" fill="none" focusable="false">
            <path d="M24 56H32V48H24V56Z" fill="white" />
            <path d="M16 48H24V40H16V48Z" fill="white" />
            <path d="M8 40H16V32H8V40Z" fill="white" />
            <path d="M0 32H8V24H0V32Z" fill="white" />
            <path d="M8 24H16V16H8V24Z" fill="white" />
            <path d="M16 16H24V8H16V16Z" fill="white" />
            <path d="M24 8H32V0H24V8Z" fill="white" />
          </svg>
        </span>
      </button>

      <button
        type="button"
        className="lightbox-hit lightbox-hit-center"
        aria-label="Close lightbox"
        onClick={onClose}
      />

      <button
        type="button"
        className="lightbox-hit lightbox-hit-right"
        aria-label="Next illustration"
        onClick={goNext}
      >
        <span className="lightbox-hit-arrow" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="56" viewBox="0 0 32 56" fill="none" focusable="false">
            <path d="M8 56H0V48H8V56Z" fill="white" />
            <path d="M16 48H8V40H16V48Z" fill="white" />
            <path d="M24 40H16V32H24V40Z" fill="white" />
            <path d="M32 32H24V24H32V32Z" fill="white" />
            <path d="M24 24H16V16H24V24Z" fill="white" />
            <path d="M16 16H8V8H16V16Z" fill="white" />
            <path d="M8 8H0V0H8V8Z" fill="white" />
          </svg>
        </span>
      </button>

      <div
        className="lightbox-content"
      >
        <div className="lightbox-stage" ref={lightboxStageRef}>
          <div className="lightbox-artwork">
            <Component />
          </div>
        </div>
      </div>

      <div className="lightbox-indicator" aria-live="polite" aria-atomic="true">
        <span className="lightbox-indicator-bar" aria-hidden="true">
          {loadingBarNotches.map((notch) => (
            <span
              key={notch.key}
              className={notch.isCurrent ? "lightbox-indicator-notch" : notch.glyph === "▁" ? "lightbox-indicator-bar-notch is-unwatched" : "lightbox-indicator-bar-notch"}
            >
              {notch.glyph}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

function IllustrationCard({ item, isCarouselDragging, onOpen }: { item: IllustrationItem; isCarouselDragging: () => boolean; onOpen: () => void }) {
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const blinkTimerRef = useRef<number | null>(null);
  const positionRafRef = useRef<number | null>(null);
  const currentFrameRef = useRef(0);
  const pointerXRef = useRef(0);
  const pointerYRef = useRef(0);
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const imageShellRef = useRef<HTMLDivElement | null>(null);
  const isImageHoveringRef = useRef(false);
  const isHoveringRef = useRef(false);
  const isPointerDownRef = useRef(false);

  const isEyeCursorEnabled = (): boolean => {
    if (typeof window === "undefined") {
      return true;
    }

    return !window.matchMedia("(max-width: 720px), (hover: none), (pointer: coarse)").matches;
  };

  const syncCursorPositionFromPointer = () => {
    const cursor = cursorRef.current;
    const card = cardRef.current;
    const imageShell = imageShellRef.current;
    if (!cursor || !card || !imageShell) {
      return;
    }

    const cardBounds = card.getBoundingClientRect();
    const relativeX = pointerXRef.current - cardBounds.left;
    const relativeY = pointerYRef.current - cardBounds.top;

    const imageBounds = imageShell.getBoundingClientRect();
    const imageRelativeX = pointerXRef.current - imageBounds.left;
    const imageRelativeY = pointerYRef.current - imageBounds.top;
    const frame = HOVER_CURSOR_FRAMES[currentFrameRef.current] ?? HOVER_CURSOR_FRAMES[0];

    cursor.style.left = `${relativeX - frame.hotX}px`;
    cursor.style.top = `${relativeY - frame.hotY}px`;
    card.style.setProperty("--glint-x", `${imageRelativeX}px`);
    card.style.setProperty("--glint-y", `${imageRelativeY}px`);
  };

  const applyCursorFrame = (frameIndex: number) => {
    const cursor = cursorRef.current;
    const frame = HOVER_CURSOR_FRAMES[frameIndex];
    if (!cursor || !frame) {
      return;
    }

    currentFrameRef.current = frameIndex;
    cursor.style.width = `${frame.width}px`;
    cursor.style.height = `${frame.height}px`;
    cursor.style.marginLeft = "0px";
    cursor.style.marginTop = "0px";
    cursor.style.backgroundImage = `url("${frame.src}")`;

    if (isImageHoveringRef.current) {
      syncCursorPositionFromPointer();
    }
  };

  const stopBlink = () => {
    if (blinkTimerRef.current !== null) {
      window.clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = null;
    }
  };

  const setPressedVisualState = (pressed: boolean) => {
    isPointerDownRef.current = pressed;
    const card = cardRef.current;
    if (!card) {
      return;
    }

    if (pressed) {
      card.classList.add("is-pointer-down");
    } else {
      card.classList.remove("is-pointer-down");
    }
  };

  const stopCursorTracking = () => {
    if (positionRafRef.current !== null) {
      window.cancelAnimationFrame(positionRafRef.current);
      positionRafRef.current = null;
    }
  };

  const startBlink = () => {
    stopBlink();

    const sequence = Math.random() < BLINK_DOUBLE_PROBABILITY
      ? BLINK_SEQUENCE_DOUBLE
      : BLINK_SEQUENCE_SINGLE;

    const step = (index: number) => {
      if (!isHoveringRef.current || isCarouselDragging()) {
        return;
      }

      applyCursorFrame(sequence[index]);

      if (index < sequence.length - 1) {
        blinkTimerRef.current = window.setTimeout(() => step(index + 1), BLINK_TIMINGS_MS[index + 1] - BLINK_TIMINGS_MS[index]);
      } else {
        const nextBlinkDelay = BLINK_NEXT_DELAY_MIN_MS + Math.random() * BLINK_NEXT_DELAY_RANGE_MS;
        blinkTimerRef.current = window.setTimeout(() => {
          if (isHoveringRef.current && !isCarouselDragging()) {
            startBlink();
          }
        }, nextBlinkDelay);
      }
    };

    step(0);
  };

  const syncCursorPosition = (event: { clientX: number; clientY: number; currentTarget: EventTarget | null }) => {
    pointerXRef.current = event.clientX;
    pointerYRef.current = event.clientY;
    syncCursorPositionFromPointer();
  };

  const startCursorTracking = () => {
    stopCursorTracking();

    const tick = () => {
      if (!isHoveringRef.current || isCarouselDragging()) {
        isImageHoveringRef.current = false;
        positionRafRef.current = null;
        return;
      }

      const cursor = cursorRef.current;
      const card = cardRef.current;
      const imageShell = imageShellRef.current;
      if (cursor && card && imageShell && isImageHoveringRef.current) {
        syncCursorPositionFromPointer();
      }

      positionRafRef.current = window.requestAnimationFrame(tick);
    };

    positionRafRef.current = window.requestAnimationFrame(tick);
  };

  useEffect(() => {
    const handlePointerUp = (event: PointerEvent) => {
      if (!isPointerDownRef.current) {
        return;
      }

      if (isCarouselDragging()) {
        isImageHoveringRef.current = false;
        setPressedVisualState(false);
        stopBlink();
        stopCursorTracking();
        return;
      }

      pointerXRef.current = event.clientX;
      pointerYRef.current = event.clientY;

      setPressedVisualState(false);

      const imageShell = imageShellRef.current;
      const imageBounds = imageShell?.getBoundingClientRect();
      const isStillInsideImage = !!imageBounds &&
        event.clientX >= imageBounds.left &&
        event.clientX <= imageBounds.right &&
        event.clientY >= imageBounds.top &&
        event.clientY <= imageBounds.bottom;

      isImageHoveringRef.current = isStillInsideImage;

      if (isImageHoveringRef.current && isHoveringRef.current) {
        syncCursorPositionFromPointer();
        applyCursorFrame(0);
        startBlink();
        startCursorTracking();
      } else {
        stopBlink();
        stopCursorTracking();
      }
    };

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  const handleClick = () => {
    if (!isCarouselDragging()) {
      onOpen();
    }
  };

  const { Component } = item;

  return (
    <button
      ref={cardRef}
      className="portfolio-card"
      aria-label={`View ${item.id}`}
      onClick={handleClick}
      onPointerEnter={() => {
        isHoveringRef.current = true;
      }}
      onPointerLeave={() => {
        isHoveringRef.current = false;
        stopBlink();
        stopCursorTracking();
        isImageHoveringRef.current = false;
        setPressedVisualState(false);
      }}
    >
      <div
        ref={imageShellRef}
        className="portfolio-image-shell"
        onPointerDown={(event) => {
          if (!isEyeCursorEnabled() || isCarouselDragging() || event.pointerType !== "mouse" || event.button !== 0) {
            return;
          }

          syncCursorPosition(event);
          setPressedVisualState(true);
          stopBlink();
          stopCursorTracking();
        }}
        onPointerEnter={(event) => {
          if (!isEyeCursorEnabled() || isCarouselDragging() || event.pointerType !== "mouse") {
            return;
          }

          isImageHoveringRef.current = true;
          syncCursorPosition(event);
          applyCursorFrame(0);
          startBlink();
          startCursorTracking();
        }}
        onPointerMove={(event) => {
          if (!isEyeCursorEnabled() || isCarouselDragging() || event.pointerType !== "mouse") {
            return;
          }

          syncCursorPosition(event);
        }}
        onPointerLeave={() => {
          if (isPointerDownRef.current) {
            return;
          }

          isImageHoveringRef.current = false;
          setPressedVisualState(false);
          stopBlink();
          stopCursorTracking();
        }}
      >
        <div className="portfolio-image">
          <Component />
        </div>
      </div>
      <span aria-hidden="true" className="portfolio-card-cursor" ref={cursorRef} />
    </button>
  );
}

export default function GriegConnectCarousel() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const firstSetRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const setWidthRef = useRef(0);
  const velocityRef = useRef(BASE_SPEED);
  const isHoveringRef = useRef(false);
  const isDraggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const pointerStartXRef = useRef(0);
  const lastPointerXRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const suppressClickUntilRef = useRef(0);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const doubledItems = useMemo(() => [...ITEMS, ...ITEMS], []);

  useEffect(() => {
    const measure = () => {
      setWidthRef.current = firstSetRef.current?.offsetWidth ?? 0;
    };

    measure();

    const observer = new ResizeObserver(measure);
    if (firstSetRef.current) {
      observer.observe(firstSetRef.current);
    }

    const wrapOffset = (value: number) => {
      const width = setWidthRef.current;
      if (width <= 0) {
        return value;
      }

      let wrapped = value % width;
      if (wrapped < 0) {
        wrapped += width;
      }
      return wrapped;
    };

    const viewport = viewportRef.current;

    const onPointerDown = (event: PointerEvent) => {
      if (!viewport) {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      suppressClickUntilRef.current = 0;
      pointerIdRef.current = event.pointerId;
      pointerStartXRef.current = event.clientX;
      dragDistanceRef.current = 0;
      lastPointerXRef.current = event.clientX;
      lastPointerTimeRef.current = performance.now();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      const dragStartThreshold = getDragStartThreshold(event.pointerType);

      if (!isDraggingRef.current) {
        const moved = Math.abs(event.clientX - pointerStartXRef.current);
        if (moved < dragStartThreshold) {
          return;
        }

        isDraggingRef.current = true;
        velocityRef.current = 0;
        sectionRef.current?.classList.add("is-carousel-dragging");
        if (viewport && !viewport.hasPointerCapture(event.pointerId)) {
          viewport.setPointerCapture(event.pointerId);
        }
      }

      const now = performance.now();
      const dx = event.clientX - lastPointerXRef.current;
      const dtMs = Math.max(8, now - lastPointerTimeRef.current);
      const dt = dtMs / 1000;

      dragDistanceRef.current += Math.abs(dx);
      offsetRef.current = wrapOffset(offsetRef.current - dx);
      applyTrackTransform(trackRef.current, offsetRef.current);
      const instantaneousVelocity = -dx / dt;
      velocityRef.current = clamp(
        velocityRef.current * 0.58 + instantaneousVelocity * 0.42,
        -MAX_ABS_VELOCITY,
        MAX_ABS_VELOCITY
      );

      lastPointerXRef.current = event.clientX;
      lastPointerTimeRef.current = now;
    };

    const onWheel = (event: WheelEvent) => {
      const width = setWidthRef.current;
      if (width <= 0) {
        return;
      }

      if (event.ctrlKey) {
        return;
      }

      const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.15 || event.shiftKey;
      if (!horizontalIntent) {
        return;
      }

      const wheelDelta = event.shiftKey && Math.abs(event.deltaX) < 0.01 ? event.deltaY : event.deltaX;
      if (Math.abs(wheelDelta) < 0.1) {
        return;
      }

      event.preventDefault();
      offsetRef.current = wrapOffset(offsetRef.current + wheelDelta * 0.95);
      velocityRef.current = clamp(wheelDelta * 1.45, -MAX_ABS_VELOCITY, MAX_ABS_VELOCITY);
    };

    const endDrag = (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      if (isDraggingRef.current && viewport && viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }

      const dragEndThreshold = getDragStartThreshold(event.pointerType);

      if (isDraggingRef.current && dragDistanceRef.current > dragEndThreshold) {
        suppressClickUntilRef.current = performance.now() + 220;
      }

      if (isDraggingRef.current) {
        const releaseTarget = isHoveringRef.current ? HOVER_SLOW_SPEED : BASE_SPEED;
        velocityRef.current = clamp(
          velocityRef.current * 0.52 + releaseTarget * 0.48,
          -920,
          920
        );
      }

      isDraggingRef.current = false;
      pointerIdRef.current = null;
      sectionRef.current?.classList.remove("is-carousel-dragging");
    };

    const onMouseEnter = () => {
      isHoveringRef.current = true;
    };

    const onMouseLeave = () => {
      isHoveringRef.current = false;
    };

    if (viewport) {
      viewport.addEventListener("pointerdown", onPointerDown);
      viewport.addEventListener("pointermove", onPointerMove);
      viewport.addEventListener("pointerup", endDrag);
      viewport.addEventListener("pointercancel", endDrag);
      viewport.addEventListener("mouseenter", onMouseEnter);
      viewport.addEventListener("mouseleave", onMouseLeave);
      viewport.addEventListener("wheel", onWheel, { passive: false });
    }

    let rafId = 0;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const targetSpeed = isHoveringRef.current ? HOVER_SLOW_SPEED : BASE_SPEED;
      if (!isDraggingRef.current) {
        const damping = Math.exp(-dt * 1.6);
        velocityRef.current = clamp(
          velocityRef.current * damping + targetSpeed * (1 - damping),
          -MAX_ABS_VELOCITY,
          MAX_ABS_VELOCITY
        );
      }

      const width = setWidthRef.current;
      if (trackRef.current && width > 0) {
        if (!isDraggingRef.current) {
          offsetRef.current = wrapOffset(offsetRef.current + velocityRef.current * dt);
        }

        applyTrackTransform(trackRef.current, offsetRef.current);
      }

      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      sectionRef.current?.classList.remove("is-carousel-dragging");

      if (viewport) {
        viewport.removeEventListener("pointerdown", onPointerDown);
        viewport.removeEventListener("pointermove", onPointerMove);
        viewport.removeEventListener("pointerup", endDrag);
        viewport.removeEventListener("pointercancel", endDrag);
        viewport.removeEventListener("mouseenter", onMouseEnter);
        viewport.removeEventListener("mouseleave", onMouseLeave);
        viewport.removeEventListener("wheel", onWheel);
      }
    };
  }, []);

  return (
    <>
      <section ref={sectionRef} className="portfolio-carousel-section" aria-label="Grieg Connect Illustrations">
        <style>{`
          .portfolio-carousel-section {
            position: relative;
            --section-vpad: 96px;
            --card-size: 192px;
            width: 100%;
            height: 100%;
            overflow: visible;
            padding: var(--section-vpad) 0;
            min-height: calc(var(--card-size) + (var(--section-vpad) * 2));
            box-sizing: border-box;
            display: flex;
            align-items: center;
            background: radial-gradient(120% 92% at 50% 50%, #161616 0%, #0a0a0a 52%, #040404 100%);
          }

          .portfolio-carousel-section::before {
            content: "";
            position: absolute;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.24' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.95'/%3E%3C/svg%3E");
            background-size: 280px 280px;
            background-repeat: repeat;
            mix-blend-mode: soft-light;
            opacity: 0.085;
            animation: carouselNoiseShift 520ms steps(2, end) infinite;
          }

          @keyframes carouselNoiseShift {
            0% {
              transform: translate3d(0, 0, 0);
            }
            25% {
              transform: translate3d(-1.5%, 1%, 0);
            }
            50% {
              transform: translate3d(1%, -1%, 0);
            }
            75% {
              transform: translate3d(-1%, -0.6%, 0);
            }
            100% {
              transform: translate3d(0.6%, 1.2%, 0);
            }
          }

          .portfolio-carousel-mask {
            pointer-events: none;
            position: absolute;
            inset: 0;
            z-index: 2;
            background: linear-gradient(90deg, #050505 0%, rgba(5, 5, 5, 0) 8%, rgba(5, 5, 5, 0) 92%, #050505 100%);
          }

          .portfolio-track {
            position: relative;
            z-index: 1;
            display: flex;
            width: max-content;
            will-change: transform;
            gap: clamp(36px, 5.2vw, 80px);
            padding: 0 clamp(16px, 4vw, 48px);
          }

          .portfolio-viewport {
            width: 100%;
            overflow: visible;
            touch-action: pan-y;
            user-select: none;
            -webkit-user-select: none;
          }

          .portfolio-set {
            display: flex;
            gap: clamp(36px, 5.2vw, 80px);
          }

          .portfolio-card {
            position: relative;
            --glint-x: 50%;
            --glint-y: 30%;
            width: 192px;
            height: 192px;
            flex: 0 0 auto;
            cursor: pointer;
            user-select: none;
            -webkit-user-select: none;
            background: none;
            border: none;
            padding: 0;
            display: block;
          }

          .portfolio-image-shell {
            cursor: none;
            width: 100%;
            height: 100%;
            --icon-native-grid: 24;
          }

          .portfolio-card-cursor {
            position: absolute;
            left: 0;
            top: 0;
            z-index: 3;
            pointer-events: none;
            display: block;
            background-repeat: no-repeat;
            background-position: center;
            background-size: contain;
            opacity: 0;
            transform: translate3d(0, 0, 0);
            transition: opacity 120ms ease;
            will-change: left, top, width, height, margin-left, margin-top, background-image;
          }

          .portfolio-image-shell:hover ~ .portfolio-card-cursor,
          .portfolio-image-shell:active ~ .portfolio-card-cursor,
          .portfolio-image-shell:focus-visible ~ .portfolio-card-cursor {
            opacity: 1;
          }

          .portfolio-card.is-pointer-down .portfolio-card-cursor {
            opacity: 0 !important;
          }

          .portfolio-carousel-section.is-carousel-dragging .portfolio-card-cursor {
            opacity: 0 !important;
          }

          .portfolio-carousel-section.is-carousel-dragging .portfolio-viewport,
          .portfolio-carousel-section.is-carousel-dragging .portfolio-card,
          .portfolio-carousel-section.is-carousel-dragging .portfolio-image-shell {
            cursor: grabbing !important;
          }

          .portfolio-carousel-section.is-carousel-dragging .portfolio-image-shell,
          .portfolio-carousel-section.is-carousel-dragging .portfolio-image,
          .portfolio-carousel-section.is-carousel-dragging .portfolio-image-shell::after {
            transition: none !important;
          }

          .portfolio-image-shell {
            position: relative;
            overflow: hidden;
            background: transparent;
            box-shadow: none;
            transition: none;
            border-radius: 8px;
          }

          .portfolio-image-shell::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background-image:
              linear-gradient(to right, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 1px, transparent 1px);
            background-size:
              calc(100% / var(--icon-native-grid)) calc(100% / var(--icon-native-grid)),
              calc(100% / var(--icon-native-grid)) calc(100% / var(--icon-native-grid));
            background-position: 0 0, 0 0;
            -webkit-mask-image: radial-gradient(
              150% 120% at var(--glint-x, 50%) var(--glint-y, 50%),
              rgba(0, 0, 0, 0.94) 0%,
              rgba(0, 0, 0, 0.72) 34%,
              rgba(0, 0, 0, 0.24) 68%,
              transparent 100%
            );
            mask-image: radial-gradient(
              150% 120% at var(--glint-x, 50%) var(--glint-y, 50%),
              rgba(0, 0, 0, 0.94) 0%,
              rgba(0, 0, 0, 0.72) 34%,
              rgba(0, 0, 0, 0.24) 68%,
              transparent 100%
            );
            opacity: 0;
            transform: scale(1);
            transform-origin: center;
            mix-blend-mode: screen;
            transition: opacity 220ms ease, transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
            z-index: 1;
          }

          .portfolio-image-shell::after {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background:
              radial-gradient(
                120% 96% at var(--glint-x) var(--glint-y),
                rgba(255, 255, 255, 0.2) 0%,
                rgba(255, 255, 255, 0.1) 32%,
                rgba(255, 255, 255, 0.03) 52%,
                rgba(255, 255, 255, 0) 74%
              ),
              radial-gradient(
                170% 120% at 50% 8%,
                rgba(255, 255, 255, 0.16) 0%,
                rgba(255, 255, 255, 0.06) 34%,
                rgba(255, 255, 255, 0) 72%
              ),
              linear-gradient(
                160deg,
                rgba(255, 255, 255, 0.08) 0%,
                rgba(255, 255, 255, 0.02) 34%,
                rgba(255, 255, 255, 0) 58%
              );
            opacity: 0;
            transition: opacity 220ms ease;
            display: block;
          }

          .portfolio-image {
            display: block;
            width: 100%;
            height: 100%;
            filter: grayscale(1) saturate(0) brightness(0.68) contrast(1.05);
            transition: filter 220ms ease;
          }

          .portfolio-image svg,
          .portfolio-image > * {
            width: 100%;
            height: 100%;
            display: block;
          }

          .portfolio-image-shell:hover .portfolio-image,
          .portfolio-image-shell:active .portfolio-image,
          .portfolio-image-shell:focus-visible .portfolio-image {
            filter: grayscale(1) saturate(0) brightness(1.45) contrast(1.08);
          }

          .portfolio-image-shell:hover::before,
          .portfolio-image-shell:active::before,
          .portfolio-image-shell:focus-visible::before {
            opacity: 0.28;
            transform: scale(1.03);
          }

          .portfolio-image-shell:hover,
          .portfolio-image-shell:active,
          .portfolio-image-shell:focus-visible {
            background: transparent;
          }

          .portfolio-image-shell:hover,
          .portfolio-image-shell:focus-visible {
            box-shadow: none;
          }

          .portfolio-image-shell:hover::after,
          .portfolio-image-shell:active::after,
          .portfolio-image-shell:focus-visible::after {
            opacity: 0.78;
          }

          .portfolio-card:focus-visible {
            outline: 2px solid rgba(255, 255, 255, 0.9);
            outline-offset: 6px;
          }

          /* Lightbox Styles */
          .lightbox-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background:
              radial-gradient(120% 92% at 50% 50%, rgba(20, 20, 20, 0.54), rgba(6, 6, 6, 0.78));
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            backdrop-filter: blur(12px) saturate(1.08);
            -webkit-backdrop-filter: blur(12px) saturate(1.08);
            isolation: isolate;
            transform: translateZ(0);
            will-change: opacity;
            animation: fadeIn 200ms ease;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }



          .lightbox-content {
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: lightboxContentFadeIn 180ms ease;
            position: relative;
            z-index: 1;
            pointer-events: none;
          }

          .lightbox-stage {
            --lb-grid-x: 50%;
            --lb-grid-y: 50%;
            --lb-grid-offset-x: 0px;
            --lb-grid-offset-y: 0px;
            --lb-grid-cell: 8px;
            --lb-artwork-size: min(92vw, 92vh);
            width: 100%;
            height: 100%;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .lightbox-stage::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background-image:
              linear-gradient(to right, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 1px, transparent 1px);
            background-size:
              var(--lb-grid-cell) var(--lb-grid-cell),
              var(--lb-grid-cell) var(--lb-grid-cell);
            background-position:
              var(--lb-grid-offset-x) var(--lb-grid-offset-y),
              var(--lb-grid-offset-x) var(--lb-grid-offset-y);
            -webkit-mask-image: radial-gradient(
              135% 120% at var(--lb-grid-x, 50%) var(--lb-grid-y, 50%),
              rgba(0, 0, 0, 0.96) 0%,
              rgba(0, 0, 0, 0.72) 34%,
              rgba(0, 0, 0, 0.2) 72%,
              transparent 100%
            );
            mask-image: radial-gradient(
              135% 120% at var(--lb-grid-x, 50%) var(--lb-grid-y, 50%),
              rgba(0, 0, 0, 0.96) 0%,
              rgba(0, 0, 0, 0.72) 34%,
              rgba(0, 0, 0, 0.2) 72%,
              transparent 100%
            );
            opacity: 0.34;
            mix-blend-mode: screen;
            z-index: 2;
          }

          .lightbox-artwork {
            position: relative;
            width: var(--lb-artwork-size);
            height: var(--lb-artwork-size);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1;
            image-rendering: pixelated;
          }

          .lightbox-artwork svg,
          .lightbox-artwork > * {
            width: 100%;
            height: 100%;
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            display: block;
            pointer-events: none;
            image-rendering: pixelated;
          }

          @keyframes lightboxContentFadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .lightbox-stage svg {
            width: 100%;
            height: 100%;
            max-width: 100vw;
            max-height: 100vh;
            object-fit: contain;
            display: block;
            pointer-events: none;
          }

          .lightbox-hit {
            position: absolute;
            top: 0;
            bottom: 0;
            background: none;
            border: none;
            padding: 0;
            margin: 0;
            cursor: pointer;
            z-index: 2;
            display: flex;
            align-items: center;
            transition: background-color 220ms cubic-bezier(0.22, 1, 0.36, 1);
          }

          .lightbox-hit:focus,
          .lightbox-hit:focus-visible {
            outline: none;
          }

          .lightbox-hit-left {
            left: 0;
            width: 25vw;
            justify-content: flex-start;
            padding-left: clamp(12px, 2vw, 26px);
          }

          .lightbox-hit-center {
            left: 25vw;
            width: 50vw;
            justify-content: center;
          }

          .lightbox-hit-right {
            right: 0;
            width: 25vw;
            justify-content: flex-end;
            padding-right: clamp(12px, 2vw, 26px);
          }

          .lightbox-indicator {
            position: absolute;
            left: 50%;
            bottom: clamp(14px, 2.2vh, 28px);
            transform: translateX(-50%);
            z-index: 3;
            pointer-events: none;
            font-family: "JetBrains Mono", "JetBrainsMono", "SFMono-Regular", "SF Mono", Menlo, Consolas, monospace;
            font-size: 10.5pt;
            font-weight: 300;
            letter-spacing: 0.14em;
            white-space: nowrap;
            color: rgba(236, 242, 255, 0.86);
            text-shadow:
              0 0 10px rgba(148, 220, 255, 0.22),
              0 0 22px rgba(148, 220, 255, 0.14);
            opacity: 0.82;
            transition:
              opacity 440ms cubic-bezier(0.16, 1, 0.3, 1),
              text-shadow 440ms cubic-bezier(0.16, 1, 0.3, 1),
              transform 440ms cubic-bezier(0.16, 1, 0.3, 1);
          }

          .lightbox-overlay.is-ui-idle .lightbox-indicator {
            opacity: 0.34;
          }

          .lightbox-indicator-label,
          .lightbox-indicator-separator,
          .lightbox-indicator-glyph,
          .lightbox-indicator-bar {
            font-variant-numeric: tabular-nums;
          }

          .lightbox-indicator-label {
            font-size: 0.78em;
            opacity: 0.84;
          }

          .lightbox-indicator-number {
            font-size: 0.82em;
          }

          .lightbox-indicator-separator,
          .lightbox-indicator-glyph {
            opacity: 0.66;
          }

          .lightbox-indicator-bar {
            display: inline-block;
            letter-spacing: 0.1em;
            text-shadow: 0 0 8px rgba(148, 220, 255, 0.14);
          }

          .lightbox-indicator-bar-notch {
            display: inline-block;
            opacity: 0.72;
            transition: opacity 300ms cubic-bezier(0.16, 1, 0.3, 1);
          }

          .lightbox-indicator-bar-notch.is-unwatched {
            opacity: 0.54;
          }

          .lightbox-indicator-notch {
            display: inline-block;
            letter-spacing: 0.1em;
            animation: notchPulse 360ms cubic-bezier(0.22, 1, 0.36, 1);
            animation-fill-mode: both;
          }

          @keyframes notchPulse {
            0% {
              opacity: 0.68;
            }
            45% {
              opacity: 1;
            }
            100% {
              opacity: 0.72;
            }
          }

          .lightbox-hit-arrow {
            width: 32px;
            height: 56px;
            opacity: 0.35;
            transform: scale(1);
            transition:
              opacity 420ms cubic-bezier(0.16, 1, 0.3, 1),
              transform 420ms cubic-bezier(0.16, 1, 0.3, 1),
              filter 420ms cubic-bezier(0.16, 1, 0.3, 1);
            filter: drop-shadow(0 0 0 rgba(255, 255, 255, 0));
          }

          .lightbox-overlay.is-ui-idle .lightbox-hit-arrow {
            opacity: 0;
            transform: scale(0.92);
            filter: drop-shadow(0 0 0 rgba(255, 255, 255, 0));
          }

          .lightbox-overlay.is-keyboard-input .lightbox-hit-arrow {
            opacity: 0;
            transform: scale(0.92);
            filter: drop-shadow(0 0 0 rgba(255, 255, 255, 0));
          }

          .lightbox-hit-arrow svg {
            width: 100%;
            height: 100%;
            display: block;
          }

          .lightbox-overlay:not(.is-keyboard-input) .lightbox-hit:hover .lightbox-hit-arrow,
          .lightbox-overlay:not(.is-keyboard-input) .lightbox-hit:focus-visible .lightbox-hit-arrow {
            opacity: 1;
            transform: scale(1.06);
            filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.36));
          }

          .lightbox-hit:active .lightbox-hit-arrow {
            transform: scale(0.95);
          }

          .lightbox-overlay:not(.is-keyboard-input) .lightbox-hit-left:hover .lightbox-hit-arrow,
          .lightbox-overlay:not(.is-keyboard-input) .lightbox-hit-left:focus-visible .lightbox-hit-arrow {
            transform: translateX(-3px) scale(1.06);
          }

          .lightbox-overlay:not(.is-keyboard-input) .lightbox-hit-right:hover .lightbox-hit-arrow,
          .lightbox-overlay:not(.is-keyboard-input) .lightbox-hit-right:focus-visible .lightbox-hit-arrow {
            transform: translateX(3px) scale(1.06);
          }

          @media (max-width: 720px) {
            .portfolio-carousel-section {
              --section-vpad: 96px;
              --card-size: min(37vw, 160px);
              padding: var(--section-vpad) 0;
            }

            .portfolio-card {
              width: min(37vw, 160px);
              height: min(37vw, 160px);
            }

            .portfolio-card-cursor {
              display: none !important;
            }

            .portfolio-image-shell {
              cursor: auto;
              box-shadow: none;
            }

            .portfolio-image {
              filter: grayscale(1) saturate(0) brightness(0.68) contrast(1.05);
            }

            .portfolio-image-shell::after {
              opacity: 0;
            }

            .portfolio-image-shell::before {
              opacity: 0;
            }

            .lightbox-overlay {
              padding: 20px;
            }

            .lightbox-content {
              width: min(96vw, 760px);
              height: min(84vh, 760px);
            }

            .lightbox-indicator {
              bottom: 20px;
              letter-spacing: 0.08em;
              font-size: 10pt;
            }

            .lightbox-hit-left,
            .lightbox-hit-right {
              width: 24vw;
            }

            .lightbox-hit-center {
              left: 24vw;
              width: 52vw;
            }
          }

          @media (hover: none), (pointer: coarse) {
            .portfolio-card-cursor {
              display: none !important;
            }

            .portfolio-image-shell {
              cursor: auto;
              box-shadow: none;
            }

            .portfolio-image {
              filter: grayscale(1) saturate(0) brightness(0.68) contrast(1.05);
            }

            .portfolio-image-shell::after {
              opacity: 0;
            }

            .lightbox-hit-arrow {
              opacity: 0.82;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .portfolio-carousel-section::before {
              animation: none;
              opacity: 0.05;
            }

            .portfolio-track {
              transform: translate3d(0, 0, 0) !important;
            }

            .portfolio-image {
              transition: filter 0s ease;
            }

            .portfolio-image-shell {
              transition: none;
            }

            .portfolio-image-shell::before {
              transition: opacity 0s ease;
              transform: none;
              animation: none;
            }

            .lightbox-stage::before {
              animation: none;
            }

            .lightbox-overlay,
            .lightbox-content {
              animation: none;
            }

            .lightbox-indicator-bar {
              animation: none !important;
            }
          }
        `}</style>

        <div
          ref={viewportRef}
          className="portfolio-viewport"
          onClickCapture={(event) => {
            if (performance.now() < suppressClickUntilRef.current) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <div ref={trackRef} className="portfolio-track">
            <div ref={firstSetRef} className="portfolio-set">
              {ITEMS.map((item) => (
                <IllustrationCard 
                  key={item.id} 
                  item={item} 
                  isCarouselDragging={() => isDraggingRef.current}
                  onOpen={() => setLightboxIndex(ITEMS.indexOf(item))}
                />
              ))}
            </div>

            <div className="portfolio-set" aria-hidden="true">
              {doubledItems.slice(ITEMS.length).map((item, index) => (
                <IllustrationCard 
                  key={`${item.id}-${index}`} 
                  item={item} 
                  isCarouselDragging={() => isDraggingRef.current}
                  onOpen={() => setLightboxIndex(ITEMS.indexOf(item))}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="portfolio-carousel-mask" aria-hidden="true" />
      </section>

      <Lightbox
        items={ITEMS}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}