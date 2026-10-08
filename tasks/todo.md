# Todo: Per-Problem Session Persistence

Spec: [SPEC.md](../SPEC.md) · Plan: [plan.md](plan.md)

All commands run from `frontend/` unless noted.

---

## Task 1: Fix the Ask button passing the click event as the mode

**Description:** `onClick={sendMessage}` on `#ask-tutor-btn` passes the React click event in as `requestedMode`. Change it to `onClick={() => sendMessage()}` so clicking Ask behaves the same as pressing Enter.

**Acceptance criteria:**
- [x] Clicking "Ask Tutor" sends `mode: "chat"` and the tutor reply is shown.

**Verification:**
- [x] `npm run lint` and `npm run build` pass
- [ ] Manual: `npm run dev`, type a question, click Ask, and check that the request payload in the Network tab has `"mode":"chat"`

**Dependencies:** None
**Files:** `frontend/src/App.jsx`
**Scope:** XS

---

## Task 2: Per-problem store, with the current session migrated and restored on reopen

**Description:** Add `sessions.js` with `sessionKeyFor`, `loadStore`, `saveStore` and `upsertSession`, as designed in the SPEC. Point `App.jsx` at the store instead of `leetcode-coach-session`: on mount, load the store and take `messages`, `context` and `hintLevel` from `sessions[activeKey]`; the persist effect writes back through `upsertSession` + `saveStore`. On first load, migrate the legacy key into the store and remove the legacy key only after the save succeeds. Covers user stories 2 and 4.

**Acceptance criteria:**
- [ ] Reopening the panel restores the active problem's chat, hint level and context.
- [x] A browser with the legacy `leetcode-coach-session` key opens with that chat intact, filed under `sessionKeyFor(legacy.context)`, and the legacy key is gone.
- [x] Corrupt JSON under either key opens an empty panel instead of crashing.

**Verification:**
- [x] `node --test src/sessions.test.js` passes. It covers: slug from `/problems/two-sum/`, `/problems/two-sum/description/`, `/problems/two-sum?envType=x`, `/problems/two-sum` with no trailing slash; the title fallback; `untitled`; legacy migration; corrupt JSON; `saveStore` returning `false` when `setItem` throws; an `upsertSession` round-trip
- [x] `npm run lint` and `npm run build` pass
- [ ] Manual: in DevTools, set the legacy key by hand, reload, and check that the chat is shown and the store contains it

**Dependencies:** None
**Files:** `frontend/src/sessions.js` (new), `frontend/src/sessions.test.js` (new), `frontend/src/App.jsx`
**Scope:** M

---

## Checkpoint A (after Tasks 1–2)
- [ ] `node --test src/sessions.test.js`, `npm run lint` and `npm run build` all pass
- [ ] Backend: `cd backend && .venv/bin/python -m unittest discover tests` passes, unchanged
- [ ] The unpacked extension (`frontend/dist`) loads, and reopening the panel restores the session
- [ ] Review with a human before continuing

---

## Task 3: Importing a different problem switches sessions

**Description:** In `refreshContext`, compute `sessionKeyFor` from the imported context. If it differs from `activeKey`, save the current session, then load (or create) the target session, merge the imported fields into its context, and set `activeKey`, `messages`, `context` and `hintLevel` together. If the key is the same, merge the context only, as today. Covers user story 1.

**Acceptance criteria:**
- [ ] Two Sum (2 hints) → Valid Parentheses shows an empty chat at level 0. → Two Sum restores the 2 hints and level 2.
- [ ] Refreshing on the same problem keeps the chat and only updates the context fields.
- [ ] Neither problem's messages ever show up under the other's key in storage.

**Verification:**
- [x] Unit tests still pass. Add a test if `sessions.js` gains a helper.
- [x] `npm run lint` and `npm run build` pass
- [ ] Manual (unpacked extension): run the Two Sum ↔ Valid Parentheses flow above, then inspect `leetcode-coach-sessions` in the panel's DevTools

**Dependencies:** Task 2
**Files:** `frontend/src/App.jsx` (possibly `sessions.js` and its test)
**Scope:** S

---

## Task 4: Clear chat and New problem are scoped per session; quota errors are surfaced

**Description:** "Clear chat" empties `messages` and sets `hintLevel` to 0 for the active session only. "New problem" switches to an empty `untitled` session without deleting saved sessions, and still calls `/api/reset`. When `saveStore` returns `false`, show the existing error banner ("Couldn't save session — storage is full") and leave the in-memory state as it is. Covers user story 3 and the quota row of the SPEC behavior table.

**Acceptance criteria:**
- [ ] "Clear chat" on Two Sum leaves Valid Parentheses' saved session unchanged.
- [ ] "New problem" then "Refresh tab" on Two Sum restores Two Sum's session.
- [ ] A forced `setItem` failure shows the banner and the chat keeps working.

**Verification:**
- [x] `npm run lint` and `npm run build` pass
- [ ] Manual: the flows above. For quota, temporarily run `localStorage.setItem = () => { throw new DOMException('', 'QuotaExceededError') }` in the panel's DevTools and send a message.

**Dependencies:** Task 3
**Files:** `frontend/src/App.jsx`
**Scope:** S

---

## Checkpoint B: Complete
- [ ] Every Success Criteria checkbox in SPEC.md is met
- [ ] User stories 1–4 pass manually in the unpacked extension
- [ ] Web-app mode (`npm run dev`) works and sessions are keyed by title
- [ ] Backend unittest suite passes, unchanged
- [ ] Ready for review
