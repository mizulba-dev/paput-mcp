import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  deleteStoredOAuthSession,
  getOAuthSessionPath,
  readStoredOAuthSession,
  writeStoredOAuthSession,
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
});
