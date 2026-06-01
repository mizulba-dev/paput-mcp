import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getGeneratedInputSchema } from './schemas/tool-input.js';
import { getRegisteredTools } from './tool.js';

const expectedToolNames = [
  'paput_create_memo',
  'paput_search_memo',
  'paput_get_memo',
  'paput_update_memo',
  'paput_get_categories',
  'paput_create_note',
  'paput_search_notes',
  'paput_get_note',
  'paput_update_note',
  'paput_get_skill_sheet',
  'paput_update_skill_sheet_basic_info',
  'paput_update_skill_sheet_self_pr',
  'paput_set_skill_sheet_skills',
  'paput_upsert_skill_sheet_project',
  'paput_delete_skill_sheet_project',
  'paput_cache_status',
  'paput_sync_remote_memos',
  'paput_scan_sessions',
  'paput_get_session_transcript',
  'paput_add_knowledge_candidates',
  'paput_list_pending_candidates',
  'paput_save_pending_candidate',
  'paput_discard_pending_candidate',
];

const readOnlyToolNames = [
  'paput_search_memo',
  'paput_get_memo',
  'paput_get_categories',
  'paput_search_notes',
  'paput_get_note',
  'paput_get_skill_sheet',
  'paput_cache_status',
  'paput_scan_sessions',
  'paput_get_session_transcript',
  'paput_list_pending_candidates',
];

const destructiveToolNames = [
  'paput_update_memo',
  'paput_update_note',
  'paput_update_skill_sheet_basic_info',
  'paput_update_skill_sheet_self_pr',
  'paput_set_skill_sheet_skills',
  'paput_upsert_skill_sheet_project',
  'paput_delete_skill_sheet_project',
  'paput_discard_pending_candidate',
];

describe('registered tools', () => {
  it('registers the expected tool set in order', () => {
    const toolNames = getRegisteredTools().map((tool) => tool.definition.name);

    expect(toolNames).toEqual(expectedToolNames);
  });

  it('has generated input schema for every registered tool', () => {
    for (const tool of getRegisteredTools()) {
      expect(tool.definition.inputSchema).toEqual(
        getGeneratedInputSchema(tool.definition.name),
      );
      expect(tool.definition.inputSchema.type).toBe('object');
    }
  });

  it('sets MCP annotations for every registered tool', () => {
    for (const tool of getRegisteredTools()) {
      const name = tool.definition.name;

      expect(tool.definition.annotations).toMatchObject({
        readOnlyHint: readOnlyToolNames.includes(name),
        destructiveHint:
          !readOnlyToolNames.includes(name) &&
          destructiveToolNames.includes(name),
        idempotentHint:
          readOnlyToolNames.includes(name) ||
          name.startsWith('paput_update_') ||
          name === 'paput_set_skill_sheet_skills',
        openWorldHint: false,
      });
    }
  });

  it('keeps handler tool files aligned with registered tools', () => {
    expect(readHandlerToolNames()).toEqual(expectedToolNames);
  });
});

function readHandlerToolNames(): string[] {
  const handlerDir = join(import.meta.dirname, 'handlers');
  const names: string[] = [];

  for (const path of readToolFiles(handlerDir)) {
    const source = readFileSync(path, 'utf8');
    const match = source.match(/name:\s*['"]([^'"]+)['"]/);
    if (match) {
      names.push(match[1]);
    }
  }

  return names.sort((a, b) => {
    return expectedToolNames.indexOf(a) - expectedToolNames.indexOf(b);
  });
}

function readToolFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...readToolFiles(path));
    } else if (entry === 'tool.ts') {
      files.push(path);
    }
  }

  return files;
}
