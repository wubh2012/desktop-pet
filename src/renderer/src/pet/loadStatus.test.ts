/**
 * Unit tests for renderer model-load status presentation.
 *
 * Responsibility: verifies DOM-independent status mutations for model loading
 * results. These tests do not create WebGL state, load GLB assets, or require
 * Electron APIs.
 *
 * Key dependencies: Vitest and the pure status helper functions.
 */
import { describe, expect, test } from 'vitest';

import { showModelLoadFailure, showModelLoadSuccess } from './loadStatus';

describe('model load status helpers', () => {
  test('hides successful load diagnostics so they do not cover the pet', () => {
    const status = { textContent: '加载中...', hidden: false };

    showModelLoadSuccess(status, {
      animationCount: 0,
      platform: 'win32'
    });

    expect(status.textContent).toBe('GLB 已加载 | animations=0 | platform=win32');
    expect(status.hidden).toBe(true);
  });

  test('keeps load failures visible to aid debugging', () => {
    const status = { textContent: '加载中...', hidden: true };

    showModelLoadFailure(status);

    expect(status.textContent).toBe('模型加载失败');
    expect(status.hidden).toBe(false);
  });
});
