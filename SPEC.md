# Spec: Big-O UI/UX Redesign

> Replaces the per-problem sessions spec, which is complete (branch `feature/per-problem-sessions`) and stays in git history.

## Objective

Redesign the side-panel extension, renamed **Big-O**, from a generic chat form into a polished developer tool. It is a calm, trustworthy coding coach that helps LeetCode users get unstuck **without immediately giving away the solution**.

**User:** someone solving a LeetCode problem with Big-O open next to it in Chrome's side panel (360–500 px wide), who wants the smallest useful next step.

**Personality:** intelligent, calm, encouraging, a little witty, developer-oriented, premium. Not a children's learning app, not a generic AI chatbot.

**Guiding principle:** help the user think rather than solving the problem for them. Show the guided path, put the next small step first, and put the solution behind a deliberate choice.

### User stories
1. On a LeetCode problem, I see the problem name, Big-O and the conversation without scrolling. The problem details stay out of the way until I want to edit them.
2. I click "Next hint" repeatedly and watch a 5-step path fill in: Nudge → Hint → Approach → Pseudocode → Solution. Revealing the solution asks me to confirm first.
3. When I ask Big-O to review my code, I get a structured result: whether it's correct, time and space complexity badges coloured by how costly they are, a list of issues, and an optional hidden "next nudge".
4. Code in replies is shown in monospace with a copy button.
5. While Big-O works, its mascot shows that it's thinking. On an error it looks confused and offers **Retry**.
6. I can do everything with the keyboard, focus is always visible, and with reduced motion turned on nothing animates.

### Non-goals
- No backend, API contract, prompt or AI logic changes.
- No changes to session persistence (`sessions.js`) or tab import (`extension.js`, `content-script.js`) behavior.
- No light theme, no 3D, no Lottie, no Spline, no marketing page, no gamification such as streaks, points or confetti.

## Decisions (approved)

| Topic | Decision |
|---|---|
| Accent | Mint/teal `#3CCFB0`, used only for progress and the primary action. Amber means caution or solution, red means error, green means success. |
| Solution gate | A confirmation dialog: a native `<dialog>` with Cancel focused by default. |
| Retry on error | Added. It removes the trailing user message that got no reply, then resends it with its original mode, so the message never appears twice. |
| Toolbar icons | PNGs at 16, 32, 48 and 128 px, rendered from the mascot SVG with `rsvg-convert` (`brew install librsvg`, a local dev tool, not a project dependency). The PNGs are committed. |
| Theme | Dark only. |
| Mascot | Inline SVG animated with CSS + `motion`. No new dependency. |
| Fonts | The system font stack and `ui-monospace`. The Google Fonts request is removed. |

## Tech Stack

Unchanged: React 19, Vite 8, `motion` 13 (already installed), plain CSS, Chrome MV3 side panel. **No new npm dependencies.** Backend (FastAPI + LangChain + Gemini) untouched.

## Commands

```
Frontend dev:    cd frontend && npm run dev
Frontend build:  cd frontend && npm run build
Frontend lint:   cd frontend && npm run lint
Frontend tests:  cd frontend && node --test 'src/**/*.test.js'
Backend tests:   cd backend && .venv/bin/python -m unittest discover tests
Icons:           cd frontend && sh scripts/icons.sh   (needs rsvg-convert)
```

## Project Structure

```
frontend/src/App.jsx               → keeps ALL state and handlers; renders the components below
frontend/src/components/
  Header.jsx                       → mascot, wordmark, problem chip, icon actions (Refresh, New problem, Clear chat)
  ProblemContext.jsx               → collapsible editor for the 6 existing context fields
  HintLadder.jsx                   → 5-step path, Next hint, secondary actions, solution dialog
  Message.jsx                      → user/tutor message, ReviewDetails, CodeBlock, copy
  Composer.jsx                     → auto-growing input, send button, key hints
  Mascot.jsx                       → SVG "O" with states: idle|thinking|hint|success|error|analyzing
  IconButton.jsx, Kbd.jsx          → shared primitives (tooltip, aria-label, focus ring)
frontend/src/lib/
  richText.js (+ .test.js)         → splits text into text / inline code / fenced code blocks (no HTML)
  ladder.js (+ .test.js)           → step metadata; level → step; next mode for a level; complexity → tone
frontend/src/styles/tokens.css     → design tokens (color, type, space, radius, motion, z)
frontend/src/index.css             → base + component styles using tokens (BEM kept)
frontend/scripts/icons.sh          → renders mascot SVG → public/icons/icon-{16,32,48,128}.png
frontend/public/manifest.json      → name "Big-O", icons
DELETE: src/App.css, src/assets/{hero.png,react.svg,vite.svg}, public/icons.svg, empty public/favicon.svg (replaced)
```

## Design System

**Tokens (`tokens.css`):**
```css
:root {
  --bg: #0B0C0E; --surface: #111214; --raised: #17181B;
  --border: rgb(255 255 255 / 0.07); --border-strong: rgb(255 255 255 / 0.12);
  --text: #EDEEF0; --text-2: #A0A3A9; --text-3: #6B6E75;
  --accent: #3CCFB0; --accent-soft: rgb(60 207 176 / 0.12);
  --warn: #E8A33D; --danger: #EF5B5B; --ok: #4CC38A;
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, system-ui, sans-serif;
  --mono: ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, monospace;
  --fs-xs: 11px; --fs-sm: 12px; --fs-md: 13px; --fs-lg: 15px; --fs-xl: 17px;
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 20px; --sp-6: 24px; --sp-8: 32px;
  --r-sm: 6px; --r-md: 8px; --r-lg: 12px;
  --dur-fast: 120ms; --dur: 180ms; --dur-slow: 240ms; --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  --focus: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent);
}
```

**Rules:**
- Hairline 1px borders.
- Shadows only on the dialog and popovers.
- `backdrop-filter` glass only on the sticky header and the composer.
- Gradients at most as a 1px highlight. No gradient text.
- No emoji in the UI chrome.
- Only one primary (accent) button visible at a time.

**Complexity tones:** `O(1)`, `O(log n)` → ok; `O(n)` → accent; `O(n log n)` → warn; `O(n^2)` or worse, or anything unrecognized → danger or neutral. Matched by a small regex in `ladder.js`.

**Hint path (backend `hint_level` scale, unchanged):**

| Level | Step | Sent mode |
|---|---|---|
| 1 | Nudge | `hint` |
| 2 | Hint | `hint` |
| 3 | Approach | `stronger_hint` |
| 4 | Pseudocode | `stronger_hint` |
| 5 | Solution | `show_solution` (after confirmation) |

"Next hint" uses the existing `sendMessage(mode, message)`. The existing level progression in `App.jsx` (`min(level + 1, 4)`, solution = 5) stays as it is. Complexity is covered by "Review my code" (`review_approach`).

**Mascot:** a 24×24 viewBox ring with two eye marks. States are driven by `App` state: `loading` → thinking (or analyzing when the mode is `review_approach`); `error` → error; the last reply was a hint → hint, briefly; a review reported correct → success, briefly; otherwise idle. With reduced motion, each state is a static pose.

**Microcopy (restrained wit), examples:**
- Empty state: "Stuck? Let's find the smallest next step."
- Thinking: "Checking edge cases…" / "Reducing the search space…"
- Solution dialog: "This skips the good part. Reveal the full solution?"

## Code Style

Match the existing code:
- ES modules, no semicolons, single quotes, 2-space indentation.
- Function components with hooks, and JSDoc on exported functions.
- BEM class names in CSS, and every value comes from a token.
- Components get state and handlers through props and never call `fetch` or `localStorage` themselves.

```jsx
/** Icon-only button with accessible name and tooltip. */
export function IconButton({ label, shortcut, onClick, disabled, children }) {
  return (
    <button className="icon-btn" aria-label={label} title={shortcut ? `${label} (${shortcut})` : label}
      onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
```

## Testing Strategy

- **Unit (`node --test 'src/**/*.test.js'`):**
  - `richText.test.js`: plain text, inline code, fenced blocks with and without a language, unclosed fences, and HTML-looking input staying text.
  - `ladder.test.js`: level → step, the next mode for each level, complexity → tone mapping.
  - The existing `sessions.test.js` must still pass.
- **No component test harness.** It is not added, and adding one counts as a new dependency, which needs your approval first.
- **Manual (unpacked extension), at each checkpoint:**
  - Panel widths of 360 and 500 px.
  - A keyboard-only pass: Tab order, visible focus, every shortcut, Esc, the dialog trapping focus.
  - With reduced motion turned on in the OS.
  - With a screen reader (VoiceOver), confirm new replies are announced.
  - Regression pass: import, switch session, New problem, Clear chat, every mode, the error banner.

## Boundaries

- **Always:** keep every existing handler and state in `App.jsx` with unchanged behavior; use tokens instead of hard-coded values; give each icon button an `aria-label`; respect `useReducedMotion`; run lint, build and `node --test 'src/**/*.test.js'` before each commit.
- **Ask first:** any new npm dependency; any backend, prompt or API change; changing `sessions.js`, `extension.js` or `content-script.js`; adding manifest permissions.
- **Never:** render model output as HTML (`dangerouslySetInnerHTML`); load remote fonts or scripts; remove an existing feature or mode; add 3D or Lottie runtimes.

## Success Criteria

- [ ] At 360 px on a LeetCode problem, the header, hint path, last reply and composer are visible without scrolling, with the context collapsed.
- [ ] Every existing feature still works: import, per-problem sessions, New problem, Clear chat, all 6 modes, free-form chat, the error banner, and saving the session.
- [ ] Revealing the solution needs a confirmation. Cancel is the default and Esc closes the dialog.
- [ ] Review replies show correctness, coloured Time and Space badges, the issues, and a hidden next hint, whenever the backend returns them.
- [ ] Fenced code renders in monospace with a working copy button. No model output is injected as HTML.
- [ ] The mascot shows the idle, thinking, analyzing, hint, success and error states. With reduced motion there's no animation.
- [ ] Retry resends the last user message after an error.
- [ ] Shortcuts work when the panel has focus: `/`, `Alt+H`, `Alt+R`, `Alt+E`, `Esc`. Every interactive element has a visible focus ring.
- [ ] The extension shows "Big-O" and the mascot icon in the toolbar and on the extensions page. No requests go to fonts.googleapis.com.
- [ ] Lint and build are clean, `node --test 'src/**/*.test.js'` passes, and the backend suite passes without changes.
- [ ] No new npm dependencies (`package.json` dependencies unchanged).

## Open Questions

1. **Witty microcopy:** should the rotating "thinking" lines be fixed (2–4 lines) or tied to the mode, for example "Reading your code…" for a review? Proposed: tie them to the mode, 2 lines each.
2. **Free-form chat replies** carry no step. Should they still show a left rule? Proposed: a neutral rule.
3. **Branch:** start from `main` after the per-problem sessions PR is merged, or stack on `feature/per-problem-sessions`? Proposed: wait for the merge, then branch `feature/big-o-redesign` from `main`.
