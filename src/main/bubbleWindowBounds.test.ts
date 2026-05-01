import { describe, expect, test } from 'vitest';

import { calculateBubbleWindowBounds } from './bubbleWindowBounds.js';

const workArea = { x: 0, y: 0, width: 1920, height: 1080 };
const bubbleSize = { width: 320, height: 104 };

describe('calculateBubbleWindowBounds', () => {
  test('places bubble above the pet when there is room', () => {
    expect(
      calculateBubbleWindowBounds({ x: 800, y: 500, width: 240, height: 260 }, bubbleSize, workArea)
    ).toEqual({ x: 760, y: 394, width: 320, height: 104 });
  });

  test('places bubble below the pet near the top edge', () => {
    expect(
      calculateBubbleWindowBounds({ x: 800, y: 40, width: 240, height: 260 }, bubbleSize, workArea)
    ).toEqual({ x: 760, y: 302, width: 320, height: 104 });
  });

  test('clamps bubble inside horizontal work area edges', () => {
    expect(
      calculateBubbleWindowBounds({ x: 10, y: 500, width: 120, height: 260 }, bubbleSize, workArea)
    ).toEqual({ x: 0, y: 394, width: 320, height: 104 });
    expect(
      calculateBubbleWindowBounds({ x: 1860, y: 500, width: 120, height: 260 }, bubbleSize, workArea)
    ).toEqual({ x: 1600, y: 394, width: 320, height: 104 });
  });
});
