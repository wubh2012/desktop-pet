/**
 * Unit tests for tray icon path resolution.
 *
 * Responsibility: verifies how the main process chooses development and
 * packaged tray icon resources without creating Electron native images.
 *
 * Side effects: none.
 *
 * Key dependencies and constraints: tests inject filesystem existence checks so
 * they do not depend on the local machine's generated icon files.
 */
import { describe, expect, test } from 'vitest';

import { resolveTrayIconPath } from './trayIcon.js';

describe('resolveTrayIconPath', () => {
  test('prefers the generated 32px tray PNG from build during development', () => {
    const path = resolveTrayIconPath({
      isPackaged: false,
      cwd: 'D:/project',
      resourcesPath: 'D:/project/resources',
      exists: (candidate) => candidate.endsWith('build\\tray-32.png')
    });

    expect(path).toBe('D:\\project\\build\\tray-32.png');
  });

  test('uses packaged resources after electron-builder copies tray files', () => {
    const path = resolveTrayIconPath({
      isPackaged: true,
      cwd: 'D:/project',
      resourcesPath: 'D:/project/release/win-unpacked/resources',
      exists: (candidate) => candidate.endsWith('resources\\tray-32.png')
    });

    expect(path).toBe('D:\\project\\release\\win-unpacked\\resources\\tray-32.png');
  });

  test('falls back to null when no generated tray icon exists', () => {
    expect(
      resolveTrayIconPath({
        isPackaged: false,
        cwd: 'D:/project',
        resourcesPath: 'D:/project/resources',
        exists: () => false
      })
    ).toBeNull();
  });
});
