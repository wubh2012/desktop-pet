/**
 * Unit tests for GLB capability detection.
 *
 * Responsibility: verifies that renderer code can safely summarize animation,
 * skeleton, and morph-target support from GLTFLoader output. These tests use
 * small in-memory objects and do not read model files or start WebGL.
 *
 * Key dependencies: Vitest and the public `detectModelCapabilities` helper.
 */
import { describe, expect, test } from 'vitest';

import { detectModelCapabilities } from './modelCapabilities';

describe('detectModelCapabilities', () => {
  test('reports no capabilities for an empty GLTF-like object', () => {
    const capabilities = detectModelCapabilities({});

    expect(capabilities).toEqual({
      hasAnimations: false,
      hasSkeleton: false,
      hasMorphTargets: false,
      animationNames: []
    });
  });

  test('detects animation names and unnamed animation fallbacks', () => {
    const capabilities = detectModelCapabilities({
      animations: [{ name: 'Idle' }, { name: '' }]
    });

    expect(capabilities.hasAnimations).toBe(true);
    expect(capabilities.animationNames).toEqual(['Idle', '<unnamed>']);
  });

  test('detects skeletons and morph target dictionaries in traversed objects', () => {
    const visitedObjects: unknown[] = [
      { isSkinnedMesh: true },
      { morphTargetDictionary: { smile: 0 } }
    ];

    const capabilities = detectModelCapabilities({
      scene: {
        traverse(callback: (object: unknown) => void): void {
          for (const object of visitedObjects) {
            callback(object);
          }
        }
      }
    });

    expect(capabilities.hasSkeleton).toBe(true);
    expect(capabilities.hasMorphTargets).toBe(true);
  });
});
