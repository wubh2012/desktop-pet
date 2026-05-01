/**
 * Unit tests for shared desktop-pet model identifiers.
 *
 * Responsibility: verifies the cross-process model selection contract. The
 * tests do not load model assets, create menus, or use Electron IPC.
 *
 * Side effects: none.
 * Key dependencies: Vitest and the shared `petModel` helpers.
 */
import { describe, expect, test } from 'vitest';

import {
  DEFAULT_PET_MODEL_ID,
  isPetModelId,
  normalizePetModelId,
  PET_MODEL_IDS
} from './petModel.js';

describe('petModel', () => {
  test('supports the bundled white and black Live2D cats', () => {
    expect(PET_MODEL_IDS).toEqual(['tororo', 'hijiki']);
    expect(DEFAULT_PET_MODEL_ID).toBe('tororo');
    expect(isPetModelId('tororo')).toBe(true);
    expect(isPetModelId('hijiki')).toBe(true);
  });

  test('rejects unknown model identifiers and falls back to the default model', () => {
    expect(isPetModelId('black')).toBe(false);
    expect(isPetModelId('')).toBe(false);
    expect(isPetModelId(null)).toBe(false);
    expect(normalizePetModelId('hijiki')).toBe('hijiki');
    expect(normalizePetModelId('unknown')).toBe(DEFAULT_PET_MODEL_ID);
  });
});
