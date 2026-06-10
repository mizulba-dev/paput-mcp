---
name: paput-sync
description: Use this to sync existing PaPut memos into the local cache and improve duplicate detection.
---

# PaPut Sync

Sync existing PaPut memos into the local cache.

## Steps

1. Check the current cache state with `paput_cache_status`.
2. Run `paput_sync_remote_memos`.
3. Run `paput_cache_status` again and confirm the synced counts.
4. Briefly report the sync result to the user.

## Notes

- Syncing is for duplicate detection.
- Do not save or discard pending candidates.
- Do not create new PaPut memos.
