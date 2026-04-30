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
  test('allows only idle and walk modes', () => {
    expect(PET_ACTION_MODES).toEqual(['idle', 'walk']);
    expect(isPetActionMode('idle')).toBe(true);
    expect(isPetActionMode('walk')).toBe(true);
    expect(isPetActionMode('clicked')).toBe(false);
    expect(isPetActionMode('run')).toBe(false);
  });

  test('allows only jump and spin one-shot actions', () => {
    expect(PET_ONE_SHOT_ACTIONS).toEqual(['jump', 'spin']);
    expect(isPetOneShotAction('jump')).toBe(true);
    expect(isPetOneShotAction('spin')).toBe(true);
    expect(isPetOneShotAction('idle')).toBe(false);
    expect(isPetOneShotAction('clicked')).toBe(false);
  });
});
