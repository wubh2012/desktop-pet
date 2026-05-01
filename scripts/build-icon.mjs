/**
 * CLI entry point for generating the Electron Windows application icon.
 *
 * Responsibility: reads one source image path from the command line, defaulting
 * to `scripts/app.png`, and writes `build/icon.ico`, `build/tray-16.png`, and
 * `build/tray-32.png`. It does not update package configuration, clear Windows
 * icon caches, or run electron-builder.
 *
 * Side effects: reads the source image, creates the output directory, writes an
 * ICO file, and prints non-sensitive status lines.
 *
 * Key dependencies and constraints: delegates image resizing and ICO assembly
 * to `iconBuilder.mjs`; run from the project root for the default output path.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { writeIconAssetSet } from './iconBuilder.mjs';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

/**
 * Parses CLI arguments into icon generation paths.
 *
 * Inputs: `argv` is usually `process.argv`, with optional source image at index
 * 2 and optional output directory at index 3.
 * Returns: `{ sourcePath, outputDirectory }` with absolute paths.
 * Errors: does not throw for missing optional arguments.
 * Side effects: none.
 */
export function parseIconCliArgs(argv) {
  const sourcePath = argv[2] ?? resolve(currentDirectory, 'app.png');
  const outputDirectory = argv[3] ?? 'build';

  return {
    sourcePath: resolve(sourcePath),
    outputDirectory: resolve(outputDirectory)
  };
}

/**
 * Runs the icon generation command.
 *
 * Inputs: `argv` follows Node CLI argument conventions.
 * Returns: a promise that resolves after the ICO file is written.
 * Errors: rejects for invalid arguments, unreadable images, or write failures.
 * Side effects: writes the ICO file and prints status lines.
 */
export async function runIconCli(argv) {
  const { sourcePath, outputDirectory } = parseIconCliArgs(argv);
  const result = await writeIconAssetSet({ sourcePath, outputDirectory });

  console.info(`Icon written: ${result.ico.outputPath}`);
  console.info(`Icon frames: ${result.ico.frameCount}`);
  for (const trayIcon of result.trayIcons) {
    console.info(`Tray ${trayIcon.size}px written: ${trayIcon.outputPath}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runIconCli(process.argv).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
