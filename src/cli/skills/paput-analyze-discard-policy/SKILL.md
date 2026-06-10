---
name: paput-analyze-discard-policy
description: Use this to analyze locally discarded PaPut knowledge candidates, derive reusable capture rejection criteria, and save the resulting capture policy document.
---

# PaPut Analyze Discard Policy

Analyze locally discarded PaPut knowledge candidates, derive reusable capture rejection criteria, and save the resulting capture policy document. The saved policy is read by `paput-capture` before adding new knowledge candidates.

## When To Use

- The user wants to improve PaPut capture judgment from past discarded candidates.
- The user wants to document why candidates should not become PaPut memos.
- The user wants to refresh the capture policy after reviewing or discarding candidates.

## Steps

1. Fetch discard policy context with `paput_get_discard_policy_context`.
2. Read the current policy and discarded candidates.
3. Analyze recurring rejection patterns from titles, bodies, categories, similar memo data, and discard reasons.
4. Produce a concise Markdown policy that generalizes the patterns without copying project-specific details.
5. Save the policy with `paput_update_capture_policy`.
6. Report the saved path, updated timestamp, and the main policy changes.

## Policy Document Requirements

Use this structure:

```md
# PaPut Capture Policy

## Capture

- Reusable technical knowledge, decision criteria, or procedures that can apply across projects.

## Reject

- Criteria for candidates that should not be added to pending.

## Borderline

- Criteria that require asking the user before adding to pending.

## Generalization Rules

- How to convert a narrow candidate into a reusable one.

## Recent Discard Patterns

- Trends observed in the discarded candidates.
```

## Analysis Rules

- Do not include secrets, customer data, project-specific specifications, implementation details, operational rules, or code.
- Do not copy discarded candidate bodies verbatim unless a very short phrase is needed as a generalized example.
- Prefer criteria over examples.
- Keep the policy short enough for `paput-capture` to read every time.
- If there are no discarded candidates, create or keep a baseline policy based on existing PaPut capture rules.
- If discard reasons conflict, describe the conflict under `Borderline` rather than forcing a rule.

## Notes

- This skill does not save PaPut memos.
- The policy is local-only and stored in the PaPut cache.
- The policy guides future capture decisions; it should not be treated as an immutable blocklist.
