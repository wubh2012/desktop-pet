/**
 * Unit tests for fitting Live2D model bounds into the transparent pet window.
 *
 * Responsibility: verifies pure geometry for model scale and placement. The
 * tests do not import PixiJS, create canvases, or load Live2D assets.
 *
 * Side effects: none.
 * Key dependencies and constraints: Live2D bounds are expressed in unscaled
 * local coordinates, so repeated layout passes must produce the same transform.
 */
import { describe, expect, test } from 'vitest';

import { calculateLive2DLayout } from './live2dLayout';

describe('calculateLive2DLayout', () => {
  test('fits the full model inside the viewport with top and bottom breathing room', () => {
    const layout = calculateLive2DLayout({
      viewport: { width: 545, height: 352 },
      localBounds: { x: 0, y: 0, width: 800, height: 1000 }
    });

    expect(layout.scale).toBeCloseTo((352 * 0.92) / 1000);
    expect(layout.x).toBeCloseTo((545 - 800 * layout.scale) / 2);
    expect(layout.y).toBeCloseTo(352 * 0.96 - 1000 * layout.scale);
  });

  test('uses unscaled local bounds so repeated passes stay stable', () => {
    const first = calculateLive2DLayout({
      viewport: { width: 340, height: 430 },
      localBounds: { x: -100, y: -40, width: 900, height: 1100 }
    });
    const second = calculateLive2DLayout({
      viewport: { width: 340, height: 430 },
      localBounds: { x: -100, y: -40, width: 900, height: 1100 }
    });

    expect(second).toEqual(first);
  });
});
