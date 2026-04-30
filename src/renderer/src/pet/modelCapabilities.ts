/**
 * GLB model capability detection for desktop pet assets.
 *
 * Responsibility: summarizes whether a loaded GLTF object appears to contain
 * animation clips, skinned meshes, or morph targets. It does not load files,
 * mutate Three.js objects, or decide which animations to play.
 *
 * Side effects: none. The helper only traverses objects provided by the caller.
 *
 * Key dependencies and constraints: accepts a narrow GLTF-like shape so tests
 * can run without WebGL. Runtime callers pass the result from Three.js
 * `GLTFLoader`.
 */

export interface ModelCapabilities {
  readonly hasAnimations: boolean;
  readonly hasSkeleton: boolean;
  readonly hasMorphTargets: boolean;
  readonly animationNames: readonly string[];
}

interface AnimationLike {
  readonly name?: string;
}

interface TraversableSceneLike {
  traverse(callback: (object: unknown) => void): void;
}

export interface GltfLike {
  readonly animations?: readonly AnimationLike[];
  readonly scene?: TraversableSceneLike;
}

/**
 * Detects high-level animation capabilities from a loaded GLTF-like object.
 *
 * Inputs: `gltf` may contain `animations` and a traversable `scene`, matching
 * the fields used from Three.js `GLTFLoader` output. Missing fields are treated
 * as empty.
 * Returns: booleans for animation, skeleton, and morph-target availability plus
 * normalized animation names.
 * Errors: does not throw for missing data. If a caller-provided `traverse`
 * implementation throws, that exception is allowed to surface because it means
 * the supplied object is not a valid scene.
 * Side effects: none beyond invoking the scene traversal callback.
 */
export function detectModelCapabilities(gltf: GltfLike): ModelCapabilities {
  const animations = gltf.animations ?? [];
  let hasSkeleton = false;
  let hasMorphTargets = false;

  gltf.scene?.traverse((object) => {
    const candidate = object as {
      readonly isSkinnedMesh?: boolean;
      readonly morphTargetDictionary?: Record<string, number>;
    };

    if (candidate.isSkinnedMesh === true) {
      hasSkeleton = true;
    }

    if (
      candidate.morphTargetDictionary &&
      Object.keys(candidate.morphTargetDictionary).length > 0
    ) {
      hasMorphTargets = true;
    }
  });

  return {
    hasAnimations: animations.length > 0,
    hasSkeleton,
    hasMorphTargets,
    animationNames: animations.map((animation) =>
      animation.name && animation.name.trim().length > 0 ? animation.name : '<unnamed>'
    )
  };
}
