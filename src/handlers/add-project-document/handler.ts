import { ApiClient } from '../../services/api/client.js';
import {
  addProjectDocument,
  SimilarProjectDocumentItem,
} from '../../services/api/project-context.js';

export async function handleAddProjectDocument(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  const invalid = validateArgs(args);
  if (invalid) {
    return invalid;
  }

  const input = args as Record<string, unknown>;

  try {
    const result = await addProjectDocument(apiClient, {
      skill_sheet_project_id: input.skill_sheet_project_id as number,
      kind: input.kind as string,
      title: input.title as string,
      summary: typeof input.summary === 'string' ? input.summary : undefined,
      body: input.body as string,
      decided_at:
        typeof input.decided_at === 'string' ? input.decided_at : undefined,
    });

    if (result.duplicate) {
      const text = result.promoted_to
        ? `Skipped saving: this work is already promoted to a skill (${result.promoted_to}). Use that skill instead of recording the procedure again.`
        : `Skipped saving: a nearly identical document already exists.\n\n${formatSimilarDocuments(result.similar_documents)}\n\nConsider updating the existing document instead.`;

      return {
        structuredContent: result as unknown as Record<string, unknown>,
        content: [{ type: 'text', text }],
      };
    }

    const similarNote =
      result.similar_documents.length > 0
        ? `\n\nSimilar existing documents:\n${formatSimilarDocuments(result.similar_documents)}`
        : '';

    const proposalNote = result.skill_proposal
      ? `\n\nA skill proposal was created: 【${result.skill_proposal.title}】(ID: ${result.skill_proposal.id}). Ask the user whether to turn the repeated procedure into a skill. On approval, create the skill and call paput_promote_project_documents with the related document IDs; on rejection, call paput_discard_project_proposal with the reason.`
      : '';

    return {
      structuredContent: result as unknown as Record<string, unknown>,
      content: [
        {
          type: 'text',
          text: `Project document saved: 【${result.document?.title}】(ID: ${result.document?.id}, ${result.document?.kind})${similarNote}${proposalNote}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return {
      content: [
        {
          type: 'text',
          text: `Failed to add project document: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

function validateArgs(args: Record<string, unknown> | undefined) {
  if (
    !args ||
    typeof args.skill_sheet_project_id !== 'number' ||
    typeof args.kind !== 'string' ||
    typeof args.title !== 'string' ||
    args.title.trim() === '' ||
    typeof args.body !== 'string' ||
    args.body.trim() === ''
  ) {
    return {
      content: [
        {
          type: 'text',
          text: 'skill_sheet_project_id, kind, title, and body are required.',
        },
      ],
      isError: true,
    };
  }

  return null;
}

function formatSimilarDocuments(
  documents: SimilarProjectDocumentItem[],
): string {
  return documents
    .map(
      (doc) =>
        `- [${doc.id}] (${doc.kind}) ${doc.title} (Score: ${doc.score.toFixed(3)})`,
    )
    .join('\n');
}
