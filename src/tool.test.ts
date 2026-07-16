import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { getGeneratedInputSchema } from './schemas/tool-input.js';
import { getRegisteredTools, processToolResult } from './tool.js';
import type { OnboardingContext } from './types/index.js';

const expectedToolNames = [
  'paput_create_memos',
  'paput_search_memo',
  'paput_find_similar_memos',
  'paput_backfill_memo_embeddings',
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
  'paput_get_skill_sheet_project_episodes_context',
  'paput_update_skill_sheet_project_episodes',
  'paput_update_skill_sheet_faq',
  'paput_list_goals',
  'paput_create_goal',
  'paput_update_goal',
  'paput_delete_goal',
  'paput_get_dashboard_analysis',
  'paput_update_dashboard_analysis',
  'paput_get_dashboard_analysis_context',
  'paput_get_project_context',
  'paput_get_project_document',
  'paput_search_project_documents',
  'paput_add_project_document',
  'paput_update_project_document',
  'paput_update_project_instructions',
  'paput_discard_project_proposal',
  'paput_promote_project_documents',
  'paput_add_knowledge_candidates',
  'paput_list_processed_sessions',
  'paput_mark_processed_session',
  'paput_list_pending_candidates',
  'paput_update_pending_candidate',
  'paput_save_pending_candidate',
  'paput_discard_pending_candidate',
  'paput_get_capture_policy',
  'paput_get_discard_policy_context',
  'paput_update_capture_policy',
];

const readOnlyToolNames = [
  'paput_search_memo',
  'paput_find_similar_memos',
  'paput_get_memo',
  'paput_get_categories',
  'paput_search_notes',
  'paput_get_note',
  'paput_get_skill_sheet',
  'paput_get_skill_sheet_project_episodes_context',
  'paput_list_goals',
  'paput_get_dashboard_analysis',
  'paput_get_dashboard_analysis_context',
  'paput_get_project_context',
  'paput_get_project_document',
  'paput_search_project_documents',
  'paput_list_processed_sessions',
  'paput_list_pending_candidates',
  'paput_get_capture_policy',
  'paput_get_discard_policy_context',
];

const destructiveToolNames = [
  'paput_update_memo',
  'paput_update_note',
  'paput_update_skill_sheet_basic_info',
  'paput_update_skill_sheet_self_pr',
  'paput_set_skill_sheet_skills',
  'paput_upsert_skill_sheet_project',
  'paput_delete_skill_sheet_project',
  'paput_update_skill_sheet_project_episodes',
  'paput_update_skill_sheet_faq',
  'paput_update_goal',
  'paput_delete_goal',
  'paput_update_dashboard_analysis',
  'paput_update_project_document',
  'paput_update_project_instructions',
  'paput_discard_project_proposal',
  'paput_promote_project_documents',
  'paput_mark_processed_session',
  'paput_update_pending_candidate',
  'paput_discard_pending_candidate',
  'paput_update_capture_policy',
];

const openWorldToolNames = [
  'paput_create_memos',
  'paput_update_memo',
  'paput_create_note',
  'paput_update_note',
  'paput_update_skill_sheet_basic_info',
  'paput_update_skill_sheet_self_pr',
  'paput_set_skill_sheet_skills',
  'paput_upsert_skill_sheet_project',
  'paput_delete_skill_sheet_project',
  'paput_update_skill_sheet_project_episodes',
  'paput_update_skill_sheet_faq',
  'paput_save_pending_candidate',
];

describe('registered tools', () => {
  it('registers the expected tool set in order', () => {
    const toolNames = getRegisteredTools().map((tool) => tool.definition.name);

    expect(toolNames).toEqual(expectedToolNames);
  });

  it('exposes the project argument for paput_get_project_context by default', () => {
    const tool = getRegisteredTools().find(
      (t) => t.definition.name === 'paput_get_project_context',
    );

    expect(
      Object.keys(tool?.definition.inputSchema.properties ?? {}),
    ).toContain('project');
  });

  it('drops the project argument when a project context is configured', () => {
    const tool = getRegisteredTools({ projectContextConfigured: true }).find(
      (t) => t.definition.name === 'paput_get_project_context',
    );

    expect(
      Object.keys(tool?.definition.inputSchema.properties ?? {}),
    ).not.toContain('project');
    expect(tool?.definition.description).toContain('with no arguments');
  });

  it('keeps generated input schema properties for every registered tool', () => {
    for (const tool of getRegisteredTools()) {
      const generatedInputSchema = getGeneratedInputSchema(
        tool.definition.name,
      );

      expect(Object.keys(tool.definition.inputSchema.properties)).toEqual(
        expect.arrayContaining(
          Object.keys(generatedInputSchema?.properties ?? {}),
        ),
      );
      expect(tool.definition.inputSchema.type).toBe('object');
    }
  });

  it('sets a non-empty output schema for every registered tool', () => {
    for (const tool of getRegisteredTools()) {
      expect(tool.definition.outputSchema).toMatchObject({
        type: 'object',
        properties: expect.any(Object),
      });
      expect(
        Object.keys(tool.definition.outputSchema?.properties ?? {}),
      ).not.toHaveLength(0);
    }
  });

  it('keeps handler-defined memo type properties when annotating tools', () => {
    const schemas = Object.fromEntries(
      getRegisteredTools().map((tool) => [
        tool.definition.name,
        tool.definition.inputSchema,
      ]),
    );

    expect(schemas.paput_create_memos.properties.memos).toMatchObject({
      items: {
        properties: {
          memo_type_keys: memoTypeSchemaMatcher(),
        },
      },
    });
    expect(schemas.paput_update_memo.properties.memo_type_keys).toMatchObject(
      memoTypeSchemaMatcher(),
    );
    expect(
      schemas.paput_add_knowledge_candidates.properties.candidates,
    ).toMatchObject({
      items: {
        properties: {
          memo_type_keys: memoTypeSchemaMatcher(),
        },
      },
    });
    expect(
      schemas.paput_save_pending_candidate.properties.memo_type_keys,
    ).toMatchObject(memoTypeSchemaMatcher());
  });

  it('uses English descriptions for every registered tool', () => {
    for (const tool of getRegisteredTools()) {
      expect(tool.definition.description).not.toMatch(
        /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
      );
    }
  });

  it('uses English input schemas for every registered tool', () => {
    for (const tool of getRegisteredTools()) {
      expect(JSON.stringify(tool.definition.inputSchema)).not.toMatch(
        /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
      );
    }
  });

  it('sets MCP annotations for every registered tool', () => {
    for (const tool of getRegisteredTools()) {
      const name = tool.definition.name;
      const expectedTitle = name
        .replace(/^paput_/, '')
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      expect(tool.definition.title).toBe(expectedTitle);
      expect(tool.definition.annotations).toMatchObject({
        title: expectedTitle,
        readOnlyHint: readOnlyToolNames.includes(name),
        destructiveHint:
          !readOnlyToolNames.includes(name) &&
          destructiveToolNames.includes(name),
        idempotentHint:
          readOnlyToolNames.includes(name) ||
          name.startsWith('paput_update_') ||
          name === 'paput_set_skill_sheet_skills',
        openWorldHint: openWorldToolNames.includes(name),
      });
    }
  });

  it('keeps handler tool files aligned with registered tools', () => {
    expect(readHandlerToolNames()).toEqual(expectedToolNames);
  });
});

describe('onboarding nudges', () => {
  const originalResult = {
    structuredContent: { value: 1 },
    content: [{ type: 'text', text: 'Original response' }],
  };

  it.each([
    [{ memo_count: 0, has_skill_sheet: false }, 'Your PaPut account is empty.'],
    [
      { memo_count: 2, has_skill_sheet: false },
      'Your PaPut skill sheet has not been set up yet.',
    ],
    [
      { memo_count: 0, has_skill_sheet: true },
      'Your PaPut account has no memos yet.',
    ],
  ])(
    'appends the matching neutral notice for status %o',
    async (status, text) => {
      const onboarding = createOnboardingContext(status);

      const result = await processToolResult(
        'paput_search_memo',
        originalResult,
        { onboarding },
      );

      expect(result.content).toEqual([
        ...originalResult.content,
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining(text),
        }),
      ]);
      expect(JSON.stringify(result.content)).toContain(
        'in Claude Code, use the /paput:onboarding skill',
      );
      expect(result.structuredContent).toBe(originalResult.structuredContent);
      expect(onboarding.claimNudge).toHaveBeenCalledOnce();
    },
  );

  it('does not append a notice for a completed account', async () => {
    const onboarding = createOnboardingContext({
      memo_count: 1,
      has_skill_sheet: true,
    });

    const result = await processToolResult(
      'paput_search_memo',
      originalResult,
      { onboarding },
    );

    expect(result).toBe(originalResult);
    expect(onboarding.claimNudge).not.toHaveBeenCalled();
  });

  it('does not inspect or modify error responses', async () => {
    const onboarding = createOnboardingContext({
      memo_count: 0,
      has_skill_sheet: false,
    });
    const errorResult = {
      content: [{ type: 'text', text: 'Failed' }],
      isError: true,
    };

    const result = await processToolResult('paput_create_memos', errorResult, {
      onboarding,
    });

    expect(result).toBe(errorResult);
    expect(onboarding.getStatus).not.toHaveBeenCalled();
    expect(onboarding.invalidateStatus).not.toHaveBeenCalled();
  });

  it('invalidates status without adding a nudge after a partial memo creation', async () => {
    const onboarding = createOnboardingContext({
      memo_count: 0,
      has_skill_sheet: false,
    });
    const partialResult = {
      structuredContent: {
        success: false,
        created_count: 1,
        failed_count: 1,
        created: [{ index: 0, id: 10, title: 'Created memo' }],
        failed: [{ index: 1, title: 'Failed memo', error: 'failed' }],
      },
      content: [{ type: 'text', text: 'Partially created' }],
      isError: true,
    };

    const result = await processToolResult(
      'paput_create_memos',
      partialResult,
      { onboarding },
    );

    expect(result).toBe(partialResult);
    expect(onboarding.invalidateStatus).toHaveBeenCalledOnce();
    expect(onboarding.getStatus).not.toHaveBeenCalled();
    expect(onboarding.claimNudge).not.toHaveBeenCalled();
  });

  it('invalidates status without adding a nudge when candidate saving fails after memo creation', async () => {
    const onboarding = createOnboardingContext({
      memo_count: 0,
      has_skill_sheet: false,
    });
    const partialResult = {
      structuredContent: {
        success: false,
        action: 'save_candidate_failed_after_memo_created',
        candidate_id: 'candidate-1',
        memo_id: 123,
        retry_args: {
          candidate_id: 'candidate-1',
          saved_memo_id: 123,
        },
      },
      content: [{ type: 'text', text: 'Candidate saving failed' }],
      isError: true,
    };

    const result = await processToolResult(
      'paput_save_pending_candidate',
      partialResult,
      { onboarding },
    );

    expect(result).toBe(partialResult);
    expect(onboarding.invalidateStatus).toHaveBeenCalledOnce();
    expect(onboarding.getStatus).not.toHaveBeenCalled();
    expect(onboarding.claimNudge).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'invalidates status after a successful candidate save (used existing memo: %s)',
    async (usedExistingMemo) => {
      const onboarding = createOnboardingContext({
        memo_count: 0,
        has_skill_sheet: false,
      });
      const successResult = {
        structuredContent: {
          success: true,
          action: 'saved',
          candidate_id: 'candidate-1',
          memo_id: 123,
          used_existing_memo: usedExistingMemo,
        },
        content: [{ type: 'text', text: 'Candidate saved' }],
      };

      const result = await processToolResult(
        'paput_save_pending_candidate',
        successResult,
        { onboarding },
      );

      expect(result).toBe(successResult);
      expect(onboarding.invalidateStatus).toHaveBeenCalledOnce();
      expect(onboarding.getStatus).not.toHaveBeenCalled();
      expect(onboarding.claimNudge).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      'input validation failure',
      {
        content: [{ type: 'text', text: 'candidate_id is required' }],
        isError: true,
      },
    ],
    [
      'memo creation failure',
      {
        content: [{ type: 'text', text: 'Failed to save knowledge candidate' }],
        isError: true,
      },
    ],
    [
      'another structured failure',
      {
        structuredContent: { action: 'another_failure' },
        content: [{ type: 'text', text: 'Failed' }],
        isError: true,
      },
    ],
  ])(
    'does not invalidate status for candidate %s',
    async (_label, errorResult) => {
      const onboarding = createOnboardingContext({
        memo_count: 0,
        has_skill_sheet: false,
      });

      const result = await processToolResult(
        'paput_save_pending_candidate',
        errorResult,
        { onboarding },
      );

      expect(result).toBe(errorResult);
      expect(onboarding.invalidateStatus).not.toHaveBeenCalled();
      expect(onboarding.getStatus).not.toHaveBeenCalled();
      expect(onboarding.claimNudge).not.toHaveBeenCalled();
    },
  );

  it.each([
    'paput_create_memos',
    'paput_update_skill_sheet_basic_info',
    'paput_set_skill_sheet_skills',
    'paput_upsert_skill_sheet_project',
  ])('invalidates status after a successful %s write', async (toolName) => {
    const onboarding = createOnboardingContext({
      memo_count: 1,
      has_skill_sheet: true,
    });

    await processToolResult(toolName, originalResult, { onboarding });

    expect(onboarding.invalidateStatus).toHaveBeenCalledOnce();
    expect(onboarding.getStatus).not.toHaveBeenCalled();
    expect(onboarding.claimNudge).not.toHaveBeenCalled();
  });

  it('fetches fresh status on the next regular tool call after a write', async () => {
    const onboarding = createOnboardingContext({
      memo_count: 1,
      has_skill_sheet: true,
    });

    await processToolResult('paput_create_memos', originalResult, {
      onboarding,
    });
    await processToolResult('paput_search_memo', originalResult, {
      onboarding,
    });

    expect(onboarding.invalidateStatus).toHaveBeenCalledOnce();
    expect(onboarding.getStatus).toHaveBeenCalledOnce();
  });

  it('fails open when the onboarding status API is aborted', async () => {
    const onboarding = createOnboardingContext({
      memo_count: 0,
      has_skill_sheet: false,
    });
    vi.mocked(onboarding.getStatus).mockRejectedValue(
      new DOMException('The operation was aborted', 'AbortError'),
    );

    const result = await processToolResult(
      'paput_search_memo',
      originalResult,
      { onboarding },
    );

    expect(result).toBe(originalResult);
  });

  it('respects the per-user nudge cooldown claim', async () => {
    const onboarding = createOnboardingContext({
      memo_count: 0,
      has_skill_sheet: false,
    });
    vi.mocked(onboarding.claimNudge).mockReturnValue(false);

    const result = await processToolResult(
      'paput_search_memo',
      originalResult,
      { onboarding },
    );

    expect(result).toBe(originalResult);
  });
});

function createOnboardingContext(status: {
  memo_count: number;
  has_skill_sheet: boolean;
}): OnboardingContext {
  return {
    getStatus: vi.fn().mockResolvedValue(status),
    invalidateStatus: vi.fn(),
    claimNudge: vi.fn().mockReturnValue(true),
  };
}

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

function memoTypeSchemaMatcher() {
  return {
    type: 'array',
    items: {
      enum: expect.arrayContaining([
        'knowledge',
        'decision',
        'operation',
        'principle',
      ]),
    },
    description: expect.stringMatching(/memo type/i),
  };
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
