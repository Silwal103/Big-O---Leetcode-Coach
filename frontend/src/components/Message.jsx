import { useEffect, useState } from 'react'
import { parseBlocks } from '../lib/richText'

function Inline({ tokens }) {
  return tokens.map((token, i) => {
    switch (token.type) {
      case 'strong': return <strong key={i}><Inline tokens={token.children} /></strong>
      case 'em': return <em key={i}><Inline tokens={token.children} /></em>
      case 'code': return <code key={i} className="rich__code">{token.value}</code>
      case 'math': return <span key={i} className="rich__math">{token.value}</span>
      default: return token.value
    }
  })
}

/**
 * Monospace code block with a copy button.
 *
 * @param {{ lang: string, value: string }} props
 * @returns {JSX.Element}
 */
function CodeBlock({ lang, value }) {
  const [status, setStatus] = useState('Copy')

  useEffect(() => {
    if (status === 'Copy') return
    const timer = window.setTimeout(() => setStatus('Copy'), 1500)
    return () => window.clearTimeout(timer)
  }, [status])

  const copy = () => {
    navigator.clipboard.writeText(value).then(() => setStatus('Copied'), () => setStatus('Copy failed'))
  }

  return (
    <div className="code-block">
      <div className="code-block__bar">
        <span className="code-block__lang">{lang || 'code'}</span>
        <button type="button" className="code-block__copy" onClick={copy} aria-live="polite">
          {status}
        </button>
      </div>
      <pre className="code-block__pre"><code>{value}</code></pre>
    </div>
  )
}

/**
 * Render tutor text (Markdown subset + math) as React elements; never as HTML.
 *
 * @param {{ text: string }} props
 * @returns {JSX.Element}
 */
export function RichText({ text }) {
  return (
    <div className="rich">
      {parseBlocks(text).map((block, i) => {
        switch (block.type) {
          case 'code':
            return <CodeBlock key={i} lang={block.lang} value={block.value} />
          case 'heading':
            return <h3 key={i} className="rich__heading"><Inline tokens={block.inlines} /></h3>
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul'
            return (
              <List key={i} className="rich__list" start={block.ordered ? block.start : undefined}>
                {block.items.map((item, j) => <li key={j}><Inline tokens={item} /></li>)}
              </List>
            )
          }
          default:
            return <p key={i} className="rich__p"><Inline tokens={block.inlines} /></p>
        }
      })}
    </div>
  )
}

/**
 * One conversation entry. Tutor replies read like a document with a tone rule;
 * user messages are compact and right-aligned.
 *
 * @param {{ message: { role: string, content: string, hintLevel?: number, revealsSolution?: boolean } }} props
 * @returns {JSX.Element}
 */
export function Message({ message }) {
  if (message.role === 'user') {
    return (
      <div className="message message--user">
        <span className="visually-hidden">You said:</span>
        <p className="message__user-text">{message.content}</p>
      </div>
    )
  }

  const tone = message.revealsSolution ? 'solution' : message.hintLevel > 0 ? 'hint' : 'neutral'
  return (
    <div className={`message message--ai message--${tone}`}>
      <span className="message__label">Big-O</span>
      <RichText text={message.content} />
      {(message.hintLevel > 0 || message.revealsSolution) && (
        <div className="message__meta">
          {message.revealsSolution
            ? <span className="message__tag message__tag--solution">Solution revealed</span>
            : <span className="message__tag message__tag--hint">Hint level {message.hintLevel}/5</span>}
        </div>
      )}
    </div>
  )
}
