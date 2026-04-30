/**
 * Live2D viewport size helpers.
 *
 * Responsibility: chooses stable Pixi renderer dimensions from DOM layout and
 * window bounds. It does not create canvases or load model assets.
 *
 * Side effects: none.
 * Key dependencies and constraints: Electron transparent windows can report
 * zero host dimensions during early startup, so window dimensions are used as a
 * fallback to avoid creating a practically invisible 1x1 renderer.
 */

export interface Live2DSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Resolves a usable Live2D canvas size.
 *
 * Inputs: `host` is the fixed renderer host size; `viewport` is the browser
 * viewport size.
 * Returns: positive integer dimensions, preferring host layout when available.
 * Errors: does not throw.
 * Side effects: none.
 */
export function resolveLive2DViewportSize(host: Live2DSize, viewport: Live2DSize): Live2DSize {
  return {
    width: Math.max(Math.round(host.width || viewport.width), 1),
    height: Math.max(Math.round(host.height || viewport.height), 1)
  };
}
