/**
 * Shared Electron menu template builder for pet action controls.
 *
 * Responsibility: creates serializable menu item templates for action mode,
 * one-shot actions, and look-at-mouse toggling. It does not create native
 * menus, windows, tray icons, or send IPC by itself.
 *
 * Side effects: none while building templates. Side effects happen only when
 * Electron invokes the click handlers supplied by the caller.
 *
 * Key dependencies and constraints: runs in Electron's main-process bundle and
 * keeps labels/ordering consistent between tray menus and pet context menus.
 */
import type { MenuItemConstructorOptions } from 'electron';

import {
  PET_ACTION_MODES,
  PET_ONE_SHOT_ACTIONS,
  type PetActionMode,
  type PetOneShotAction
} from '../shared/petActionMode.js';

/**
 * Read-only state needed to render action menu checked values.
 *
 * Inputs: constructed by the main process from in-memory app state.
 * Returns: not applicable; this interface describes a plain state object.
 * Errors: none.
 * Side effects: none.
 */
export interface PetActionMenuState {
  /** Current persistent mode shown as the checked radio item. */
  readonly currentActionMode: PetActionMode;
  /** Current look-at-mouse toggle shown as the checked checkbox item. */
  readonly lookAtMouseEnabled: boolean;
}

/**
 * Callback contract for menu item side effects.
 *
 * Inputs: Electron invokes these methods with validated action identifiers or
 * boolean toggle state.
 * Returns: nothing.
 * Errors: implementations should handle renderer/window absence without
 * throwing because menu clicks are user-facing native UI events.
 * Side effects: caller-owned; usually updates app state and sends renderer IPC.
 */
export interface PetActionMenuHandlers {
  /** Selects a persistent pet action mode such as idle or walk. */
  setActionMode(mode: PetActionMode): void;
  /** Triggers a transient action without changing the persistent mode. */
  triggerOneShotAction(action: PetOneShotAction): void;
  /** Enables or disables pointer-driven head/body look direction. */
  setLookAtMouseEnabled(enabled: boolean): void;
}

/**
 * Builds the reusable pet action menu item template.
 *
 * Inputs: `state` describes checked radio/checkbox values; `handlers` contains
 * validated callbacks that own application side effects.
 * Returns: Electron menu template items in stable display order.
 * Errors: does not throw for valid action constants and handlers.
 * Side effects: none during construction; generated click handlers delegate to
 * caller-provided functions when selected by the user.
 */
export function buildPetActionMenuTemplate(
  state: PetActionMenuState,
  handlers: PetActionMenuHandlers
): MenuItemConstructorOptions[] {
  return [
    ...PET_ACTION_MODES.map((mode) => ({
      label: mode === 'idle' ? '待机' : '行走',
      type: 'radio' as const,
      checked: state.currentActionMode === mode,
      click: () => {
        handlers.setActionMode(mode);
      }
    })),
    { type: 'separator' as const },
    ...PET_ONE_SHOT_ACTIONS.map((action) => ({
      label: action === 'jump' ? '跳一下' : '转一圈',
      click: () => {
        handlers.triggerOneShotAction(action);
      }
    })),
    { type: 'separator' as const },
    {
      label: '看向鼠标',
      type: 'checkbox' as const,
      checked: state.lookAtMouseEnabled,
      click: () => {
        handlers.setLookAtMouseEnabled(!state.lookAtMouseEnabled);
      }
    }
  ];
}
