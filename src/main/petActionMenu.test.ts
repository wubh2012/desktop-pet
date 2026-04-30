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
      { currentActionMode: 'walk', lookAtMouseEnabled: true },
      {
        setActionMode: () => undefined,
        triggerOneShotAction: () => undefined,
        setLookAtMouseEnabled: () => undefined
      }
    );

    expect(template.map((item) => item.label ?? item.type)).toEqual([
      '待机',
      '行走',
      'separator',
      '跳一下',
      '转一圈',
      'separator',
      '看向鼠标'
    ]);
    expect(template[0]).toMatchObject({ type: 'radio', checked: false });
    expect(template[1]).toMatchObject({ type: 'radio', checked: true });
    expect(template[6]).toMatchObject({ type: 'checkbox', checked: true });
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

    template[1].click?.(undefined as never, undefined as never, undefined as never);
    template[3].click?.(undefined as never, undefined as never, undefined as never);
    template[4].click?.(undefined as never, undefined as never, undefined as never);
    template[6].click?.(undefined as never, undefined as never, undefined as never);

    expect(calls).toEqual(['mode:walk', 'one-shot:jump', 'one-shot:spin', 'look:true']);
  });
});
