import { useLayoutEffect } from 'react'
import { Kbd } from './Kbd'

/**
 * Message input: grows with its content (CSS caps it), Enter sends, Shift+Enter adds a line.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {Function} props.onChange - Receives the new text.
 * @param {Function} props.onSubmit
 * @param {boolean} props.disabled - True while a request is in flight.
 * @param {React.RefObject} props.inputRef - Lets App focus the textarea.
 * @returns {JSX.Element}
 */
export function Composer({ value, onChange, onSubmit, disabled, inputRef }) {
  useLayoutEffect(() => {
    const field = inputRef.current
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${field.scrollHeight}px`
  }, [value, inputRef])

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <label htmlFor="tutor-input" className="visually-hidden">Message Big-O</label>
      <div className="composer__box">
        <textarea
          ref={inputRef}
          id="tutor-input"
          className="composer__field"
          placeholder="Ask about this problem…"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />
        <button
          type="submit"
          id="ask-tutor-btn"
          className="composer__send"
          aria-label="Send"
          title="Send (Enter)"
          disabled={disabled || !value.trim()}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
          </svg>
        </button>
      </div>
      <p className="composer__hint" aria-hidden="true">
        <Kbd>↵</Kbd> send <span className="composer__sep">·</span> <Kbd>⇧</Kbd><Kbd>↵</Kbd> new line <span className="composer__sep">·</span> <Kbd>/</Kbd> focus
      </p>
    </form>
  )
}
