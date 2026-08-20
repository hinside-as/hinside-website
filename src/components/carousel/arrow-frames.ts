// The hinside "growing arrow" — three frames (short/long/longest) that play
// in sequence to read as a single arrow extending. Used by LogoCarousel's
// own pointer-tracking cursor.

const ARROW_SHORT_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="56" viewBox="0 0 80 56" fill="none">
  <path d="M56 56H48V48H56V56Z" fill="white"/>
  <path d="M64 48H56V40H64V48Z" fill="white"/>
  <path d="M72 24H80V32H72V40H64V32H0V24H64V16H72V24Z" fill="white"/>
  <path d="M64 16H56V8H64V16Z" fill="white"/>
  <path d="M56 8H48V0H56V8Z" fill="white"/>
</svg>`)}`;
const ARROW_LONG_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="88" height="56" viewBox="0 0 88 56" fill="none">
  <path d="M64 56H56V48H64V56Z" fill="white"/>
  <path d="M72 48H64V40H72V48Z" fill="white"/>
  <path d="M80 24H88V32H80V40H72V32H0V24H72V16H80V24Z" fill="white"/>
  <path d="M72 16H64V8H72V16Z" fill="white"/>
  <path d="M64 8H56V0H64V8Z" fill="white"/>
</svg>`)}`;
const ARROW_LONGEST_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="56" viewBox="0 0 96 56" fill="none">
  <path d="M72 56H64V48H72V56Z" fill="white"/>
  <path d="M80 48H72V40H80V48Z" fill="white"/>
  <path d="M88 24H96V32H88V40H80V32H0V24H80V16H88V24Z" fill="white"/>
  <path d="M80 16H72V8H80V16Z" fill="white"/>
  <path d="M72 8H64V0H72V8Z" fill="white"/>
</svg>`)}`;

export const ARROW_FRAMES = [
  { src: ARROW_SHORT_URI, width: 80, height: 56, hotX: 48, hotY: 28 },
  { src: ARROW_LONG_URI, width: 88, height: 56, hotX: 48, hotY: 28 },
  { src: ARROW_LONGEST_URI, width: 96, height: 56, hotX: 48, hotY: 28 },
] as const;

export const ARROW_REMINDER_SEQUENCE = [0, 1, 2, 1, 0, 1, 2, 1, 0] as const;
export const ARROW_REMINDER_TIMINGS_MS = [0, 90, 170, 250, 330, 430, 510, 590, 680] as const;
