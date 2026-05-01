/**
 * Static regression tests for renderer CSS placement rules.
 *
 * Responsibility: protects layout invariants that affect the transparent
 * Electron pet and bubble windows. It does not render DOM, launch Electron, or
 * validate visual colors.
 *
 * Side effects: reads the local `styles.css` file only.
 * Key dependencies and constraints: CSS is inspected as source text because the
 * bubble window placement depends on Electron transparency outside JSDOM.
 */
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const stylesPath = join(dirname(fileURLToPath(import.meta.url)), 'styles.css');

describe('renderer bubble styles', () => {
  test('anchors the independent bubble content near the bottom of its transparent window', () => {
    const styles = readFileSync(stylesPath, 'utf8');
    const bubbleViewRule = styles.match(/\.bubble-view\s+\.pet-bubble\s*\{(?<body>[^}]*)\}/);

    expect(bubbleViewRule?.groups?.body).toContain('top: auto;');
    expect(bubbleViewRule?.groups?.body).toContain('bottom: 8px;');
    expect(bubbleViewRule?.groups?.body).not.toContain('top: 10px;');
  });
});
