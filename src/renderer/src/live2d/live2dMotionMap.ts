/**
 * Tororo Live2D motion name mapping.
 *
 * Responsibility: translates app-level actions and external command names into
 * Cubism motion group/index pairs from Tororo's `model3.json`. It does not load
 * models or play animations.
 *
 * Side effects: none.
 * Key dependencies and constraints: the mapping is specific to Live2D official
 * sample model Tororo and should be updated when the model changes.
 */
import type { PetOneShotAction } from '../../../shared/petActionMode';

export interface Live2DMotionRef {
  readonly group: string;
  readonly index: number;
}

const MOTION_MAP: Readonly<Record<string, Live2DMotionRef>> = {
  '00': { group: 'Idle', index: 0 },
  '01': { group: 'FlickUp', index: 0 },
  '02': { group: 'FlickDown', index: 0 },
  '03': { group: 'Tap', index: 0 },
  '04': { group: 'Idle', index: 1 },
  '05': { group: 'Flick', index: 0 },
  '06': { group: 'Tap', index: 1 },
  '07': { group: 'Tap', index: 2 },
  '08': { group: 'Idle', index: 2 },
  tease: { group: 'FlickUp', index: 0 },
  surprise: { group: 'FlickDown', index: 0 },
  pet: { group: 'Tap', index: 0 },
  poke: { group: 'Tap', index: 1 },
  cute: { group: 'Tap', index: 2 },
  active: { group: 'Flick', index: 0 }
};

/**
 * Resolves an internal motion alias into a Tororo Cubism motion reference.
 *
 * Inputs: semantic direct action or internal numbered motion name such as `01`.
 * Returns: motion group/index when supported, otherwise null.
 * Errors: does not throw.
 * Side effects: none.
 */
export function resolveLive2DMotion(name: PetOneShotAction | string): Live2DMotionRef | null {
  return MOTION_MAP[name.trim()] ?? null;
}
