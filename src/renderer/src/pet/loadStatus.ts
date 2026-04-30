/**
 * Renderer status helpers for GLB model load results.
 *
 * Responsibility: mutates only the small development status element used by
 * the renderer. It does not create DOM nodes, load assets, inspect GLB files,
 * start WebGL, or communicate with Electron.
 *
 * Side effects: updates the supplied status element's text and visibility.
 *
 * Key dependencies and constraints: callers pass a minimal element-like object
 * so this module stays testable without a browser DOM.
 */

export interface LoadStatusElement {
  textContent: string | null;
  hidden: string | boolean;
}

export interface ModelLoadSuccessDiagnostics {
  readonly animationCount: number;
  readonly platform: string;
}

/**
 * Records successful GLB load diagnostics while keeping the status hidden.
 *
 * Inputs: `element` is the renderer status node; `diagnostics.animationCount`
 * is the number of GLB animation clips; `diagnostics.platform` is a safe,
 * non-sensitive platform label.
 * Returns: nothing.
 * Errors: does not throw for finite or non-finite counts; values are rendered
 * as received for developer diagnostics.
 * Side effects: updates text for inspection and hides the element so normal
 * pet display is not covered by success text.
 */
export function showModelLoadSuccess(
  element: LoadStatusElement,
  diagnostics: ModelLoadSuccessDiagnostics
): void {
  element.textContent = `GLB 已加载 | animations=${diagnostics.animationCount} | platform=${diagnostics.platform}`;
  element.hidden = true;
}

/**
 * Shows a visible model-load failure message.
 *
 * Inputs: `element` is the renderer status node.
 * Returns: nothing.
 * Errors: does not throw.
 * Side effects: updates text and makes the status element visible because the
 * user needs feedback when the pet cannot render.
 */
export function showModelLoadFailure(element: LoadStatusElement): void {
  element.textContent = '模型加载失败';
  element.hidden = false;
}
