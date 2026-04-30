/**
 * Preload bridge for the desktop pet renderer.
 *
 * Responsibility: exposes a tiny, read-only API to renderer code while keeping
 * Electron and Node.js internals hidden. It does not perform file I/O, window
 * creation, or model rendering.
 *
 * Side effects: registers values on `window` through Electron's context bridge.
 * Key dependencies and constraints: must run with `contextIsolation` enabled
 * and should only expose serializable, non-sensitive data.
 */
import { contextBridge } from 'electron';

export interface DesktopPetApi {
  readonly platform: NodeJS.Platform;
}

const api: DesktopPetApi = {
  platform: process.platform
};

contextBridge.exposeInMainWorld('desktopPet', api);
