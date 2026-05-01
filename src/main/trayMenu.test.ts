/**
 * Unit tests for the desktop-pet tray menu template.
 *
 * Responsibility: verifies the user-facing tray control layout and callback
 * wiring without creating Electron native menus, windows, or tray icons.
 *
 * Side effects: none.
 * Key dependencies and constraints: tests the pure tray menu template builder
 * and assumes Electron will later render these serializable menu items.
 */
import type { MenuItemConstructorOptions } from 'electron';
import { describe, expect, test } from 'vitest';

import { buildTrayMenuTemplate } from './trayMenu.js';

describe('buildTrayMenuTemplate', () => {
  test('puts daily controls and interactions at the top level', () => {
    const template = buildTrayMenuTemplate(
      {
        rendererStatusLabel: '桌宠状态：黑猫已就绪',
        petVisible: true,
        currentPetModelId: 'hijiki',
        currentActionMode: 'active',
        debugWindowMode: true,
        currentYawRadians: 0
      },
      {
        togglePetVisibility: () => undefined,
        setPetModel: () => undefined,
        setActionMode: () => undefined,
        triggerOneShotAction: () => undefined,
        setDebugWindowMode: () => undefined,
        setModelYaw: () => undefined,
        quit: () => undefined
      }
    );

    expect(template.map((item) => item.label ?? item.type)).toEqual([
      '桌宠状态：黑猫已就绪',
      'separator',
      '隐藏宠物',
      '白猫 Tororo',
      '黑猫 Hijiki',
      'separator',
      '安静陪伴',
      '活泼一点',
      'separator',
      '摸摸它',
      '逗它一下',
      '轻轻碰它',
      '卖个萌',
      '打个招呼',
      '精神一下',
      '小小惊讶',
      'separator',
      '高级',
      'separator',
      '退出'
    ]);
    expect(template.map((item) => item.label)).not.toContain('看着鼠标');
    expect(template.map((item) => item.label)).not.toContain('求关注');
    expect(template[3]).toMatchObject({ type: 'radio', checked: false });
    expect(template[4]).toMatchObject({ type: 'radio', checked: true });
    expect(template[6]).toMatchObject({ type: 'radio', checked: false });
    expect(template[7]).toMatchObject({ type: 'radio', checked: true });

    const advanced = template[17].submenu as MenuItemConstructorOptions[];
    expect(advanced.map((item) => item.label ?? item.type)).toEqual([
      '调试窗口模式',
      '模型朝向调试'
    ]);
    expect(advanced[0]).toMatchObject({ type: 'checkbox', checked: true });
  });

  test('wires tray actions to the supplied handlers', () => {
    const calls: string[] = [];
    const template = buildTrayMenuTemplate(
      {
        rendererStatusLabel: '桌宠状态：启动中',
        petVisible: false,
        currentPetModelId: 'tororo',
        currentActionMode: 'idle',
        debugWindowMode: true,
        currentYawRadians: 0
      },
      {
        togglePetVisibility: () => calls.push('visibility'),
        setPetModel: (modelId) => calls.push(`model:${modelId}`),
        setActionMode: (mode) => calls.push(`mode:${mode}`),
        triggerOneShotAction: (action) => calls.push(`one-shot:${action}`),
        setDebugWindowMode: (enabled) => calls.push(`debug:${enabled}`),
        setModelYaw: (yawRadians) => calls.push(`yaw:${yawRadians}`),
        quit: () => calls.push('quit')
      }
    );

    template[2].click?.(undefined as never, undefined as never, undefined as never);
    template[4].click?.(undefined as never, undefined as never, undefined as never);
    template[7].click?.(undefined as never, undefined as never, undefined as never);
    template[9].click?.(undefined as never, undefined as never, undefined as never);
    const advanced = template[17].submenu as MenuItemConstructorOptions[];
    advanced[0].click?.(undefined as never, undefined as never, undefined as never);
    const yawChoices = advanced[1].submenu as MenuItemConstructorOptions[];
    yawChoices[1].click?.(undefined as never, undefined as never, undefined as never);
    template[19].click?.(undefined as never, undefined as never, undefined as never);

    expect(calls).toEqual([
      'visibility',
      'model:hijiki',
      'mode:active',
      'one-shot:pet',
      'debug:false',
      `yaw:${Math.PI / 2}`,
      'quit'
    ]);
  });
});
