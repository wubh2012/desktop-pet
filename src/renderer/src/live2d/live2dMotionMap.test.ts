/**
 * Unit tests for Tororo Live2D motion mapping.
 *
 * Responsibility: verifies stable mapping from app-level actions and external
 * motion names to Cubism motion groups. It does not load PixiJS or Live2D.
 *
 * Side effects: none.
 * Key dependencies and constraints: uses the Tororo sample model's model3.json
 * motion groups as the expected contract.
 */
import { describe, expect, test } from 'vitest';

import { resolveLive2DMotion } from './live2dMotionMap';

describe('resolveLive2DMotion', () => {
  test('maps semantic direct actions to Tororo motions', () => {
    expect(resolveLive2DMotion('tease')).toEqual({ group: 'FlickUp', index: 0 });
    expect(resolveLive2DMotion('surprise')).toEqual({ group: 'FlickDown', index: 0 });
    expect(resolveLive2DMotion('pet')).toEqual({ group: 'Tap', index: 0 });
    expect(resolveLive2DMotion('poke')).toEqual({ group: 'Tap', index: 1 });
    expect(resolveLive2DMotion('cute')).toEqual({ group: 'Tap', index: 2 });
  });

  test('keeps numbered motion names internal only', () => {
    expect(resolveLive2DMotion('01')).toEqual({ group: 'FlickUp', index: 0 });
    expect(resolveLive2DMotion('02')).toEqual({ group: 'FlickDown', index: 0 });
    expect(resolveLive2DMotion('03')).toEqual({ group: 'Tap', index: 0 });
    expect(resolveLive2DMotion('06')).toEqual({ group: 'Tap', index: 1 });
    expect(resolveLive2DMotion('07')).toEqual({ group: 'Tap', index: 2 });
    expect(resolveLive2DMotion('08')).toEqual({ group: 'Idle', index: 2 });
  });

  test('returns null for unknown motion names', () => {
    expect(resolveLive2DMotion('unknown')).toBeNull();
    expect(resolveLive2DMotion('')).toBeNull();
  });
});
