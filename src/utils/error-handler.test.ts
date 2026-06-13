import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupErrorHandling } from './error-handler.js';

describe('setupErrorHandling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs MCP errors through server.onerror', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'on').mockImplementation(() => process);
    const server = { onerror: undefined, close: vi.fn() } as unknown as Server;

    setupErrorHandling(server);
    const error = new Error('mcp failed');
    server.onerror?.(error);

    expect(errorSpy).toHaveBeenCalledWith('[MCP Error]', error);
  });

  it('closes the server and exits on SIGINT', async () => {
    let sigintListener: (() => Promise<void>) | undefined;
    vi.spyOn(process, 'on').mockImplementation(((
      event: string,
      listener: () => Promise<void>,
    ) => {
      if (event === 'SIGINT') sigintListener = listener;
      return process;
    }) as typeof process.on);
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    const close = vi.fn().mockResolvedValue(undefined);
    const server = { onerror: undefined, close } as unknown as Server;

    setupErrorHandling(server);
    expect(sigintListener).toBeDefined();
    await sigintListener?.();

    expect(close).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
