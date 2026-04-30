/**
 * Unit tests for GLB material repair metadata selection.
 *
 * Responsibility: verifies how the renderer chooses a useful embedded image
 * from malformed GLBs that contain images but no material bindings. The tests
 * do not load real GLB files or start WebGL.
 *
 * Key dependencies: Vitest and pure helpers from `materialRepair`.
 */
import { describe, expect, test } from 'vitest';

import { findBaseColorImageIndex } from './materialRepair';

describe('findBaseColorImageIndex', () => {
  test('prefers the non-normal, non-metallic base color image', () => {
    expect(
      findBaseColorImageIndex([
        { name: 'texture_v128_768_normal' },
        { name: 'texture_v128_768' },
        { name: 'texture_v128_768_metallic-texture_v128_768_roughness' }
      ])
    ).toBe(1);
  });

  test('falls back to the first non-utility image', () => {
    expect(
      findBaseColorImageIndex([
        { name: 'pet_normal' },
        { name: 'pet_diffuse' },
        { name: 'pet_roughness' }
      ])
    ).toBe(1);
  });

  test('returns null when there is no useful image', () => {
    expect(findBaseColorImageIndex([{ name: 'normal' }, { name: 'roughness' }])).toBeNull();
  });
});
