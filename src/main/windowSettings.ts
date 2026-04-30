/**
 * Debug-window settings helpers for the Electron main process.
 *
 * Responsibility: validates persisted debug window bounds and provides small
 * JSON file helpers for loading and saving those bounds. It does not create
 * Electron windows, render UI, or store sensitive data.
 *
 * Side effects: `readDebugWindowBounds` and `writeDebugWindowBounds` perform
 * synchronous local filesystem I/O against one small JSON file. No timeout or
 * retry is used because the operation is local, tiny, and best-effort; failures
 * are ignored so settings persistence cannot block app startup or shutdown.
 *
 * Key dependencies and constraints: callers should pass a path under
 * `app.getPath('userData')`. Only numeric `x`, `y`, `width`, and `height` are
 * persisted.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

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
  try {
    const raw = readFileSync(settingsPath, 'utf8');
    const parsed = JSON.parse(raw) as { debugWindowBounds?: unknown };
    return normalizeDebugBounds(parsed.debugWindowBounds, fallback);
  } catch {
    return null;
  }
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
  try {
    mkdirSync(dirname(settingsPath), { recursive: true });
    writeFileSync(
      settingsPath,
      `${JSON.stringify({ debugWindowBounds: bounds }, null, 2)}\n`,
      'utf8'
    );
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
