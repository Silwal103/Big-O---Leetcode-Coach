/**
 * Coaching helpers: the hint path, complexity badges and review verdicts.
 */

/** Hint path steps, keyed to the backend's hint_level scale (unchanged). */
export const STEPS = [
  { level: 1, label: 'Nudge' },
  { level: 2, label: 'Hint' },
  { level: 3, label: 'Approach' },
  { level: 4, label: 'Pseudocode' },
  { level: 5, label: 'Solution' },
]

/**
 * The step reached at a hint level, or null before the first hint.
 *
 * @param {number} [level]
 * @returns {{ level: number, label: string }|null}
 */
export function stepForLevel(level) {
  return STEPS.find(step => step.level === level) ?? null
}

/**
 * Mode "Next hint" sends: gentle hints first, then stronger ones.
 * (App caps hint levels at 4; only show_solution reaches 5.)
 *
 * @param {number} level - Current hint level.
 * @returns {'hint'|'stronger_hint'}
 */
export function nextHintMode(level) {
  return level < 2 ? 'hint' : 'stronger_hint'
}

// First O(...) in the string, allowing one level of nested parens: O(n log(n)).
const BIG_O = /O\(((?:[^()]|\([^()]*\))*)\)/i

/**
 * The O(...) part of a complexity description, or the text itself.
 *
 * @param {string} [text]
 * @returns {string}
 */
export function complexityLabel(text = '') {
  return text.match(BIG_O)?.[0] ?? text.trim()
}

/**
 * Colour tone for a complexity: cheap → ok, linear → accent, n log n → warn,
 * polynomial/exponential → danger, anything unrecognised → neutral.
 *
 * @param {string} [text]
 * @returns {'ok'|'accent'|'warn'|'danger'|'neutral'}
 */
export function complexityTone(text = '') {
  const inner = text.match(BIG_O)?.[1]
  if (inner === undefined) return 'neutral'
  const term = inner
    .toLowerCase()
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/log\((\w+)\)/g, 'log$1')
    .replace(/\s+/g, '')
  if (term === '1' || term === 'logn') return 'ok'
  if (term === 'n') return 'accent'
  if (term === 'nlogn') return 'warn'
  if (/^n\^\d+$/.test(term) || /^\d+\^n$/.test(term) || term === 'n!') return 'danger'
  return 'neutral'
}

/**
 * Tone for a correctness verdict: only an unqualified "correct" is ok.
 *
 * @param {string} [text]
 * @returns {'ok'|'warn'}
 */
export function correctnessTone(text = '') {
  return /^\s*correct\b/i.test(text) ? 'ok' : 'warn'
}
