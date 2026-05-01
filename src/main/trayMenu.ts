/**
 * Desktop-pet tray menu template builder.
 *
 * Responsibility: creates a complete tray menu for daily pet controls, model
 * selection, quick interactions, advanced/debug controls, and app exit. It
 * does not create native menus, windows, tray icons, settings files, or IPC by
 * itself.
 *
 * Side effects: none while building templates. Side effects happen only when
 * Electron invokes caller-supplied click handlers.
 *
 * Key dependencies and constraints: designed for Electron's main process and
 * keeps risky/debug operations under the Advanced submenu so normal tray usage
 * stays quick and hard to misclick.
 */
import type { MenuItemConstructorOptions } from 'electron';

import {
  PET_ACTION_MODES,
  type PetActionMode,
  type PetOneShotAction
} from '../shared/petActionMode.js';
import { PET_MODEL_IDS, type PetModelId } from '../shared/petModel.js';
import { buildModelOrientationMenuTemplate } from './modelOrientationMenu.js';
import { buildPetContextMenuTemplate } from './petActionMenu.js';

/**
 * Read-only state needed to render the tray menu.
 *
 * Inputs: constructed by the main process from current in-memory window,
 * renderer, model, action, and debug state.
 * Returns: not applicable; this interface describes a plain state object.
 * Errors: none.
 * Side effects: none.
 */
export interface TrayMenuState {
  readonly rendererStatusLabel: string;
  readonly petVisible: boolean;
  readonly currentPetModelId: PetModelId;
  readonly currentActionMode: PetActionMode;
  readonly debugWindowMode: boolean;
  readonly currentYawRadians: number;
}

/**
 * Callback contract for tray menu side effects.
 *
 * Inputs: Electron invokes these methods with validated model/action values or
 * boolean toggles.
 * Returns: nothing.
 * Errors: implementations should handle missing windows/renderers without
 * throwing because menu clicks are user-facing native UI events.
 * Side effects: caller-owned; usually shows windows, updates state, sends IPC,
 * persists settings, or quits the app.
 */
export interface TrayMenuHandlers {
  readonly togglePetVisibility: () => void;
  readonly setPetModel: (modelId: PetModelId) => void;
  readonly setActionMode: (mode: PetActionMode) => void;
  readonly triggerOneShotAction: (action: PetOneShotAction) => void;
  readonly setDebugWindowMode: (enabled: boolean) => void;
  readonly setModelYaw: (yawRadians: number) => void;
  readonly quit: () => void;
}

/**
 * Builds the complete desktop-pet tray menu template.
 *
 * Inputs: `state` supplies checked labels and visible state; `handlers` owns
 * all side effects triggered by click handlers.
 * Returns: Electron menu template items in the quick-first tray order.
 * Errors: does not throw for valid state and handlers.
 * Side effects: none during construction; generated click handlers delegate to
 * caller-provided functions when selected by the user.
 */
export function buildTrayMenuTemplate(
  state: TrayMenuState,
  handlers: TrayMenuHandlers
): MenuItemConstructorOptions[] {
  return [
    { label: state.rendererStatusLabel, enabled: false },
    { type: 'separator' as const },
    {
      label: state.petVisible ? '隐藏宠物' : '显示宠物',
      click: handlers.togglePetVisibility
    },
    ...PET_MODEL_IDS.map((modelId) => buildModelMenuItem(modelId, state, handlers)),
    { type: 'separator' as const },
    ...PET_ACTION_MODES.map((mode) => buildModeMenuItem(mode, state, handlers)),
    { type: 'separator' as const },
    ...buildPetContextMenuTemplate({ triggerOneShotAction: handlers.triggerOneShotAction }),
    { type: 'separator' as const },
    {
      label: '高级',
      submenu: buildAdvancedMenuTemplate(state, handlers)
    },
    { type: 'separator' as const },
    {
      label: '退出',
      click: handlers.quit
    }
  ];
}

/**
 * Builds one bundled-model radio menu item.
 *
 * Inputs: model id plus current tray state and callbacks.
 * Returns: Electron menu item for selecting the model.
 * Errors: does not throw for known model ids.
 * Side effects: click handler delegates to caller-owned model switching.
 */
function buildModelMenuItem(
  modelId: PetModelId,
  state: TrayMenuState,
  handlers: TrayMenuHandlers
): MenuItemConstructorOptions {
  return {
    label: modelId === 'tororo' ? '白猫 Tororo' : '黑猫 Hijiki',
    type: 'radio' as const,
    checked: state.currentPetModelId === modelId,
    click: () => {
      handlers.setPetModel(modelId);
    }
  };
}

/**
 * Builds one persistent-mode radio menu item.
 *
 * Inputs: semantic mode id plus current tray state and callbacks.
 * Returns: Electron menu item for selecting the mode.
 * Errors: does not throw for known mode ids.
 * Side effects: click handler delegates to caller-owned state mutation.
 */
function buildModeMenuItem(
  mode: PetActionMode,
  state: TrayMenuState,
  handlers: TrayMenuHandlers
): MenuItemConstructorOptions {
  return {
    label: mode === 'idle' ? '安静陪伴' : '活泼一点',
    type: 'radio' as const,
    checked: state.currentActionMode === mode,
    click: () => {
      handlers.setActionMode(mode);
    }
  };
}

/**
 * Builds the Advanced submenu containing low-frequency or risky controls.
 *
 * Inputs: current debug/yaw state plus side-effect handlers.
 * Returns: Electron menu items for debug mode and optional orientation presets.
 * Errors: does not throw for finite or non-finite yaw state; the orientation
 * helper handles invalid yaw values by leaving presets unchecked.
 * Side effects: none during construction; click handlers delegate to callers.
 */
function buildAdvancedMenuTemplate(
  state: TrayMenuState,
  handlers: TrayMenuHandlers
): MenuItemConstructorOptions[] {
  return [
    {
      label: '调试窗口模式',
      type: 'checkbox' as const,
      checked: state.debugWindowMode,
      click: () => {
        handlers.setDebugWindowMode(!state.debugWindowMode);
      }
    },
    ...buildModelOrientationMenuTemplate(
      { debugWindowMode: state.debugWindowMode, currentYawRadians: state.currentYawRadians },
      { setModelYaw: handlers.setModelYaw }
    )
  ];
}
