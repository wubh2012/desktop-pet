/**
 * Electron Vite configuration for the desktop pet app.
 *
 * Responsibility: defines the main, preload, and renderer entry points for local
 * development and production builds. It does not create windows or render the
 * pet; those side effects live in the Electron and renderer entry files.
 *
 * Key dependencies: electron-vite and Vite. The config must remain compatible
 * with Electron's isolated preload model and browser-based renderer modules.
 */
import { defineConfig } from 'electron-vite';
import { resolve } from 'node:path';

/**
 * Creates the build configuration consumed by electron-vite.
 *
 * Inputs: none at runtime; paths are resolved relative to the project root.
 * Returns: electron-vite config with explicit entry files for each process.
 * Errors: configuration errors surface through electron-vite during dev/build.
 * Side effects: none; this module only exports configuration data.
 */
export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/main/index.ts')
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/preload/index.ts')
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    publicDir: resolve(__dirname, 'public'),
    base: './'
  }
});
