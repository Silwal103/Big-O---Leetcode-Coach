import { correctnessTone } from './ladder.js'

const THINKING_LINES = {
  hint: ['Looking for the smallest nudge…', 'Reducing the search space…'],
  stronger_hint: ['Narrowing it down…', 'Picking the next step…'],
  explain_concept: ['Finding a small example…', 'Choosing the clearest angle…'],
  review_approach: ['Reading your code…', 'Checking edge cases…'],
  show_solution: ['Writing it out cleanly…', 'Double-checking the complexity…'],
  chat: ['Thinking it through…', 'Checking edge cases…'],
}

/**
 * Status lines shown while a request of this mode is in flight.
 *
 * @param {string} mode
 * @returns {string[]}
 */
export function thinkingLines(mode) {
  return THINKING_LINES[mode] ?? THINKING_LINES.chat
}

/**
 * Which pose the mascot should take.
 *
 * @param {object} state
 * @param {boolean} [state.loading] - A request is in flight.
 * @param {string} [state.mode] - Mode of the in-flight request.
 * @param {string|null} [state.error]
 * @param {object} [state.lastMessage] - Last message in the conversation.
 * @param {boolean} [state.recent] - The last reply arrived moments ago.
 * @returns {'idle'|'thinking'|'analyzing'|'hint'|'success'|'error'}
 */
export function mascotState({ loading, mode, error, lastMessage, recent } = {}) {
  if (loading) return mode === 'review_approach' ? 'analyzing' : 'thinking'
  if (error) return 'error'
  if (recent && lastMessage?.role === 'ai') {
    if (lastMessage.correctness && correctnessTone(lastMessage.correctness) === 'ok') return 'success'
    if (lastMessage.hintLevel > 0 && !lastMessage.revealsSolution) return 'hint'
  }
  return 'idle'
}
