## PaPut Knowledge Capture Rules

When work is completed, a problem is solved, a design decision is settled, or reusable knowledge appears, automatically check whether there are candidates worth keeping in PaPut.

Only keep technical knowledge, decision criteria, and procedures that can be reused in other projects. Do not keep project-specific specifications, implementation details, operational rules, code, secrets, or customer data.

When candidates exist, check for duplicates with the local cache or similar memo information before saving. If a candidate is reusable, non-duplicate, non-sensitive, and not project-specific, add it to pending with `paput_add_knowledge_candidates` without waiting for user approval. After adding it, briefly report the title, categories, and candidate ID.

Use `paput_save_pending_candidate` only when the user explicitly approves saving a pending candidate to PaPut.

If a candidate may be duplicate, sensitive, project-specific, too narrow, or ambiguous, present its title, body, categories, and concern before adding it to pending, and ask the user to confirm.

When the user asks to review pending candidates or save them to PaPut, follow the `paput-save` workflow.
