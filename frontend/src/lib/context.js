export const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'javascript', label: 'JavaScript' },
]

/**
 * Whether the user has supplied nothing worth showing (url alone doesn't count).
 *
 * @param {{ title?: string, description?: string, code?: string }} context
 * @returns {boolean}
 */
export function isContextEmpty({ title = '', description = '', code = '' } = {}) {
  return !title.trim() && !description.trim() && !code.trim()
}

/**
 * One-line summary for the collapsed problem context row.
 *
 * @param {{ title?: string, language?: string, code?: string }} context
 * @returns {string}
 */
export function contextSummary(context) {
  if (isContextEmpty(context)) return 'Add problem details'
  const language = LANGUAGES.find(l => l.value === context.language)?.label
  const code = (context.code || '').trim()
  const lines = code ? code.split('\n').length : 0
  const size = lines > 1 ? `${lines} lines` : code ? 'Code added' : ''
  return [language, size || 'No code yet'].filter(Boolean).join(' · ')
}
