import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readStoredOAuthSession } from '../services/oauth/local-auth.js';
import { login } from './login.js';

const apiUrl = 'https://api.example.test';

describe('login', () => {
  const originalPaputHome = process.env.PAPUT_HOME;
  const tempDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalPaputHome === undefined) {
      delete process.env.PAPUT_HOME;
    } else {
      process.env.PAPUT_HOME = originalPaputHome;
    }
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  function usePaputHome(): void {
    const paputHome = mkdtempSync(join(tmpdir(), 'paput-mcp-test-'));
    tempDirs.push(paputHome);
    process.env.PAPUT_HOME = paputHome;
  }

  function captureLogs(): string[] {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });
    return logs;
  }

  function mockOAuthProvider(tokenResponse: () => Response) {
    return vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url === `${apiUrl}/.well-known/oauth-authorization-server`) {
          return new Response(
            JSON.stringify({
              issuer: apiUrl,
              authorization_endpoint: `${apiUrl}/oauth/authorize`,
              registration_endpoint: `${apiUrl}/oauth/register`,
              token_endpoint: `${apiUrl}/oauth/token`,
            }),
            { status: 200 },
          );
        }
        if (url === `${apiUrl}/oauth/register`) {
          return new Response(JSON.stringify({ client_id: 'client-123' }), {
            status: 200,
          });
        }
        if (url === `${apiUrl}/oauth/token`) {
          return tokenResponse();
        }
        throw new Error(`Unexpected fetch: ${url} ${init?.method ?? 'GET'}`);
      });
  }

  async function waitForAuthorizationUrl(logs: string[]): Promise<URL> {
    const start = Date.now();
    while (Date.now() - start < 5000) {
      const line = logs.find((log) =>
        log.includes(`${apiUrl}/oauth/authorize?`),
      );
      if (line) {
        const match = line.match(/https:\/\/\S+/);
        if (match) return new URL(match[0]);
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('Authorization URL was not printed.');
  }

  function httpGet(url: string): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      const req = request(url, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      });
      req.on('error', reject);
      req.end();
    });
  }

  function base64Url(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  it('completes the PKCE flow and stores the OAuth session', async () => {
    usePaputHome();
    const logs = captureLogs();
    const fetchMock = mockOAuthProvider(
      () =>
        new Response(
          JSON.stringify({
            access_token: 'access-token',
            expires_in: 3600,
            refresh_token: 'refresh-token',
            scope: 'paput.read',
            token_type: 'Bearer',
          }),
          { status: 200 },
        ),
    );

    const loginPromise = login([
      '--api-url',
      apiUrl,
      '--scopes',
      'paput.read',
      '--no-open',
    ]);
    const authorizationUrl = await waitForAuthorizationUrl(logs);

    expect(authorizationUrl.searchParams.get('response_type')).toBe('code');
    expect(authorizationUrl.searchParams.get('client_id')).toBe('client-123');
    expect(authorizationUrl.searchParams.get('scope')).toBe('paput.read');
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe(
      'S256',
    );

    const redirectUri = authorizationUrl.searchParams.get('redirect_uri');
    const state = authorizationUrl.searchParams.get('state');
    const callbackResponse = await httpGet(
      `${redirectUri}?code=auth-code&state=${state}`,
    );
    await loginPromise;

    expect(callbackResponse.status).toBe(200);
    expect(callbackResponse.body).toContain('Authorization complete');

    const tokenCall = fetchMock.mock.calls.find(
      ([input]) => String(input) === `${apiUrl}/oauth/token`,
    );
    const body = (tokenCall?.[1] as RequestInit).body as URLSearchParams;
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('auth-code');
    expect(body.get('redirect_uri')).toBe(redirectUri);
    expect(
      base64Url(
        createHash('sha256')
          .update(body.get('code_verifier') ?? '')
          .digest(),
      ),
    ).toBe(authorizationUrl.searchParams.get('code_challenge'));

    const session = readStoredOAuthSession();
    expect(session).toMatchObject({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      api_url: apiUrl,
      client_id: 'client-123',
      issuer: apiUrl,
      redirect_uri: redirectUri,
    });
  });

  it('rejects when the callback state does not match', async () => {
    usePaputHome();
    const logs = captureLogs();
    mockOAuthProvider(() => new Response('{}', { status: 200 }));

    const loginPromise = login(['--api-url', apiUrl, '--no-open']);
    const authorizationUrl = await waitForAuthorizationUrl(logs);
    const redirectUri = authorizationUrl.searchParams.get('redirect_uri');

    const notFound = await httpGet(
      `${new URL(redirectUri ?? '').origin}/other-path`,
    );
    expect(notFound.status).toBe(404);

    const expectation = expect(loginPromise).rejects.toThrow(
      'OAuth state mismatch.',
    );
    await httpGet(`${redirectUri}?code=auth-code&state=wrong-state`);

    await expectation;
    expect(readStoredOAuthSession()).toBeUndefined();
  });

  it('rejects when the authorization callback reports an error', async () => {
    usePaputHome();
    const logs = captureLogs();
    mockOAuthProvider(() => new Response('{}', { status: 200 }));

    const loginPromise = login(['--api-url', apiUrl, '--no-open']);
    const authorizationUrl = await waitForAuthorizationUrl(logs);
    const redirectUri = authorizationUrl.searchParams.get('redirect_uri');

    const expectation = expect(loginPromise).rejects.toThrow(
      'OAuth authorization failed: access_denied',
    );
    const callbackResponse = await httpGet(
      `${redirectUri}?error=access_denied`,
    );

    expect(callbackResponse.status).toBe(400);
    await expectation;
  });

  it('rejects when the callback is missing code or state', async () => {
    usePaputHome();
    const logs = captureLogs();
    mockOAuthProvider(() => new Response('{}', { status: 200 }));

    const loginPromise = login(['--api-url', apiUrl, '--no-open']);
    const authorizationUrl = await waitForAuthorizationUrl(logs);
    const redirectUri = authorizationUrl.searchParams.get('redirect_uri');

    const expectation = expect(loginPromise).rejects.toThrow(
      'OAuth callback is missing code or state.',
    );
    const callbackResponse = await httpGet(`${redirectUri}?code=auth-code`);

    expect(callbackResponse.status).toBe(400);
    await expectation;
  });

  it('rejects when the code exchange fails', async () => {
    usePaputHome();
    const logs = captureLogs();
    mockOAuthProvider(
      () =>
        new Response(JSON.stringify({ error: 'invalid_grant' }), {
          status: 400,
        }),
    );

    const loginPromise = login(['--api-url', apiUrl, '--no-open']);
    const authorizationUrl = await waitForAuthorizationUrl(logs);
    const redirectUri = authorizationUrl.searchParams.get('redirect_uri');
    const state = authorizationUrl.searchParams.get('state');

    const expectation = expect(loginPromise).rejects.toThrow(
      'OAuth token exchange failed: HTTP 400',
    );
    await httpGet(`${redirectUri}?code=auth-code&state=${state}`);

    await expectation;
    expect(readStoredOAuthSession()).toBeUndefined();
  });

  it('rejects when the client registration fails', async () => {
    usePaputHome();
    captureLogs();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === `${apiUrl}/.well-known/oauth-authorization-server`) {
        return new Response(
          JSON.stringify({
            issuer: apiUrl,
            authorization_endpoint: `${apiUrl}/oauth/authorize`,
            registration_endpoint: `${apiUrl}/oauth/register`,
            token_endpoint: `${apiUrl}/oauth/token`,
          }),
          { status: 200 },
        );
      }
      return new Response(null, { status: 500 });
    });

    await expect(login(['--api-url', apiUrl, '--no-open'])).rejects.toThrow(
      'OAuth client registration failed: HTTP 500',
    );
  });

  it('rejects unknown or incomplete options before any network access', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(login(['--unknown'])).rejects.toThrow(
      'Unknown login option: --unknown',
    );
    await expect(login(['--api-url'])).rejects.toThrow(
      '--api-url requires a value.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
