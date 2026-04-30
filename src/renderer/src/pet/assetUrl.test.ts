/**
 * Unit tests for renderer asset URL construction.
 *
 * Responsibility: locks down the URL behavior needed for both Vite dev server
 * and Electron production `file://` renderer loading. The tests do not read
 * files, start Electron, or load GLB assets.
 *
 * Key dependencies: Vitest and the public `buildRendererAssetUrl` helper.
 */
import { describe, expect, test } from 'vitest';

import { buildRendererAssetUrl } from './assetUrl';

describe('buildRendererAssetUrl', () => {
  test('keeps Vite dev-server assets rooted at slash base', () => {
    expect(buildRendererAssetUrl('/', 'assets/pet.glb')).toBe('/assets/pet.glb');
  });

  test('keeps Electron file build assets relative to renderer HTML', () => {
    expect(buildRendererAssetUrl('./', 'assets/pet.glb')).toBe('./assets/pet.glb');
  });

  test('normalizes accidental leading slashes in asset paths', () => {
    expect(buildRendererAssetUrl('./', '/assets/pet.glb')).toBe('./assets/pet.glb');
  });
});
