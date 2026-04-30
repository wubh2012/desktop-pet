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

  test('starts in idle mode without horizontal walking', () => {
    const controller = new PetController();

    const first = controller.update(0);
    const later = controller.update(1);

    expect(first.state).toBe('idle');
    expect(later.state).toBe('idle');
    expect(first.position.x).toBe(0);
    expect(later.position.x).toBe(0);
  });

  test('keeps idle vertical float subtle so the pet feels grounded', () => {
    const controller = new PetController();
    const samples = [];

    for (let frame = 0; frame < 180; frame += 1) {
      samples.push(controller.update(1 / 60).position.y);
    }

    const lowest = Math.min(...samples);
    const highest = Math.max(...samples);

    expect(highest - lowest).toBeLessThanOrEqual(0.025);
  });

  test('returns to the previous mode after a click reaction finishes', () => {
    const controller = new PetController();

    controller.setMode('active');
    controller.click();

    const duringClick = controller.update(0.12);
    expect(duringClick.state).toBe('clicked');
    expect(duringClick.scale.x).toBeGreaterThan(1);

    controller.update(0.5);
    const afterClick = controller.update(0.1);

    expect(afterClick.state).toBe('active');
  });

  test('plays an energetic one-shot action and returns to the previous mode', () => {
    const controller = new PetController();

    controller.setMode('active');
    controller.triggerOneShot('tease');

    const duringJump = controller.update(0.16);
    expect(duringJump.state).toBe('tease');
    expect(duringJump.position.y).toBeGreaterThan(0.1);
    expect(duringJump.scale.x).toBeGreaterThan(1);

    controller.update(0.6);
    const afterJump = controller.update(0.1);
    expect(afterJump.state).toBe('active');
  });

  test('plays a gentle one-shot action and returns to idle', () => {
    const controller = new PetController();

    controller.triggerOneShot('pet');

    const duringSpin = controller.update(0.25);
    expect(duringSpin.state).toBe('pet');
    expect(Math.abs(duringSpin.rotation.y)).toBeGreaterThan(0.1);

    controller.update(1);
    const afterSpin = controller.update(0.1);
    expect(afterSpin.state).toBe('idle');
  });

  test('leans toward the mouse while idling', () => {
    const controller = new PetController();

    const left = controller.update(0.1, { lookAtX: -1 });
    const right = controller.update(0.1, { lookAtX: 1 });

    expect(left.rotation.y).toBeLessThan(0);
    expect(right.rotation.y).toBeGreaterThan(0);
  });

  test('keeps walking inside the configured horizontal range', () => {
    const controller = new PetController({ walkRange: 0.35, walkSpeed: 0.4 });

    controller.setMode('active');

    for (let frame = 0; frame < 240; frame += 1) {
      const transform = controller.update(1 / 60);
      expect(transform.position.x).toBeLessThanOrEqual(0.35);
      expect(transform.position.x).toBeGreaterThanOrEqual(-0.35);
    }
  });
});
