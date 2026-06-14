import { execFile } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createServer, type Server as HttpServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { promisify } from 'node:util';
import {
  buildStoredOAuthSession,
  fetchAuthorizationServerMetadata,
  getOAuthSessionPath,
  tokenResponseSchema,
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

type TokenResponse = import('zod').infer<typeof tokenResponseSchema>;

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

  const parsed = tokenResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(
      'OAuth token exchange response is missing required fields.',
    );
  }
  return parsed.data;
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
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        renderCallbackPage({
          status: 'error',
          title: 'Authorization failed',
          message:
            'PaPut MCP could not complete the authorization request. Return to the terminal for details.',
        }),
      );
      return;
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) {
      rejectCallback?.(new Error('OAuth callback is missing code or state.'));
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        renderCallbackPage({
          status: 'error',
          title: 'Invalid callback',
          message:
            'The authorization callback was missing required information. Return to the terminal for details.',
        }),
      );
      return;
    }

    resolveCallback?.({ code, state });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(
      renderCallbackPage({
        status: 'success',
        title: 'Authorization complete',
        message:
          'PaPut MCP has been connected. You can close this window and return to your terminal.',
      }),
    );
  });

  await listen(server);
  const address = server.address() as AddressInfo;
  return {
    close: () => close(server),
    redirectUri: `http://127.0.0.1:${address.port}/oauth/callback`,
    waitForCallback: () => callbackPromise,
  };
}

function renderCallbackPage(params: {
  message: string;
  status: 'error' | 'success';
  title: string;
}): string {
  const icon = params.status === 'success' ? 'OK' : '!';
  const eyebrow =
    params.status === 'success' ? 'OAuth authorization' : 'OAuth error';
  const logoUrl = 'https://paput.io/img/paput-main-logo-transparent.png';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(params.title)} | PaPut MCP</title>
  <style>
    :root {
      --base-black: #1F2937;
      --neutral-white: #F8FAFC;
      --primary-orange: #F59E0B;
      --primary-orange-light: #FCEFDC;
      --primary-red: #FF6B6A;
      --primary-blue: #64B2DD;
      --border: #E5E7EB;
      --muted: #6B7280;
    }
    * { box-sizing: border-box; }
    html {
      min-height: 100%;
      background: var(--neutral-white);
      color: var(--base-black);
      font-family: "LINE Seed", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      min-height: 100vh;
      margin: 0;
      background:
        radial-gradient(circle at top left, rgba(245, 158, 11, 0.12), transparent 34rem),
        radial-gradient(circle at bottom right, rgba(100, 178, 221, 0.12), transparent 30rem),
        var(--neutral-white);
    }
    main {
      display: grid;
      place-items: center;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .card {
      width: min(100%, 440px);
      border: 1px solid #e2e6de;
      border-radius: 24px;
      background: #ffffff;
      box-shadow: 0 24px 60px rgba(31, 41, 55, 0.10);
      overflow: hidden;
    }
    .card-header {
      padding: 32px 32px 24px;
      text-align: center;
      border-bottom: 1px solid #F3F4F6;
    }
    .logo {
      display: block;
      width: 168px;
      height: auto;
      margin: 0 auto 24px;
    }
    .eyebrow {
      margin: 0 0 8px;
      color: var(--primary-orange);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0;
    }
    .content {
      padding: 28px 32px 32px;
      text-align: center;
    }
    .mark {
      display: inline-grid;
      place-items: center;
      width: 44px;
      height: 44px;
      margin: 0 auto 18px;
      border-radius: 999px;
      color: var(--primary-orange);
      background: var(--primary-orange-light);
      font-weight: 800;
      letter-spacing: 0;
    }
    h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.25;
      font-weight: 800;
      letter-spacing: 0;
    }
    p {
      margin: 0;
      color: #374151;
      font-size: 16px;
      line-height: 1.7;
    }
    .note {
      margin-top: 18px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
    }
    @media (max-width: 560px) {
      main { padding: 20px 14px; }
      .card { border-radius: 20px; }
      .card-header { padding: 28px 20px 20px; }
      .content { padding: 24px 20px 28px; }
      .logo { width: 140px; margin-bottom: 20px; }
      h1 { font-size: 24px; }
    }
  </style>
</head>
<body>
  <main aria-labelledby="callback-title">
    <section class="card">
      <div class="card-header">
        <img class="logo" src="${logoUrl}" alt="PaPut">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h1 id="callback-title">${escapeHtml(params.title)}</h1>
      </div>
      <div class="content">
        <div class="mark" aria-hidden="true">${icon}</div>
        <p>${escapeHtml(params.message)}</p>
        <p class="note">This local callback page was opened by PaPut MCP CLI.</p>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
