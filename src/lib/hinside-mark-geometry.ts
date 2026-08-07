export const VIEWBOX_WIDTH = 112;
export const VIEWBOX_HEIGHT = 13;

/**
 * Pixel-block geometry for the hinside wordmark, ported from
 * legacy/logo-hinside.tsx. Each slat is a 1-unit-tall horizontal bar:
 * it spans x → x+w and y → y+1 in the viewBox. Verified to exactly match
 * public/media/shared/logo-mark.svg's path geometry — keep both in sync
 * if the mark is ever redrawn.
 */
export const HINSIDE_MARK_SLATS: { x: number; y: number; w: number }[] = [
  { x: 101, y: 12, w: 11 }, { x: 101, y: 10, w: 4 }, { x: 101, y: 8, w: 4 }, { x: 101, y: 6, w: 8 },
  { x: 101, y: 4, w: 4 }, { x: 101, y: 2, w: 4 }, { x: 101, y: 0, w: 11 }, { x: 82, y: 12, w: 10 },
  { x: 90, y: 10, w: 4 }, { x: 82, y: 10, w: 4 }, { x: 92, y: 8, w: 4 }, { x: 82, y: 8, w: 4 },
  { x: 92, y: 6, w: 4 }, { x: 82, y: 6, w: 4 }, { x: 92, y: 4, w: 4 }, { x: 82, y: 4, w: 4 },
  { x: 90, y: 2, w: 4 }, { x: 82, y: 2, w: 4 }, { x: 82, y: 0, w: 10 }, { x: 68, y: 12, w: 8 },
  { x: 70, y: 10, w: 4 }, { x: 70, y: 8, w: 4 }, { x: 70, y: 6, w: 4 }, { x: 70, y: 4, w: 4 },
  { x: 70, y: 2, w: 4 }, { x: 68, y: 0, w: 8 }, { x: 52, y: 12, w: 8 }, { x: 58, y: 10, w: 4 },
  { x: 50, y: 10, w: 5 }, { x: 58, y: 8, w: 4 }, { x: 52, y: 6, w: 8 }, { x: 50, y: 4, w: 4 },
  { x: 58, y: 2, w: 4 }, { x: 50, y: 2, w: 4 }, { x: 52, y: 0, w: 8 }, { x: 40, y: 12, w: 4 },
  { x: 32, y: 12, w: 4 }, { x: 40, y: 10, w: 4 }, { x: 32, y: 10, w: 4 }, { x: 40, y: 8, w: 4 },
  { x: 32, y: 8, w: 4 }, { x: 38, y: 6, w: 6 }, { x: 32, y: 6, w: 4 }, { x: 32, y: 4, w: 12 },
  { x: 40, y: 2, w: 4 }, { x: 32, y: 2, w: 6 }, { x: 40, y: 0, w: 4 }, { x: 32, y: 0, w: 4 },
  { x: 18, y: 12, w: 8 }, { x: 20, y: 10, w: 4 }, { x: 20, y: 8, w: 4 }, { x: 20, y: 6, w: 4 },
  { x: 20, y: 4, w: 4 }, { x: 20, y: 2, w: 4 }, { x: 18, y: 0, w: 8 }, { x: 8, y: 12, w: 4 },
  { x: 0, y: 12, w: 4 }, { x: 8, y: 10, w: 4 }, { x: 0, y: 10, w: 4 }, { x: 8, y: 8, w: 4 },
  { x: 0, y: 8, w: 4 }, { x: 0, y: 6, w: 12 }, { x: 8, y: 4, w: 4 }, { x: 0, y: 4, w: 4 },
  { x: 8, y: 2, w: 4 }, { x: 0, y: 2, w: 4 }, { x: 8, y: 0, w: 4 }, { x: 0, y: 0, w: 4 },
];
