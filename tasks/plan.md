# Implementation Plan: Per-Problem Session Persistence

Spec: [SPEC.md](../SPEC.md). Task checklist: [todo.md](todo.md).

## Overview

Replace the single `leetcode-coach-session` slot in `localStorage` with a store that holds one session per problem, keyed by the LeetCode slug. Switching problems saves the current session and restores the next one. Everything is frontend-only; the backend does not change.

## Architecture Decisions

- **One pure module, `frontend/src/sessions.js`,** holds key derivation, load/save, migration and upsert. It has no React or DOM code, and `storage` is passed in so `node:test` can test it with a stub. This avoids adding a test-framework dependency.
- **`App.jsx` keeps its three state hooks** (`messages`, `context`, `hintLevel`) plus a new `activeKey`. One effect writes them back into the store. This is the smallest change from today's code, which already uses a single persisting effect.
- **Sessions switch only on import** (panel open and "Refresh tab"). Following tab changes automatically is out of scope (SPEC Open Question 1).
- **The open questions are settled as the spec proposed:** no automatic tab tracking, no session cap, no delete-all button, and the Ask-button bug gets fixed.

## Dependency Graph

```
sessions.js (sessionKeyFor, loadStore, saveStore, upsertSession)
    │
    ├── App.jsx: initial load + persist effect + legacy migration     (Task 2)
    │       │
    │       └── App.jsx: switch session on import                     (Task 3)
    │               │
    │               └── App.jsx: Clear chat / New problem / quota UI  (Task 4)
    │
Ask-button bug fix (independent)                                     (Task 1)
```

## Task List

### Phase 1: Foundation
- [x] Task 1: Fix the Ask button passing the click event as the mode (XS)
- [x] Task 2: Per-problem store, with the current session migrated and restored on reopen (M)

### Checkpoint A
- [ ] Unit tests, lint and build pass; reopening the panel restores the session; the legacy session is migrated

### Phase 2: Core behavior
- [ ] Task 3: Importing a different problem switches sessions (S)
- [ ] Task 4: Clear chat and New problem are scoped per session; quota errors are surfaced (S)

### Checkpoint B: Complete
- [ ] All SPEC success criteria are met; user stories 1–4 pass manually in the unpacked extension

Full task detail is in [todo.md](todo.md).

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The legacy session is lost during migration | High | Delete the legacy key only after the new store has saved successfully. Unit-test the migration. |
| A race between the persist effect and the session switch writes the old chat under the new key | High | Do the switch in a single function that saves the current session and then sets all state from the target session. Check it manually with two problems in a row. |
| LeetCode URL variants (`/description/`, `/submissions/`, query strings, `/problems/x` without a trailing slash) give different keys | Med | The slug regex stops at `/?#`. Unit-test every variant. |
| A full `localStorage` makes `setItem` throw inside an effect | Med | `saveStore` returns `false` and never throws. `App` shows a banner. |
| Web-app mode has no URL | Low | Fall back to the title key, or to `untitled`. Check manually with `npm run dev`. |

## Parallelization

Task 1 is independent and can land at any time. Tasks 2 → 3 → 4 run in order because they all edit the same state wiring in `App.jsx`.

## Open Questions

None blocking. SPEC open questions 1–3 are resolved as proposed (out of scope for v1); reopen them if you disagree.
