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

const BUBBLE_GAP = 2;

export function calculateBubbleWindowBounds(
  petBounds: RectangleBounds,
  bubbleSize: Pick<RectangleBounds, 'width' | 'height'>,
  workArea: RectangleBounds
): RectangleBounds {
  const width = bubbleSize.width;
  const height = bubbleSize.height;
  const preferredX = petBounds.x + Math.round((petBounds.width - width) / 2);
  const aboveY = petBounds.y - height - BUBBLE_GAP;
  const belowY = petBounds.y + petBounds.height + BUBBLE_GAP;
  const hasRoomAbove = aboveY >= workArea.y;
  const preferredY = hasRoomAbove ? aboveY : belowY;

  return {
    x: clamp(preferredX, workArea.x, workArea.x + workArea.width - width),
    y: clamp(preferredY, workArea.y, workArea.y + workArea.height - height),
    width,
    height
  };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}
