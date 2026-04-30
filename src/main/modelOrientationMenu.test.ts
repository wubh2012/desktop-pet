/**
 * Unit tests for debug-only model orientation menu templates.
 *
 * Responsibility: verifies fixed GLB yaw menu entries and callback wiring
 * without creating native Electron menus, renderer windows, or IPC channels.
 *
 * Key dependencies: Vitest and the pure `buildModelOrientationMenuTemplate`
 * helper.
 */
import { describe, expect, test } from 'vitest';

import { buildModelOrientationMenuTemplate } from './modelOrientationMenu.js';

describe('buildModelOrientationMenuTemplate', () => {
  test('returns no items outside debug window mode', () => {
    const template = buildModelOrientationMenuTemplate(
      { debugWindowMode: false, currentYawRadians: 0 },
      { setModelYaw: () => undefined }
    );

    expect(template).toEqual([]);
  });

  test('builds fixed yaw choices when debug window mode is enabled', () => {
    const template = buildModelOrientationMenuTemplate(
      { debugWindowMode: true, currentYawRadians: 0 },
      { setModelYaw: () => undefined }
    );

    expect(template).toHaveLength(1);
    expect(template[0].label).toBe('模型朝向调试');
    const submenu = template[0].submenu as Electron.MenuItemConstructorOptions[];
    expect(submenu.map((item) => item.label)).toEqual(['0°', '90°', '180°', '270°', '-90°']);
    expect(submenu[0]).toMatchObject({ type: 'radio', checked: true });
  });

  test('wires yaw item clicks to the supplied handler', () => {
    const calls: number[] = [];
    const template = buildModelOrientationMenuTemplate(
      { debugWindowMode: true, currentYawRadians: 0 },
      { setModelYaw: (yawRadians) => calls.push(yawRadians) }
    );

    const submenu = template[0].submenu as Electron.MenuItemConstructorOptions[];
    submenu[1].click?.(undefined as never, undefined as never, undefined as never);
    submenu[3].click?.(undefined as never, undefined as never, undefined as never);

    expect(calls[0]).toBeCloseTo(Math.PI / 2);
    expect(calls[1]).toBeCloseTo((Math.PI * 3) / 2);
  });
});
