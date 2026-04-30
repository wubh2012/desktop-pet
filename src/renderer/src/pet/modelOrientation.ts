/**
 * Pure GLB base-orientation helpers for the renderer.
 *
 * Responsibility: resolves the root yaw used to make a loaded model face the
 * camera. It does not import Three.js, mutate scene objects, read files, or
 * persist user choices.
 *
 * Side effects: none.
 *
 * Key dependencies and constraints: debug overrides are intentionally supplied
 * by the caller as URL search text so this module stays deterministic and easy
 * to test.
 */

const DEFAULT_MODEL_YAW_RADIANS = 0;
const DEGREES_TO_RADIANS = Math.PI / 180;

/**
 * Resolves the base Y-axis rotation for a loaded GLB model.
 *
 * Inputs: `search` is a URL query string such as `?petYaw=180deg`; `debugEnabled`
 * controls whether caller-supplied overrides are honored. `petYaw` accepts
 * finite radians by default and finite degree values when suffixed with `deg`.
 * Returns: yaw in radians, falling back to the current bundled model default.
 * Errors: does not throw; malformed search strings and invalid numeric values
 * are ignored.
 * Side effects: none.
 */
export function resolveModelYaw(search: string, debugEnabled: boolean): number {
  if (!hasDebugModelYawOverride(search, debugEnabled)) {
    return DEFAULT_MODEL_YAW_RADIANS;
  }

  const yawValue = new URLSearchParams(search).get('petYaw');

  if (!yawValue) {
    return DEFAULT_MODEL_YAW_RADIANS;
  }

  return parseYawValue(yawValue);
}

/**
 * Checks whether the current renderer URL carries a usable debug yaw override.
 *
 * Inputs: `search` is a URL query string; `debugEnabled` controls whether debug
 * parameters may affect model orientation.
 * Returns: true only when debug mode is enabled and the `petYaw` parameter is
 * present, regardless of whether the value later parses successfully.
 * Errors: does not throw for malformed query strings.
 * Side effects: none.
 */
export function hasDebugModelYawOverride(search: string, debugEnabled: boolean): boolean {
  return debugEnabled && new URLSearchParams(search).has('petYaw');
}

/**
 * Parses a debug yaw override into radians.
 *
 * Inputs: `value` is a raw `petYaw` query value. Plain numbers are radians;
 * values ending in `deg` are degrees. Whitespace around the value is tolerated.
 * Returns: a finite yaw in radians or the default yaw when parsing fails.
 * Errors: does not throw for malformed input.
 * Side effects: none.
 */
function parseYawValue(value: string): number {
  const trimmed = value.trim();
  const degreeMatch = /^([+-]?(?:\d+\.?\d*|\.\d+))deg$/i.exec(trimmed);

  if (degreeMatch) {
    const degrees = Number(degreeMatch[1]);
    return Number.isFinite(degrees) ? degrees * DEGREES_TO_RADIANS : DEFAULT_MODEL_YAW_RADIANS;
  }

  const radians = Number(trimmed);
  return Number.isFinite(radians) ? radians : DEFAULT_MODEL_YAW_RADIANS;
}
