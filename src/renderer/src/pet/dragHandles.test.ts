/**
 * Unit tests for invisible desktop-pet drag handle creation.
 *
 * Responsibility: verifies that the renderer creates enough native drag
 * regions for small transparent pet windows. The tests do not start Electron,
 * render canvases, or move native windows.
 *
 * Side effects: none beyond constructing small fake element objects.
 * Key dependencies and constraints: Electron consumes `-webkit-app-region`
 * from CSS, so these tests only verify the stable DOM class contract.
 */
import { describe, expect, test } from 'vitest';

import { createDragHandles, DRAG_HANDLE_EDGE_CLASSES } from './dragHandles';

describe('createDragHandles', () => {
  test('creates one invisible native drag region for each window edge', () => {
    const handles = createDragHandles(createFakeDocument());

    expect(DRAG_HANDLE_EDGE_CLASSES).toEqual([
      'drag-handle--top',
      'drag-handle--bottom',
      'drag-handle--left',
      'drag-handle--right'
    ]);
    expect(handles.map((handle) => handle.className)).toEqual([
      'drag-handle drag-handle--top',
      'drag-handle drag-handle--bottom',
      'drag-handle drag-handle--left',
      'drag-handle drag-handle--right'
    ]);
    expect(handles.every((handle) => handle.getAttribute('aria-hidden') === 'true')).toBe(true);
  });
});

/**
 * Creates a tiny document substitute for drag-handle unit tests.
 *
 * Inputs: none.
 * Returns: object with the subset of `Document` used by `createDragHandles`.
 * Errors: does not throw.
 * Side effects: none.
 */
function createFakeDocument(): Pick<Document, 'createElement'> {
  return {
    createElement: () => {
      const attributes = new Map<string, string>();

      return {
        className: '',
        setAttribute(name: string, value: string): void {
          attributes.set(name, value);
        },
        getAttribute(name: string): string | null {
          return attributes.get(name) ?? null;
        }
      } as HTMLDivElement;
    }
  } as Pick<Document, 'createElement'>;
}
