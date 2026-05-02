/**
 * Unit tests for package-level build configuration.
 *
 * Responsibility: verifies packaging guardrails that keep Windows distributable
 * builds reproducible on developer machines. It does not invoke electron-builder
 * or create release artifacts.
 *
 * Side effects: reads the repository package.json file only.
 * Key dependencies and constraints: electron-builder reads npm package `config`
 * values as environment variables during `npm run`, and Windows executable
 * resource editing currently pulls the legacy winCodeSign archive.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  readonly scripts?: Record<string, string>;
  readonly config?: Record<string, string>;
  readonly build?: {
    readonly win?: {
      readonly signAndEditExecutable?: boolean;
    };
  };
};

describe('Windows packaging configuration', () => {
  test('uses a stable binary mirror and avoids legacy winCodeSign extraction', () => {
    expect(packageJson.scripts?.['dist:win']).toBe('npm run build && electron-builder --win nsis');
    expect(packageJson.config?.electron_builder_binaries_mirror).toBe(
      'https://npmmirror.com/mirrors/electron-builder-binaries/'
    );
    expect(packageJson.build?.win?.signAndEditExecutable).toBe(false);
  });
});
