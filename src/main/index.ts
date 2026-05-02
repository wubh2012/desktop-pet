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
  screen,
  Tray,
  type IpcMainEvent,
  type IpcMainInvokeEvent
} from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendFileSync } from 'node:fs';

import {
  applySavedWindowBounds,
  createContentSizedWindowBounds,
  readDebugWindowBounds,
  readPetModelId,
  readModelYaw,
  readReminderSettings,
  writePetModelId,
  writeModelYaw,
  writeDebugWindowBounds,
  type WindowBounds
} from './windowSettings.js';
import { calculateBubbleWindowBounds } from './bubbleWindowBounds.js';
import { resolveWindowMode } from './windowMode.js';
import { createTrayImage } from './trayIcon.js';
import {
  startPetCommandServer,
  type PetCommandServer
} from './petCommandServer.js';
import { buildPetContextMenuTemplate, type PetContextMenuHandlers } from './petActionMenu.js';
import { buildTrayMenuTemplate } from './trayMenu.js';
import { normalizeRendererStatusLabel } from './rendererStatus.js';
import { registerSystemContextMenuSuppression } from './systemContextMenu.js';
import { parsePetCommand, type PetCommand } from '../shared/petCommand.js';
import { type PetActionMode, type PetOneShotAction } from '../shared/petActionMode.js';
import { type PetModelId } from '../shared/petModel.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFile);
const debugLogPath = join(process.cwd(), 'desktop-pet-debug.log');

const BUBBLE_WINDOW_SIZE = { width: 320, height: 104 } as const;

let mainWindow: BrowserWindow | null = null;
let bubbleWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let petCommandServer: PetCommandServer | null = null;
let hideBubbleTimer: NodeJS.Timeout | null = null;
let debugWindowMode = false;
let currentActionMode: PetActionMode = 'idle';
let currentPetModelId: PetModelId = 'tororo';
let lookAtMouseEnabled = true;
let currentModelYawRadians = 0;
let isQuitting = false;
let saveDebugBoundsTimer: NodeJS.Timeout | null = null;
let rendererStatusLabel = '桌宠状态：启动中';

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
    useContentSize: mode.useContentSize,
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
  registerSystemContextMenuSuppression(window, { enabled: !mode.frame });

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
    positionBubbleWindow();
  });

  window.on('move', () => {
    writeDebugLog(`window:move ${JSON.stringify(window.getBounds())}`);
    scheduleDebugWindowBoundsSave(window);
    positionBubbleWindow();
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
  sendPetModelToRenderer(window);
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
 * Side effects: writes non-sensitive bounds to the local user settings file,
 * storing content size so frameless pet mode matches debug-mode visual size.
 */
function saveDebugWindowBoundsNow(window: BrowserWindow): void {
  if (!debugWindowMode || window.isDestroyed()) {
    return;
  }

  const bounds: WindowBounds = createContentSizedWindowBounds(
    window.getBounds(),
    window.getContentBounds()
  );
  writeDebugWindowBounds(getSettingsPath(), bounds);
}

/**
 * Builds the tray context menu for quick daily controls and advanced settings.
 *
 * Inputs: none; reads current window, renderer, model, action, and debug state.
 * Returns: an Electron menu instance ready for `Tray.setContextMenu`.
 * Errors: does not throw unless Electron menu construction fails.
 * Side effects: generated menu item click handlers may show/hide windows,
 * update app state, send renderer IPC, or quit the app when invoked.
 */
function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate(
    buildTrayMenuTemplate(
      {
        rendererStatusLabel,
        petVisible: mainWindow?.isVisible() ?? false,
        currentPetModelId,
        currentActionMode,
        debugWindowMode,
        currentYawRadians: currentModelYawRadians
      },
      {
        togglePetVisibility,
        setPetModel,
        setActionMode,
        triggerOneShotAction,
        setDebugWindowMode,
        setModelYaw,
        quit: quitApp
      }
    )
  );
}

/**
 * Toggles the desktop-pet window from the tray menu.
 *
 * Inputs: none; uses the current main window reference.
 * Returns: nothing.
 * Errors: recreates a missing/destroyed window instead of throwing.
 * Side effects: may create, show, hide, focus, and refresh the tray menu.
 */
function togglePetVisibility(): void {
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

/**
 * Quits the app from the tray menu.
 *
 * Inputs: none.
 * Returns: nothing.
 * Errors: Electron owns quit errors; this function does not catch them.
 * Side effects: marks intentional quit state and asks Electron to quit.
 */
function quitApp(): void {
  isQuitting = true;
  app.quit();
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
 * Creates pet-body context menu handlers bound to this process state.
 *
 * Inputs: none; captures local state mutator functions.
 * Returns: callbacks used by Electron pet context-menu click handlers.
 * Errors: callbacks do not throw for validated menu values.
 * Side effects: returned callbacks may send IPC to the renderer when the user
 * selects a pet-body interaction item.
 */
function getPetContextMenuHandlers(): PetContextMenuHandlers {
  return {
    triggerOneShotAction
  };
}

/**
 * Sets the current tray-selected Live2D pet model.
 *
 * Inputs: `modelId` is a validated bundled model id.
 * Returns: nothing.
 * Errors: does not throw.
 * Side effects: updates in-memory state, persists settings, sends IPC to the
 * renderer, and refreshes tray radio state.
 */
function setPetModel(modelId: PetModelId): void {
  if (currentPetModelId === modelId) {
    return;
  }

  currentPetModelId = modelId;
  writePetModelId(getSettingsPath(), currentPetModelId);

  if (mainWindow && !mainWindow.isDestroyed()) {
    sendPetModelToRenderer(mainWindow);
  }

  refreshTrayMenu();
}

/**
 * Builds a native Electron menu for direct pet-body interaction control.
 *
 * Inputs: none.
 * Returns: a native `Menu` containing only one-shot interaction items.
 * Errors: Electron may throw if template construction fails.
 * Side effects: none until the returned menu is shown and clicked.
 */
function buildPetActionMenu(): Menu {
  return Menu.buildFromTemplate(
    buildPetContextMenuTemplate(getPetContextMenuHandlers())
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
 * Handles renderer lifecycle status updates for the tray menu.
 *
 * Inputs: IPC event and untrusted status payload from the isolated renderer.
 * Returns: nothing.
 * Errors: malformed or blank values are ignored.
 * Side effects: updates in-memory tray label state and refreshes the native
 * context menu when a valid status arrives.
 */
function handleRendererStatus(_event: IpcMainEvent, value: unknown): void {
  const nextLabel = normalizeRendererStatusLabel(value);

  if (!nextLabel) {
    return;
  }

  rendererStatusLabel = nextLabel;
  refreshTrayMenu();
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

function sendPetMessageToRenderer(text: string, durationSeconds?: number, action?: PetOneShotAction): void {
  showBubbleMessage(text, durationSeconds);

  if (action) {
    triggerOneShotAction(action);
  }
}

function createBubbleWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: BUBBLE_WINDOW_SIZE.width,
    height: BUBBLE_WINDOW_SIZE.height,
    transparent: true,
    frame: false,
    resizable: false,
    show: false,
    alwaysOnTop: true,
    focusable: false,
    hasShadow: false,
    skipTaskbar: true,
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(currentDirectory, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.setMenu(null);
  window.setAlwaysOnTop(true, 'screen-saver');
  window.setIgnoreMouseEvents(true);
  window.on('closed', () => {
    bubbleWindow = null;
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(`${process.env.ELECTRON_RENDERER_URL}?view=bubble`);
  } else {
    void window.loadFile(join(currentDirectory, '../renderer/index.html'), { query: { view: 'bubble' } });
  }

  return window;
}

function showBubbleMessage(text: string, durationSeconds?: number): void {
  const message = text.trim();

  if (!message || !mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const targetWindow = bubbleWindow && !bubbleWindow.isDestroyed() ? bubbleWindow : createBubbleWindow();
  bubbleWindow = targetWindow;
  positionBubbleWindow();
  targetWindow.showInactive();
  targetWindow.setAlwaysOnTop(true, 'screen-saver');
  sendMessageToBubbleWindow(targetWindow, message, durationSeconds);

  if (hideBubbleTimer) {
    clearTimeout(hideBubbleTimer);
  }

  hideBubbleTimer = setTimeout(() => {
    hideBubbleMessage();
  }, (durationSeconds ?? 8) * 1000);
}

function sendMessageToBubbleWindow(window: BrowserWindow, text: string, durationSeconds?: number): void {
  const payload = { type: 'message', text, durationSeconds };

  if (window.webContents.isLoading()) {
    window.webContents.once('did-finish-load', () => {
      if (!window.isDestroyed()) {
        window.webContents.send('pet-message', payload);
      }
    });
    return;
  }

  window.webContents.send('pet-message', payload);
}

function hideBubbleMessage(): void {
  if (hideBubbleTimer) {
    clearTimeout(hideBubbleTimer);
    hideBubbleTimer = null;
  }

  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    bubbleWindow.hide();
  }
}

/**
 * Positions the independent bubble window near the current pet window.
 *
 * Inputs: none; reads the current main and bubble BrowserWindow instances.
 * Returns: nothing.
 * Errors: missing or destroyed windows are ignored.
 * Side effects: mutates the bubble window bounds, including before first show
 * so HTTP-triggered messages appear next to the pet immediately. Uses the main
 * window content bounds so framed debug windows do not add title-bar distance.
 */
function positionBubbleWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed() || !bubbleWindow || bubbleWindow.isDestroyed()) {
    return;
  }

  const petBounds = mainWindow.getContentBounds();
  const display = screen.getDisplayMatching(petBounds);
  const bounds = calculateBubbleWindowBounds(petBounds, BUBBLE_WINDOW_SIZE, display.workArea);
  bubbleWindow.setBounds(bounds, false);
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
    case 'message':
      sendPetMessageToRenderer(command.text, command.durationSeconds, command.action);
      return;
  }
}

/**
 * Sets whether renderer should steer the pet toward the mouse pointer.
 *
 * Inputs: boolean enabled state.
 * Returns: nothing.
 * Errors: does not throw.
 * Side effects: updates in-memory state and sends IPC to the renderer. This is
 * kept for the local HTTP API; normal UI keeps mouse-follow enabled by default.
 */
function setLookAtMouseEnabled(enabled: boolean): void {
  lookAtMouseEnabled = enabled;

  if (mainWindow && !mainWindow.isDestroyed()) {
    sendLookAtMouseToRenderer(mainWindow);
  }
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
 * Sends the current Live2D pet model selection to a renderer window.
 *
 * Inputs: target `BrowserWindow`.
 * Returns: nothing.
 * Errors: does not throw for destroyed windows.
 * Side effects: emits one IPC message to renderer code.
 */
function sendPetModelToRenderer(window: BrowserWindow): void {
  if (!window.isDestroyed()) {
    window.webContents.send('pet-model-changed', currentPetModelId);
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
  currentPetModelId = readPetModelId(getSettingsPath());
  ipcMain.handle('open-pet-action-menu', handleOpenPetActionMenu);
  ipcMain.handle('get-current-pet-model', () => currentPetModelId);
  ipcMain.on('pet-renderer-status', handleRendererStatus);
  ipcMain.handle('get-reminder-settings', () => readReminderSettings(getSettingsPath()));
  ipcMain.handle('show-pet-message', (_event, value: unknown) => {
    const parsed = parsePetCommand(value);

    if (parsed.ok && parsed.command.type === 'message') {
      showBubbleMessage(parsed.command.text, parsed.command.durationSeconds);
    }
  });

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
  hideBubbleMessage();

  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    bubbleWindow.destroy();
  }

  bubbleWindow = null;
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
