/**
 * Unit tests for fitting a loaded GLB model into the desktop pet viewport.
 *
 * Responsibility: verifies pure model layout math without starting WebGL,
 * Electron, or loading real GLB files. These tests prevent large generated
 * models from being shifted out of view by unscaled bounding-box centers.
 *
 * Key dependencies: Vitest and the public `calculateModelLayout` helper.
 */
import { describe, expect, test } from 'vitest';

import { calculateModelLayout } from './modelLayout';

describe('calculateModelLayout', () => {
  test('scales by the largest dimension and offsets the center after scaling', () => {
    const layout = calculateModelLayout({
      min: { x: -10, y: 0, z: -2 },
      max: { x: 30, y: 20, z: 2 },
      targetSize: 2
    });

    expect(layout.scale).toBeCloseTo(0.05);
    expect(layout.position.x).toBeCloseTo(-0.5);
    expect(layout.position.y).toBeCloseTo(-0.5);
    expect(layout.position.z).toBeCloseTo(0);
  });

  test('uses a safe fallback scale for empty or invalid bounds', () => {
    const layout = calculateModelLayout({
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
      targetSize: 2
    });

    expect(layout.scale).toBe(1);
    expect(layout.position).toEqual({ x: 0, y: 0, z: 0 });
  });
});
