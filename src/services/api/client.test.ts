import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeStoredOAuthSession } from '../oauth/local-auth.js';
import { createApiClient } from './client.js';

describe('createApiClient', () => {
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

  it('uses an explicit bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = createApiClient('https://api.example.test', 'access-token');

    await client.get('/api/v1/mcp/memos');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/mcp/memos',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    );
  });

  it('uses a stored OAuth token when no explicit auth is configured', async () => {
    const paputHome = mkdtempSync(join(tmpdir(), 'paput-mcp-test-'));
    tempDirs.push(paputHome);
    process.env.PAPUT_HOME = paputHome;
    writeStoredOAuthSession({
      access_token: 'stored-token',
      api_url: 'https://api.example.test',
      client_id: 'client-id',
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      issuer: 'https://api.example.test',
      redirect_uri: 'http://127.0.0.1:1234/oauth/callback',
      refresh_token: 'refresh-token',
      scope: 'paput.read paput.write',
      token_type: 'Bearer',
    });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = createApiClient('https://api.example.test');

    await client.get('/api/v1/mcp/memos');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/mcp/memos',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer stored-token',
        }),
      }),
    );
  });
});
