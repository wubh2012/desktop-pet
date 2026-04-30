/**
 * Unit tests for GLB base-facing orientation selection.
 *
 * Responsibility: verifies URL-driven debug overrides without loading real GLB
 * files, starting Electron, mutating browser history, or creating WebGL state.
 *
 * Key dependencies: Vitest and the pure `resolveModelYaw` helper.
 */
import { describe, expect, test } from 'vitest';

import { hasDebugModelYawOverride, resolveModelYaw } from './modelOrientation';

describe('resolveModelYaw', () => {
  test('keeps the default yaw outside debug-capable builds', () => {
    expect(resolveModelYaw('?petYaw=180deg', false)).toBe(0);
  });

  test('accepts radians from petYaw in debug-capable builds', () => {
    expect(resolveModelYaw('?petYaw=0', true)).toBe(0);
    expect(resolveModelYaw('?petYaw=1.5708', true)).toBeCloseTo(1.5708);
  });

  test('accepts degrees from petYaw in debug-capable builds', () => {
    expect(resolveModelYaw('?petYaw=180deg', true)).toBeCloseTo(Math.PI);
    expect(resolveModelYaw('?petYaw=-90deg', true)).toBeCloseTo(-Math.PI / 2);
  });

  test('falls back to the default yaw for invalid overrides', () => {
    expect(resolveModelYaw('?petYaw=front', true)).toBe(0);
    expect(resolveModelYaw('?petYaw=Infinity', true)).toBe(0);
  });

  test('detects explicit debug yaw overrides only in debug-capable builds', () => {
    expect(hasDebugModelYawOverride('?petYaw=90deg', true)).toBe(true);
    expect(hasDebugModelYawOverride('?petYaw=90deg', false)).toBe(false);
    expect(hasDebugModelYawOverride('?other=90deg', true)).toBe(false);
  });
});
