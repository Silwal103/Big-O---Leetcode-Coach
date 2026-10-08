# Implementation Plan: Big-O UI/UX Redesign

Spec: [SPEC.md](../SPEC.md) · Task checklist: [todo.md](todo.md) · Branch: `feature/big-o-redesign` (from `main` @ `3eddf13`)
Previous plan: [archive/per-problem-sessions-plan.md](archive/per-problem-sessions-plan.md)

## Overview

Restyle and restructure the side panel into Big-O, a calm developer tool, **without changing what it does**. Work is sliced by visible area of the panel: header → problem context → messages → composer → hint path → mascot → icons. Each slice pulls its markup out of `App.jsx` into a component and restyles it in the same task, so the panel works after every commit. `App.jsx` keeps every piece of state and every handler.

## Architecture Decisions

- **Extract components slice by slice, not all at once.** There are no component tests, so moving all ~440 lines in one go is the riskiest possible step. Each task moves one area and is checked by hand straight away.
- **Components only display data.** They get state and handlers through props. `fetch`, `localStorage`, `sessions.js` and `extension.js` stay referenced only from `App.jsx`.
- **The logic lives in pure `src/lib/` modules** (`richText.js`, `ladder.js`) tested with `node:test`. That is the only automated coverage for new behaviour, so anything with branching logic goes there.
- **Tokens first.** `tokens.css` lands in Task 1 and every later style uses it, so no colour or spacing values are written out by hand.
- **Header without a menu.** Three icon buttons fit at 360 px; an overflow menu would need its own focus and keyboard handling. (SPEC updated.)
- **Retry** removes the trailing user message that got no reply, then calls the existing `sendMessage(mode, message)`. The handler itself doesn't change. (SPEC updated.)
- **Toolbar icons** come from the same SVG as `Mascot.jsx`, rendered by `scripts/icons.sh` with `rsvg-convert`, a local tool and not an npm dependency.

## Dependency Graph

```
T1 tokens.css + fonts + rename + cleanup
 ├── T2 Header (+ IconButton, static Mascot) ──────────────┐
 ├── T3 ProblemContext (collapsible)                       │
 ├── T4 lib/richText + Message (code blocks, aria-live)    │
 │     └── T5 lib/ladder.complexityTone + ReviewDetails    │
 ├── T6 Composer + Retry + "/" shortcut                    │
 └── T7 lib/ladder steps + HintLadder + solution dialog ◄──┘ (uses T5's ladder.js)
       └── T8 Mascot states + empty/thinking states (needs T2 Mascot, T4/T6/T7 state hooks)
             └── T9 Toolbar icons from mascot SVG
```

All tasks edit `App.jsx`, so they run **in order**. Nothing can be done in parallel safely.

## Task List

### Phase 1: Shell
- [x] Task 1: Design tokens, system fonts, rename to Big-O, delete template leftovers (S)
- [x] Task 2: Header: mascot mark, wordmark, problem chip, icon actions (M)
- [x] Task 3: Collapsible problem context (S)

### Checkpoint A: Shell
- [ ] At 360 px on a problem page, the chat area is visible without scrolling. The full regression pass is clean.

### Phase 2: Conversation
- [ ] Task 4: Document-style messages with safe code-block rendering (M)
- [ ] Task 5: Structured review details with complexity badges (M)
- [ ] Task 6: Composer, Retry and the `/` shortcut (S)

### Checkpoint B: Conversation
- [ ] Code renders and copies, reviews show badges, Retry works, nothing is injected as HTML

### Phase 3: Coaching
- [ ] Task 7: Hint path, Next hint, secondary actions, solution confirmation dialog, Alt shortcuts (M)

### Checkpoint C: Coaching
- [ ] Keyboard-only run of the whole hint path through to the solution dialog

### Phase 4: Identity
- [ ] Task 8: Mascot states, empty and thinking states, microcopy (M)
- [ ] Task 9: Toolbar and favicon icons from the mascot SVG (S)

### Checkpoint D: Complete
- [ ] Every SPEC success criterion is met

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A behaviour regresses while markup moves out of `App.jsx` | High | One area per task. Handlers are passed in, never rewritten. The regression pass runs at every checkpoint. |
| Model output rendered unsafely | High | `richText.js` returns plain tokens and React renders the text. `dangerouslySetInnerHTML` is banned. A unit test feeds `<script>` input through it. |
| Layout doesn't fit at 360 px | Med | Each task's manual check runs at 360 px and at 500 px. |
| `backdrop-filter` or animation costs performance in the side panel | Med | Glass only on two sticky bars. Animate only `opacity` and `transform`. Reduced-motion check at each checkpoint. |
| Clipboard copy fails in the side panel | Low | `navigator.clipboard.writeText` on a user click, which works on extension pages. On failure show "Copy failed", never throw. |
| Alt-key shortcuts clash with the OS or the browser (macOS Alt types characters) | Med | Match on `event.code` (`KeyH`), not `event.key`. Ignore them while the composer has focus. Test on macOS. |
| Complexity strings vary ("O(N)", "O(n * m)", "linear") | Low | Normalize case and whitespace. Anything unrecognized gets a neutral tone. Unit-tested. |

## Open Questions

None blocking. SPEC open questions 1–2 are taken as proposed (thinking lines per mode, neutral rule for chat replies). Question 3 is resolved: the branch is cut from `main` after PR #3 merged.
