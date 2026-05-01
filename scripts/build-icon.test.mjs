/**
 * Tests for the icon generation CLI argument parser.
 *
 * Responsibility: verifies default source and output paths without running the
 * image conversion command. It does not read or write actual icon files.
 *
 * Side effects: none.
 *
 * Key dependencies and constraints: paths are resolved relative to the project
 * root and the script directory, matching how `npm run icon:ico` is invoked.
 */
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

import { parseIconCliArgs } from './build-icon.mjs';

describe('parseIconCliArgs', () => {
  test('defaults to scripts/app.png and the build output directory', () => {
    expect(parseIconCliArgs(['node', 'scripts/build-icon.mjs'])).toEqual({
      sourcePath: resolve('scripts/app.png'),
      outputDirectory: resolve('build')
    });
  });

  test('accepts an explicit source image and output directory', () => {
    expect(parseIconCliArgs(['node', 'scripts/build-icon.mjs', 'custom.png', 'dist-icons'])).toEqual({
      sourcePath: resolve('custom.png'),
      outputDirectory: resolve('dist-icons')
    });
  });
});
