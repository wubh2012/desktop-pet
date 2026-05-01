/**
 * Semantic Live2D action sequence resolution.
 *
 * Responsibility: expands user-facing pet interaction ids into Tororo motion
 * names and optional lightweight procedural effects. It does not load models,
 * create PixiJS objects, or schedule timers.
 *
 * Side effects: none.
 * Key dependencies and constraints: motion names are internal Tororo runtime
 * aliases; external APIs should use the semantic action ids only.
 */
import type { PetOneShotAction } from '../../../shared/petActionMode';

export type Live2DProceduralEffect = 'pop' | 'hop' | 'wiggle';

export interface Live2DActionSequence {
  readonly motions: readonly string[];
  readonly effect: Live2DProceduralEffect | null;
}

const ACTION_SEQUENCES: Readonly<Record<PetOneShotAction, Live2DActionSequence>> = {
  tease: { motions: ['01'], effect: null },
  pet: { motions: ['03'], effect: null },
  poke: { motions: ['06'], effect: null },
  surprise: { motions: ['02'], effect: null },
  cute: { motions: ['07'], effect: null },
  greet: { motions: ['03'], effect: 'pop' },
  cheer: { motions: ['01', '05'], effect: 'hop' }
};

/**
 * Resolves a semantic one-shot action into a Live2D motion sequence.
 *
 * Inputs: user-facing action id from tray, context menu, or API.
 * Returns: immutable-by-convention sequence description.
 * Errors: TypeScript constrains known actions; runtime lookup always succeeds
 * for supported action ids.
 * Side effects: none.
 */
export function resolveLive2DActionSequence(action: PetOneShotAction): Live2DActionSequence {
  return ACTION_SEQUENCES[action];
}
