/**
 * Static tests for Electron main-process startup defaults.
 *
 * Responsibility: protects user-facing startup defaults that are otherwise
 * hard to exercise without launching Electron. It does not create native
 * windows, trays, or IPC channels.
 *
 * Side effects: reads the local main-process source file only.
 * Key dependencies and constraints: uses source inspection for simple startup
 * invariants that should stay visible in `index.ts`.
 */
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'index.ts');

describe('main-process startup defaults', () => {
  test('enables look-at-mouse behavior by default and still syncs it to the renderer', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain('let lookAtMouseEnabled = true;');
    expect(source).toContain('sendLookAtMouseToRenderer(window);');
  });
});
