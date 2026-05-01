/**
 * Static regression tests for the Live2D renderer entry module.
 *
 * Responsibility: verifies renderer bootstrap invariants that are hard to
 * exercise in Vitest's Node environment. It does not create WebGL contexts,
 * load Live2D assets, or launch Electron.
 *
 * Side effects: reads the local TypeScript source file only.
 * Key dependencies and constraints: this protects Electron's strict CSP from
 * PixiJS v6's default shader sync path by requiring the Pixi shader shim to be
 * installed before a Pixi application can be constructed.
 */
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'Live2DPetRenderer.ts');

describe('Live2DPetRenderer module bootstrap', () => {
  test('installs the Pixi CSP shader shim before constructing an application', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const shimImportIndex = source.indexOf("import { install as installPixiUnsafeEval } from '@pixi/unsafe-eval';");
    const shaderImportIndex = source.indexOf("import { ShaderSystem } from '@pixi/core';");
    const installIndex = source.indexOf('installPixiUnsafeEval({ ShaderSystem });');
    const applicationIndex = source.indexOf('new PIXI.Application');

    expect(shimImportIndex).toBeGreaterThanOrEqual(0);
    expect(shaderImportIndex).toBeGreaterThanOrEqual(0);
    expect(installIndex).toBeGreaterThanOrEqual(0);
    expect(applicationIndex).toBeGreaterThanOrEqual(0);
    expect(installIndex).toBeLessThan(applicationIndex);
  });

  test('keeps successful Live2D diagnostics out of the pet window', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain('this.statusElement.hidden = true;');
    expect(source).not.toContain('this.statusElement.hidden = !import.meta.env.DEV;');
    expect(source).toContain('window.desktopPet?.reportRendererStatus');
  });

  test('loads Live2D assets from the selected pet model instead of a fixed Tororo URL', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain('initialModelId');
    expect(source).toContain('setModel(modelId: PetModelId)');
    expect(source).toContain('buildLive2DModelUrl');
    expect(source).not.toContain('const MODEL_URL');
  });

  test('deduplicates same-model requests while the initial model is still loading', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain('private loadingModelId: PetModelId | null = null;');
    expect(source).toContain('this.loadingModelId === modelId');
    expect(source).toContain('this.loadingModelId = modelId;');
    expect(source).toContain('this.loadingModelId = null;');
  });

  test('keeps mouse-follow behavior enabled before the first IPC sync', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain('private lookAtMouseEnabled = true;');
  });
});
