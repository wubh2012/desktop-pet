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
import { contextBridge, ipcRenderer } from 'electron';

import {
  isPetActionMode,
  isPetOneShotAction,
  type PetActionMode,
  type PetOneShotAction
} from '../shared/petActionMode.js';
import { isPetModelId, normalizePetModelId, type PetModelId } from '../shared/petModel.js';

/**
 * Safe renderer-facing API exposed through Electron context isolation.
 *
 * Inputs: renderer code calls the methods with callbacks or no arguments.
 * Returns: platform metadata, unsubscribe functions, or promises for main
 * process commands.
 * Errors: invalid IPC payloads are ignored by listener methods; command
 * promises reject only if Electron IPC invocation fails.
 * Side effects: methods register IPC listeners or ask the main process to show
 * native UI.
 */
export interface DesktopPetApi {
  readonly platform: NodeJS.Platform;
  /** Subscribes to persistent action mode changes and returns an unsubscribe callback. */
  onActionModeChanged(callback: (mode: PetActionMode) => void): () => void;
  /** Subscribes to one-shot action requests and returns an unsubscribe callback. */
  onOneShotAction(callback: (action: PetOneShotAction) => void): () => void;
  /** Subscribes to look-at-mouse toggle changes and returns an unsubscribe callback. */
  onLookAtMouseChanged(callback: (enabled: boolean) => void): () => void;
  /** Subscribes to selected pet model changes and returns an unsubscribe callback. */
  onPetModelChanged(callback: (modelId: PetModelId) => void): () => void;
  /** Reads the current main-process pet model selection. */
  getCurrentPetModel(): Promise<PetModelId>;
  /** Subscribes to persisted model yaw changes and returns an unsubscribe callback. */
  onModelYawChanged(callback: (yawRadians: number) => void): () => void;
  /** Requests that the main process open the native pet action context menu. */
  openPetActionMenu(): Promise<void>;
  /**
   * Reports renderer lifecycle status for the tray menu.
   *
   * Inputs: concise non-sensitive status text; blank and malformed payloads are
   * ignored by the main process.
   * Returns: nothing.
   * Errors: does not throw for normal IPC sends.
   * Side effects: sends one asynchronous IPC message to the main process.
   */
  reportRendererStatus(status: string): void;
}

const api: DesktopPetApi = {
  platform: process.platform,

  /**
   * Subscribes to tray-selected pet action changes.
   *
   * Inputs: `callback` receives only validated semantic modes.
   * Returns: an unsubscribe function for removing the IPC listener.
   * Errors: invalid IPC payloads are ignored.
   * Side effects: registers an Electron IPC listener until unsubscribed.
   */
  onActionModeChanged(callback: (mode: PetActionMode) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, value: unknown): void => {
      if (isPetActionMode(value)) {
        callback(value);
      }
    };

    ipcRenderer.on('pet-action-mode-changed', listener);

    return () => {
      ipcRenderer.removeListener('pet-action-mode-changed', listener);
    };
  },

  /**
   * Subscribes to tray-triggered one-shot pet actions.
   *
   * Inputs: `callback` receives only validated semantic interaction actions.
   * Returns: an unsubscribe function for removing the IPC listener.
   * Errors: invalid IPC payloads are ignored.
   * Side effects: registers an Electron IPC listener until unsubscribed.
   */
  onOneShotAction(callback: (action: PetOneShotAction) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, value: unknown): void => {
      if (isPetOneShotAction(value)) {
        callback(value);
      }
    };

    ipcRenderer.on('pet-one-shot-action', listener);

    return () => {
      ipcRenderer.removeListener('pet-one-shot-action', listener);
    };
  },

  /**
   * Subscribes to the tray look-at-mouse toggle.
   *
   * Inputs: `callback` receives a boolean enabled state.
   * Returns: an unsubscribe function for removing the IPC listener.
   * Errors: invalid IPC payloads are ignored.
   * Side effects: registers an Electron IPC listener until unsubscribed.
   */
  onLookAtMouseChanged(callback: (enabled: boolean) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, value: unknown): void => {
      if (typeof value === 'boolean') {
        callback(value);
      }
    };

    ipcRenderer.on('pet-look-at-mouse-changed', listener);

    return () => {
      ipcRenderer.removeListener('pet-look-at-mouse-changed', listener);
    };
  },

  /**
   * Subscribes to tray-selected Live2D pet model changes.
   *
   * Inputs: `callback` receives only validated bundled model ids.
   * Returns: an unsubscribe function for removing the IPC listener.
   * Errors: invalid IPC payloads are ignored.
   * Side effects: registers an Electron IPC listener until unsubscribed.
   */
  onPetModelChanged(callback: (modelId: PetModelId) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, value: unknown): void => {
      if (isPetModelId(value)) {
        callback(value);
      }
    };

    ipcRenderer.on('pet-model-changed', listener);

    return () => {
      ipcRenderer.removeListener('pet-model-changed', listener);
    };
  },

  /**
   * Reads the current main-process Live2D pet model selection.
   *
   * Inputs: none.
   * Returns: promise resolving to a safe bundled model id.
   * Errors: Electron IPC failures reject the promise; invalid values normalize
   * to the default model id.
   * Side effects: sends one invoke request to the main process.
   */
  async getCurrentPetModel(): Promise<PetModelId> {
    const value = await ipcRenderer.invoke('get-current-pet-model');

    return normalizePetModelId(value);
  },

  /**
   * Subscribes to tray-selected GLB model yaw changes.
   *
   * Inputs: `callback` receives finite radians only.
   * Returns: an unsubscribe function for removing the IPC listener.
   * Errors: invalid IPC payloads are ignored.
   * Side effects: registers an Electron IPC listener until unsubscribed.
   */
  onModelYawChanged(callback: (yawRadians: number) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, value: unknown): void => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        callback(value);
      }
    };

    ipcRenderer.on('pet-model-yaw-changed', listener);

    return () => {
      ipcRenderer.removeListener('pet-model-yaw-changed', listener);
    };
  },

  /**
   * Opens the native pet action context menu owned by the main process.
   *
   * Inputs: none.
   * Returns: a promise that resolves after the main process handles the request.
   * Errors: rejects if the IPC channel is unavailable or the main handler
   * throws.
   * Side effects: may display a native context menu over the pet window.
   */
  async openPetActionMenu(): Promise<void> {
    await ipcRenderer.invoke('open-pet-action-menu');
  },

  /**
   * Reports renderer lifecycle status to the main-process tray menu.
   *
   * Inputs: concise non-sensitive status text, such as model readiness.
   * Returns: nothing.
   * Errors: invalid values are ignored by the main process.
   * Side effects: sends one asynchronous IPC message.
   */
  reportRendererStatus(status: string): void {
    ipcRenderer.send('pet-renderer-status', status);
  }
};

contextBridge.exposeInMainWorld('desktopPet', api);
