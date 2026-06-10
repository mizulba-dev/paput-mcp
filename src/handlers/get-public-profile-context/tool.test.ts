import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { getPublicProfileContextTool } from './tool.js';

describe('getPublicProfileContextTool', () => {
  it('defines paput_get_public_profile_context', () => {
    expectToolDefinition(
      getPublicProfileContextTool,
      'paput_get_public_profile_context',
    );
  });
});
