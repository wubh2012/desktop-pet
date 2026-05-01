/**
 * Electron main process for the desktop pet shell.
 *
 * Responsibility: creates and owns the transparent desktop window lifecycle.
 * It does not render Three.js content, parse GLB files, or manage pet behavior.
 *
 * Side effects: creates native windows, changes process lifecycle behavior, and
 * loads either the development server URL or production renderer files.
 *
 * Key dependencies and constraints: runs in Electron's main process, must keep
 * context isolation enabled for the renderer, and should avoid exposing Node.js
 * APIs directly to web content.
 */
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  Tray,
  type IpcMainInvokeEvent
} from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendFileSync } from 'node:fs';

import {
  applySavedWindowBounds,
  readDebugWindowBounds,
  readModelYaw,
  writeModelYaw,
  writeDebugWindowBounds,
  type WindowBounds
} from './windowSettings.js';
import { resolveWindowMode } from './windowMode.js';
import { createTrayImage } from './trayIcon.js';
import { buildModelOrientationMenuTemplate } from './modelOrientationMenu.js';
import {
  startPetCommandServer,
  type PetCommandServer
} from './petCommandServer.js';
import {
  buildPetActionMenuTemplate,
  type PetActionMenuHandlers,
  type PetActionMenuState
} from './petActionMenu.js';
import type { PetCommand } from '../shared/petCommand.js';
import { type PetActionMode, type PetOneShotAction } from '../shared/petActionMode.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFile);
const debugLogPath = join(process.cwd(), 'desktop-pet-debug.log');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let petCommandServer: PetCommandServer | null = null;
let debugWindowMode = false;
let currentActionMode: PetActionMode = 'idle';
let lookAtMouseEnabled = false;
let currentModelYawRadians = 0;
let isQuitting = false;
let saveDebugBoundsTimer: NodeJS.Timeout | null = null;

/**
 * Writes a main-process debug line when diagnostics are enabled.
 *
 * Inputs: text message without sensitive information.
 * Returns: nothing.
 * Errors: filesystem errors are ignored because diagnostics must not affect app
 * behavior.
 * Side effects: appends to `desktop-pet-debug.log` in the project directory.
 */
function writeDebugLog(message: string): void {
  if (process.env.DESKTOP_PET_DEBUG_RENDERER !== '1') {
    return;
  }

  try {
    appendFileSync(debugLogPath, `[${new Date().toISOString()}] ${message}\n`, 'utf8');
  } catch {
    // Debug-only best effort logging.
  }
}

/**
 * Creates the single desktop pet window.
 *
 * Inputs: none. Window dimensions and behavior are fixed for the MVP.
 * Returns: the created `BrowserWindow` instance.
 * Errors: Electron surfaces native creation or load failures through rejected
 * load promises or process-level errors; this function does not swallow them.
 * Side effects: allocates a native transparent always-on-top window.
 */
function createMainWindow(): BrowserWindow {
  writeDebugLog('createMainWindow:start');
  const baseMode = resolveWindowMode(debugWindowMode);
  const mode = applySavedWindowBounds(
    baseMode,
    readDebugWindowBounds(getSettingsPath(), baseMode)
  );
  let initialRendererStateSent = false;
  const window = new BrowserWindow({
    x: mode.x,
    y: mode.y,
    width: mode.width,
    height: mode.height,
    minWidth: mode.minWidth,
    minHeight: mode.minHeight,
    transparent: mode.transparent,
    frame: mode.frame,
    resizable: mode.resizable,
    show: false,
    alwaysOnTop: true,
    hasShadow: mode.hasShadow,
    skipTaskbar: mode.skipTaskbar,
    autoHideMenuBar: true,
    backgroundColor: mode.backgroundColor,
    title: mode.title,
    webPreferences: {
      preload: join(currentDirectory, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  writeDebugLog('createMainWindow:created');

  window.setMenu(null);
  window.setAlwaysOnTop(true, 'screen-saver');

  if (process.env.DESKTOP_PET_DEBUG_RENDERER === '1') {
    window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      console.log(`[renderer:${level}] ${sourceId}:${line} ${message}`);
      writeDebugLog(`[renderer:${level}] ${sourceId}:${line} ${message}`);
    });
  }

  window.on('close', (event) => {
    writeDebugLog(`window:close debug=${debugWindowMode} quitting=${isQuitting}`);
    if (debugWindowMode) {
      saveDebugWindowBoundsNow(window);
    }

    if (!isQuitting) {
      event.preventDefault();
      window.hide();
    }
  });

  window.on('resize', () => {
    writeDebugLog(`window:resize ${JSON.stringify(window.getBounds())}`);
    scheduleDebugWindowBoundsSave(window);
  });

  window.on('move', () => {
    writeDebugLog(`window:move ${JSON.stringify(window.getBounds())}`);
    scheduleDebugWindowBoundsSave(window);
  });
  window.on('closed', () => {
    writeDebugLog('window:closed');
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    writeDebugLog(`renderer:gone ${JSON.stringify(details)}`);
  });
  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    writeDebugLog(`renderer:did-fail-load code=${errorCode} description=${errorDescription} url=${validatedURL}`);
  });
  window.webContents.on('did-finish-load', () => {
    writeDebugLog('renderer:did-finish-load');
  });

  const showWindowOnce = (): void => {
    if (!initialRendererStateSent) {
      initialRendererStateSent = true;
      showMainWindowAndSendInitialState(window);
    }
  };

  window.once('ready-to-show', showWindowOnce);
  window.once('ready-to-show', () => {
    writeDebugLog('window:ready-to-show');
  });
  window.webContents.once('did-finish-load', showWindowOnce);
  setTimeout(showWindowOnce, 1000);

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(currentDirectory, '../renderer/index.html'));
  }

  return window;
}

/**
 * Shows a renderer window and sends current main-process pet state.
 *
 * Inputs: `window` is the BrowserWindow created by `createMainWindow`.
 * Returns: nothing.
 * Errors: destroyed windows are ignored.
 * Side effects: shows/focuses native UI and emits initial renderer IPC state.
 */
function showMainWindowAndSendInitialState(window: BrowserWindow): void {
  if (window.isDestroyed()) {
    writeDebugLog('showMainWindow:destroyed');
    return;
  }

  writeDebugLog(`showMainWindow:before ${JSON.stringify(window.getBounds())}`);
  window.show();
  window.setAlwaysOnTop(true, 'screen-saver');
  window.moveTop();
  window.focus();
  writeDebugLog(`showMainWindow:after visible=${window.isVisible()} focused=${window.isFocused()} ${JSON.stringify(window.getBounds())}`);
  sendActionModeToRenderer(window);
  sendLookAtMouseToRenderer(window);
  sendModelYawToRenderer(window);
}


/**
 * Resolves the settings JSON path for this app.
 *
 * Inputs: none.
 * Returns: path under Electron `userData`.
 * Errors: Electron may throw if called before app readiness; callers only use
 * this after `app.whenReady`.
 * Side effects: none.
 */
function getSettingsPath(): string {
  return join(app.getPath('userData'), 'desktop-pet-settings.json');
}

/**
 * Schedules a best-effort debug-window bounds save.
 *
 * Inputs: `window` is the debug BrowserWindow whose bounds may have changed.
 * Returns: nothing.
 * Errors: does not throw.
 * Side effects: resets a short timer that will write local settings if debug
 * mode is still active.
 */
function scheduleDebugWindowBoundsSave(window: BrowserWindow): void {
  if (!debugWindowMode) {
    return;
  }

  if (saveDebugBoundsTimer) {
    clearTimeout(saveDebugBoundsTimer);
  }

  saveDebugBoundsTimer = setTimeout(() => {
    saveDebugWindowBoundsNow(window);
  }, 300);
}

/**
 * Saves current debug-window bounds immediately.
 *
 * Inputs: `window` is expected to be a debug BrowserWindow.
 * Returns: nothing.
 * Errors: does not throw; persistence is best-effort.
 * Side effects: writes non-sensitive bounds to the local user settings file.
 */
function saveDebugWindowBoundsNow(window: BrowserWindow): void {
  if (!debugWindowMode || window.isDestroyed()) {
    return;
  }

  const bounds: WindowBounds = window.getBounds();
  writeDebugWindowBounds(getSettingsPath(), bounds);
}

/**
 * Builds the tray context menu for pet visibility and debug mode controls.
 *
 * Inputs: none; reads the current debug mode and window visibility.
 * Returns: an Electron menu instance ready for `Tray.setContextMenu`.
 * Errors: does not throw unless Electron menu construction fails.
 * Side effects: menu item click handlers may show, hide, recreate, or quit the
 * app when invoked by the user.
 */
function buildTrayMenu(): Menu {
  const visible = mainWindow?.isVisible() ?? false;
  const modelOrientationTemplate = buildModelOrientationMenuTemplate(
    { debugWindowMode, currentYawRadians: currentModelYawRadians },
    { setModelYaw }
  );

  return Menu.buildFromTemplate([
    {
      label: visible ? '隐藏宠物' : '显示宠物',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          mainWindow = createMainWindow();
        }

        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }

        refreshTrayMenu();
      }
    },
    {
      label: '调试窗口模式',
      type: 'checkbox',
      checked: debugWindowMode,
      click: () => {
        setDebugWindowMode(!debugWindowMode);
      }
    },
    ...modelOrientationTemplate,
    {
      label: '小猫互动',
      submenu: buildPetActionMenuTemplate(getPetActionMenuState(), getPetActionMenuHandlers())
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
}

/**
 * Creates the tray icon and its initial menu.
 *
 * Inputs: none.
 * Returns: nothing.
 * Errors: Electron throws if the platform cannot create a tray icon.
 * Side effects: creates a native system tray icon and attaches click/menu
 * handlers for this process.
 */
function initializeTray(): void {
  tray = new Tray(
    createTrayImage(nativeImage, {
      isPackaged: app.isPackaged,
      cwd: process.cwd(),
      resourcesPath: process.resourcesPath
    })
  );
  tray.setToolTip('Desktop Pet');
  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
    refreshTrayMenu();
  });
  refreshTrayMenu();
}

/**
 * Refreshes tray menu labels and checkbox state.
 *
 * Inputs: none.
 * Returns: nothing.
 * Errors: does not throw when the tray has not been initialized.
 * Side effects: replaces the native tray context menu.
 */
function refreshTrayMenu(): void {
  tray?.setContextMenu(buildTrayMenu());
}

/**
 * Reads the current action menu state for tray and pet context menus.
 *
 * Inputs: none; reads in-memory main-process state.
 * Returns: the current radio and checkbox state for menu rendering.
 * Errors: does not throw.
 * Side effects: none.
 */
function getPetActionMenuState(): PetActionMenuState {
  return {
    currentActionMode,
    lookAtMouseEnabled
  };
}

/**
 * Creates action menu handlers bound to this process state.
 *
 * Inputs: none; captures local state mutator functions.
 * Returns: callbacks used by Electron menu item click handlers.
 * Errors: callbacks do not throw for validated menu values.
 * Side effects: returned callbacks may update state, refresh tray menus, and
 * send IPC to the renderer when the user selects a menu item.
 */
function getPetActionMenuHandlers(): PetActionMenuHandlers {
  return {
    setActionMode,
    triggerOneShotAction,
    setLookAtMouseEnabled
  };
}

/**
 * Builds a native Electron menu for direct pet action control.
 *
 * Inputs: none; reads current action state.
 * Returns: a native `Menu` containing only pet action items.
 * Errors: Electron may throw if template construction fails.
 * Side effects: none until the returned menu is shown and clicked.
 */
function buildPetActionMenu(): Menu {
  return Menu.buildFromTemplate(
    buildPetActionMenuTemplate(getPetActionMenuState(), getPetActionMenuHandlers())
  );
}

/**
 * Opens the pet action context menu for a renderer-owned window.
 *
 * Inputs: `window` is the BrowserWindow that requested the menu.
 * Returns: nothing.
 * Errors: does not throw for destroyed windows.
 * Side effects: shows a native context menu owned by Electron.
 */
function popupPetActionMenu(window: BrowserWindow): void {
  if (window.isDestroyed()) {
    return;
  }

  buildPetActionMenu().popup({ window });
}

/**
 * Handles renderer requests to open the native pet action menu.
 *
 * Inputs: Electron invoke event whose sender is expected to be the pet window.
 * Returns: nothing.
 * Errors: does not throw when the sender has no BrowserWindow.
 * Side effects: may show the native context menu.
 */
function handleOpenPetActionMenu(event: IpcMainInvokeEvent): void {
  const sourceWindow = BrowserWindow.fromWebContents(event.sender);

  if (sourceWindow) {
    popupPetActionMenu(sourceWindow);
  }
}

/**
 * Sets the current tray-selected pet action mode.
 *
 * Inputs: `mode` is the validated user-selected action mode.
 * Returns: nothing.
 * Errors: does not throw.
 * Side effects: updates in-memory state, sends IPC to the renderer, and
 * refreshes tray radio state.
 */
function setActionMode(mode: PetActionMode): void {
  currentActionMode = mode;

  if (mainWindow && !mainWindow.isDestroyed()) {
    sendActionModeToRenderer(mainWindow);
  }

  refreshTrayMenu();
}

/**
 * Triggers a one-shot action in the renderer.
 *
 * Inputs: `action` is a semantic one-shot interaction id.
 * Returns: nothing.
 * Errors: does not throw.
 * Side effects: emits one IPC message to renderer code.
 */
function triggerOneShotAction(action: PetOneShotAction): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pet-one-shot-action', action);
  }
}

/**
 * Dispatches a validated external command to local app behavior.
 *
 * Inputs: parsed pet command from the local HTTP API.
 * Returns: nothing.
 * Errors: does not throw for known command variants.
 * Side effects: may update menu state, send renderer IPC, or refresh the tray.
 */
function dispatchPetCommand(command: PetCommand): void {
  switch (command.type) {
    case 'mode':
      setActionMode(command.mode);
      return;
    case 'action':
      triggerOneShotAction(command.action);
      return;
    case 'lookAtMouse':
      setLookAtMouseEnabled(command.enabled);
      return;
  }
}

/**
 * Sets whether renderer should steer the pet toward the mouse pointer.
 *
 * Inputs: boolean enabled state.
 * Returns: nothing.
 * Errors: does not throw.
 * Side effects: updates menu state, sends IPC to renderer, and refreshes tray.
 */
function setLookAtMouseEnabled(enabled: boolean): void {
  lookAtMouseEnabled = enabled;

  if (mainWindow && !mainWindow.isDestroyed()) {
    sendLookAtMouseToRenderer(mainWindow);
  }

  refreshTrayMenu();
}

/**
 * Sets the GLB model base yaw from the debug tray menu.
 *
 * Inputs: `yawRadians` is a finite Y-axis rotation in radians.
 * Returns: nothing.
 * Errors: invalid yaw values are ignored.
 * Side effects: updates in-memory state, persists settings, sends IPC to the
 * renderer, and refreshes tray radio state.
 */
function setModelYaw(yawRadians: number): void {
  if (!Number.isFinite(yawRadians)) {
    return;
  }

  currentModelYawRadians = yawRadians;
  writeModelYaw(getSettingsPath(), currentModelYawRadians);

  if (mainWindow && !mainWindow.isDestroyed()) {
    sendModelYawToRenderer(mainWindow);
  }

  refreshTrayMenu();
}

/**
 * Sends the current pet action mode to a renderer window.
 *
 * Inputs: target `BrowserWindow`.
 * Returns: nothing.
 * Errors: does not throw for destroyed windows.
 * Side effects: emits one IPC message to renderer code.
 */
function sendActionModeToRenderer(window: BrowserWindow): void {
  if (!window.isDestroyed()) {
    window.webContents.send('pet-action-mode-changed', currentActionMode);
  }
}

/**
 * Sends current look-at-mouse state to a renderer window.
 *
 * Inputs: target `BrowserWindow`.
 * Returns: nothing.
 * Errors: does not throw for destroyed windows.
 * Side effects: emits one IPC message to renderer code.
 */
function sendLookAtMouseToRenderer(window: BrowserWindow): void {
  if (!window.isDestroyed()) {
    window.webContents.send('pet-look-at-mouse-changed', lookAtMouseEnabled);
  }
}

/**
 * Sends current persisted GLB yaw to a renderer window.
 *
 * Inputs: target `BrowserWindow`.
 * Returns: nothing.
 * Errors: does not throw for destroyed windows.
 * Side effects: emits one IPC message to renderer code.
 */
function sendModelYawToRenderer(window: BrowserWindow): void {
  if (!window.isDestroyed()) {
    window.webContents.send('pet-model-yaw-changed', currentModelYawRadians);
  }
}

/**
 * Starts the local HTTP command API if the port is available.
 *
 * Inputs: none; uses fixed localhost settings for the MVP.
 * Returns: promise resolved after startup attempt finishes.
 * Errors: startup failures are logged and swallowed so the desktop pet still
 * opens even if the API port is occupied.
 * Side effects: may bind `127.0.0.1:17321`.
 */
async function startLocalCommandApi(): Promise<void> {
  try {
    petCommandServer = await startPetCommandServer({
      host: '127.0.0.1',
      port: 17321,
      onCommand: dispatchPetCommand
    });
    console.info(`Desktop Pet command API listening on ${petCommandServer.url}`);
  } catch (error) {
    console.error('Failed to start Desktop Pet command API.', error);
  }
}

/**
 * Toggles debug window mode by recreating the BrowserWindow.
 *
 * Inputs: `enabled` true creates a framed, resizable debug window; false
 * returns to compact transparent desktop-pet mode.
 * Returns: nothing.
 * Errors: native window creation errors surface through Electron.
 * Side effects: destroys the current window if present and creates a new one.
 */
function setDebugWindowMode(enabled: boolean): void {
  if (debugWindowMode === enabled) {
    return;
  }

  const previousDebugMode = debugWindowMode;
  const previousWindow = mainWindow;

  if (previousDebugMode && previousWindow && !previousWindow.isDestroyed()) {
    saveDebugWindowBoundsNow(previousWindow);
  }

  debugWindowMode = enabled;
  mainWindow = createMainWindow();

  if (previousWindow && !previousWindow.isDestroyed()) {
    previousWindow.destroy();
  }

  refreshTrayMenu();
}

app.whenReady().then(() => {
  writeDebugLog('app:ready');
  app.setName('Desktop Pet');
  currentModelYawRadians = readModelYaw(getSettingsPath()) ?? currentModelYawRadians;
  ipcMain.handle('open-pet-action-menu', handleOpenPetActionMenu);

  mainWindow = createMainWindow();
  initializeTray();
  void startLocalCommandApi();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  void petCommandServer?.close();
  petCommandServer = null;
});

app.on('window-all-closed', () => {
  writeDebugLog(`app:window-all-closed quitting=${isQuitting}`);
  mainWindow = null;
  if (isQuitting) {
    app.quit();
  }
});

app.on('before-quit', () => {
  writeDebugLog('app:before-quit');
});

app.on('will-quit', () => {
  writeDebugLog('app:will-quit');
});

process.on('uncaughtException', (error) => {
  writeDebugLog(`process:uncaughtException ${error.stack ?? error.message}`);
});

process.on('unhandledRejection', (reason) => {
  writeDebugLog(`process:unhandledRejection ${String(reason)}`);
});
