/**
 * Native system context-menu suppression helpers for desktop-pet windows.
 *
 * Responsibility: centralizes Electron `system-context-menu` event wiring for
 * frameless draggable pet windows. It does not create windows, build app menus,
 * or handle renderer-owned pet action context menus.
 *
 * Side effects: may register an Electron event listener on a supplied native
 * window when suppression is enabled.
 * Key dependencies and constraints: Electron emits this event for native
 * non-client areas, including `-webkit-app-region: drag` regions on frameless
 * windows.
 */

/**
 * Minimal window contract needed to suppress the native system context menu.
 *
 * Inputs: implementers must support Electron's `system-context-menu` event.
 * Returns: the native window may return itself or another listener token.
 * Errors: listener registration errors propagate to the caller.
 * Side effects: registering a listener mutates the target window's event
 * listener set.
 */
export interface SystemContextMenuWindow {
  /**
   * Registers a native system-menu listener.
   *
   * Inputs: fixed Electron event name plus listener receiving the native event
   * and screen point.
   * Returns: implementation-defined listener registration result.
   * Errors: may throw if the native window rejects listener registration.
   * Side effects: mutates the target window's listener set.
   */
  on(
    eventName: 'system-context-menu',
    listener: (event: Electron.Event, point: Electron.Point) => void
  ): unknown;
}

/**
 * Options controlling whether a native system menu listener is attached.
 *
 * Inputs: `enabled` should be true for frameless pet windows and false for
 * debug/framed windows that should keep OS-default window behavior.
 * Returns: not applicable; this interface describes registration data.
 * Errors: none by itself.
 * Side effects: none by itself.
 */
export interface SystemContextMenuSuppressionOptions {
  /** Whether to attach a listener that prevents the OS window menu. */
  readonly enabled: boolean;
}

/**
 * Registers native system context-menu suppression when requested.
 *
 * Inputs: `window` is the Electron BrowserWindow-like target receiving the
 * listener; `options.enabled` controls whether suppression should be attached.
 * Returns: nothing.
 * Errors: propagates unexpected Electron listener registration errors.
 * Side effects: none when disabled; when enabled, registers one listener that
 * may prevent the OS window menu from opening.
 */
export function registerSystemContextMenuSuppression(
  window: SystemContextMenuWindow,
  options: SystemContextMenuSuppressionOptions
): void {
  if (!options.enabled) {
    return;
  }

  window.on('system-context-menu', (event) => {
    event.preventDefault();
  });
}
