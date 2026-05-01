/**
 * Shared external command contract for desktop pet control.
 *
 * Responsibility: validates plain JSON-like values received from HTTP or other
 * external integrations before they reach Electron state or renderer IPC. It
 * does not start servers, show menus, or execute actions.
 *
 * Side effects: none.
 * Key dependencies and constraints: command values must stay JSON-serializable
 * because they may cross process boundaries and external API boundaries.
 */
import {
  isPetActionMode,
  isPetOneShotAction,
  type PetActionMode,
  type PetOneShotAction
} from './petActionMode.js';

export interface PetModeCommand {
  readonly type: 'mode';
  readonly mode: PetActionMode;
}

export interface PetActionCommand {
  readonly type: 'action';
  readonly action: PetOneShotAction;
}

export interface PetLookAtMouseCommand {
  readonly type: 'lookAtMouse';
  readonly enabled: boolean;
}

export interface PetMessageCommand {
  readonly type: 'message';
  readonly text: string;
  readonly action?: PetOneShotAction;
  readonly durationSeconds?: number;
}

export type PetCommand =
  | PetModeCommand
  | PetActionCommand
  | PetLookAtMouseCommand
  | PetMessageCommand;

export type PetCommandParseResult =
  | { readonly ok: true; readonly command: PetCommand }
  | { readonly ok: false; readonly error: string };

/**
 * Parses and validates an unknown external command value.
 *
 * Inputs: `value` is a JSON-like value, typically parsed from an HTTP request
 * body.
 * Returns: a discriminated result containing a safe command or a stable error
 * message for a 400 response.
 * Errors: does not throw for malformed user input.
 * Side effects: none.
 */
export function parsePetCommand(value: unknown): PetCommandParseResult {
  if (!isRecord(value)) {
    return { ok: false, error: 'Command must be an object.' };
  }

  switch (value.type) {
    case 'mode':
      return isPetActionMode(value.mode)
        ? { ok: true, command: { type: 'mode', mode: value.mode } }
        : { ok: false, error: 'Invalid mode command.' };
    case 'action':
      return isPetOneShotAction(value.action)
        ? { ok: true, command: { type: 'action', action: value.action } }
        : { ok: false, error: 'Invalid action command.' };
    case 'lookAtMouse':
      return typeof value.enabled === 'boolean'
        ? { ok: true, command: { type: 'lookAtMouse', enabled: value.enabled } }
        : { ok: false, error: 'Invalid lookAtMouse command.' };
    case 'message':
      return parseMessageCommand(value);
    default:
      return { ok: false, error: 'Unknown command type.' };
  }
}

/**
 * Checks whether a value can be safely inspected as a plain record.
 *
 * Inputs: unknown value from untrusted JSON.
 * Returns: true for non-null objects that are not arrays.
 * Errors: does not throw.
 * Side effects: none.
 */
function parseMessageCommand(value: Record<string, unknown>): PetCommandParseResult {
  if (typeof value.text !== 'string' || value.text.trim().length === 0) {
    return { ok: false, error: 'Invalid message command.' };
  }

  const command: PetMessageCommand = {
    type: 'message',
    text: value.text.trim()
  };

  if (value.action !== undefined) {
    if (!isPetOneShotAction(value.action)) {
      return { ok: false, error: 'Invalid message command.' };
    }

    return withOptionalDuration({ ...command, action: value.action }, value.durationSeconds);
  }

  return withOptionalDuration(command, value.durationSeconds);
}

function withOptionalDuration(command: PetMessageCommand, durationSeconds: unknown): PetCommandParseResult {
  if (durationSeconds === undefined) {
    return { ok: true, command };
  }

  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return { ok: false, error: 'Invalid message command.' };
  }

  return { ok: true, command: { ...command, durationSeconds } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
