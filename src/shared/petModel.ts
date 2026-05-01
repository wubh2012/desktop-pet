/**
 * Shared desktop-pet model selection contract.
 *
 * Responsibility: defines bundled pet model identifiers that can cross the
 * Electron main/preload/renderer boundary. It does not load assets, build
 * menus, or persist settings.
 *
 * Side effects: none.
 * Key dependencies and constraints: values must remain serializable and stable
 * because they are stored in local settings and sent through Electron IPC.
 */

export const PET_MODEL_IDS = ['tororo', 'hijiki'] as const;
export const DEFAULT_PET_MODEL_ID: PetModelId = 'tororo';

export type PetModelId = (typeof PET_MODEL_IDS)[number];

/**
 * Checks whether a value is a supported bundled pet model id.
 *
 * Inputs: unknown value from settings, IPC, menu state, or tests.
 * Returns: true only for supported model ids.
 * Errors: does not throw.
 * Side effects: none.
 */
export function isPetModelId(value: unknown): value is PetModelId {
  return typeof value === 'string' && PET_MODEL_IDS.includes(value as PetModelId);
}

/**
 * Normalizes unknown model selection data to a safe bundled model id.
 *
 * Inputs: unknown value from untrusted persisted settings or IPC.
 * Returns: the supplied model id when valid, otherwise the default white cat.
 * Errors: does not throw.
 * Side effects: none.
 */
export function normalizePetModelId(value: unknown): PetModelId {
  return isPetModelId(value) ? value : DEFAULT_PET_MODEL_ID;
}
