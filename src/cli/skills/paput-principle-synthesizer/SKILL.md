---
name: paput-principle-synthesizer
description: Use this to synthesize cross-cutting principle candidates from the user's accumulated public decision/operation memos (and private design docs) and add them to pending. It surfaces the stances that run through many decisions — the thinnest, most AI-durable memo type — which the per-conversation paput-capture cannot reach. It only proposes to pending; it never saves to PaPut.
---

# PaPut Principle Synthesizer

Synthesize `principle` candidates by reading the user's accumulated `decision` / `operation` memos (and, as substrate, their private `design_doc` project documents) as a whole, finding the stances that run through many of them, and proposing each as a `principle` pending candidate.

A `principle` is a stance explicitly generalized one level above individual decisions — what the person optimizes for and what they reject across cases. It rarely falls out of a single conversation, so `paput-capture` (which works per session) structurally under-produces it. This skill fills that gap by working across the whole accumulated corpus. It is the persistence counterpart of the public-profile ◆ stances: it turns the cross-cutting synthesis into reusable `principle` material.

Use this when the user wants to thicken their `principle` memos, distill recurring decisions into stated principles, or refresh principle candidates from accumulated knowledge.

## Workflow

1. Gather the material:
   - Call `paput_get_public_profile_context`. Use `public_summary_memos` — the complete index (id, title, memo_types, updated_at; no bodies) of ALL the user's PUBLIC `decision` / `operation` / `principle` memos. The `decision` / `operation` entries are the synthesis material; the existing `principle` entries are the de-dup baseline.
   - As substrate, call `paput_get_project_context` and read the `design_doc` documents in the index with `paput_get_project_document(id)`. Design docs hold decisions with reasons and rejected alternatives — strong principle material — but they are private and project-specific.
2. Read the bodies of the memos you plan to cluster with `paput_get_memo` (index first, fetch on demand — do not bulk-fetch everything).
3. Cluster across documents by theme. Look for a stance that runs through SEVERAL decisions/operations (and design-doc decisions), not a single memo restated.
4. Synthesize each qualifying cluster into one `principle` candidate:
   - body: the stance generalized one level up — what it optimizes for and what it rejects — plus applicability conditions / exceptions where useful, and a `## 根拠` section listing the source memo ids and titles it was synthesized from (reference design docs abstractly, without project-specific leaks).
   - Strip project-specific names, screens, code, and secrets; rewrite as reusable judgment criteria (follow the capture policy's generalization rules — fetch it with `paput_get_capture_policy`).
   - Default `is_public: false`; set `memo_type_keys: ['principle']` (add `decision` as a second label only if it is genuinely also a reusable judgment criterion).
5. De-dup before adding:
   - For each candidate, call `paput_find_similar_memos` (it searches all of the user's memos, public and private). Treat a top score of ~0.85 or higher against an existing memo as a near-duplicate and skip it.
   - Also compare against the existing `principle` entries in `public_summary_memos`, and check `paput_list_pending_candidates` so you do not duplicate a pending candidate.
6. Add only the non-duplicate, generalized, project-independent candidates with `paput_add_knowledge_candidates` (memo_type_keys=['principle']). Add to pending only.
7. Report each added candidate: title, categories, memo type, candidate id, and the source memos it was synthesized from.
8. Do NOT save to PaPut. Saving a pending candidate is handled by `paput-save`, only when the user explicitly approves it.

## Quality Bar

- A `principle` must run through at least two or three decisions/operations. A single decision reworded is NOT a principle — drop it (or leave it as the decision memo it already is).
- Generalize. Remove project-specific specifications, screen names, code, identifiers, and secrets. The body must be reusable in another project from its title and text alone.
- `knowledge`-type memos are commodity. Do not build principles from them; the material is `decision` / `operation` and design-doc decisions.
- Do not duplicate. Skip anything that semantically matches an existing `principle` memo (find_similar ~0.85+) or an existing pending candidate.
- Do not leak private design-doc specifics into a candidate. Default `is_public: false`; the user decides visibility at review time.
- The save API sits behind a WAF that inspects the body. Write command, SQL, and markup examples as prose or pseudo-notation, not raw executable strings.

## Notes

- This skill only proposes to pending. It never writes memos directly; final saves go through `paput-save` with explicit user approval.
- It complements `paput-capture` (per-conversation, generalizable knowledge) by working across the accumulated corpus to reach the cross-cutting `principle` axis.
- If the index has too few `decision` / `operation` memos to find a cross-cutting stance, say so and add nothing rather than forcing weak principles.
