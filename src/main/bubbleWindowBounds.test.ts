/**
 * Unit tests for independent bubble-window positioning.
 *
 * Responsibility: verifies pure screen-space placement math for the transparent
 * reminder/message bubble. It does not create Electron windows or inspect the
 * renderer DOM.
 *
 * Side effects: none.
 * Key dependencies and constraints: expected coordinates intentionally include
 * a small overlap with the pet window so the visible bubble sits closer to the
 * pet body rather than only touching the transparent window edge.
 */
import { describe, expect, test } from 'vitest';

import { calculateBubbleWindowBounds } from './bubbleWindowBounds.js';

const workArea = { x: 0, y: 0, width: 1920, height: 1080 };
const bubbleSize = { width: 320, height: 104 };

describe('calculateBubbleWindowBounds', () => {
  test('places bubble above the pet when there is room', () => {
    expect(
      calculateBubbleWindowBounds({ x: 800, y: 500, width: 240, height: 260 }, bubbleSize, workArea)
    ).toEqual({ x: 760, y: 408, width: 320, height: 104 });
  });

  test('places bubble below the pet near the top edge', () => {
    expect(
      calculateBubbleWindowBounds({ x: 800, y: 40, width: 240, height: 260 }, bubbleSize, workArea)
    ).toEqual({ x: 760, y: 288, width: 320, height: 104 });
  });

  test('clamps bubble inside horizontal work area edges', () => {
    expect(
      calculateBubbleWindowBounds({ x: 10, y: 500, width: 120, height: 260 }, bubbleSize, workArea)
    ).toEqual({ x: 0, y: 408, width: 320, height: 104 });
    expect(
      calculateBubbleWindowBounds({ x: 1860, y: 500, width: 120, height: 260 }, bubbleSize, workArea)
    ).toEqual({ x: 1600, y: 408, width: 320, height: 104 });
  });
});
