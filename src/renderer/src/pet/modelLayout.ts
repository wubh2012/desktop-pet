/**
 * Pure layout math for fitting GLB models into the desktop pet renderer.
 *
 * Responsibility: calculates scale and position values from a model bounding
 * box. It does not import Three.js, mutate scene objects, load assets, or know
 * about Electron windows.
 *
 * Side effects: none.
 *
 * Key dependencies and constraints: callers apply the returned `position`
 * together with the returned `scale` on the same model object. Position values
 * are pre-multiplied by scale so large source-coordinate models remain centered.
 */

export interface LayoutVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ModelBounds {
  readonly min: LayoutVector3;
  readonly max: LayoutVector3;
  readonly targetSize: number;
}

export interface ModelLayout {
  readonly scale: number;
  readonly position: LayoutVector3;
}

/**
 * Calculates a model transform that centers the scaled bounding box.
 *
 * Inputs: `bounds.min` and `bounds.max` are the model-space bounding-box
 * corners; `targetSize` is the desired largest displayed dimension. All values
 * are unitless Three.js model units.
 * Returns: a scale and position pair for applying to the model root.
 * Errors: does not throw; invalid or empty bounds return identity layout.
 * Side effects: none.
 */
export function calculateModelLayout(bounds: ModelBounds): ModelLayout {
  const size = {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z
  };
  const largestDimension = Math.max(size.x, size.y, size.z);

  if (
    !Number.isFinite(largestDimension) ||
    largestDimension <= 0 ||
    !Number.isFinite(bounds.targetSize) ||
    bounds.targetSize <= 0
  ) {
    return {
      scale: 1,
      position: { x: 0, y: 0, z: 0 }
    };
  }

  const scale = bounds.targetSize / largestDimension;
  const center = {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2
  };

  return {
    scale,
    position: {
      x: -center.x * scale,
      y: -center.y * scale,
      z: -center.z * scale
    }
  };
}
