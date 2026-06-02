import { execFile } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createServer, type Server as HttpServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { promisify } from 'node:util';
import {
  buildStoredOAuthSession,
  fetchAuthorizationServerMetadata,
  getOAuthSessionPath,
  writeStoredOAuthSession,
} from '../services/oauth/local-auth.js';

const execFileAsync = promisify(execFile);
const DEFAULT_SCOPES = 'paput.read paput.write';

interface LoginOptions {
  apiUrl: string;
  noOpen: boolean;
  scopes: string;
}

interface RegisterClientResponse {
  client_id: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export async function login(args: string[]): Promise<void> {
  const options = parseLoginOptions(args);
  const metadata = await fetchAuthorizationServerMetadata(options.apiUrl);
  const callback = await startCallbackServer();
  const callbackPromise = callback.waitForCallback();

  try {
    const client = await registerClient({
      endpoint: metadata.registration_endpoint,
      redirectUri: callback.redirectUri,
      scopes: options.scopes,
    });
    const codeVerifier = randomToken();
    const state = randomToken();
    const authorizationUrl = new URL(metadata.authorization_endpoint);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('client_id', client.client_id);
    authorizationUrl.searchParams.set('redirect_uri', callback.redirectUri);
    authorizationUrl.searchParams.set('scope', options.scopes);
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set(
      'code_challenge',
      pkceChallenge(codeVerifier),
    );
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    console.log('Opening PaPut OAuth login in your browser.');
    console.log(`If it does not open, visit:\n${authorizationUrl.toString()}`);

    if (!options.noOpen) {
      await openBrowser(authorizationUrl.toString());
    }

    const callbackResult = await callbackPromise;
    if (callbackResult.state !== state) {
      throw new Error('OAuth state mismatch.');
    }

    const token = await exchangeCode({
      clientId: client.client_id,
      code: callbackResult.code,
      codeVerifier,
      redirectUri: callback.redirectUri,
      tokenEndpoint: metadata.token_endpoint,
    });

    writeStoredOAuthSession(
      buildStoredOAuthSession({
        apiUrl: options.apiUrl,
        clientId: client.client_id,
        issuer: metadata.issuer,
        redirectUri: callback.redirectUri,
        token,
      }),
    );

    console.log(`PaPut OAuth login completed.`);
    console.log(`Token cache: ${getOAuthSessionPath()}`);
  } finally {
    await callback.close();
  }
}

function parseLoginOptions(args: string[]): LoginOptions {
  const options: LoginOptions = {
    apiUrl: process.env.PAPUT_API_URL ?? 'https://api.paput.io',
    noOpen: false,
    scopes: DEFAULT_SCOPES,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      printLoginHelp();
      process.exit(0);
    } else if (arg === '--api-url') {
      options.apiUrl = requireValue(args, (index += 1), '--api-url');
    } else if (arg === '--scopes') {
      options.scopes = requireValue(args, (index += 1), '--scopes')
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean)
        .join(' ');
    } else if (arg === '--no-open') {
      options.noOpen = true;
    } else {
      throw new Error(`Unknown login option: ${arg}`);
    }
  }

  return options;
}

function printLoginHelp(): void {
  console.log(`Usage:
  paput-mcp login [options]

Options:
  --api-url <URL>       PaPut API URL. Defaults to PAPUT_API_URL or https://api.paput.io
  --scopes <SCOPES>     Comma-separated OAuth scopes. Defaults to paput.read,paput.write
  --no-open             Print the login URL without opening a browser
`);
}

function requireValue(args: string[], index: number, option: string): string {
  const value = args[index];
  if (!value) throw new Error(`${option} requires a value.`);
  return value;
}

async function registerClient(params: {
  endpoint: string;
  redirectUri: string;
  scopes: string;
}): Promise<RegisterClientResponse> {
  const response = await fetch(params.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirect_uris: [params.redirectUri],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_name: 'PaPut MCP Local CLI',
      client_uri: 'https://github.com/mizulba-dev/paput-mcp',
      software_id: 'paput-mcp',
      software_version: 'local',
      scope: params.scopes,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OAuth client registration failed: HTTP ${response.status}`,
    );
  }

  const client = (await response.json()) as RegisterClientResponse;
  if (!client.client_id) {
    throw new Error('OAuth client registration response is missing client_id.');
  }
  return client;
}

async function exchangeCode(params: {
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  tokenEndpoint: string;
}): Promise<TokenResponse> {
  const response = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: params.clientId,
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed: HTTP ${response.status}`);
  }

  return (await response.json()) as TokenResponse;
}

async function startCallbackServer(): Promise<{
  close: () => Promise<void>;
  redirectUri: string;
  waitForCallback: () => Promise<{ code: string; state: string }>;
}> {
  let resolveCallback:
    | ((value: { code: string; state: string }) => void)
    | undefined;
  let rejectCallback: ((error: Error) => void) | undefined;
  const callbackPromise = new Promise<{ code: string; state: string }>(
    (resolve, reject) => {
      resolveCallback = resolve;
      rejectCallback = reject;
    },
  );

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname !== '/oauth/callback') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const error = url.searchParams.get('error');
    if (error) {
      rejectCallback?.(new Error(`OAuth authorization failed: ${error}`));
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Authorization failed. You may close this window.');
      return;
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) {
      rejectCallback?.(new Error('OAuth callback is missing code or state.'));
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Invalid callback. You may close this window.');
      return;
    }

    resolveCallback?.({ code, state });
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Authorization successful. You may close this window.');
  });

  await listen(server);
  const address = server.address() as AddressInfo;
  return {
    close: () => close(server),
    redirectUri: `http://127.0.0.1:${address.port}/oauth/callback`,
    waitForCallback: () => callbackPromise,
  };
}

async function listen(server: HttpServer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
}

async function close(server: HttpServer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function openBrowser(url: string): Promise<void> {
  const command =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'cmd'
        : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];

  try {
    await execFileAsync(command, args);
  } catch {
    console.warn('Could not open the browser automatically.');
  }
}

function randomToken(): string {
  return base64Url(randomBytes(32));
}

function pkceChallenge(verifier: string): string {
  return base64Url(createHash('sha256').update(verifier).digest());
}

function base64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
