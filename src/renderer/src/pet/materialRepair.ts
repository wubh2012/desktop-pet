/**
 * Material repair helpers for malformed generated GLB assets.
 *
 * Responsibility: gives color to GLB scenes that contain embedded images but no
 * material bindings. It prefers a detected base-color image and falls back to a
 * simple colored PBR material. It does not edit GLB files on disk or require
 * Blender.
 *
 * Side effects: `repairMissingMaterials` mutates mesh materials in the loaded
 * Three.js scene and may append temporary texture definitions to GLTFLoader's
 * in-memory parser JSON so embedded images can be decoded.
 *
 * Key dependencies and constraints: uses a narrow GLTF parser shape because the
 * relevant GLTFLoader internals are not part of the stable public type surface.
 * Failures fall back to a safe material instead of breaking model display.
 */
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface ImageLike {
  readonly name?: string;
}

interface RepairableGltfParser {
  readonly json?: {
    textures?: Array<{ source: number; sampler?: number }>;
    images?: ImageLike[];
  };
  loadTexture?: (textureIndex: number) => Promise<THREE.Texture>;
}

type RepairableGltf = GLTF & {
  readonly parser?: RepairableGltfParser;
};

const FALLBACK_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x9fc5d8,
  roughness: 0.82,
  metalness: 0.05
});

/**
 * Finds the most likely base-color image among embedded GLB images.
 *
 * Inputs: array-like image metadata from glTF JSON. Image names are optional.
 * Returns: image index to use for base color, or `null` when only utility maps
 * are present.
 * Errors: does not throw.
 * Side effects: none.
 */
export function findBaseColorImageIndex(images: readonly ImageLike[]): number | null {
  const utilityPattern = /(normal|rough|metal|metallic|ao|occlusion|height|bump)/i;
  const directColorPattern = /(base|color|diffuse|albedo|texture)/i;

  const directIndex = images.findIndex((image) => {
    const name = image.name ?? '';
    return directColorPattern.test(name) && !utilityPattern.test(name);
  });

  if (directIndex >= 0) {
    return directIndex;
  }

  const fallbackIndex = images.findIndex((image) => !utilityPattern.test(image.name ?? ''));
  return fallbackIndex >= 0 ? fallbackIndex : null;
}

/**
 * Applies material repair to meshes that have no meaningful material.
 *
 * Inputs: loaded `gltf` object from `GLTFLoader`.
 * Returns: a promise resolving after materials are assigned.
 * Errors: internal texture decoding errors are caught; fallback material is
 * still applied.
 * Side effects: mutates mesh materials in `gltf.scene`.
 */
export async function repairMissingMaterials(gltf: GLTF): Promise<void> {
  const scene = gltf.scene;

  if (!hasMeshWithoutUsefulMaterial(scene)) {
    return;
  }

  const repairedMaterial = await createRepairMaterial(gltf as RepairableGltf);
  applyMaterialToMeshes(scene, repairedMaterial);
}

/**
 * Builds a material from embedded image metadata when possible.
 *
 * Inputs: repairable GLTF with optional parser internals.
 * Returns: a MeshStandardMaterial using an embedded base color texture, or a
 * clone of the fallback material.
 * Errors: catches parser/texture errors and falls back to plain color.
 * Side effects: may add a temporary texture definition to parser JSON.
 */
async function createRepairMaterial(gltf: RepairableGltf): Promise<THREE.MeshStandardMaterial> {
  try {
    const parser = gltf.parser;
    const images = parser?.json?.images ?? [];
    const baseColorImageIndex = findBaseColorImageIndex(images);

    if (!parser?.json || !parser.loadTexture || baseColorImageIndex === null) {
      return FALLBACK_MATERIAL.clone();
    }

    const textures = parser.json.textures ?? [];
    parser.json.textures = textures;
    const textureIndex = textures.push({ source: baseColorImageIndex }) - 1;
    const texture = await parser.loadTexture(textureIndex);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;

    return new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.05
    });
  } catch (error) {
    console.warn('Failed to repair GLB material from embedded texture.', error);
    return FALLBACK_MATERIAL.clone();
  }
}

/**
 * Checks whether a scene contains a mesh that needs repaired material.
 *
 * Inputs: Three.js object root.
 * Returns: true when any mesh has no material or only unnamed default material.
 * Errors: does not throw.
 * Side effects: traverses the scene graph.
 */
function hasMeshWithoutUsefulMaterial(root: THREE.Object3D): boolean {
  let needsRepair = false;

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;

    if (!mesh.isMesh) {
      return;
    }

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (materials.length === 0 || materials.some((material) => !material || !material.name)) {
      needsRepair = true;
    }
  });

  return needsRepair;
}

/**
 * Assigns a material clone to every mesh in a scene.
 *
 * Inputs: Three.js root and source material.
 * Returns: nothing.
 * Errors: does not throw.
 * Side effects: replaces mesh materials.
 */
function applyMaterialToMeshes(root: THREE.Object3D, sourceMaterial: THREE.MeshStandardMaterial): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;

    if (mesh.isMesh) {
      mesh.material = sourceMaterial.clone();
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
}
