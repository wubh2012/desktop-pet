/**
 * Unit tests for Live2D model catalog resolution.
 *
 * Responsibility: verifies bundled model metadata and renderer asset URL
 * construction without loading PixiJS, Live2D, or model files.
 *
 * Side effects: none.
 * Key dependencies: Vitest and the pure Live2D model catalog helpers.
 */
import { describe, expect, test } from 'vitest';

import { buildLive2DModelUrl, getLive2DModelDefinition } from './live2dModelCatalog';

describe('live2dModelCatalog', () => {
  test('describes the bundled Tororo and Hijiki model assets', () => {
    expect(getLive2DModelDefinition('tororo')).toMatchObject({
      id: 'tororo',
      displayName: '白猫 Tororo',
      modelPath: 'live2d/tororo/tororo.model3.json',
      readyStatus: '白猫已就绪'
    });
    expect(getLive2DModelDefinition('hijiki')).toMatchObject({
      id: 'hijiki',
      displayName: '黑猫 Hijiki',
      modelPath: 'live2d/hijiki/hijiki.model3.json',
      readyStatus: '黑猫已就绪'
    });
  });

  test('builds renderer-relative model URLs from the selected model id', () => {
    expect(buildLive2DModelUrl('/app/', 'tororo')).toBe('/app/live2d/tororo/tororo.model3.json');
    expect(buildLive2DModelUrl('/app/', 'hijiki')).toBe('/app/live2d/hijiki/hijiki.model3.json');
  });
});
