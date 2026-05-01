/**
 * Static regression tests for the preload desktop-pet API bridge.
 *
 * Responsibility: verifies that model selection IPC stays exposed through the
 * context-isolated preload surface. The tests do not start Electron or invoke
 * real IPC.
 *
 * Side effects: reads the local TypeScript source file only.
 * Key dependencies: Vitest and the preload source contract.
 */
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'index.ts');

describe('preload desktopPet API', () => {
  test('exposes validated pet model selection methods and IPC channels', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain('getCurrentPetModel(): Promise<PetModelId>');
    expect(source).toContain('onPetModelChanged(callback: (modelId: PetModelId) => void): () => void');
    expect(source).toContain("ipcRenderer.invoke('get-current-pet-model')");
    expect(source).toContain("ipcRenderer.on('pet-model-changed'");
    expect(source).toContain('isPetModelId(value)');
  });
});
