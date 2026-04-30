/**
 * Pure window mode configuration for the desktop pet main process.
 *
 * Responsibility: defines the normal transparent pet window and the framed
 * resizable debug window. It does not import Electron, create windows, or read
 * persistent settings.
 *
 * Side effects: none.
 *
 * Key dependencies and constraints: Electron main process consumes these values
 * when creating or recreating `BrowserWindow` instances. Frame visibility cannot
 * be toggled in place, so switching modes requires recreating the window.
 */

export interface ResolvedWindowMode {
  readonly width: number;
  readonly height: number;
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly frame: boolean;
  readonly resizable: boolean;
  readonly transparent: boolean;
  readonly skipTaskbar: boolean;
  readonly hasShadow: boolean;
  readonly backgroundColor: string;
  readonly title: string;
}

/**
 * Resolves Electron window creation options for normal or debug mode.
 *
 * Inputs: `debugMode` true returns a framed, resizable window for inspection;
 * false returns the compact transparent desktop-pet window.
 * Returns: serializable window sizing and chrome options.
 * Errors: does not throw.
 * Side effects: none.
 */
export function resolveWindowMode(debugMode: boolean): ResolvedWindowMode {
  if (debugMode) {
    return {
      width: 520,
      height: 560,
      minWidth: 120,
      minHeight: 120,
      frame: true,
      resizable: true,
      transparent: false,
      skipTaskbar: false,
      hasShadow: true,
      backgroundColor: '#20242c',
      title: '桌宠调试窗口'
    };
  }

  return {
    width: 340,
    height: 430,
    frame: false,
    resizable: false,
    transparent: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    title: '桌面宠物'
  };
}
