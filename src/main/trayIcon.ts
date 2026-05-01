/**
 * Tray icon loading helpers for the Electron main process.
 *
 * Responsibility: resolves and creates the native tray icon used at runtime in
 * development and packaged builds. It does not generate icon files, configure
 * installers, or own tray menu behavior.
 *
 * Side effects: `createTrayImage` reads generated PNG files through Electron's
 * native image API when they exist; pure path helpers have no side effects.
 *
 * Key dependencies and constraints: runs in the Electron main process when
 * creating images. Packaged builds expect electron-builder to copy tray PNGs to
 * `process.resourcesPath`.
 */
import type { NativeImage } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const fallbackTrayPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAHuSURBVFhH7ZY9SwNBEIbzTyJEsIg2aqEIEoSARUBQEFIIAYuAaCEpRAuJhaRQU2gqG8VCsTCN2kQLxUKx8AMiFoqFCoKCKAgKFivvwcpm5nZv7xTSXPHkSPZu5tmPmUskGosnorF4vl5E8NHQ2CzqRSgQCgQW6EmmxGA680tvaoDdY4NvgemZgri6vhGfX9+M27t7MV8siaZ4G3tOh7UAZnxyesaSugHBvv40i+GGlcB4blK8vX+wRF7MFhZYLIqnAGYeJLkE54PG9CVgu+w6Hh6fREtrJ4trJYADRwMGYX2zzGJbCeBU02Dg8OhYuy1uY/iuWwWtAOqaBkcgnAmMIyCW12YMDGdHWQ6jwMhYjgnQpVwsLVuNAV1FaAUmpvJMALNSm4x6QE1jAA2K5jAKoPapAECTmSsuicr+ga8x3wLoZDTIX8CW0hxGASzn88srC0QPF0U33tWdZDmMAmB1baMmyPlFVbR3JLT9Yau87YjjQNY8d1llsa0EkEydEfZWjmGLsN9Ihqv6Ol5RxFGeple1UQCgftXZ7OxWHDF6H8DvanKgKz+JpwCgW4FZyZkPZbLOFYlpB9xTVkyHlQBAWbodSjcg4jVzibUAwBKj19OEKn7+jABfAhKUFDolmosElSHfBX4IJPCfhAKhwA8hqC3zfwzKjQAAAABJRU5ErkJggg==';

export interface TrayIconPathOptions {
  /** Whether Electron is running from a packaged application. */
  isPackaged: boolean;
  /** Project root during development, normally `process.cwd()`. */
  cwd: string;
  /** Electron packaged resources directory, normally `process.resourcesPath`. */
  resourcesPath: string;
  /** Optional filesystem existence check override for tests. */
  exists?: (path: string) => boolean;
}

/**
 * Minimal native image factory contract used by tray icon creation.
 *
 * Inputs: paths or data URLs supplied by `createTrayImage`.
 * Returns: Electron `NativeImage` instances.
 * Errors: follows Electron's native image behavior; invalid paths may produce
 * empty images rather than throwing.
 * Side effects: `createFromPath` may read image files from disk.
 */
export interface NativeImageFactory {
  createFromPath(path: string): NativeImage;
  createFromDataURL(dataUrl: string): NativeImage;
}

/**
 * Runtime options for creating the final tray image.
 *
 * Inputs: extends path resolution options and optionally overrides displayed
 * tray size in pixels.
 * Returns: used only as structured input; no direct return value.
 * Errors: invalid paths simply lead to fallback image behavior.
 * Side effects: none by itself.
 */
export interface TrayImageOptions extends TrayIconPathOptions {
  /** Display size in pixels for the final tray image; defaults to 16. */
  size?: number;
}

/**
 * Resolves the generated tray icon path for the current runtime mode.
 *
 * Inputs: `isPackaged` selects packaged resources vs project `build/`; `cwd` is
 * the project root during development; `resourcesPath` is Electron's packaged
 * resources directory; `exists` optionally injects filesystem checks for tests.
 * Returns: the first existing tray PNG path, preferring 32px, or `null`.
 * Errors: does not throw for normal path strings.
 * Side effects: reads filesystem existence unless `exists` is injected.
 */
export function resolveTrayIconPath({
  isPackaged,
  cwd,
  resourcesPath,
  exists = existsSync
}: TrayIconPathOptions): string | null {
  const baseDirectory = isPackaged ? resourcesPath : join(cwd, 'build');
  const candidates = [
    join(baseDirectory, 'tray-32.png'),
    join(baseDirectory, 'tray-16.png')
  ];

  return candidates.find((candidate) => exists(candidate)) ?? null;
}

/**
 * Creates the Electron tray image from generated PNG assets with a fallback.
 *
 * Inputs: `nativeImageApi` is Electron's native image factory; options describe
 * runtime mode and filesystem roots. `size` defaults to 16 display pixels.
 * Returns: a non-template `NativeImage` resized for Windows tray usage.
 * Errors: does not throw for missing generated assets; Electron image decoding
 * problems fall back to the embedded icon when an empty image is returned.
 * Side effects: may read a generated tray PNG from disk.
 */
export function createTrayImage(
  nativeImageApi: NativeImageFactory,
  options: TrayImageOptions
): NativeImage {
  const trayIconPath = resolveTrayIconPath(options);
  const image =
    trayIconPath === null
      ? createFallbackTrayImage(nativeImageApi)
      : nativeImageApi.createFromPath(trayIconPath);
  const finalImage = image.isEmpty() ? createFallbackTrayImage(nativeImageApi) : image;

  finalImage.setTemplateImage(false);

  return finalImage.resize({ width: options.size ?? 16, height: options.size ?? 16 });
}

/**
 * Creates the embedded fallback tray image.
 *
 * Inputs: `nativeImageApi` is Electron's native image factory.
 * Returns: a `NativeImage` decoded from the built-in PNG data URL.
 * Errors: Electron returns an empty image if decoding fails.
 * Side effects: none.
 */
function createFallbackTrayImage(nativeImageApi: NativeImageFactory): NativeImage {
  return nativeImageApi.createFromDataURL(`data:image/png;base64,${fallbackTrayPngBase64}`);
}
