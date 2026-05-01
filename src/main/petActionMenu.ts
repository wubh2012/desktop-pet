/**
 * Electron menu template builder for pet-body interaction controls.
 *
 * Responsibility: creates serializable menu item templates for direct
 * one-shot pet interactions. It does not create native menus, windows, tray
 * icons, model controls, debug controls, or send IPC by itself.
 *
 * Side effects: none while building templates. Side effects happen only when
 * Electron invokes the click handlers supplied by the caller.
 *
 * Key dependencies and constraints: runs in Electron's main-process bundle.
 * The pet-body context menu intentionally stays flat and interaction-only so
 * right-clicking the pet cannot accidentally hide, reconfigure, or quit it.
 */
import type { MenuItemConstructorOptions } from 'electron';

import type { PetOneShotAction } from '../shared/petActionMode.js';

/**
 * One-shot pet actions exposed in the pet-body context menu.
 *
 * Inputs: none.
 * Returns: immutable action ids in display order.
 * Errors: none; TypeScript constrains ids to supported actions.
 * Side effects: none.
 */
export const PET_CONTEXT_MENU_ACTIONS = [
  'pet',
  'tease',
  'poke',
  'cute',
  'greet',
  'cheer',
  'surprise'
] as const satisfies readonly PetOneShotAction[];

/**
 * Callback contract for pet-body interaction menu side effects.
 *
 * Inputs: Electron invokes this method with validated one-shot action ids.
 * Returns: nothing.
 * Errors: implementations should handle renderer/window absence without
 * throwing because menu clicks are user-facing native UI events.
 * Side effects: caller-owned; usually sends renderer IPC.
 */
export interface PetContextMenuHandlers {
  /** Triggers a transient action without changing the persistent mode. */
  triggerOneShotAction(action: PetOneShotAction): void;
}

/**
 * Builds the flat pet-body context menu item template.
 *
 * Inputs: `handlers` contains the validated one-shot callback that owns app
 * side effects.
 * Returns: Electron menu template items in stable interaction-only order.
 * Errors: does not throw for valid action constants and handlers.
 * Side effects: none during construction; generated click handlers delegate to
 * caller-provided functions when selected by the user.
 */
export function buildPetContextMenuTemplate(
  handlers: PetContextMenuHandlers
): MenuItemConstructorOptions[] {
  return PET_CONTEXT_MENU_ACTIONS.map((action) => buildOneShotMenuItem(action, handlers));
}

/**
 * Builds one semantic interaction menu item.
 *
 * Inputs: semantic one-shot action id and caller callbacks.
 * Returns: Electron menu item for triggering the interaction.
 * Errors: does not throw for known action ids.
 * Side effects: click handler delegates to caller-owned IPC dispatch.
 */
function buildOneShotMenuItem(
  action: PetOneShotAction,
  handlers: PetContextMenuHandlers
): MenuItemConstructorOptions {
  return {
    label: getOneShotActionLabel(action),
    click: () => {
      handlers.triggerOneShotAction(action);
    }
  };
}

/**
 * Resolves the user-facing label for a semantic one-shot action.
 *
 * Inputs: semantic action id.
 * Returns: concise Chinese label for tray and context menus.
 * Errors: exhaustive switch returns a label for every supported action.
 * Side effects: none.
 */
function getOneShotActionLabel(action: PetOneShotAction): string {
  switch (action) {
    case 'tease':
      return '逗它一下';
    case 'pet':
      return '摸摸它';
    case 'poke':
      return '轻轻碰它';
    case 'surprise':
      return '小小惊讶';
    case 'cute':
      return '卖个萌';
    case 'greet':
      return '打个招呼';
    case 'cheer':
      return '精神一下';
  }
}
