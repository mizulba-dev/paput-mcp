import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { updateNoteTool } from './tool.js';

describe('updateNoteTool', () => {
  it('defines paput_update_note', () => {
    expectToolDefinition(updateNoteTool, 'paput_update_note');
  });
});
