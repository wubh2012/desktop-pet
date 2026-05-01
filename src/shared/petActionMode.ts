/**
 * Shared pet action mode contract.
 *
 * Responsibility: defines the small set of user-selectable pet actions that can
 * cross the Electron main/preload/renderer boundary. It does not control the
 * pet, create menus, or send IPC messages.
 *
 * Side effects: none.
 *
 * Key dependencies and constraints: values must stay serializable because they
 * are sent through Electron IPC.
 */

export const PET_ACTION_MODES = ['idle', 'active'] as const;
export const PET_ONE_SHOT_ACTIONS = [
  'tease',
  'pet',
  'poke',
  'surprise',
  'cute',
  'greet',
  'cheer'
] as const;

export type PetActionMode = (typeof PET_ACTION_MODES)[number];
export type PetOneShotAction = (typeof PET_ONE_SHOT_ACTIONS)[number];

/**
 * Checks whether a value is a supported pet action mode.
 *
 * Inputs: any unknown value received from menu state, IPC, or tests.
 * Returns: true only for semantic persistent modes such as `idle` or `active`.
 * Errors: does not throw.
 * Side effects: none.
 */
export function isPetActionMode(value: unknown): value is PetActionMode {
  return typeof value === 'string' && PET_ACTION_MODES.includes(value as PetActionMode);
}

/**
 * Checks whether a value is a supported one-shot pet action.
 *
 * Inputs: any unknown value received from tray menu or IPC.
 * Returns: true only for semantic one-shot interaction ids.
 * Errors: does not throw.
 * Side effects: none.
 */
export function isPetOneShotAction(value: unknown): value is PetOneShotAction {
  return typeof value === 'string' && PET_ONE_SHOT_ACTIONS.includes(value as PetOneShotAction);
}
