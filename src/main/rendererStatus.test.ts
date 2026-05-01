/**
 * Unit tests for renderer status label normalization.
 *
 * Responsibility: verifies that renderer-supplied diagnostics become safe,
 * concise tray menu labels without creating Electron menus or windows.
 *
 * Key dependencies: Vitest and the pure renderer status helper.
 */
import { describe, expect, test } from 'vitest';

import { normalizeRendererStatusLabel } from './rendererStatus.js';

describe('normalizeRendererStatusLabel', () => {
  test('keeps concise user-facing renderer status text', () => {
    expect(normalizeRendererStatusLabel('白猫已就绪')).toBe('桌宠状态：白猫已就绪');
  });

  test('rejects non-string or blank renderer status values', () => {
    expect(normalizeRendererStatusLabel(null)).toBeNull();
    expect(normalizeRendererStatusLabel('   ')).toBeNull();
  });

  test('normalizes whitespace and truncates very long renderer status values', () => {
    const label = normalizeRendererStatusLabel(`  第一行\n第二行${'很长'.repeat(80)}  `);

    if (label === null) {
      throw new Error('Expected a normalized status label.');
    }

    expect(label).toMatch(/^桌宠状态：第一行 第二行/);
    expect(label.length).toBeLessThanOrEqual(49);
  });
});
