/**
 * Pure Live2D model layout math.
 *
 * Responsibility: converts an unscaled Live2D local bounding box and renderer
 * viewport into a stable Pixi transform. It does not import PixiJS, inspect
 * model assets, or mutate renderer state.
 *
 * Side effects: none.
 * Key dependencies and constraints: callers must pass local, unscaled bounds.
 * Passing `model.width` or `model.height` after scaling would make repeated
 * resize passes compound the scale and push the pet out of frame.
 */

export interface Live2DRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Live2DLayoutInput {
  readonly viewport: Live2DSize;
  readonly localBounds: Live2DRect;
}

export interface Live2DLayout {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface Live2DSize {
  readonly width: number;
  readonly height: number;
}

const WIDTH_FIT_RATIO = 0.92;
const HEIGHT_FIT_RATIO = 0.92;
const BOTTOM_ANCHOR_RATIO = 0.96;

/**
 * Calculates a stable scale and position for a Live2D model.
 *
 * Inputs: viewport dimensions in CSS pixels and model local bounds before any
 * layout scale is applied.
 * Returns: absolute Pixi position and uniform scale that center the model and
 * keep its bottom near the lower edge without clipping the top.
 * Errors: non-positive dimensions fall back to scale one and origin placement.
 * Side effects: none.
 */
export function calculateLive2DLayout(input: Live2DLayoutInput): Live2DLayout {
  const { viewport, localBounds } = input;

  if (
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    localBounds.width <= 0 ||
    localBounds.height <= 0
  ) {
    return { x: 0, y: 0, scale: 1 };
  }

  const scale = Math.min(
    (viewport.width * WIDTH_FIT_RATIO) / localBounds.width,
    (viewport.height * HEIGHT_FIT_RATIO) / localBounds.height
  );
  const centerX = localBounds.x + localBounds.width / 2;
  const bottomY = localBounds.y + localBounds.height;

  return {
    x: viewport.width / 2 - centerX * scale,
    y: viewport.height * BOTTOM_ANCHOR_RATIO - bottomY * scale,
    scale
  };
}
