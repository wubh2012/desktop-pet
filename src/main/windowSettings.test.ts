/**
 * Unit tests for persisted debug-window bounds normalization.
 *
 * Responsibility: verifies pure bounds validation and merging before Electron
 * uses persisted window data. These tests do not create native windows or read
 * user settings files.
 *
 * Key dependencies: Vitest and the public helpers from `windowSettings`.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  applySavedWindowBounds,
  createContentSizedWindowBounds,
  DEFAULT_REMINDER_SETTINGS,
  normalizeDebugBounds,
  normalizeModelYaw,
  normalizeReminderSettings,
  readPetModelId,
  readModelYaw,
  readReminderSettings,
  writePetModelId,
  writeModelYaw
} from './windowSettings.js';

describe('windowSettings', () => {
  test('keeps valid debug bounds while enforcing minimum size', () => {
    const bounds = normalizeDebugBounds(
      { x: 40, y: 50, width: 360, height: 280 },
      { width: 520, height: 560, minWidth: 300, minHeight: 340 }
    );

    expect(bounds).toEqual({ x: 40, y: 50, width: 360, height: 340 });
  });

  test('rejects invalid persisted bounds', () => {
    const bounds = normalizeDebugBounds(
      { x: Number.NaN, y: 50, width: 0, height: 280 },
      { width: 520, height: 560, minWidth: 300, minHeight: 340 }
    );

    expect(bounds).toBeNull();
  });

  test('keeps user-selected small bounds when no minimum size is configured', () => {
    const bounds = normalizeDebugBounds(
      { x: 838, y: 450, width: 223, height: 183 },
      { width: 340, height: 430 }
    );

    expect(bounds).toEqual({ x: 838, y: 450, width: 223, height: 183 });
  });

  test('merges saved bounds into both debug and normal modes', () => {
    const saved = { x: 10, y: 20, width: 640, height: 700 };
    const normal = applySavedWindowBounds(
      { width: 340, height: 430, frame: false, resizable: false },
      saved
    );
    const debug = applySavedWindowBounds(
      { width: 520, height: 560, frame: true, resizable: true },
      saved
    );

    expect(normal).toMatchObject(saved);
    expect(debug).toMatchObject(saved);
  });

  test('builds saved bounds from content size while preserving native window position', () => {
    const bounds = createContentSizedWindowBounds(
      { x: 914, y: 569, width: 182, height: 187 },
      { x: 922, y: 600, width: 174, height: 156 }
    );

    expect(bounds).toEqual({ x: 914, y: 569, width: 174, height: 156 });
  });

  test('keeps finite model yaw values and rejects invalid values', () => {
    expect(normalizeModelYaw(0)).toBe(0);
    expect(normalizeModelYaw(Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeModelYaw(Number.NaN)).toBeNull();
    expect(normalizeModelYaw('90deg')).toBeNull();
  });

  test('writes model yaw while preserving existing debug window bounds', () => {
    const directory = mkdtempSync(join(tmpdir(), 'desktop-pet-settings-'));
    const settingsPath = join(directory, 'settings.json');

    try {
      writeFileSync(
        settingsPath,
        `${JSON.stringify({ debugWindowBounds: { x: 1, y: 2, width: 300, height: 400 } })}\n`,
        'utf8'
      );
      writeModelYaw(settingsPath, Math.PI / 2);

      expect(readModelYaw(settingsPath)).toBeCloseTo(Math.PI / 2);

      const raw = JSON.parse(readFileSync(settingsPath, 'utf8')) as {
        debugWindowBounds?: unknown;
        modelYawRadians?: unknown;
      };
      expect(raw.debugWindowBounds).toEqual({ x: 1, y: 2, width: 300, height: 400 });
      expect(raw.modelYawRadians).toBeCloseTo(Math.PI / 2);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('reads and writes selected pet model while preserving existing settings', () => {
    const directory = mkdtempSync(join(tmpdir(), 'desktop-pet-settings-'));
    const settingsPath = join(directory, 'settings.json');

    try {
      writeFileSync(
        settingsPath,
        `${JSON.stringify({ debugWindowBounds: { x: 1, y: 2, width: 300, height: 400 } })}\n`,
        'utf8'
      );
      writePetModelId(settingsPath, 'hijiki');

      expect(readPetModelId(settingsPath)).toBe('hijiki');

      const raw = JSON.parse(readFileSync(settingsPath, 'utf8')) as {
        debugWindowBounds?: unknown;
        petModelId?: unknown;
      };
      expect(raw.debugWindowBounds).toEqual({ x: 1, y: 2, width: 300, height: 400 });
      expect(raw.petModelId).toBe('hijiki');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('falls back to the default pet model when settings contain an invalid model', () => {
    const directory = mkdtempSync(join(tmpdir(), 'desktop-pet-settings-'));
    const settingsPath = join(directory, 'settings.json');

    try {
      writeFileSync(settingsPath, `${JSON.stringify({ petModelId: 'unknown' })}\n`, 'utf8');

      expect(readPetModelId(settingsPath)).toBe('tororo');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('uses default reminder settings when persisted value is missing', () => {
    const directory = mkdtempSync(join(tmpdir(), 'desktop-pet-settings-'));
    const settingsPath = join(directory, 'settings.json');

    try {
      expect(readReminderSettings(settingsPath)).toEqual(DEFAULT_REMINDER_SETTINGS);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('keeps valid reminder settings from user config', () => {
    const settings = normalizeReminderSettings({
      enabled: false,
      restIntervalMinutes: 30,
      standIntervalMinutes: 55,
      minimumGapMinutes: 7,
      bubbleDurationSeconds: 5,
      lunchReminder: {
        enabled: false,
        start: '12:05',
        end: '13:10'
      }
    });

    expect(settings).toEqual({
      enabled: false,
      restIntervalMinutes: 30,
      standIntervalMinutes: 55,
      minimumGapMinutes: 7,
      bubbleDurationSeconds: 5,
      lunchReminder: {
        enabled: false,
        start: '12:05',
        end: '13:10'
      }
    });
  });

  test('falls back for invalid reminder setting fields', () => {
    expect(
      normalizeReminderSettings({
        enabled: 'yes',
        restIntervalMinutes: 0,
        standIntervalMinutes: Number.NaN,
        minimumGapMinutes: -1,
        bubbleDurationSeconds: 'long',
        lunchReminder: {
          enabled: 'no',
          start: '24:00',
          end: 'soon'
        }
      })
    ).toEqual(DEFAULT_REMINDER_SETTINGS);
  });
});
