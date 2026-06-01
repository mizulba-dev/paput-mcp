import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { syncRemoteMemosTool } from './tool.js';

describe('syncRemoteMemosTool', () => {
  it('defines paput_sync_remote_memos', () => {
    expectToolDefinition(syncRemoteMemosTool, 'paput_sync_remote_memos');
  });
});
