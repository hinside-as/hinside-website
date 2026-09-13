/**
 * Shared letter-by-letter reveal rendering for both TypewriterHero (scroll-
 * scrubbed, with its own static leading clause) and CaseStudyExperience's
 * title (time-based, after the page settles) — same span-per-character
 * technique, same six-hue color sweep (see global.css's .tw-letter rules),
 * driven by whatever revealCount the caller computes. Purely presentational
 * char/cursor markup — no scroll/timer logic, no aria-hidden wrapper or
 * visually-hidden fallback of its own, since callers differ on what the
 * accessible text should actually read (TypewriterHero's includes a static
 * prefix ahead of the animated part; CaseStudyExperience's doesn't).
 */
export function TypewriterChars({ text, revealCount }: { text: string; revealCount: number }) {
  const isComplete = revealCount >= text.length;
  return (
    <>
      {Array.from(text).flatMap((char, i) => [
        // The cursor sits as its own sibling exactly at the reveal
        // boundary, not nested inside the (invisible) pending character's
        // span — visibility: hidden is inherited, so a cursor nested inside
        // a pending span would disappear along with it.
        i === revealCount && !isComplete ? (
          <span key={`cursor-${i}`} className="tw-cursor" aria-hidden="true" />
        ) : null,
        // Every character is always in the DOM, not just the ones "typed"
        // so far — only .tw-letter--pending's visibility toggles per
        // character. Reserving each letter's final width up front is what
        // keeps line-wrapping stable as revealCount grows: a word whose
        // letters are still arriving one at a time would otherwise have the
        // browser's line-wrap decision keep being made against a shorter,
        // still-growing word, jumping to the next line mid-reveal once
        // enough of it "fits."
        <span key={i} className={i < revealCount ? "tw-letter" : "tw-letter tw-letter--pending"}>
          {char}
        </span>,
      ])}
    </>
  );
}
