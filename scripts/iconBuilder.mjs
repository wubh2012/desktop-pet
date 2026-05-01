/**
 * Icon generation helpers for Electron packaging.
 *
 * Responsibility: converts a source image into multiple PNG icon frames and
 * assembles them into a Windows ICO file for electron-builder. It does not
 * modify package metadata, sign installers, or validate how Windows displays
 * the final icon in shell caches.
 *
 * Side effects: `writeIcoFromImage` reads the source image and writes the ICO
 * file; lower-level helpers are pure.
 *
 * Key dependencies and constraints: uses Sharp for image decoding/resizing and
 * writes ICO entries that embed PNG payloads, which is suitable for modern
 * Windows and Electron installer tooling.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import sharp from 'sharp';

export const DEFAULT_ICON_SIZES = [16, 24, 32, 48, 64, 128, 256];
export const DEFAULT_TRAY_ICON_SIZES = [16, 32];

/**
 * Builds a Windows ICO buffer from pre-rendered square PNG images.
 *
 * Inputs: `images` is a non-empty array of `{ size, png }` objects. `size` is
 * the square frame dimension in pixels from 1 to 256; `png` is a non-empty
 * Buffer containing that frame's PNG bytes.
 * Returns: a Buffer containing an ICO header, directory entries, and image data.
 * Errors: throws `Error` when the list is empty, a size is outside the ICO byte
 * range, or a PNG payload is missing.
 * Side effects: none.
 */
export function createIcoBuffer(images) {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('ICO generation requires at least one image.');
  }

  const sortedImages = [...images].sort((left, right) => left.size - right.size);
  const headerSize = 6;
  const entrySize = 16;
  const directorySize = headerSize + sortedImages.length * entrySize;
  let imageOffset = directorySize;

  const header = Buffer.alloc(directorySize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sortedImages.length, 4);

  for (const [index, image] of sortedImages.entries()) {
    validateIcoImage(image);

    const entryOffset = headerSize + index * entrySize;
    header[entryOffset] = image.size === 256 ? 0 : image.size;
    header[entryOffset + 1] = image.size === 256 ? 0 : image.size;
    header[entryOffset + 2] = 0;
    header[entryOffset + 3] = 0;
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(image.png.length, entryOffset + 8);
    header.writeUInt32LE(imageOffset, entryOffset + 12);
    imageOffset += image.png.length;
  }

  return Buffer.concat([header, ...sortedImages.map((image) => image.png)]);
}

/**
 * Renders square transparent PNG frames from a source image.
 *
 * Inputs: `sourcePath` is a local path readable by Sharp. `sizes` is an array of
 * target square pixel dimensions; empty values are rejected by lower-level ICO
 * validation after rendering.
 * Returns: a promise resolving to `{ size, png }` frame objects.
 * Errors: rejects if the source file cannot be read/decoded or Sharp cannot
 * render a requested size.
 * Side effects: reads the source image file.
 */
export async function renderIconPngFrames(sourcePath, sizes = DEFAULT_ICON_SIZES) {
  return Promise.all(
    sizes.map(async (size) => ({
      size,
      png: await renderSquarePng(sourcePath, size)
    }))
  );
}

/**
 * Converts a source image into a Windows ICO file on disk.
 *
 * Inputs: `sourcePath` points to the source image; `outputPath` is the target
 * `.ico` file; `sizes` optionally overrides the default frame dimensions.
 * Returns: a promise resolving to metadata about the written ICO file.
 * Errors: rejects on image decoding, invalid ICO input, directory creation, or
 * file write failures.
 * Side effects: creates the output directory if needed and writes `outputPath`.
 */
export async function writeIcoFromImage({ sourcePath, outputPath, sizes = DEFAULT_ICON_SIZES }) {
  const frames = await renderIconPngFrames(sourcePath, sizes);
  const ico = createIcoBuffer(frames);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, ico);

  return {
    outputPath,
    frameCount: frames.length,
    byteLength: ico.length
  };
}

/**
 * Writes a square transparent PNG icon frame to disk.
 *
 * Inputs: `sourcePath` is any image Sharp can decode; `outputPath` is the target
 * PNG path; `size` is the square frame dimension in pixels.
 * Returns: a promise resolving to metadata for the written PNG.
 * Errors: rejects on invalid source images, unsupported sizes, directory
 * creation failures, or write failures.
 * Side effects: creates the output directory if needed and writes `outputPath`.
 */
export async function writePngIconFrame({ sourcePath, outputPath, size }) {
  const png = await renderSquarePng(sourcePath, size);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, png);

  return {
    outputPath,
    size,
    byteLength: png.length
  };
}

/**
 * Generates all icon assets consumed by development and packaged builds.
 *
 * Inputs: `sourcePath` points to the source artwork; `outputDirectory` is where
 * `icon.ico`, `tray-16.png`, and `tray-32.png` are written.
 * Returns: metadata for the ICO and tray PNG files.
 * Errors: rejects when source decoding, resizing, or filesystem writes fail.
 * Side effects: creates `outputDirectory` as needed and writes icon assets.
 */
export async function writeIconAssetSet({ sourcePath, outputDirectory }) {
  const ico = await writeIcoFromImage({
    sourcePath,
    outputPath: join(outputDirectory, 'icon.ico')
  });
  const trayIcons = await Promise.all(
    DEFAULT_TRAY_ICON_SIZES.map((size) =>
      writePngIconFrame({
        sourcePath,
        outputPath: join(outputDirectory, `tray-${size}.png`),
        size
      })
    )
  );

  return {
    ico,
    trayIcons
  };
}

/**
 * Renders a source image into one square transparent PNG buffer.
 *
 * Inputs: `sourcePath` is a local image path; `size` is the square output
 * dimension in pixels.
 * Returns: a PNG Buffer.
 * Errors: rejects when Sharp cannot decode or resize the source image.
 * Side effects: reads the source image.
 */
async function renderSquarePng(sourcePath, size) {
  return sharp(sourcePath)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();
}


/**
 * Validates a single PNG frame before it is referenced from the ICO directory.
 *
 * Inputs: `image` is a candidate frame object.
 * Returns: nothing when the frame satisfies ICO constraints.
 * Errors: throws `Error` for invalid size or missing payload.
 * Side effects: none.
 */
function validateIcoImage(image) {
  if (!Number.isInteger(image?.size) || image.size < 1 || image.size > 256) {
    throw new Error(`Invalid ICO image size: ${image?.size}`);
  }

  if (!Buffer.isBuffer(image.png) || image.png.length === 0) {
    throw new Error(`Missing PNG payload for ${image.size}px ICO image.`);
  }
}
