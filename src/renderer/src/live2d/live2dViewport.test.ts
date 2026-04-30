/**
 * Unit tests for Live2D viewport size resolution.
 *
 * Responsibility: verifies that Live2D canvas sizing remains usable when the
 * fixed host element has not reported layout dimensions during early startup.
 * It does not create PixiJS applications or load Live2D assets.
 *
 * Side effects: none.
 * Key dependencies and constraints: uses pure numeric inputs for deterministic
 * renderer sizing behavior.
 */
import { describe, expect, test } from 'vitest';

import { resolveLive2DViewportSize } from './live2dViewport';

describe('resolveLive2DViewportSize', () => {
  test('uses host dimensions when available', () => {
    expect(resolveLive2DViewportSize({ width: 300, height: 400 }, { width: 900, height: 700 })).toEqual({
      width: 300,
      height: 400
    });
  });

  test('falls back to window dimensions during early layout', () => {
    expect(resolveLive2DViewportSize({ width: 0, height: 0 }, { width: 260, height: 320 })).toEqual({
      width: 260,
      height: 320
    });
  });

  test('never returns zero dimensions', () => {
    expect(resolveLive2DViewportSize({ width: 0, height: 0 }, { width: 0, height: 0 })).toEqual({
      width: 1,
      height: 1
    });
  });
});
