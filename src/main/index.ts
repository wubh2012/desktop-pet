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
import { app, BrowserWindow, Menu, nativeImage, Tray, type NativeImage } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  applySavedWindowBounds,
  readDebugWindowBounds,
  writeDebugWindowBounds,
  type WindowBounds
} from './windowSettings.js';
import { resolveWindowMode } from './windowMode.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFile);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let debugWindowMode = false;
let isQuitting = false;
let saveDebugBoundsTimer: NodeJS.Timeout | null = null;

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
  const baseMode = resolveWindowMode(debugWindowMode);
  const mode = applySavedWindowBounds(
    baseMode,
    readDebugWindowBounds(getSettingsPath(), baseMode)
  );
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

  window.setMenu(null);
  window.setAlwaysOnTop(true, 'screen-saver');

  window.on('close', (event) => {
    if (debugWindowMode) {
      saveDebugWindowBoundsNow(window);
    }

    if (!isQuitting) {
      event.preventDefault();
      window.hide();
    }
  });

  window.on('resize', () => {
    scheduleDebugWindowBoundsSave(window);
  });

  window.on('move', () => {
    scheduleDebugWindowBoundsSave(window);
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(currentDirectory, '../renderer/index.html'));
  }

  return window;
}

/**
 * Creates a small tray icon image for the desktop pet controls.
 *
 * Inputs: none.
 * Returns: an Electron `NativeImage` built from an embedded SVG data URL.
 * Errors: does not throw under normal Electron image decoding; if decoding
 * fails, Electron returns an empty image and the tray still initializes.
 * Side effects: none.
 */
function createTrayImage(): NativeImage {
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAHuSURBVFhH7ZY9SwNBEIbzTyJEsIg2aqEIEoSARUBQEFIIAYuAaCEpRAuJhaRQU2gqG8VCsTCN2kQLxUKx8AMiFoqFCoKCKAgKFivvwcpm5nZv7xTSXPHkSPZu5tmPmUskGosnorF4vl5E8NHQ2CzqRSgQCgQW6EmmxGA680tvaoDdY4NvgemZgri6vhGfX9+M27t7MV8siaZ4G3tOh7UAZnxyesaSugHBvv40i+GGlcB4blK8vX+wRF7MFhZYLIqnAGYeJLkE54PG9CVgu+w6Hh6fREtrJ4trJYADRwMGYX2zzGJbCeBU02Dg8OhYuy1uY/iuWwWtAOqaBkcgnAmMIyCW12YMDGdHWQ6jwMhYjgnQpVwsLVuNAV1FaAUmpvJMALNSm4x6QE1jAA2K5jAKoPapAECTmSsuicr+ga8x3wLoZDTIX8CW0hxGASzn88srC0QPF0U33tWdZDmMAmB1baMmyPlFVbR3JLT9Yau87YjjQNY8d1llsa0EkEydEfZWjmGLsN9Ihqv6Ol5RxFGeple1UQCgftXZ7OxWHDF6H8DvanKgKz+JpwCgW4FZyZkPZbLOFYlpB9xTVkyHlQBAWbodSjcg4jVzibUAwBKj19OEKn7+jABfAhKUFDolmosElSHfBX4IJPCfhAKhwA8hqC3zfwzKjQAAAABJRU5ErkJggg==';
  const image = nativeImage.createFromDataURL(`data:image/png;base64,${pngBase64}`);
  image.setTemplateImage(false);

  return image.resize({ width: 16, height: 16 });
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
  tray = new Tray(createTrayImage());
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
  app.setName('Desktop Pet');
  mainWindow = createMainWindow();
  initializeTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  mainWindow = null;
  if (isQuitting) {
    app.quit();
  }
});
