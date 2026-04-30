/**
 * Debug-only Electron menu template builder for GLB model orientation.
 *
 * Responsibility: creates serializable tray submenu items that adjust the
 * model's base Y-axis yaw. It does not create native menus, windows, settings
 * files, or IPC messages by itself.
 *
 * Side effects: none while building templates. Side effects happen only when
 * Electron invokes the click handlers supplied by the caller.
 *
 * Key dependencies and constraints: this menu is intended for debug window
 * mode only, where a fixed-angle submenu is easier to operate from the tray
 * than free-form numeric input.
 */
import type { MenuItemConstructorOptions } from 'electron';

/**
 * Read-only state needed to render model orientation debug choices.
 *
 * Inputs: constructed by the main process from in-memory app state.
 * Returns: not applicable; this interface describes a plain state object.
 * Errors: none.
 * Side effects: none.
 */
export interface ModelOrientationMenuState {
  /** Whether the framed debug window mode is enabled. */
  readonly debugWindowMode: boolean;
  /** Current base yaw in radians, used to mark the checked preset. */
  readonly currentYawRadians: number;
}

/**
 * Callback contract for debug orientation menu item side effects.
 *
 * Inputs: Electron invokes `setModelYaw` with one of the fixed finite radian
 * presets.
 * Returns: nothing.
 * Errors: implementations should ignore invalid values and handle missing
 * renderer windows without throwing.
 * Side effects: caller-owned; usually persists settings and sends renderer IPC.
 */
export interface ModelOrientationMenuHandlers {
  /** Persists and applies a model yaw value in radians. */
  setModelYaw(yawRadians: number): void;
}

const YAW_PRESETS = [
  { label: '0°', radians: 0 },
  { label: '90°', radians: Math.PI / 2 },
  { label: '180°', radians: Math.PI },
  { label: '270°', radians: (Math.PI * 3) / 2 },
  { label: '-90°', radians: -Math.PI / 2 }
] as const;

/**
 * Builds debug-only model orientation menu items.
 *
 * Inputs: `state.debugWindowMode` determines whether items are returned;
 * `state.currentYawRadians` marks the nearest preset as checked. `handlers`
 * contains the side-effecting callback invoked by menu clicks.
 * Returns: an empty array outside debug mode, otherwise one submenu containing
 * fixed radio angle choices.
 * Errors: does not throw for finite or non-finite state; non-finite yaw simply
 * results in no checked preset.
 * Side effects: none during construction.
 */
export function buildModelOrientationMenuTemplate(
  state: ModelOrientationMenuState,
  handlers: ModelOrientationMenuHandlers
): MenuItemConstructorOptions[] {
  if (!state.debugWindowMode) {
    return [];
  }

  return [
    {
      label: '模型朝向调试',
      submenu: YAW_PRESETS.map((preset) => ({
        label: preset.label,
        type: 'radio' as const,
        checked: isSameYaw(state.currentYawRadians, preset.radians),
        click: () => {
          handlers.setModelYaw(preset.radians);
        }
      }))
    }
  ];
}

/**
 * Compares two yaw values with a small tolerance for floating-point storage.
 *
 * Inputs: two radian values.
 * Returns: true when both values are finite and close enough to represent the
 * same preset.
 * Errors: does not throw.
 * Side effects: none.
 */
function isSameYaw(left: number, right: number): boolean {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 0.000001;
}
