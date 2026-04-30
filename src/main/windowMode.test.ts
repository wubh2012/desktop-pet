/**
 * Unit tests for desktop pet window mode options.
 *
 * Responsibility: verifies the pure configuration used to create normal and
 * debug Electron windows. Tests do not import Electron, create native windows,
 * or touch the filesystem.
 *
 * Key dependencies: Vitest and the public `resolveWindowMode` helper.
 */
import { describe, expect, test } from 'vitest';

import { resolveWindowMode } from './windowMode.js';

describe('resolveWindowMode', () => {
  test('normal mode stays frameless, compact, transparent, and taskbar-hidden', () => {
    expect(resolveWindowMode(false)).toMatchObject({
      width: 340,
      height: 430,
      frame: false,
      resizable: false,
      transparent: true,
      skipTaskbar: true,
      hasShadow: false
    });
  });

  test('debug mode shows a resizable framed window for manual sizing', () => {
    expect(resolveWindowMode(true)).toMatchObject({
      width: 520,
      height: 560,
      frame: true,
      resizable: true,
      transparent: false,
      skipTaskbar: false,
      hasShadow: true
    });
    expect(resolveWindowMode(true).minWidth).toBeUndefined();
    expect(resolveWindowMode(true).minHeight).toBeUndefined();
  });
});
