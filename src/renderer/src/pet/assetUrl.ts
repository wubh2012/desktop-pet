/**
 * Renderer asset URL helpers.
 *
 * Responsibility: constructs URLs for static renderer assets that work under
 * both the Vite dev server and Electron's production `file://` loading. It does
 * not verify file existence, fetch assets, or inspect GLB content.
 *
 * Side effects: none.
 *
 * Key dependencies and constraints: callers should pass `import.meta.env.BASE_URL`
 * as the base. Production builds use `./` so public assets resolve next to the
 * built renderer HTML instead of from the filesystem root.
 */

/**
 * Builds a renderer-safe URL for a public asset.
 *
 * Inputs: `baseUrl` is Vite's base URL, typically `/` in development or `./` in
 * Electron file builds. `assetPath` is a project-public asset path such as
 * `assets/pet.glb`; a leading slash is tolerated and removed.
 * Returns: a URL string suitable for browser loaders.
 * Errors: does not throw; empty base values fall back to `./`.
 * Side effects: none.
 */
export function buildRendererAssetUrl(baseUrl: string, assetPath: string): string {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = assetPath.replace(/^\/+/, '');

  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Normalizes a Vite base URL so simple string concatenation is safe.
 *
 * Inputs: base URL from Vite or a caller-provided fallback.
 * Returns: a non-empty base URL ending in `/`.
 * Errors: does not throw.
 * Side effects: none.
 */
function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();

  if (trimmed.length === 0) {
    return './';
  }

  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}
