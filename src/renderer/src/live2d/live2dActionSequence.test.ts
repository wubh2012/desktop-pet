/**
 * Unit tests for semantic Live2D action sequence resolution.
 *
 * Responsibility: verifies how user-facing cat actions expand into Tororo
 * motion names and lightweight procedural effects. These tests do not load
 * PixiJS, Live2D assets, or Electron.
 *
 * Side effects: none.
 * Key dependencies and constraints: action ids come from the shared
 * cross-process contract and must stay semantic for HTTP/API callers.
 */
import { describe, expect, test } from 'vitest';

import { resolveLive2DActionSequence } from './live2dActionSequence';

describe('resolveLive2DActionSequence', () => {
  test('resolves direct semantic actions to one motion and no procedural effect', () => {
    expect(resolveLive2DActionSequence('pet')).toEqual({
      motions: ['03'],
      effect: null
    });
    expect(resolveLive2DActionSequence('cute')).toEqual({
      motions: ['07'],
      effect: null
    });
  });

  test('resolves combined semantic actions to motion sequences and named effects', () => {
    expect(resolveLive2DActionSequence('greet')).toEqual({
      motions: ['03'],
      effect: 'pop'
    });
    expect(resolveLive2DActionSequence('cheer')).toEqual({
      motions: ['01', '05'],
      effect: 'hop'
    });
  });
});
