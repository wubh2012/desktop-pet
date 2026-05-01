/**
 * Renderer status label normalization for the tray menu.
 *
 * Responsibility: converts renderer-supplied lifecycle diagnostics into a
 * short, user-facing tray label. It does not create Electron menus, trust raw
 * IPC payloads, or persist status to disk.
 *
 * Side effects: none.
 *
 * Key dependencies and constraints: input may come from an isolated renderer
 * process, so callers must pass untrusted values through this helper before
 * showing them in native UI.
 */

const STATUS_LABEL_PREFIX = '桌宠状态：';
const MAX_STATUS_TEXT_LENGTH = 36;

/**
 * Normalizes a renderer status value for display in the tray menu.
 *
 * Inputs: untrusted IPC payload; only non-blank strings are accepted. Whitespace
 * is collapsed so line breaks cannot create odd native menu labels.
 * Returns: prefixed tray label, or null when the input should be ignored.
 * Errors: does not throw for malformed values.
 * Side effects: none.
 */
export function normalizeRendererStatusLabel(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.trim().replace(/\s+/g, ' ');

  if (!text) {
    return null;
  }

  const clippedText =
    text.length > MAX_STATUS_TEXT_LENGTH
      ? `${text.slice(0, MAX_STATUS_TEXT_LENGTH - 1)}...`
      : text;

  return `${STATUS_LABEL_PREFIX}${clippedText}`;
}
