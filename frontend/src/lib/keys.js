const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'color', 'file'])

/**
 * Whether a keyboard event target is somewhere the user types text,
 * so global single-key shortcuts must not fire there.
 *
 * @param {EventTarget|null} target
 * @returns {boolean}
 */
export function isTypingTarget(target) {
  if (!target) return false
  if (target.isContentEditable) return true
  if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true
  return target.tagName === 'INPUT' && !NON_TEXT_INPUTS.has(target.type)
}

/**
 * A send can be retried when the last message is the user's and got no reply.
 *
 * @param {Array<{ role: string }>} messages
 * @returns {boolean}
 */
export function canRetry(messages) {
  return messages.at(-1)?.role === 'user'
}
