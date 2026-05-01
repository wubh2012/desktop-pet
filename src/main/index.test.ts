/**
 * Static regression tests for desktop-pet main-process window orchestration.
 *
 * Responsibility: protects main-process sequencing that is hard to exercise
 * without launching Electron. It does not create windows, start HTTP servers,
 * or send IPC.
 *
 * Side effects: reads the local main-process source file only.
 * Key dependencies and constraints: source inspection is used only for narrow
 * lifecycle invariants around independent Electron windows.
 */
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'index.ts');

describe('main-process bubble window orchestration', () => {
  test('can position a newly created bubble before it is first shown', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const functionStart = source.indexOf('function positionBubbleWindow(): void {');
    const nextFunctionStart = source.indexOf('\n/**', functionStart + 1);
    const functionBody = source.slice(functionStart, nextFunctionStart);

    expect(functionStart).toBeGreaterThanOrEqual(0);
    expect(functionBody).not.toContain('!bubbleWindow.isVisible()');
    expect(functionBody).toContain('bubbleWindow.setBounds(bounds, false);');
  });

  test('positions the bubble against the pet content area instead of native title chrome', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const functionStart = source.indexOf('function positionBubbleWindow(): void {');
    const nextFunctionStart = source.indexOf('\n/**', functionStart + 1);
    const functionBody = source.slice(functionStart, nextFunctionStart);

    expect(functionStart).toBeGreaterThanOrEqual(0);
    expect(functionBody).toContain('mainWindow.getContentBounds()');
    expect(functionBody).not.toContain('const petBounds = mainWindow.getBounds();');
  });
});
