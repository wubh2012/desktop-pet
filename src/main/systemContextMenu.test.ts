/**
 * Unit tests for native system context-menu suppression on pet windows.
 *
 * Responsibility: verifies the BrowserWindow event wiring contract without
 * creating native Electron windows. It does not test renderer context menus or
 * OS-level menu rendering.
 *
 * Side effects: none beyond invoking fake event listeners in memory.
 * Key dependencies: Vitest and the public suppression registration helper.
 */
import { describe, expect, test } from 'vitest';

import { registerSystemContextMenuSuppression } from './systemContextMenu.js';

describe('registerSystemContextMenuSuppression', () => {
  test('prevents the native system menu for normal frameless pet windows', () => {
    const window = createFakeWindow();
    const event = createFakeEvent();

    registerSystemContextMenuSuppression(window, { enabled: true });
    window.emitSystemContextMenu(event);

    expect(event.preventDefaultCalls).toBe(1);
  });

  test('leaves debug windows with their default native system menu behavior', () => {
    const window = createFakeWindow();

    registerSystemContextMenuSuppression(window, { enabled: false });

    expect(window.listenerCount).toBe(0);
  });
});

/**
 * Creates a minimal BrowserWindow-like fake for system context-menu tests.
 *
 * Inputs: none.
 * Returns: fake window that records one registered `system-context-menu`
 * listener and can invoke it later.
 * Errors: throws if production code tries to register an unexpected event.
 * Side effects: stores listeners in memory for assertions.
 */
function createFakeWindow(): {
  readonly listenerCount: number;
  on(
    eventName: 'system-context-menu',
    listener: (event: Electron.Event, point: Electron.Point) => void
  ): unknown;
  emitSystemContextMenu(event: Electron.Event): void;
} {
  const listeners: Array<(event: Electron.Event, point: Electron.Point) => void> = [];

  return {
    /**
     * Counts listeners registered by the helper under test.
     *
     * Inputs: none.
     * Returns: current number of stored listeners.
     * Errors: does not throw.
     * Side effects: none.
     */
    get listenerCount(): number {
      return listeners.length;
    },
    /**
     * Stores only the expected Electron system context-menu listener.
     *
     * Inputs: event name and listener supplied by production code.
     * Returns: fake window itself for Electron-like chaining.
     * Errors: throws when production code registers an unexpected event.
     * Side effects: appends the listener to an in-memory array.
     */
    on(
      eventName: 'system-context-menu',
      listener: (event: Electron.Event, point: Electron.Point) => void
    ): unknown {
      if (eventName !== 'system-context-menu') {
        throw new Error(`Unexpected event ${eventName}`);
      }

      listeners.push(listener);
      return this;
    },
    /**
     * Invokes all stored system context-menu listeners.
     *
     * Inputs: fake Electron event to deliver to listeners.
     * Returns: nothing.
     * Errors: propagates listener errors.
     * Side effects: may mutate the delivered event through listener behavior.
     */
    emitSystemContextMenu(event: Electron.Event): void {
      const point: Electron.Point = { x: 0, y: 0 };

      for (const listener of listeners) {
        listener(event, point);
      }
    }
  };
}

/**
 * Creates a fake Electron event with observable default prevention.
 *
 * Inputs: none.
 * Returns: event-like object plus a call counter for `preventDefault`.
 * Errors: does not throw.
 * Side effects: increments a counter when the tested listener prevents default
 * native menu behavior.
 */
function createFakeEvent(): Electron.Event & { readonly preventDefaultCalls: number } {
  let preventDefaultCalls = 0;

  return {
    get preventDefaultCalls(): number {
      return preventDefaultCalls;
    },
    preventDefault(): void {
      preventDefaultCalls += 1;
    }
  } as Electron.Event & { readonly preventDefaultCalls: number };
}
