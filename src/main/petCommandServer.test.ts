/**
 * Integration-style unit tests for the local pet command HTTP server.
 *
 * Responsibility: verifies request routing, JSON validation, and callback
 * dispatch without starting the full Electron app. It does not render models
 * or send IPC.
 *
 * Side effects: opens ephemeral localhost HTTP ports during each test and
 * closes them before the test finishes.
 *
 * Key dependencies and constraints: uses Node's built-in fetch and HTTP stack.
 */
import { afterEach, describe, expect, test } from 'vitest';

import { startPetCommandServer, type PetCommandServer } from './petCommandServer.js';
import type { PetCommand } from '../shared/petCommand.js';

let server: PetCommandServer | null = null;

afterEach(async () => {
  if (server) {
    await server.close();
    server = null;
  }
});

describe('startPetCommandServer', () => {
  test('dispatches valid pet commands from POST /pet/command', async () => {
    const received: PetCommand[] = [];
    server = await startPetCommandServer({
      host: '127.0.0.1',
      port: 0,
      onCommand: (command) => {
        received.push(command);
      }
    });

    const response = await fetch(`${server.url}/pet/command`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'motion', name: '01' })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(received).toEqual([{ type: 'motion', name: '01' }]);
  });

  test('rejects malformed JSON without dispatching', async () => {
    const received: PetCommand[] = [];
    server = await startPetCommandServer({
      host: '127.0.0.1',
      port: 0,
      onCommand: (command) => {
        received.push(command);
      }
    });

    const response = await fetch(`${server.url}/pet/command`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{'
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'Request body must be valid JSON.' });
    expect(received).toEqual([]);
  });

  test('rejects invalid commands without dispatching', async () => {
    const received: PetCommand[] = [];
    server = await startPetCommandServer({
      host: '127.0.0.1',
      port: 0,
      onCommand: (command) => {
        received.push(command);
      }
    });

    const response = await fetch(`${server.url}/pet/command`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'mode', mode: 'sleep' })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'Invalid mode command.' });
    expect(received).toEqual([]);
  });

  test('returns 404 for unknown paths and 405 for wrong methods', async () => {
    server = await startPetCommandServer({
      host: '127.0.0.1',
      port: 0,
      onCommand: () => undefined
    });

    const missing = await fetch(`${server.url}/missing`, { method: 'POST' });
    const wrongMethod = await fetch(`${server.url}/pet/command`, { method: 'GET' });

    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ ok: false, error: 'Not found.' });
    expect(wrongMethod.status).toBe(405);
    expect(await wrongMethod.json()).toEqual({ ok: false, error: 'Method not allowed.' });
  });
});
