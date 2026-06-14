---
name: paput-project-document
description: Use this to save a project-specific design decision (design_doc) or repeatable procedure (procedure) as a PaPut project document via paput_add_project_document. This is Check 1 of the completion checklist, independent from reusable-knowledge capture.
---

# PaPut Project Document

Save a project-specific design decision or a repeatable project procedure as a project document. This is the project-scoped counterpart to `paput-capture`; the two are independent, and finishing one never satisfies the other.

## When To Use

- A design decision was just settled (which option, why, and what was rejected).
- A repeatable project procedure was just completed and could be reused next time.
- You are about to report project work as done and Check 1 of the completion checklist has not been accounted for.

## Steps

1. Identify the active project. Call `paput_get_project_context` if it has not been loaded this session, and take the `skill_sheet_project_id` from the result.
2. Decide the kind: `design_doc` for a decision (include the decision, the reasons, and the rejected alternatives) or `procedure` for repeatable steps.
3. Save with `paput_add_project_document`. Review the result: if `duplicate` is set, update the existing document instead of saving again; if `similar_documents` are returned, confirm you are not duplicating them.
4. If the result contains a `skill_proposal`, ask the user whether to turn the repeated procedure into a skill. On approval, create the skill first, then call `paput_promote_project_documents` with the related document IDs; on rejection, call `paput_discard_project_proposal` with the reason.
5. Report what was saved: title, ID, and kind.

## Do Not Save

- Repository conventions or anything that belongs in CLAUDE.md / AGENTS.md.
- Reusable cross-project knowledge — that goes to the `paput-capture` workflow (Check 2).
- Secrets or customer data.

## Notes

- Run this check on its own. Having no reusable knowledge candidates is not a reason to skip it, and the reverse is also true.
- This skill saves project documents only; it does not touch pending knowledge candidates or the `paput-save` flow.
