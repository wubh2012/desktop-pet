/**
 * Unit tests for pet action menu template construction.
 *
 * Responsibility: verifies menu labels and callback wiring for the pet-body
 * context menu without creating native Electron menus or windows.
 *
 * Key dependencies: Vitest and the pure `buildPetContextMenuTemplate` helper.
 */
import { describe, expect, test } from 'vitest';

import { buildPetContextMenuTemplate } from './petActionMenu.js';

describe('buildPetContextMenuTemplate', () => {
  test('builds a flat pet-body interaction menu only', () => {
    const template = buildPetContextMenuTemplate({
      triggerOneShotAction: () => undefined
    });

    expect(template.map((item) => item.label ?? item.type)).toEqual([
      '摸摸它',
      '逗它一下',
      '轻轻碰它',
      '卖个萌',
      '打个招呼',
      '精神一下',
      '小小惊讶'
    ]);
    expect(template.map((item) => item.label)).not.toContain('求关注');
    expect(template.map((item) => item.label)).not.toContain('看着鼠标');
    expect(template.some((item) => item.type === 'separator')).toBe(false);
  });

  test('wires pet-body interaction clicks to one-shot handlers', () => {
    const calls: string[] = [];
    const template = buildPetContextMenuTemplate({
      triggerOneShotAction: (action) => calls.push(`one-shot:${action}`)
    });

    template[0].click?.(undefined as never, undefined as never, undefined as never);
    template[1].click?.(undefined as never, undefined as never, undefined as never);
    template[6].click?.(undefined as never, undefined as never, undefined as never);

    expect(calls).toEqual([
      'one-shot:pet',
      'one-shot:tease',
      'one-shot:surprise'
    ]);
  });
});
