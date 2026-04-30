/**
 * Invisible drag-handle DOM helpers for transparent pet windows.
 *
 * Responsibility: creates edge-aligned elements that Electron treats as native
 * drag regions. It does not move windows, render models, or handle pointer
 * events itself.
 *
 * Side effects: creates detached DOM elements only.
 * Key dependencies and constraints: CSS must apply `-webkit-app-region: drag`
 * to `.drag-handle`; the center of the window remains available for pet
 * interaction.
 */

export const DRAG_HANDLE_EDGE_CLASSES = [
  'drag-handle--top',
  'drag-handle--bottom',
  'drag-handle--left',
  'drag-handle--right'
] as const;

/**
 * Creates invisible drag regions around the window edges.
 *
 * Inputs: optional document-like object, primarily for unit tests.
 * Returns: detached div elements ready to append to the renderer root.
 * Errors: browser DOM creation errors are allowed to surface.
 * Side effects: creates DOM elements and sets class/ARIA attributes.
 */
export function createDragHandles(
  documentRef: Pick<Document, 'createElement'> = document
): HTMLDivElement[] {
  return DRAG_HANDLE_EDGE_CLASSES.map((edgeClass) => {
    const element = documentRef.createElement('div');
    element.className = `drag-handle ${edgeClass}`;
    element.setAttribute('aria-hidden', 'true');

    return element;
  });
}
