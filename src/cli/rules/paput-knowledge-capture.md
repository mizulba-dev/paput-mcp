## PaPut Knowledge Capture Rules

This section is the procedure for Check 2 of the PaPut Completion Checklist. When reusable cross-project knowledge appears, check whether there are candidates worth keeping in PaPut and, if so, follow the `paput-capture` workflow.

Route each item correctly: reusable cross-project knowledge goes to the `paput-capture` workflow; project-specific design decisions and repeatable procedures go to `paput_add_project_document` (Check 1).

Before adding any candidate to pending, always follow the `paput-capture` workflow in the current turn. Read the `paput-capture` skill instructions first, then read the capture policy, check existing pending candidates, and apply the workflow's quality bar. Do not call `paput_add_knowledge_candidates` directly unless the `paput-capture` workflow has been followed.

Only keep technical knowledge, decision criteria, and procedures that can be reused in other projects. Do not keep project-specific specifications, implementation details, operational rules, code, secrets, or customer data.

When candidates exist, use the `paput-capture` workflow to check duplicates before adding them: semantically similar existing memos with `paput_find_similar_memos` and existing pending candidates. Classify each candidate by memo type (`knowledge` / `decision` / `operation` / `principle`, multi-label) via `memo_type_keys`; `decision` / `operation` / `principle` are material for durable judgment and working-practice summaries, and `knowledge` is commodity. If a candidate is reusable, non-duplicate, non-sensitive, not project-specific, and allowed by the capture policy, add it to pending without waiting for user approval. After adding it, briefly report the title, categories, memo type, and candidate ID.

Use `paput_save_pending_candidate` only when the user explicitly approves saving a pending candidate to PaPut.

If a candidate may be duplicate, sensitive, project-specific, too narrow, or ambiguous, present its title, body, categories, and concern before adding it to pending, and ask the user to confirm.

When the user asks to review pending candidates or save them to PaPut, follow the `paput-save` workflow.
