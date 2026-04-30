/**
 * Unit tests for pet action menu template construction.
 *
 * Responsibility: verifies menu labels, checked state, and callback wiring for
 * pet action controls without creating native Electron menus or windows.
 *
 * Key dependencies: Vitest and the pure `buildPetActionMenuTemplate` helper.
 */
import { describe, expect, test } from 'vitest';

import { buildPetActionMenuTemplate } from './petActionMenu.js';

describe('buildPetActionMenuTemplate', () => {
  test('builds shared pet action items with current state', () => {
    const template = buildPetActionMenuTemplate(
      { currentActionMode: 'active', lookAtMouseEnabled: true },
      {
        setActionMode: () => undefined,
        triggerOneShotAction: () => undefined,
        setLookAtMouseEnabled: () => undefined
      }
    );

    expect(template.map((item) => item.label ?? item.type)).toEqual([
      '状态',
      '安静陪伴',
      '活泼一点',
      'separator',
      '互动',
      '逗它一下',
      '摸摸它',
      '轻轻碰它',
      '小小惊讶',
      '卖个萌',
      'separator',
      '小剧场',
      '打个招呼',
      '精神一下',
      '求关注',
      'separator',
      '看着鼠标'
    ]);
    expect(template[1]).toMatchObject({ type: 'radio', checked: false });
    expect(template[2]).toMatchObject({ type: 'radio', checked: true });
    expect(template[16]).toMatchObject({ type: 'checkbox', checked: true });
  });

  test('wires menu clicks to the supplied handlers', () => {
    const calls: string[] = [];
    const template = buildPetActionMenuTemplate(
      { currentActionMode: 'idle', lookAtMouseEnabled: false },
      {
        setActionMode: (mode) => calls.push(`mode:${mode}`),
        triggerOneShotAction: (action) => calls.push(`one-shot:${action}`),
        setLookAtMouseEnabled: (enabled) => calls.push(`look:${enabled}`)
      }
    );

    template[2].click?.(undefined as never, undefined as never, undefined as never);
    template[5].click?.(undefined as never, undefined as never, undefined as never);
    template[13].click?.(undefined as never, undefined as never, undefined as never);
    template[16].click?.(undefined as never, undefined as never, undefined as never);

    expect(calls).toEqual(['mode:active', 'one-shot:tease', 'one-shot:cheer', 'look:true']);
  });
});
