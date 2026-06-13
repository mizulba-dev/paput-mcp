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

  it('rejects when no token is configured and no stored session exists', async () => {
    const paputHome = mkdtempSync(join(tmpdir(), 'paput-mcp-test-'));
    tempDirs.push(paputHome);
    process.env.PAPUT_HOME = paputHome;
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = createApiClient('https://api.example.test');

    await expect(client.get('/api/v1/mcp/memos')).rejects.toThrow(
      'PaPut authentication is not configured',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('resolveEndpointUrl (SSRF protection)', () => {
    it('refuses absolute URLs pointing at another host', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch');
      const client = createApiClient('https://api.example.test', 'token');

      await expect(
        client.get('https://evil.example.test/api/v1/mcp/memos'),
      ).rejects.toThrow('Refusing to send request to untrusted host');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('refuses absolute URLs with a different scheme', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch');
      const client = createApiClient('https://api.example.test', 'token');

      await expect(
        client.get('http://api.example.test/api/v1/mcp/memos'),
      ).rejects.toThrow('Refusing to send request to untrusted host');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('refuses absolute URLs with a different port', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch');
      const client = createApiClient('https://api.example.test', 'token');

      await expect(
        client.get('https://api.example.test:8443/api/v1/mcp/memos'),
      ).rejects.toThrow('Refusing to send request to untrusted host');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('allows absolute URLs on the same origin', async () => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('{}', { status: 200 }));
      const client = createApiClient('https://api.example.test', 'token');

      await client.get('https://api.example.test/api/v1/mcp/memos');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.test/api/v1/mcp/memos',
        expect.anything(),
      );
    });
  });

  describe('error responses', () => {
    it('rejects 4xx responses with the error message from a JSON body', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ error: 'memo not found' }), {
          status: 404,
        }),
      );
      const client = createApiClient('https://api.example.test', 'token');

      await expect(client.get('/api/v1/mcp/memo/1')).rejects.toThrow(
        'memo not found',
      );
    });

    it('rejects 4xx responses with a plain text body', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('bad request', { status: 400 }),
      );
      const client = createApiClient('https://api.example.test', 'token');

      await expect(client.get('/api/v1/mcp/memos')).rejects.toThrow(
        'bad request',
      );
    });

    it('rejects 5xx responses without a body using the status code', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 500 }),
      );
      const client = createApiClient('https://api.example.test', 'token');

      await expect(client.get('/api/v1/mcp/memos')).rejects.toThrow(
        'HTTP error! status: 500',
      );
    });
  });

  describe('response body handling', () => {
    it('returns an empty object when the success body is not JSON', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('not json', { status: 200 }),
      );
      const client = createApiClient('https://api.example.test', 'token');

      await expect(client.get('/api/v1/mcp/memos')).resolves.toEqual({});
    });

    it('returns an empty object for 204 responses', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 204 }),
      );
      const client = createApiClient('https://api.example.test', 'token');

      await expect(client.delete('/api/v1/mcp/goal/1')).resolves.toEqual({});
    });
  });

  describe('request construction', () => {
    it('sends a JSON body and Content-Type for POST', async () => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('{}', { status: 200 }));
      const client = createApiClient('https://api.example.test', 'token');

      await client.post('/api/v1/mcp/note', { title: 'Note' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.test/api/v1/mcp/note',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'Note' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('omits the body and Content-Type for GET and DELETE', async () => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async () => new Response('{}', { status: 200 }));
      const client = createApiClient('https://api.example.test', 'token');

      await client.get('/api/v1/mcp/memos');
      await client.delete('/api/v1/mcp/goal/1');

      for (const [, init] of fetchMock.mock.calls) {
        const options = init as RequestInit;
        expect(options.body).toBeUndefined();
        expect(options.headers).not.toHaveProperty('Content-Type');
      }
    });
  });
});
