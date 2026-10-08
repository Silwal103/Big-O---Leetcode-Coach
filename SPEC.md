# Spec: Per-Problem Session Persistence

## Objective

Today the side panel stores one session (`messages`, `context`, `hintLevel`) in `localStorage` under `leetcode-coach-session`. Importing a different problem mixes it with the previous problem's chat and hint level. "New problem" wipes everything.

**Goal:** each LeetCode problem gets its own saved session. When a user goes back to a problem, its chat history, hint level and edited context come back.

**User:** someone working through LeetCode problems with the side panel open, often switching between problems over several days.

### User stories
1. I import Two Sum, get two hints, then import Valid Parentheses. I see an empty chat at level 0. When I go back to Two Sum, my two hints and level 2 are restored.
2. I close the side panel or restart the browser. When I reopen it on a problem I've worked on, that problem's session is restored.
3. "Clear chat" clears only the current problem's chat and hint level. Other problems are not touched.
4. If I used the extension before this change, my existing single session is kept and attached to its problem.

### Assumptions (correct these before planning)
1. **Session key:** the problem slug from the URL (`leetcode.com/problems/<slug>/...`). With no URL (web-app mode, or a title typed in by hand), the key is a slugified title. With no title either, the key is a single `untitled` scratch session.
2. **When sessions switch:** only when the context import runs, which is on panel open and on "Refresh tab". The panel does not watch tab changes in the background (see Open Questions).
3. **Storage:** keep `localStorage`, which is already in use, works in both extension and web-app modes, and lasts across panel closes and browser restarts. `chrome.storage` is not used.
4. **No backend changes.** The `/api/tutor` and `/api/reset` contracts stay the same, and the server stays stateless.
5. **No session-list UI.** Sessions are only reachable by opening the problem.

## Tech Stack

Unchanged: React 19 + Vite 8 + motion (frontend, MV3 side panel) and FastAPI + LangChain + Gemini (backend). **No new dependencies.** Frontend unit tests use Node's built-in `node:test` runner.

## Commands

```
Frontend dev:    cd frontend && npm run dev
Frontend build:  cd frontend && npm run build
Frontend lint:   cd frontend && npm run lint
Frontend tests:  cd frontend && node --test src/sessions.test.js
Backend dev:     cd backend && uvicorn main:app --reload --port 8000
Backend tests:   cd backend && python -m unittest discover tests
```

## Project Structure

```
frontend/src/sessions.js       → NEW: pure session-store helpers (key derivation, load/save, migration)
frontend/src/sessions.test.js  → NEW: node:test unit tests for sessions.js
frontend/src/App.jsx           → switch active session on import; Clear chat / New problem semantics
frontend/src/extension.js      → unchanged (already returns `url`)
backend/                       → unchanged
```

## Design

**Storage shape** (one `localStorage` key, `leetcode-coach-sessions`):

```js
{
  version: 1,
  activeKey: 'two-sum',
  sessions: {
    'two-sum': { context: {...}, messages: [...], hintLevel: 2, updatedAt: 1760000000000 },
  },
}
```

**`sessions.js` API** (pure functions wherever possible, so they can be tested without a DOM):

```js
export function sessionKeyFor(context)          // url slug → slugified title → 'untitled'
export function loadStore(storage)              // parse + migrate legacy key; never throws
export function saveStore(storage, store)       // returns false on quota/serialization error, never throws
export function upsertSession(store, key, data) // returns a new store with activeKey = key
```

`storage` is passed in (`localStorage` in the app, a `Map`-backed stub in tests).

**Behavior**
| Action | Result |
|---|---|
| Import gives a key different from `activeKey` | Save the current session, then load (or create) the session for the new key. Imported fields are merged into that session's context, the way they are today. |
| Import gives the same key | Merge the imported context only. Chat and level are left as they are. |
| Edit the title by hand (no URL) | Stays in the current session. The key is only recalculated on import. |
| Clear chat | Empties `messages` and resets `hintLevel` to 0 for the active session only. |
| New problem | Switches to an empty `untitled` session. Saved sessions are not deleted. Still calls `/api/reset`. |
| Legacy `leetcode-coach-session` present | On first load, migrate it into the new store under `sessionKeyFor(legacy.context)`, then remove the legacy key. |
| Corrupt JSON in storage | Start with an empty store and don't crash. |
| `setItem` throws (quota exceeded) | Show a non-blocking error banner. The in-memory session keeps working. |

## Code Style

Match the existing code: ES modules, no semicolons, single quotes, 2-space indentation, JSDoc on exported functions, functional React with hooks, and no new abstractions in `App.jsx` beyond calls into `sessions.js`.

```js
/**
 * Derive the storage key for a problem context.
 *
 * @param {{ url?: string, title?: string }} context
 * @returns {string}
 */
export function sessionKeyFor({ url = '', title = '' }) {
  const slug = url.match(/leetcode\.com\/problems\/([^/?#]+)/)?.[1]
  if (slug) return slug
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled'
}
```

## Testing Strategy

- **Unit (`node --test`)**: `sessions.test.js` covers key derivation (URL with `/description/` suffix, query strings, title fallback, empty), legacy migration, corrupt JSON, quota failure in `saveStore`, and an `upsertSession` round-trip.
- **Backend**: the existing `backend/tests/test_tutor_contract.py` must still pass with no changes.
- **Manual (extension loaded unpacked from `frontend/dist`)**: run through user stories 1–4 on real leetcode.com problems.
- No React component test harness is added. `App.jsx` wiring is checked manually.

## Boundaries

- **Always:** keep `sessions.js` free of React and DOM access; wrap every storage read and write in try/catch; run `npm run lint`, `npm run build` and `node --test src/sessions.test.js` before committing.
- **Ask first:** adding any dependency (including vitest); changing the `/api/tutor` or `/api/reset` contract; moving to `chrome.storage`; adding manifest permissions.
- **Never:** silently drop the legacy session; store the API key or anything server-side in the session store; break web-app (non-extension) mode.

## Success Criteria

- [ ] User stories 1–4 pass manually in the unpacked extension.
- [ ] Web-app mode (`npm run dev`, no extension) still works, and sessions are keyed by title.
- [ ] `node --test src/sessions.test.js` passes with the cases listed under Testing Strategy.
- [ ] `npm run lint` and `npm run build` are clean, and the backend unittest suite passes without changes.
- [ ] Corrupt or full storage never crashes or blanks the panel.

## Open Questions

1. **Automatic switching:** should the panel follow tab changes (`chrome.tabs.onActivated` / `onUpdated`) and switch sessions without a "Refresh tab" click? That costs more code and may need the `tabs` listener wiring. Proposed: not in v1.
2. **Retention:** should sessions be capped (for example, keep the 50 most recently updated) to stay well under the ~5 MB `localStorage` limit? Proposed: no cap in v1, and rely on the quota error path.
3. **Delete:** is there a need for a "Delete all sessions" control? Proposed: no.
4. **Existing bug, fix now?** `onClick={sendMessage}` on the Ask button passes the click event as `requestedMode`, so `JSON.stringify` gets an event object as the mode. It most likely throws on React's circular refs, so the Ask button fails while Enter works. That's a one-line fix (`onClick={() => sendMessage()}`). Proposed: fix it in this work, since it touches the same file.
