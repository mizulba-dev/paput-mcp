import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { getSessionTranscriptTool } from './tool.js';

describe('getSessionTranscriptTool', () => {
  it('defines paput_get_session_transcript', () => {
    expectToolDefinition(
      getSessionTranscriptTool,
      'paput_get_session_transcript',
    );
  });
});
