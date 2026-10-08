import { useEffect, useState } from 'react'
import { thinkingLines } from '../lib/mascot'
import { Mascot } from './Mascot'

const SUGGESTIONS = [
  "What's the first observation I should make?",
  'Which pattern does this problem look like?',
  'Which edge cases should I worry about?',
]

/**
 * In-flight status: one short line per mode, rotating every 2s.
 *
 * @param {{ mode: string }} props
 * @returns {JSX.Element}
 */
export function ThinkingRow({ mode }) {
  const lines = thinkingLines(mode)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setIndex(i => (i + 1) % lines.length), 2000)
    return () => window.clearInterval(timer)
  }, [lines.length])

  return (
    <div className="message message--ai message--thinking">
      <span className="message__label">Big-O</span>
      <p className="thinking">{lines[index]}</p>
    </div>
  )
}

/**
 * Empty conversation: the mascot and three starter questions that fill the composer.
 *
 * @param {{ onSuggest: Function }} props
 * @returns {JSX.Element}
 */
export function EmptyState({ onSuggest }) {
  return (
    <div className="empty">
      <Mascot size={56} />
      <p className="empty__title">Stuck? Let's find the smallest next step.</p>
      <p className="empty__subtitle">Ask anything, or start with one of these:</p>
      <div className="empty__suggestions">
        {SUGGESTIONS.map(text => (
          <button key={text} type="button" className="empty__suggestion" onClick={() => onSuggest(text)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
