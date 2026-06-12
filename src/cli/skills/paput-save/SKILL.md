---
name: paput-save
description: Use this to review pending candidates first, then save only candidates explicitly approved by the user. This skill never saves automatically.
---

# PaPut Save

Review pending knowledge candidates first, then save only candidates explicitly approved by the user. This skill never saves automatically.

## Steps

1. Fetch pending candidates with `paput_list_pending_candidates`.
2. Briefly show each candidate title, categories, summary, and similar memo information.
3. Save only candidates approved by the user with `paput_save_pending_candidate`.
4. Discard candidates the user rejects with `paput_discard_pending_candidate`.
5. Report the number of saved and discarded candidates.

## Notes

- Do not save to PaPut without user approval.
- Save multiple candidates only when the user explicitly asks to save all of them.
- If the user asks to modify a title or body, apply the override when saving.
- For ambiguous or likely duplicate candidates, present not saving as an option.
- When a candidate has no similar memo information, check `paput_find_similar_memos` with the candidate title before saving and surface high-score matches to the user.
