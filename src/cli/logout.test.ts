import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getOAuthSessionPath,
  readStoredOAuthSession,
  writeStoredOAuthSession,
  type StoredOAuthSession,
} from '../services/oauth/local-auth.js';
import { logout } from './logout.js';

const apiUrl = 'https://api.example.test';

describe('logout', () => {
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
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  }

  function storeSession(): StoredOAuthSession {
    const session: StoredOAuthSession = {
      access_token: 'access-token',
      api_url: apiUrl,
      client_id: 'client-id',
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      issuer: apiUrl,
      redirect_uri: 'http://127.0.0.1:1234/oauth/callback',
      refresh_token: 'refresh-token',
      scope: 'paput.read paput.write',
      token_type: 'Bearer',
    };
    writeStoredOAuthSession(session);
    return session;
  }

  function mockMetadata(
    options: { withRevocation: boolean },
    revoke?: Response,
  ) {
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === `${apiUrl}/.well-known/oauth-authorization-server`) {
        return new Response(
          JSON.stringify({
            issuer: apiUrl,
            authorization_endpoint: `${apiUrl}/oauth/authorize`,
            registration_endpoint: `${apiUrl}/oauth/register`,
            token_endpoint: `${apiUrl}/oauth/token`,
            ...(options.withRevocation
              ? { revocation_endpoint: `${apiUrl}/oauth/revoke` }
              : {}),
          }),
          { status: 200 },
        );
      }
      if (url === `${apiUrl}/oauth/revoke` && revoke) {
        return revoke;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
  }

  it('does nothing remote when no session is stored', async () => {
    usePaputHome();
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await logout([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('revokes the refresh token and removes the local cache', async () => {
    usePaputHome();
    storeSession();
    const fetchMock = mockMetadata(
      { withRevocation: true },
      new Response(null, { status: 200 }),
    );

    await logout([]);

    const revokeCall = fetchMock.mock.calls.find(
      ([input]) => String(input) === `${apiUrl}/oauth/revoke`,
    );
    expect(revokeCall).toBeDefined();
    const body = (revokeCall?.[1] as RequestInit).body as URLSearchParams;
    expect(body.get('client_id')).toBe('client-id');
    expect(body.get('token')).toBe('refresh-token');
    expect(body.get('token_type_hint')).toBe('refresh_token');

    expect(readStoredOAuthSession()).toBeUndefined();
    expect(existsSync(getOAuthSessionPath())).toBe(false);
  });

  it('removes the local cache even when the revoke endpoint fails', async () => {
    usePaputHome();
    storeSession();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockMetadata({ withRevocation: true }, new Response(null, { status: 500 }));

    await logout([]);

    expect(readStoredOAuthSession()).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not revoke the remote token: HTTP 500'),
    );
  });

  it('removes the local cache when no revocation endpoint is provided', async () => {
    usePaputHome();
    storeSession();
    mockMetadata({ withRevocation: false });

    await logout([]);

    expect(readStoredOAuthSession()).toBeUndefined();
  });

  it('skips the remote revoke with --local-only', async () => {
    usePaputHome();
    storeSession();
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await logout(['--local-only']);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(readStoredOAuthSession()).toBeUndefined();
  });

  it('rejects unknown options', async () => {
    usePaputHome();
    await expect(logout(['--unknown'])).rejects.toThrow(
      'Unknown logout option: --unknown',
    );
  });
});
