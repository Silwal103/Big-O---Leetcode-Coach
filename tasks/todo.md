# Todo: Big-O UI/UX Redesign

Spec: [SPEC.md](../SPEC.md) · Plan: [plan.md](plan.md)

All commands run from `frontend/`. **Standard checks** = `npm run lint` clean, `npm run build` clean, `node --test 'src/**/*.test.js'` passes.
**Regression pass** = in the unpacked extension (reload it in `chrome://extensions`, then reload the LeetCode tab):
- Importing via Refresh tab works.
- Switching between two problems restores each one's session.
- New problem and Clear chat work.
- Every mode sends.
- Free-form chat sends with both Enter and the button.
- The error banner appears when the backend is stopped.

---

## Task 1: Design tokens, system fonts, rename to Big-O, delete template leftovers

**Description:** Add `src/styles/tokens.css` (from the SPEC) and import it first in `main.jsx`. Re-point the existing variables in `index.css` at the new tokens so the current layout picks up the graphite and mint palette, and remove the gradient title text. Remove the Google Fonts `<link>`s and set `<title>Big-O</title>` in `index.html`. Set the manifest `name` to "Big-O" with a new description. Delete `src/App.css` and its import, `src/assets/*` and `public/icons.svg`.

**Acceptance criteria:**
- [ ] Opening the panel makes no request to `fonts.googleapis.com` or `fonts.gstatic.com`.
- [ ] Chrome shows "Big-O" on the extensions page and in the panel title. There is no purple and no gradient text.
- [x] No file references the deleted assets.

**Verification:**
- [x] Standard checks
- [x] `grep -rn "googleapis\|App.css\|hero.png\|react.svg\|vite.svg\|icons.svg" src index.html public` returns nothing
- [ ] Regression pass, and the Network tab shows no font requests

**Dependencies:** None
**Files:** `src/styles/tokens.css` (new), `src/index.css`, `src/main.jsx`, `index.html`, `public/manifest.json`, `src/App.jsx` (CSS import), deletions
**Scope:** S

---

## Task 2: Header: mascot mark, wordmark, problem chip, icon actions

**Description:** Build `Mascot.jsx` with only the `idle` pose for now (24×24 SVG ring with two eye marks, `size` prop), `IconButton.jsx` (`aria-label`, `title` showing the shortcut, `:focus-visible` ring from `--focus`), and `Header.jsx`. The header is 44 px and sticky with the glass effect. It holds the mascot, the "Big-O" wordmark, a problem chip (title truncated with an ellipsis, plus a quieter status line that replaces the uppercase pill), and icon buttons for Refresh tab (extension only), New problem and Clear chat, all wired to the existing handlers. The level badge goes away here; the hint path replaces it in T7. Until then, show the level as quiet text in the chip.

**Acceptance criteria:**
- [x] At 360 px the header is a single row with nothing wrapping. A long title is cut off with an ellipsis, and the full title is in its tooltip.
- [x] Each icon button has an accessible name and a visible focus ring, and is disabled under the same conditions as before.
- [x] Refresh tab, New problem and Clear chat behave exactly as before.

**Verification:**
- [x] Standard checks
- [x] Manual at 360 and 500 px. Tab through the header and check the focus ring is visible on every button.
- [x] Regression pass

**Dependencies:** T1
**Files:** `src/components/{Header,IconButton,Mascot}.jsx` (new), `src/App.jsx`, `src/index.css`
**Scope:** M

---

## Task 3: Collapsible problem context

**Description:** Move the 6 context fields into `ProblemContext.jsx`, with the fields unchanged and edits still going through `setContext`. By default it collapses to a summary row: "Problem details · Java · 24 lines", or "Add problem details" when empty. It opens with an "Edit" disclosure (`aria-expanded`), and `Esc` collapses it when focus is inside. It opens automatically when the import finds no problem and the context is empty.

**Acceptance criteria:**
- [x] Collapsed by default, so at 360 px the chat area is visible without scrolling.
- [x] Editing any field works exactly as before and is still saved with the session.
- [x] Esc collapses it and returns focus to the toggle.

**Verification:**
- [x] Standard checks
- [x] Manual: edit the title and code, reload the panel, and check the edits were saved. Use the keyboard to open, edit and press Esc.
- [x] Regression pass

**Dependencies:** T1
**Files:** `src/components/ProblemContext.jsx` (new), `src/App.jsx`, `src/index.css`
**Scope:** S

---

## Checkpoint A: Shell
- [x] Standard checks, plus the backend suite (`cd backend && .venv/bin/python -m unittest discover tests`), unchanged
- [x] At 360 px on a problem page, the header, a collapsed context and the chat area are all visible without scrolling
- [x] Full regression pass
- [x] Human review of the look before Phase 2

---

## Task 4: Document-style messages with safe code-block rendering

**Description:** (Scope widened after Checkpoint A feedback: replies showed raw `**`, `$…$` and list markers, so richText also handles headings, lists, bold/italic and common LaTeX → Unicode.) Add `src/lib/richText.js`, which turns text into `[{type:'text'|'code'|'block', value, lang?}]` covering fenced blocks, inline code and unclosed fences, plus `richText.test.js`. Add `Message.jsx`:
- Tutor replies have no bubble and a 2px left rule coloured by type: hint = accent, solution = warn, chat or concept = neutral.
- User messages are compact and right-aligned.
- `CodeBlock` shows the language label and a Copy button that briefly reads "Copied" (or "Copy failed").
- The chat list is `role="log"` with `aria-live="polite"`.
- The existing hint-level and solution-revealed tags are restyled.

**Acceptance criteria:**
- [x] A solution reply's code renders in a monospace block with its language label. Copy puts the exact code on the clipboard.
- [x] Text that looks like HTML (`<b>x</b>`, `<script>`) shows as literal text. There is no `dangerouslySetInnerHTML` anywhere.
- [ ] VoiceOver announces new tutor replies.

**Verification:**
- [x] `richText.test.js` covers plain text, inline code, a fence with a language, a fence without one, an unclosed fence, HTML-looking input and empty input. All standard checks pass.
- [x] `grep -rn dangerouslySetInnerHTML src` returns nothing
- [ ] Manual: ask for the solution, check the code block, paste the copied code into an editor, then a VoiceOver spot check

**Dependencies:** T1
**Files:** `src/lib/richText.js`, `src/lib/richText.test.js`, `src/components/Message.jsx` (all new), `src/App.jsx`, `src/index.css`
**Scope:** M

---

## Task 5: Structured review details with complexity badges

**Description:** In `sendMessage`, also store `correctness`, `time_complexity`, `space_complexity`, `issues` and `next_hint` from the response on `aiMessage` (all optional; this is display data only and the request is unchanged). Add `src/lib/ladder.js` with `complexityTone(str)` → `'ok'|'accent'|'warn'|'danger'|'neutral'`, plus a test. Add `ReviewDetails` inside `Message.jsx`: a correctness line, Time and Space badges coloured by tone, a list of issues, and a "Want a nudge?" `<details>` that holds `next_hint`. It renders only the fields that are present.

**Acceptance criteria:**
- [x] A "Review my approach" reply shows whichever of correctness, Time, Space, issues and the next hint the backend returned. If none came back, it looks like a plain reply.
- [x] Badge colours follow the SPEC: O(1)/O(log n) ok, O(n) accent, O(n log n) warn, O(n²) or worse danger, unrecognized neutral.
- [x] Messages saved before this change still render.

**Verification:**
- [x] `ladder.test.js` (complexity part) covers `O(1)`, `O(log n)`, `O(N)`, `O(n log n)`, `O(n^2)`, `O(n²)`, `O(2^n)`, `O(n * m)` → neutral, `''` → neutral. All standard checks pass.
- [x] Manual: review correct and incorrect code on a real problem, then reload the panel and check the old messages still render

**Dependencies:** T4
**Files:** `src/lib/ladder.js`, `src/lib/ladder.test.js` (new), `src/components/Message.jsx`, `src/App.jsx`, `src/index.css`
**Scope:** M

---

## Task 6: Composer, Retry and the `/` shortcut

**Description:** Add `Composer.jsx`: a sticky bar with the glass effect, a textarea that grows up to about 6 lines, an icon Send button, and a hint line "↵ send · ⇧↵ newline" using `Kbd.jsx`. Enter and Shift+Enter behave exactly as before. Restyle the error banner (no emoji) and add **Retry**: `App` records the last `(mode, message)` passed to `sendMessage`; Retry calls `sendMessage(mode, message, retry = true)`, which keeps the already-shown failed message (no duplicate) and leaves it out of the history it sends. User messages now store their `mode` so Retry knows what to resend. Pressing `/` anywhere outside a text field focuses the composer.

**Acceptance criteria:**
- [x] Sending, Enter, Shift+Enter, and the disabled state while loading all behave as before.
- [x] With the backend stopped: send, then the error appears. Start the backend and click Retry: the reply arrives and the user message appears only once.
- [x] `/` focuses the composer, and typing `/` inside any text field still types the character.

**Verification:**
- [x] Standard checks
- [x] Manual: the Retry flow above, the `/` shortcut, and a 6-line message at 360 px
- [x] Regression pass

**Dependencies:** T1
**Files:** `src/components/{Composer,Kbd}.jsx` (new), `src/App.jsx`, `src/index.css`
**Scope:** S

---

## Checkpoint B: Conversation
- [x] Standard checks, plus the backend suite, unchanged
- [x] Code blocks render and copy, review badges appear, Retry works, and no HTML is injected
- [x] Full regression pass, and a keyboard-only send and Retry
- [x] Human review

---

## Task 7: Hint path, Next hint, secondary actions, solution confirmation dialog, Alt shortcuts

**Description:** Extend `ladder.js` with `STEPS` (Nudge, Hint, Approach, Pseudocode, Solution, matching levels 1–5) and `nextHintMode(level)` (`hint` for levels 0–1, `stronger_hint` for 2–3), and test both. Add `HintLadder.jsx`, which replaces the mode-button row:
- A 5-segment rail with `aria-valuenow` that fills up to `hintLevel`, with the current step's name.
- One primary button, **Next hint**, which sends `nextHintMode`.
- Secondary buttons **Explain concept** and **Review my code**.
- A quieter **Show solution** button that opens a native `<dialog>` ("This skips the good part. Reveal the full solution?") with Cancel focused by default. Confirming sends `show_solution`.
- Shortcuts `Alt+H`, `Alt+R` and `Alt+E`, matched on `event.code` and ignored while a text field has focus.

Every message sent is unchanged from the old mode buttons.

**Acceptance criteria:**
- [x] Next hint from level 0 goes Nudge → Hint → Approach → Pseudocode and stays there. Solution is reached only through the dialog.
- [x] In the dialog, Esc or Cancel sends nothing and returns focus to Show solution, and focus stays inside the dialog while it's open.
- [x] All 6 modes are still reachable, with the same requests to `/api/tutor` as before (check in the Network tab).

**Verification:**
- [x] `ladder.test.js` (steps part) covers the step for each level 0–5 and `nextHintMode` for levels 0–4. All standard checks pass.
- [x] Manual, keyboard only: Alt+H ×4, Alt+R, Alt+E, Tab to Show solution, Esc, then confirm. On macOS, check that Alt doesn't type characters into the composer.
- [x] Regression pass

**Dependencies:** T5 (ladder.js), T2 (the level badge is gone)
**Files:** `src/lib/ladder.js`, `src/lib/ladder.test.js`, `src/components/HintLadder.jsx` (new), `src/App.jsx`, `src/index.css`
**Scope:** M

---

## Checkpoint C: Coaching
- [x] Standard checks
- [x] Keyboard-only run of the whole hint path through to the solution dialog
- [x] Human review of how the coaching flow feels

---

## Task 8: Mascot states, empty and thinking states, microcopy

**Description:** Give `Mascot.jsx` its `idle | thinking | analyzing | hint | success | error` states, animated with `motion` only on `opacity`, `transform` and `pathLength`, and static poses when `useReducedMotion` is on. `App` derives the state:
- `loading` → thinking, or analyzing when the mode was `review_approach`.
- `error` → error.
- The last reply was a hint → hint, for about 1.5 s.
- A review said the code is correct → success, for about 1.5 s.
- Otherwise idle.

The thinking row (replacing the loading dots) shows one status line per mode (no second mascot: the header mascot carries the live state) that rotates every 2 s, for example a review shows "Reading your code…" then "Checking edge cases…". The empty state shows a 56 px mascot, "Stuck? Let's find the smallest next step." and 3 suggestion buttons that fill the composer without sending.

**Acceptance criteria:**
- [ ] Each state appears in its situation: send, review, error, hint, a correct review, and an empty session.
- [ ] With reduced motion on in the OS, nothing animates, and states still differ by pose.
- [ ] The suggestion buttons fill the composer and focus it without sending.

**Verification:**
- [x] Standard checks
- [ ] Manual: trigger every state, then repeat with reduced motion on. Check the Performance panel shows no long tasks while thinking.
- [ ] Regression pass

**Dependencies:** T2, T4, T6, T7
**Files:** `src/components/Mascot.jsx`, `src/App.jsx`, `src/index.css`
**Scope:** M

---

## Task 9: Toolbar and favicon icons from the mascot SVG

**Description:** Run `brew install librsvg`. Save the mascot's idle pose as `public/icons/big-o.svg` (with a solid background for small sizes). Add `scripts/icons.sh`, which renders it with `rsvg-convert` to `public/icons/icon-{16,32,48,128}.png`, and commit the PNGs. Add `"icons"` and `"action.default_icon"` to the manifest. Replace the empty `public/favicon.svg` with the mascot SVG.

**Acceptance criteria:**
- [ ] The toolbar and `chrome://extensions` show the Big-O mascot instead of the letter "L".
- [ ] The 16 px icon is still recognisable.
- [x] `sh scripts/icons.sh` regenerates the PNGs identically.

**Verification:**
- [x] Standard checks; `file public/icons/*.png` reports the right sizes
- [ ] Manual: reload the extension, look at the toolbar at normal and Retina scaling, then rerun the script and check `git status` shows no changes

**Dependencies:** T8 (the final mascot shape)
**Files:** `public/icons/*` (new), `scripts/icons.sh` (new), `public/manifest.json`, `public/favicon.svg`
**Scope:** S

---

## Checkpoint D: Complete
- [ ] Every Success Criteria checkbox in SPEC.md is met
- [ ] `git diff main -- frontend/package.json` shows no dependency changes, and the backend is unchanged (`git diff main --stat -- backend` is empty)
- [ ] Full regression pass at 360 and 500 px, a keyboard-only pass, a reduced-motion pass, a VoiceOver spot check
- [ ] Ready for review and PR
