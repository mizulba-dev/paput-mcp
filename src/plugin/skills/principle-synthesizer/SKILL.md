---
name: paput-principle-synthesizer
description: Use this to synthesize cross-cutting principle candidates from the user's accumulated public decision/operation memos (and private design docs) and add them to pending. It surfaces the postures that run through many decisions — the thinnest, most AI-durable memo type — which the per-conversation paput-capture cannot reach. It only proposes to pending; it never saves to PaPut.
---

# PaPut Principle Synthesizer

Synthesize `principle` candidates by reading the user's accumulated `decision` / `operation` memos (and, as substrate, their private `design_doc` project documents) as a whole, finding the postures that run through many of them, and proposing each as a `principle` pending candidate.

A `principle` is a stance explicitly generalized one level above individual decisions — what the person optimizes for and what they reject across cases. It rarely falls out of a single conversation, so `paput-capture` (which works per session) structurally under-produces it. This skill fills that gap by working across the whole accumulated corpus and turns the cross-cutting synthesis into reusable `principle` material.

Use this when the user wants to thicken their `principle` memos, distill recurring decisions into stated principles, or refresh principle candidates from accumulated knowledge.

## Workflow

1. Gather the material:
   - Use `paput_search_memo` with `is_public: true` and `memo_type: decision`, then repeat with `memo_type: operation` and `memo_type: principle`. Page through results as needed. The `decision` / `operation` entries are the synthesis material; existing `principle` entries are the de-dup baseline.
   - As substrate, call `paput_get_project_context` and read the `design_doc` documents in the index with `paput_get_project_document(id)`. Design docs hold decisions with reasons and rejected alternatives — strong principle material — but they are private and project-specific.
2. Read the bodies of the memos you plan to cluster with `paput_get_memo` (index first, fetch on demand — do not bulk-fetch everything).
3. Cluster across documents by theme. Look for a stance that runs through SEVERAL decisions/operations (and design-doc decisions), not a single memo restated.
   - First, sweep the WHOLE index and enumerate EVERY distinct cross-cutting theme the corpus supports — do not stop at the few most obvious (e.g. security / concurrency) clusters. Aim to cover the corpus. Commonly-missed but high-value axes include: operating practices (observability, eval, testing validity), AI / automation collaboration postures (treating model output as a soft signal, where to delegate generation), retrieval / routing separation, reversibility and incremental change, error-handling and failure semantics. Scan for these explicitly so the scarce axes are not dropped.
   - Make the clusters DISJOINT: assign each source memo to the ONE principle it best anchors, not to several. If two themes overlap heavily or keep pulling the same memos, treat them as ONE cluster, or draw a sharp line so each cluster owns a distinct slice.
4. Synthesize each qualifying cluster into one `principle` candidate:
   - One cluster → one coherent stance with a SINGLE throughline (one "optimize X over Y"). Every sub-point in the body must be a facet of that one posture. If you find yourself writing "and also…" about a different concern, that is a second principle — split it out or drop the weaker thread. Do not bundle two or three loosely-related ideas under an umbrella title.
   - body: the stance generalized one level up — what it optimizes for and what it rejects — plus applicability conditions / exceptions where useful, and a sources section (use the user's language for the heading) listing the source memo ids and titles it was synthesized from (reference design docs abstractly, without project-specific leaks).
   - Strip project-specific names, screens, code, and secrets; rewrite as reusable judgment criteria (follow the capture policy's generalization rules — fetch it with `paput_get_capture_policy`).
   - Default `is_public: false`; set `memo_type_keys: ['principle']` (add `decision` as a second label only if it is genuinely also a reusable judgment criterion).
5. Self-review the draft set for MUTUAL distinctness before de-dup:
   - Compare every pair of your own draft candidates. If two share most of their source memos, or their statements overlap, they are not distinct — MERGE them into one sharper principle, or re-scope so each owns a disjoint slice and each memo anchors only one of them.
   - Merging is only for OVERLAPPING themes. It must NOT shrink the number of distinct themes you cover. "Fewer per theme" (no duplicates within a theme) is not "fewer themes" — never drop a genuine distinct cross-cutting stance just to keep the count small. Then re-check against the enumeration in step 3: if a distinct theme you found is not represented by any candidate, add it.
6. De-dup against existing memos before adding:
   - For each candidate, call `paput_find_similar_memos` (it searches all of the user's memos, public and private). Treat a top score of ~0.85 or higher against an existing memo as a near-duplicate and skip it.
   - Also compare against the existing public `principle` entries returned by `paput_search_memo`, and check `paput_list_pending_candidates` so you do not duplicate a pending candidate.
7. Add only the non-duplicate, mutually-distinct, generalized, project-independent candidates with `paput_add_knowledge_candidates` (memo_type_keys=['principle']). Add to pending only.
8. Report each added candidate: title, categories, memo type, candidate id, and the source memos it was synthesized from.
9. Do NOT save to PaPut. Saving a pending candidate is handled by `paput-save`, only when the user explicitly approves it.

## Quality Bar

- A `principle` must run through at least two or three decisions/operations. A single decision reworded is NOT a principle — drop it (or leave it as the decision memo it already is).
- One principle = one throughline. The title must name ONE posture, not an umbrella over several. If the body covers two or three loosely-related concerns, it is a grab-bag — split it into separate principles or drop the weakest thread. Test: can you state it as a single "optimize X, reject Y"? If you need "and also…" about an unrelated concern, it is two principles.
- Make principles mutually distinct. Do NOT emit two candidates that share most of their source memos or whose statements overlap. When that happens, merge them, or assign each shared memo to the single principle it best anchors and keep the two scopes disjoint. A source memo should anchor one principle, not back two.
- Cover the corpus. Surface EVERY distinct cross-cutting stance the material supports, not just the first few strong clusters. The disjointness and merge rules reduce duplicates WITHIN a theme; they must not reduce the number of themes. Watch for the scarce, high-value axes that are easy to skip once the security / concurrency clusters are formed — AI / automation collaboration postures, operating practices (observability, eval, testing), and reversibility / incremental change. If the corpus clearly supports such a stance and no candidate covers it, that is under-coverage — add it.
- Example — grab-bag (avoid): "Advance changes reversibly and in minimal scope, don't rush first-classing until a consumer actually exists, and don't distort the official recommendation for the sake of an immature dependency" bundles three concerns. Split: (1) reversible/incremental change, (2) defer first-classing until a consumer exists. Drop the unrelated "don't distort the official recommendation" to its own memo.
- Example — overlap (avoid): one principle about "separating retrieval routes by purpose" and another about "AI judgments as soft signals" both leaning on the same memos. Keep route-separation in the first and move all AI-judgment material to the second so neither bleeds.
- Generalize. Remove project-specific specifications, screen names, code, identifiers, and secrets. The body must be reusable in another project from its title and text alone.
- `knowledge`-type memos are commodity. Do not build principles from them; the material is `decision` / `operation` and design-doc decisions.
- Do not duplicate existing material. Skip anything that semantically matches an existing `principle` memo (find_similar ~0.85+) or an existing pending candidate.
- Do not leak private design-doc specifics into a candidate. Default `is_public: false`; the user decides visibility at review time.
- The save API sits behind a WAF that inspects the body. Write command, SQL, and markup examples as prose or pseudo-notation, not raw executable strings.

## Notes

- This skill only proposes to pending. It never writes memos directly; final saves go through `paput-save` with explicit user approval.
- It complements `paput-capture` (per-conversation, generalizable knowledge) by working across the accumulated corpus to reach the cross-cutting `principle` axis.
- If the index has too few `decision` / `operation` memos to find a cross-cutting stance, say so and add nothing rather than forcing weak principles.
