/**
 * Pure positioning helper for the independent reminder bubble window.
 *
 * Responsibility: calculates a screen-space window rectangle that keeps the
 * bubble near the desktop pet while staying inside the visible display work
 * area. It does not import Electron or mutate native windows.
 * Side effects: none.
 */

export interface RectangleBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const BUBBLE_WINDOW_OVERLAP = 12;

/**
 * Calculates the transparent bubble window rectangle near the visible pet body.
 *
 * @param petBounds Current pet window content bounds in screen coordinates.
 * @param bubbleSize Fixed bubble window size in CSS pixels.
 * @param workArea Visible display work area that the native window must remain within.
 * @returns Screen-space bounds for the native bubble window, clamped to the work area.
 *
 * Errors: does not throw; invalid work-area ranges collapse to the nearest minimum edge.
 * Side effects: none. The vertical overlap intentionally lets the transparent bubble
 * window enter the pet window's transparent area so the visible bubble sits closer
 * to the pet body instead of floating above the outer window edge.
 */
export function calculateBubbleWindowBounds(
  petBounds: RectangleBounds,
  bubbleSize: Pick<RectangleBounds, 'width' | 'height'>,
  workArea: RectangleBounds
): RectangleBounds {
  const width = bubbleSize.width;
  const height = bubbleSize.height;
  const preferredX = petBounds.x + Math.round((petBounds.width - width) / 2);
  const aboveY = petBounds.y - height + BUBBLE_WINDOW_OVERLAP;
  const belowY = petBounds.y + petBounds.height - BUBBLE_WINDOW_OVERLAP;
  const hasRoomAbove = aboveY >= workArea.y;
  const preferredY = hasRoomAbove ? aboveY : belowY;

  return {
    x: clamp(preferredX, workArea.x, workArea.x + workArea.width - width),
    y: clamp(preferredY, workArea.y, workArea.y + workArea.height - height),
    width,
    height
  };
}

/**
 * Constrains a coordinate to an inclusive range.
 *
 * @param value Coordinate candidate to constrain.
 * @param min Lower inclusive bound.
 * @param max Upper inclusive bound.
 * @returns `value` within `[min, max]`, or `min` when the range is inverted.
 *
 * Errors: does not throw.
 * Side effects: none.
 */
function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}
