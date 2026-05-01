/**
 * Unit tests for shared pet action mode validation.
 *
 * Responsibility: verifies the small cross-process action-mode contract used by
 * tray menu IPC. The tests do not import Electron or Three.js.
 *
 * Key dependencies: Vitest and `petActionMode` helpers.
 */
import { describe, expect, test } from 'vitest';

import {
  isPetActionMode,
  isPetOneShotAction,
  PET_ACTION_MODES,
  PET_ONE_SHOT_ACTIONS
} from './petActionMode.js';

describe('petActionMode', () => {
  test('allows only semantic persistent modes', () => {
    expect(PET_ACTION_MODES).toEqual(['idle', 'active']);
    expect(isPetActionMode('idle')).toBe(true);
    expect(isPetActionMode('active')).toBe(true);
    expect(isPetActionMode('walk')).toBe(false);
    expect(isPetActionMode('clicked')).toBe(false);
    expect(isPetActionMode('run')).toBe(false);
  });

  test('allows semantic one-shot actions only', () => {
    expect(PET_ONE_SHOT_ACTIONS).toEqual([
      'tease',
      'pet',
      'poke',
      'surprise',
      'cute',
      'greet',
      'cheer'
    ]);
    expect(isPetOneShotAction('tease')).toBe(true);
    expect(isPetOneShotAction('attention')).toBe(false);
    expect(isPetOneShotAction('jump')).toBe(false);
    expect(isPetOneShotAction('spin')).toBe(false);
    expect(isPetOneShotAction('idle')).toBe(false);
    expect(isPetOneShotAction('clicked')).toBe(false);
  });
});
