/**
 * Local HTTP server for external desktop pet commands.
 *
 * Responsibility: accepts JSON commands from localhost and dispatches validated
 * commands to main-process handlers. It does not know how commands affect
 * windows, menus, renderers, or Live2D models.
 *
 * Side effects: opens a local HTTP port, reads request bodies, and invokes the
 * supplied command callback for valid input.
 *
 * Key dependencies and constraints: intended to bind to `127.0.0.1` only. The
 * request body is capped to prevent accidental large local payloads.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import { parsePetCommand, type PetCommand } from '../shared/petCommand.js';

const MAX_BODY_BYTES = 64 * 1024;

export interface PetCommandServerOptions {
  readonly host: string;
  readonly port: number;
  readonly onCommand: (command: PetCommand) => void;
}

export interface PetCommandServer {
  readonly url: string;
  readonly port: number;
  close(): Promise<void>;
}

/**
 * Starts the localhost command server.
 *
 * Inputs: `host` and `port` define the listening endpoint; `onCommand` receives
 * validated commands.
 * Returns: a controller with the actual URL and an async close method.
 * Errors: rejects if the port cannot be opened.
 * Side effects: binds a local HTTP server and keeps it alive until closed.
 */
export function startPetCommandServer(options: PetCommandServerOptions): Promise<PetCommandServer> {
  const server = createServer((request, response) => {
    void handleRequest(request, response, options.onCommand);
  });

  server.requestTimeout = 5000;
  server.headersTimeout = 6000;

  return new Promise((resolve, reject) => {
    const onError = (error: Error): void => {
      reject(error);
    };

    server.once('error', onError);
    server.listen(options.port, options.host, () => {
      server.off('error', onError);
      const address = server.address() as AddressInfo;
      const url = `http://${address.address}:${address.port}`;

      resolve({
        url,
        port: address.port,
        close: () => closeServer(server)
      });
    });
  });
}

/**
 * Handles one HTTP request for the command API.
 *
 * Inputs: Node request/response objects and a validated command callback.
 * Returns: a promise that resolves after the response is written.
 * Errors: malformed request bodies are converted to 400 responses.
 * Side effects: reads the request body, writes an HTTP response, and may invoke
 * `onCommand` exactly once for a valid command.
 */
async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  onCommand: (command: PetCommand) => void
): Promise<void> {
  if (request.url !== '/pet/command') {
    writeJson(response, 404, { ok: false, error: 'Not found.' });
    return;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { ok: false, error: 'Method not allowed.' });
    return;
  }

  const body = await readBody(request);

  if (!body.ok) {
    writeJson(response, 400, { ok: false, error: body.error });
    return;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body.text);
  } catch {
    writeJson(response, 400, { ok: false, error: 'Request body must be valid JSON.' });
    return;
  }

  const parsed = parsePetCommand(payload);

  if (!parsed.ok) {
    writeJson(response, 400, { ok: false, error: parsed.error });
    return;
  }

  onCommand(parsed.command);
  writeJson(response, 200, { ok: true });
}

/**
 * Reads a request body with a small fixed byte limit.
 *
 * Inputs: Node incoming request stream.
 * Returns: body text or a validation error suitable for a 400 response.
 * Errors: stream errors are converted to a generic body-read error.
 * Side effects: consumes the request stream.
 */
function readBody(
  request: IncomingMessage
): Promise<{ readonly ok: true; readonly text: string } | { readonly ok: false; readonly error: string }> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    request.on('data', (chunk: Buffer) => {
      if (settled) {
        return;
      }

      totalBytes += chunk.length;

      if (totalBytes > MAX_BODY_BYTES) {
        settled = true;
        request.destroy();
        resolve({ ok: false, error: 'Request body is too large.' });
        return;
      }

      chunks.push(chunk);
    });

    request.on('end', () => {
      if (!settled) {
        settled = true;
        resolve({ ok: true, text: Buffer.concat(chunks).toString('utf8') });
      }
    });

    request.on('error', () => {
      if (!settled) {
        settled = true;
        resolve({ ok: false, error: 'Failed to read request body.' });
      }
    });
  });
}

/**
 * Writes a JSON response with consistent headers.
 *
 * Inputs: response object, HTTP status code, and JSON-serializable payload.
 * Returns: nothing.
 * Errors: Node may emit socket errors outside this function; it does not throw
 * for normal response writes.
 * Side effects: writes headers and ends the response.
 */
function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

/**
 * Closes an HTTP server as a promise.
 *
 * Inputs: server instance returned by Node `createServer`.
 * Returns: promise that resolves after close completes.
 * Errors: rejects if Node reports a close error.
 * Side effects: stops accepting new connections.
 */
function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
