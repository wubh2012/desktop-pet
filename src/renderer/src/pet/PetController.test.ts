/**
 * Unit tests for the procedural desktop pet behavior controller.
 *
 * Responsibility: documents expected state transitions and numeric transform
 * invariants for the MVP pet animation logic. The tests do not touch Electron,
 * WebGL, the DOM, local files, or the GLB asset.
 *
 * Key dependencies: Vitest and the public `PetController` API. Tests assume
 * deterministic updates from fixed delta-second inputs.
 */
import { describe, expect, test } from 'vitest';

import { PetController } from './PetController';

describe('PetController', () => {
  test('keeps idle transforms finite while adding gentle motion', () => {
    const controller = new PetController();

    const first = controller.update(0);
    const second = controller.update(0.25);

    expect(first.state).toBe('idle');
    expect(second.state).toBe('idle');
    expect(second.position.y).toBeGreaterThan(first.position.y);

    for (const transform of [first, second]) {
      for (const vector of [transform.position, transform.rotation, transform.scale]) {
        expect(Number.isFinite(vector.x)).toBe(true);
        expect(Number.isFinite(vector.y)).toBe(true);
        expect(Number.isFinite(vector.z)).toBe(true);
      }
    }
  });

  test('returns to the previous mode after a click reaction finishes', () => {
    const controller = new PetController();

    controller.setMode('walk');
    controller.click();

    const duringClick = controller.update(0.12);
    expect(duringClick.state).toBe('clicked');
    expect(duringClick.scale.x).toBeGreaterThan(1);

    controller.update(0.5);
    const afterClick = controller.update(0.1);

    expect(afterClick.state).toBe('walk');
  });

  test('keeps walking inside the configured horizontal range', () => {
    const controller = new PetController({ walkRange: 0.35, walkSpeed: 0.4 });

    controller.setMode('walk');

    for (let frame = 0; frame < 240; frame += 1) {
      const transform = controller.update(1 / 60);
      expect(transform.position.x).toBeLessThanOrEqual(0.35);
      expect(transform.position.x).toBeGreaterThanOrEqual(-0.35);
    }
  });
});
