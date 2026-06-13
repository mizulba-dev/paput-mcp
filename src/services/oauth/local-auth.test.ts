import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deleteStoredOAuthSession,
  getOAuthSessionPath,
  getValidStoredAccessToken,
  readStoredOAuthSession,
  writeStoredOAuthSession,
  type StoredOAuthSession,
} from './local-auth.js';

describe('local OAuth session storage', () => {
  const originalPaputHome = process.env.PAPUT_HOME;
  const tempDirs: string[] = [];

  afterEach(() => {
    if (originalPaputHome === undefined) {
      delete process.env.PAPUT_HOME;
    } else {
      process.env.PAPUT_HOME = originalPaputHome;
    }
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('stores OAuth tokens in a private directory and file', () => {
    const paputHome = mkdtempSync(join(tmpdir(), 'paput-mcp-test-'));
    tempDirs.push(paputHome);
    process.env.PAPUT_HOME = paputHome;

    writeStoredOAuthSession({
      access_token: 'access-token',
      api_url: 'https://api.example.test',
      client_id: 'client-id',
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      issuer: 'https://api.example.test',
      redirect_uri: 'http://127.0.0.1:1234/oauth/callback',
      refresh_token: 'refresh-token',
      scope: 'paput.read paput.write',
      token_type: 'Bearer',
    });

    expect(readStoredOAuthSession()?.access_token).toBe('access-token');
    expect(statSync(paputHome).mode & 0o777).toBe(0o700);
    expect(statSync(getOAuthSessionPath()).mode & 0o777).toBe(0o600);

    deleteStoredOAuthSession();
    expect(readStoredOAuthSession()).toBeUndefined();
  });

  it('returns undefined when the stored file is broken or incomplete', () => {
    const paputHome = mkdtempSync(join(tmpdir(), 'paput-mcp-test-'));
    tempDirs.push(paputHome);
    process.env.PAPUT_HOME = paputHome;

    writeFileSync(getOAuthSessionPath(), '{not json}');
    expect(readStoredOAuthSession()).toBeUndefined();

    writeFileSync(getOAuthSessionPath(), JSON.stringify({ access_token: 'a' }));
    expect(readStoredOAuthSession()).toBeUndefined();
  });
});

describe('getValidStoredAccessToken', () => {
  const originalPaputHome = process.env.PAPUT_HOME;
  const tempDirs: string[] = [];
  const apiUrl = 'https://api.example.test';

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

  function storeSession(
    overrides: Partial<StoredOAuthSession> = {},
  ): StoredOAuthSession {
    const session: StoredOAuthSession = {
      access_token: 'stored-access',
      api_url: apiUrl,
      client_id: 'client-id',
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      issuer: apiUrl,
      redirect_uri: 'http://127.0.0.1:1234/oauth/callback',
      refresh_token: 'stored-refresh',
      scope: 'paput.read paput.write',
      token_type: 'Bearer',
      ...overrides,
    };
    writeStoredOAuthSession(session);
    return session;
  }

  function mockOAuthEndpoints(tokenResponse: Response) {
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
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
      if (url === `${apiUrl}/oauth/token`) {
        return tokenResponse;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
  }

  it('returns the stored token without refresh while it is still valid', async () => {
    usePaputHome();
    storeSession({
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(getValidStoredAccessToken(apiUrl)).resolves.toBe(
      'stored-access',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns undefined when no session is stored', async () => {
    usePaputHome();
    await expect(getValidStoredAccessToken(apiUrl)).resolves.toBeUndefined();
  });

  it('returns undefined when the stored session belongs to another API origin', async () => {
    usePaputHome();
    storeSession({ api_url: 'https://other.example.test' });
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(getValidStoredAccessToken(apiUrl)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes and rotates the session when the token is expired', async () => {
    usePaputHome();
    storeSession({
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    const fetchMock = mockOAuthEndpoints(
      new Response(
        JSON.stringify({
          access_token: 'new-access',
          expires_in: 3600,
          refresh_token: 'new-refresh',
          scope: 'paput.read paput.write',
          token_type: 'Bearer',
        }),
        { status: 200 },
      ),
    );

    await expect(getValidStoredAccessToken(apiUrl)).resolves.toBe('new-access');

    const tokenCall = fetchMock.mock.calls.find(
      ([input]) => String(input) === `${apiUrl}/oauth/token`,
    );
    expect(tokenCall).toBeDefined();
    const body = (tokenCall?.[1] as RequestInit).body as URLSearchParams;
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('client_id')).toBe('client-id');
    expect(body.get('refresh_token')).toBe('stored-refresh');

    const stored = readStoredOAuthSession();
    expect(stored?.access_token).toBe('new-access');
    expect(stored?.refresh_token).toBe('new-refresh');
    expect(new Date(stored?.expires_at ?? 0).getTime()).toBeGreaterThan(
      Date.now(),
    );
  });

  it('refreshes when the token expires within the skew window', async () => {
    usePaputHome();
    storeSession({
      expires_at: new Date(Date.now() + 60 * 1000).toISOString(),
    });
    mockOAuthEndpoints(
      new Response(
        JSON.stringify({
          access_token: 'new-access',
          expires_in: 3600,
          refresh_token: 'new-refresh',
          scope: 'paput.read paput.write',
          token_type: 'Bearer',
        }),
        { status: 200 },
      ),
    );

    await expect(getValidStoredAccessToken(apiUrl)).resolves.toBe('new-access');
  });

  it('returns undefined when the token endpoint rejects the refresh', async () => {
    usePaputHome();
    storeSession({
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    mockOAuthEndpoints(
      new Response(JSON.stringify({ error: 'invalid_grant' }), {
        status: 400,
      }),
    );

    await expect(getValidStoredAccessToken(apiUrl)).resolves.toBeUndefined();
    expect(readStoredOAuthSession()?.access_token).toBe('stored-access');
  });

  it('rejects when the OAuth metadata cannot be loaded', async () => {
    usePaputHome();
    storeSession({
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 503 }),
    );

    await expect(getValidStoredAccessToken(apiUrl)).rejects.toThrow(
      'Failed to load OAuth metadata: HTTP 503',
    );
  });

  it('rejects when the OAuth metadata is missing required endpoints', async () => {
    usePaputHome();
    storeSession({
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ issuer: apiUrl }), { status: 200 }),
    );

    await expect(getValidStoredAccessToken(apiUrl)).rejects.toThrow(
      'OAuth metadata is missing required endpoints.',
    );
  });
});
