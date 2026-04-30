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
    server = await startFetchableTestServer((command) => {
      received.push(command);
    });

    const response = await fetch(`${server.url}/pet/command`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'action', action: 'tease' })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(received).toEqual([{ type: 'action', action: 'tease' }]);
  });

  test('rejects malformed JSON without dispatching', async () => {
    const received: PetCommand[] = [];
    server = await startFetchableTestServer((command) => {
      received.push(command);
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
    server = await startFetchableTestServer((command) => {
      received.push(command);
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
    server = await startFetchableTestServer(() => undefined);

    const missing = await fetch(`${server.url}/missing`, { method: 'POST' });
    const wrongMethod = await fetch(`${server.url}/pet/command`, { method: 'GET' });

    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ ok: false, error: 'Not found.' });
    expect(wrongMethod.status).toBe(405);
    expect(await wrongMethod.json()).toEqual({ ok: false, error: 'Method not allowed.' });
  });
});

/**
 * Starts a command server on an ephemeral port that Node fetch accepts.
 *
 * Inputs: callback that receives validated pet commands.
 * Returns: started test server.
 * Errors: throws if too many OS-assigned ports are blocked by the Fetch bad
 * port list.
 * Side effects: opens and may close ephemeral localhost ports while probing.
 */
async function startFetchableTestServer(
  onCommand: (command: PetCommand) => void
): Promise<PetCommandServer> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = await startPetCommandServer({
      host: '127.0.0.1',
      port: 0,
      onCommand
    });

    if (isFetchAllowedPort(candidate.port)) {
      return candidate;
    }

    await candidate.close();
  }

  throw new Error('Could not find an ephemeral port accepted by fetch.');
}

/**
 * Checks whether a port is blocked by the Fetch bad-port protection list.
 *
 * Inputs: TCP port number returned by Node after binding port zero.
 * Returns: false for ports that Fetch refuses before issuing a request.
 * Errors: does not throw.
 * Side effects: none.
 */
function isFetchAllowedPort(port: number): boolean {
  return !new Set([
    1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95, 101,
    102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139, 143, 161, 179, 389,
    427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563, 587, 601, 636,
    989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665,
    6666, 6667, 6668, 6669, 6697, 10080
  ]).has(port);
}
