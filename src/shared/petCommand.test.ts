/**
 * Unit tests for external pet command parsing.
 *
 * Responsibility: verifies the shared command contract used by the local HTTP
 * API before commands cross into Electron IPC. It does not start servers or
 * render pet models.
 *
 * Side effects: none.
 * Key dependencies and constraints: uses Vitest and pure parser functions.
 */
import { describe, expect, test } from 'vitest';

import { parsePetCommand } from './petCommand.js';

describe('parsePetCommand', () => {
  test('accepts persistent mode commands', () => {
    expect(parsePetCommand({ type: 'mode', mode: 'idle' })).toEqual({
      ok: true,
      command: { type: 'mode', mode: 'idle' }
    });
    expect(parsePetCommand({ type: 'mode', mode: 'active' })).toEqual({
      ok: true,
      command: { type: 'mode', mode: 'active' }
    });
  });

  test('accepts semantic action commands', () => {
    expect(parsePetCommand({ type: 'action', action: 'tease' })).toEqual({
      ok: true,
      command: { type: 'action', action: 'tease' }
    });
  });

  test('accepts look-at-mouse toggle commands', () => {
    expect(parsePetCommand({ type: 'lookAtMouse', enabled: true })).toEqual({
      ok: true,
      command: { type: 'lookAtMouse', enabled: true }
    });
  });

  test('accepts message commands', () => {
    expect(
      parsePetCommand({
        type: 'message',
        text: ' 主人～该休息啦 ',
        action: 'cute',
        durationSeconds: 8
      })
    ).toEqual({
      ok: true,
      command: {
        type: 'message',
        text: '主人～该休息啦',
        action: 'cute',
        durationSeconds: 8
      }
    });
  });

  test('rejects malformed commands with stable error messages', () => {
    expect(parsePetCommand(null)).toEqual({ ok: false, error: 'Command must be an object.' });
    expect(parsePetCommand({ type: 'mode', mode: 'sleep' })).toEqual({
      ok: false,
      error: 'Invalid mode command.'
    });
    expect(parsePetCommand({ type: 'action', action: 'jump' })).toEqual({
      ok: false,
      error: 'Invalid action command.'
    });
    expect(parsePetCommand({ type: 'action', action: 'attention' })).toEqual({
      ok: false,
      error: 'Invalid action command.'
    });
    expect(parsePetCommand({ type: 'motion', name: '01' })).toEqual({
      ok: false,
      error: 'Unknown command type.'
    });
    expect(parsePetCommand({ type: 'lookAtMouse', enabled: 'yes' })).toEqual({
      ok: false,
      error: 'Invalid lookAtMouse command.'
    });
    expect(parsePetCommand({ type: 'message', text: '' })).toEqual({
      ok: false,
      error: 'Invalid message command.'
    });
    expect(parsePetCommand({ type: 'message', text: 'hi', action: 'jump' })).toEqual({
      ok: false,
      error: 'Invalid message command.'
    });
    expect(parsePetCommand({ type: 'message', text: 'hi', durationSeconds: -1 })).toEqual({
      ok: false,
      error: 'Invalid message command.'
    });
    expect(parsePetCommand({ type: 'unknown' })).toEqual({
      ok: false,
      error: 'Unknown command type.'
    });
  });
});
