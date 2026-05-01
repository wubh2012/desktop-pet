/**
 * Tests for ICO binary assembly helpers used by the packaging icon script.
 *
 * Responsibility: verifies the structure of generated ICO buffers without
 * invoking image resizing or touching real installer configuration. It does not
 * validate visual quality, Windows shell behavior, or Electron packaging.
 *
 * Side effects: writes temporary generated image assets for end-to-end helper
 * coverage, then removes them.
 *
 * Key dependencies and constraints: uses Vitest and Sharp. ICO entries embed
 * PNG image payloads, which is supported by modern Windows icon consumers.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { describe, expect, test } from 'vitest';

import { createIcoBuffer, writeIconAssetSet } from './iconBuilder.mjs';

/**
 * Creates a tiny deterministic PNG-like payload for ICO structure tests.
 *
 * Inputs: `size` is the intended square icon dimension in pixels.
 * Returns: a Buffer with a PNG signature and simple payload bytes.
 * Errors: does not throw for positive finite sizes used by tests.
 * Side effects: none.
 */
function makePngPayload(size) {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from(`size:${size}`, 'utf8')
  ]);
}

describe('createIcoBuffer', () => {
  test('writes an ICO header and directory entries for sorted PNG images', () => {
    const images = [
      { size: 32, png: makePngPayload(32) },
      { size: 16, png: makePngPayload(16) },
      { size: 256, png: makePngPayload(256) }
    ];

    const ico = createIcoBuffer(images);

    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
    expect(ico[6]).toBe(16);
    expect(ico[22]).toBe(32);
    expect(ico[38]).toBe(0);
  });

  test('rejects empty image lists before writing an invalid ICO', () => {
    expect(() => createIcoBuffer([])).toThrow(/at least one/i);
  });
});

describe('writeIconAssetSet', () => {
  test('writes one ICO plus 16px and 32px tray PNG files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'desktop-pet-icons-'));

    try {
      const sourcePath = join(directory, 'source.png');
      const outputDirectory = join(directory, 'build');
      await sharp({
        create: {
          width: 64,
          height: 64,
          channels: 4,
          background: { r: 80, g: 160, b: 220, alpha: 1 }
        }
      })
        .png()
        .toFile(sourcePath);

      const result = await writeIconAssetSet({ sourcePath, outputDirectory });
      const tray16 = await sharp(result.trayIcons[0].outputPath).metadata();
      const tray32 = await sharp(result.trayIcons[1].outputPath).metadata();

      expect(result.ico.outputPath).toBe(join(outputDirectory, 'icon.ico'));
      expect(result.ico.frameCount).toBe(7);
      expect(result.trayIcons.map((icon) => icon.size)).toEqual([16, 32]);
      expect(tray16).toMatchObject({ width: 16, height: 16 });
      expect(tray32).toMatchObject({ width: 32, height: 32 });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
