/**
 * Debug-window settings helpers for the Electron main process.
 *
 * Responsibility: validates persisted debug window bounds and model orientation
 * values, then provides small JSON helpers for loading and saving them. It
 * does not create Electron windows, render UI, or store sensitive data.
 *
 * Side effects: `readDebugWindowBounds` and `writeDebugWindowBounds` perform
 * synchronous local filesystem I/O against one small JSON file. No timeout or
 * retry is used because the operation is local, tiny, and best-effort; failures
 * are ignored so settings persistence cannot block app startup or shutdown.
 *
 * Key dependencies and constraints: callers should pass a path under
 * `app.getPath('userData')`. Only non-sensitive numeric window bounds and GLB
 * yaw values are persisted.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { normalizePetModelId, type PetModelId } from '../shared/petModel.js';

export interface WindowBounds {
  readonly x?: number;
  readonly y?: number;
  readonly width: number;
  readonly height: number;
}

export interface DebugBoundsFallback {
  readonly width: number;
  readonly height: number;
  readonly minWidth?: number;
  readonly minHeight?: number;
}

/**
 * Complete persisted settings payload for this small app.
 *
 * Inputs: constructed from parsed JSON or before writing settings.
 * Returns: not applicable; this interface describes optional persisted fields.
 * Errors: none.
 * Side effects: none.
 */
interface DesktopPetSettings {
  readonly debugWindowBounds?: unknown;
  readonly modelYawRadians?: unknown;
  readonly petModelId?: unknown;
}

/**
 * Validates and clamps debug-window bounds loaded from settings.
 *
 * Inputs: `value` is untrusted parsed JSON; `fallback` supplies default and
 * minimum dimensions.
 * Returns: normalized bounds or `null` when the value is unusable.
 * Errors: does not throw.
 * Side effects: none.
 */
export function normalizeDebugBounds(
  value: unknown,
  fallback: DebugBoundsFallback
): WindowBounds | null {
  if (!isRecord(value)) {
    return null;
  }

  const width = value.width;
  const height = value.height;

  if (!isFiniteNumber(width) || !isFiniteNumber(height) || width <= 0 || height <= 0) {
    return null;
  }

  const normalized: WindowBounds = {
    width: fallback.minWidth ? Math.max(width, fallback.minWidth) : width,
    height: fallback.minHeight ? Math.max(height, fallback.minHeight) : height
  };

  if (isFiniteNumber(value.x)) {
    Object.assign(normalized, { x: value.x });
  }

  if (isFiniteNumber(value.y)) {
    Object.assign(normalized, { y: value.y });
  }

  return normalized;
}

/**
 * Validates a persisted model yaw value.
 *
 * Inputs: `value` is untrusted parsed JSON expected to be a radian value.
 * Returns: a finite number or `null` when the value cannot be used safely.
 * Errors: does not throw.
 * Side effects: none.
 */
export function normalizeModelYaw(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
}

/**
 * Validates a persisted pet model selection.
 *
 * Inputs: `value` is untrusted parsed JSON expected to be a bundled model id.
 * Returns: a safe model id, falling back to the default white cat when invalid.
 * Errors: does not throw.
 * Side effects: none.
 */
export function normalizePersistedPetModelId(value: unknown): PetModelId {
  return normalizePetModelId(value);
}

/**
 * Applies saved window bounds to a resolved window mode.
 *
 * Inputs: `mode` is a resolved window option object; `savedBounds` is optional
 * persisted bounds captured in debug mode.
 * Returns: `mode` merged with valid saved bounds. This intentionally applies
 * to normal mode too, so the transparent pet follows the size selected in the
 * debug window.
 * Errors: does not throw.
 * Side effects: none.
 */
export function applySavedWindowBounds<T extends DebugBoundsFallback>(
  mode: T,
  savedBounds: WindowBounds | null | undefined
): T & Partial<WindowBounds> {
  if (!savedBounds) {
    return mode;
  }

  return {
    ...mode,
    ...savedBounds
  };
}

/**
 * Reads debug-window bounds from a JSON settings file.
 *
 * Inputs: `settingsPath` is an absolute or project-relative JSON file path;
 * `fallback` provides minimum size constraints.
 * Returns: normalized bounds or `null` if the file is missing, invalid, or
 * contains unusable values.
 * Errors: filesystem and JSON parse errors are caught and treated as no saved
 * bounds.
 * Side effects: reads a small local JSON file.
 */
export function readDebugWindowBounds(
  settingsPath: string,
  fallback: DebugBoundsFallback
): WindowBounds | null {
  return normalizeDebugBounds(readSettings(settingsPath).debugWindowBounds, fallback);
}

/**
 * Reads persisted GLB model yaw from a JSON settings file.
 *
 * Inputs: `settingsPath` is an absolute or project-relative JSON file path.
 * Returns: a finite yaw in radians or `null` if the file is missing, invalid,
 * or contains unusable values.
 * Errors: filesystem and JSON parse errors are caught and treated as no saved
 * yaw.
 * Side effects: reads a small local JSON file.
 */
export function readModelYaw(settingsPath: string): number | null {
  return normalizeModelYaw(readSettings(settingsPath).modelYawRadians);
}

/**
 * Reads persisted Live2D pet model selection from a JSON settings file.
 *
 * Inputs: `settingsPath` is an absolute or project-relative JSON file path.
 * Returns: a safe bundled model id, defaulting to Tororo when the file is
 * missing, malformed, or contains an unsupported value.
 * Errors: filesystem and JSON parse errors are caught and treated as defaults.
 * Side effects: reads a small local JSON file.
 */
export function readPetModelId(settingsPath: string): PetModelId {
  return normalizePersistedPetModelId(readSettings(settingsPath).petModelId);
}

/**
 * Writes debug-window bounds to a JSON settings file.
 *
 * Inputs: `settingsPath` is the target JSON path; `bounds` are current Electron
 * window bounds.
 * Returns: nothing.
 * Errors: filesystem errors are caught so persistence remains best-effort.
 * Side effects: creates the settings directory if needed and writes one JSON
 * file containing non-sensitive window bounds.
 */
export function writeDebugWindowBounds(settingsPath: string, bounds: WindowBounds): void {
  writeSettings(settingsPath, {
    ...readSettings(settingsPath),
    debugWindowBounds: bounds
  });
}

/**
 * Writes GLB model yaw to a JSON settings file.
 *
 * Inputs: `settingsPath` is the target JSON path; `yawRadians` is a finite
 * Y-axis rotation in radians.
 * Returns: nothing.
 * Errors: invalid yaw values are ignored; filesystem errors are caught so
 * persistence remains best-effort.
 * Side effects: creates the settings directory if needed and writes one JSON
 * file containing non-sensitive model orientation state.
 */
export function writeModelYaw(settingsPath: string, yawRadians: number): void {
  const normalizedYaw = normalizeModelYaw(yawRadians);

  if (normalizedYaw === null) {
    return;
  }

  writeSettings(settingsPath, {
    ...readSettings(settingsPath),
    modelYawRadians: normalizedYaw
  });
}

/**
 * Writes selected Live2D pet model to a JSON settings file.
 *
 * Inputs: `settingsPath` is the target JSON path; `modelId` is a bundled model
 * identifier already selected by trusted app UI.
 * Returns: nothing.
 * Errors: filesystem errors are caught so persistence remains best-effort.
 * Side effects: creates the settings directory if needed and writes one JSON
 * file containing non-sensitive model selection state.
 */
export function writePetModelId(settingsPath: string, modelId: PetModelId): void {
  writeSettings(settingsPath, {
    ...readSettings(settingsPath),
    petModelId: normalizePersistedPetModelId(modelId)
  });
}

/**
 * Reads the complete desktop-pet settings JSON object.
 *
 * Inputs: `settingsPath` is the settings JSON path.
 * Returns: a plain settings object; malformed or missing files return an empty
 * object.
 * Errors: filesystem and JSON parse errors are caught.
 * Side effects: reads a small local JSON file.
 */
function readSettings(settingsPath: string): DesktopPetSettings {
  try {
    const raw = readFileSync(settingsPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Writes the complete desktop-pet settings JSON object.
 *
 * Inputs: `settingsPath` is the settings JSON path; `settings` is the complete
 * small JSON payload to persist.
 * Returns: nothing.
 * Errors: filesystem errors are caught so settings remain best-effort.
 * Side effects: creates the settings directory if needed and writes local JSON.
 */
function writeSettings(settingsPath: string, settings: DesktopPetSettings): void {
  try {
    mkdirSync(dirname(settingsPath), { recursive: true });
    writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  } catch {
    // Best-effort UI preference persistence; app behavior must not depend on it.
  }
}

/**
 * Checks whether a value is a plain indexable object.
 *
 * Inputs: any unknown value.
 * Returns: true when the value can be safely indexed.
 * Errors: does not throw.
 * Side effects: none.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Checks for finite numeric JSON values.
 *
 * Inputs: any unknown value.
 * Returns: true when the value is a finite number.
 * Errors: does not throw.
 * Side effects: none.
 */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
