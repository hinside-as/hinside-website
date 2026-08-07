// The hinside "eye" cursor: replaces the system pointer over carousel items
// with a small sprite that tracks the pointer and blinks idly — a signature
// touch carried over from the original site's cursor treatment.

const EYE_OPEN_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="56" viewBox="0 0 96 56" fill="none">
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
const EYE_MID_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="24" viewBox="0 0 96 24" fill="none">
  <path d="M80 8H56V16H80V24H16V16H40V8H16V0H80V8Z" fill="white"/>
  <path d="M16 16H0V8H16V16Z" fill="white"/>
  <path d="M96 8V16H80V8H96Z" fill="white"/>
</svg>`)}`;
const EYE_CLOSED_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="8" viewBox="0 0 96 8" fill="none">
  <path d="M96 0V8H0V0H96Z" fill="white"/>
</svg>`)}`;

export const EYE_CURSOR_FRAMES = [
  { src: EYE_OPEN_URI, width: 96, height: 56, hotX: 48, hotY: 28 },
  { src: EYE_MID_URI, width: 96, height: 24, hotX: 48, hotY: 12 },
  { src: EYE_CLOSED_URI, width: 96, height: 8, hotX: 48, hotY: 4 },
] as const;

export const BLINK_SEQUENCE_SINGLE = [0, 1, 2, 1, 0] as const;
export const BLINK_SEQUENCE_DOUBLE = [0, 1, 2, 1, 0, 1, 2, 1, 0] as const;
export const BLINK_TIMINGS_MS = [0, 120, 185, 250, 330, 410, 475, 540, 620] as const;
export const BLINK_DOUBLE_PROBABILITY = 0.32;
export const BLINK_NEXT_DELAY_MIN_MS = 2600;
export const BLINK_NEXT_DELAY_RANGE_MS = 2800;
