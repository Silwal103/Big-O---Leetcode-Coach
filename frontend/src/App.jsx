import { useState, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import './App.css'
import { getActiveTabContext, isExtension } from './extension'

/**
 * Phase 1 — Minimal Chat UI
 *
 * A simple chat interface that sends messages to the FastAPI backend
 * and displays the structured response from the LangChain → Gemini chain.
 *
 * No problem panel, code editor, or hint buttons yet — those come in later phases.
 */

const API_BASE = 'http://localhost:8000'
const STORAGE_KEY = 'leetcode-coach-session'

const EMPTY_CONTEXT = {
  title: '',
  description: '',
  constraints: '',
  examples: '',
  code: '',
  language: '',
  url: '',
}

const TUTOR_MODES = [
  { id: 'hint', label: 'Give me a hint', message: 'Give me a hint.' },
  { id: 'stronger_hint', label: 'Stronger hint', message: 'Give me a stronger hint.' },
  { id: 'explain_concept', label: 'Explain concept', message: 'Explain the key DSA concept for this problem.' },
  { id: 'review_approach', label: 'Review my approach', message: 'Review my current approach and code.' },
  { id: 'show_solution', label: 'Show solution', message: 'Show me the complete solution.' },
]

function App() {
  const shouldReduceMotion = useReducedMotion()
  const motionTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').messages || []
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [context, setContext] = useState(() => {
    try {
      return { ...EMPTY_CONTEXT, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').context || {}) }
    } catch {
      return EMPTY_CONTEXT
    }
  })
  const [contextStatus, setContextStatus] = useState(isExtension ? 'Ready to import' : 'Web app mode')
  const [hintLevel, setHintLevel] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').hintLevel || 0
    } catch {
      return 0
    }
  })
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, context, hintLevel }))
  }, [messages, context, hintLevel])

  const refreshContext = async () => {
    setContextStatus('Reading current tab…')
    setError(null)
    try {
      const imported = await getActiveTabContext()
      setContext(previous => ({
        ...previous,
        ...Object.fromEntries(Object.entries(imported).filter(([, value]) => value)),
      }))
      setContextStatus(imported.title ? `Imported: ${imported.title}` : 'No LeetCode problem found')
    } catch (err) {
      setContextStatus('Import failed')
      setError(err.message || 'Could not read the current tab.')
    }
  }

  const resetSession = async () => {
    if (loading) return

    setMessages([])
    setInput('')
    setError(null)
    setContext(EMPTY_CONTEXT)
    setContextStatus(isExtension ? 'Ready to import' : 'New problem')
    setHintLevel(0)

    try {
      const response = await fetch(`${API_BASE}/api/reset`, { method: 'POST' })
      if (!response.ok) {
        throw new Error(`Reset failed (${response.status})`)
      }
    } catch (err) {
      setError(err.message || 'Could not reset the current session.')
    }
  }

  const clearConversation = () => {
    if (loading) return
    setMessages([])
    setHintLevel(0)
    setError(null)
  }

  useEffect(() => {
    if (isExtension) {
      const refreshTimer = window.setTimeout(refreshContext, 0)
      return () => window.clearTimeout(refreshTimer)
    }
  }, [])

  // Auto-scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = async (requestedMode = 'chat', requestedMessage = input) => {
    const trimmed = requestedMessage.trim()
    if (!trimmed || loading) return

    // Clear any previous error
    setError(null)

    // Add user message to chat
    const userMessage = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    const requestedHintLevel = requestedMode === 'show_solution'
      ? 5
      : requestedMode === 'hint' || requestedMode === 'stronger_hint'
        ? Math.min(hintLevel + 1, 4)
        : hintLevel

    try {
      const response = await fetch(`${API_BASE}/api/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          problem_title: context.title,
          problem_description: context.description,
          constraints: context.constraints,
          examples: context.examples,
          code: context.code,
          language: context.language,
          mode: requestedMode,
          hint_level: requestedHintLevel,
          history: messages.slice(-10).map(message => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Server error (${response.status})`)
      }

      const data = await response.json()

      // Add AI response to chat with metadata
      const aiMessage = {
        role: 'ai',
        content: data.response,
        hintLevel: data.hint_level,
        revealsSolution: data.reveals_solution,
      }
      setHintLevel(aiMessage.hintLevel)
      setMessages(prev => [...prev, aiMessage])
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Cannot reach the backend. Is the server running on port 8000?')
      } else {
        setError(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const requestTutorMode = (mode, message) => {
    sendMessage(mode, message)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <span className="app-header__icon">🧠</span>
        <h1 className="app-header__title">LeetCode Coach</h1>
        {isExtension && (
          <button className="context-refresh-btn" onClick={refreshContext} disabled={loading}>
            Refresh tab
          </button>
        )}
        <button className="context-refresh-btn" onClick={resetSession} disabled={loading}>
          New problem
        </button>
        <button className="context-refresh-btn" onClick={clearConversation} disabled={loading || messages.length === 0}>
          Clear chat
        </button>
        <span className="app-header__badge">{contextStatus}</span>
        <motion.span
          key={hintLevel}
          className="app-header__badge"
          initial={shouldReduceMotion ? false : { opacity: 0.5, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={motionTransition}
        >
          Level {hintLevel}/5
        </motion.span>
      </header>

      {/* Main Chat Area */}
      <main className="app-main">
        <motion.section className="context-panel" layout transition={motionTransition}>
          <label htmlFor="problem-title">Current problem</label>
          <input
            id="problem-title"
            value={context.title}
            onChange={event => setContext({ ...context, title: event.target.value })}
            placeholder="Import a LeetCode problem or enter a title"
          />
          <label htmlFor="problem-description">Problem statement</label>
          <textarea
            id="problem-description"
            value={context.description}
            onChange={event => setContext({ ...context, description: event.target.value })}
            placeholder="Problem statement (editable)"
            rows={3}
          />
          <label htmlFor="problem-constraints">Constraints</label>
          <textarea
            id="problem-constraints"
            value={context.constraints}
            onChange={event => setContext({ ...context, constraints: event.target.value })}
            placeholder="Constraints (optional)"
            rows={2}
          />
          <label htmlFor="problem-examples">Examples</label>
          <textarea
            id="problem-examples"
            value={context.examples}
            onChange={event => setContext({ ...context, examples: event.target.value })}
            placeholder="Examples (optional)"
            rows={2}
          />
          <label htmlFor="code-language">Code language</label>
          <select
            id="code-language"
            value={context.language}
            onChange={event => setContext({ ...context, language: event.target.value })}
          >
            <option value="">Select a language</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="javascript">JavaScript</option>
          </select>
          <label htmlFor="current-code">Current code</label>
          <textarea
            id="current-code"
            value={context.code}
            onChange={event => setContext({ ...context, code: event.target.value })}
            placeholder="Your current code (editable)"
            rows={4}
          />
        </motion.section>
        <div className="chat-area">
          {messages.length === 0 && !loading && (
            <div className="chat-area__empty">
              <span className="chat-area__empty-icon">💬</span>
              <p className="chat-area__empty-title">Ask your DSA tutor anything</p>
              <p className="chat-area__empty-subtitle">
                Try asking about a problem, requesting a hint, or discussing a data structure concept.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              className={`message message--${msg.role}`}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={motionTransition}
            >
              <span className="message__label">
                {msg.role === 'user' ? 'You' : 'Tutor'}
              </span>
              <div className="message__bubble">{msg.content}</div>
              {msg.role === 'ai' && (
                <div className="message__meta">
                  {msg.hintLevel > 0 && (
                    <span className="message__tag message__tag--hint">
                      Hint Level {msg.hintLevel}/5
                    </span>
                  )}
                  {msg.revealsSolution && (
                    <span className="message__tag message__tag--solution">
                      Solution Revealed
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ))}

          {loading && (
            <motion.div
              className="message message--ai"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={motionTransition}
            >
              <span className="message__label">Tutor</span>
              <div className="message__bubble">
                <div className="loading-dots">
                  {[0, 1, 2].map(index => (
                    <motion.span
                      key={index}
                      className="loading-dots__dot"
                      animate={shouldReduceMotion ? undefined : { opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
                      transition={shouldReduceMotion ? undefined : { duration: 1, repeat: Infinity, delay: index * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <div className="error-banner">
              <span className="error-banner__icon">⚠️</span>
              {error}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="mode-controls" aria-label="Tutor assistance modes">
          {TUTOR_MODES.map(mode => (
            <motion.button
              key={mode.id}
              className={`mode-controls__btn mode-controls__btn--${mode.id}`}
              onClick={() => requestTutorMode(mode.id, mode.message)}
              disabled={loading}
              whileHover={shouldReduceMotion ? undefined : { y: -1 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            >
              {mode.label}
            </motion.button>
          ))}
        </div>
        <div className="input-area">
          <textarea
            ref={inputRef}
            className="input-area__field"
            placeholder="Ask the tutor a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
            id="tutor-input"
          />
          <motion.button
            className="input-area__btn"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            id="ask-tutor-btn"
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          >
            {loading ? 'Thinking…' : 'Ask Tutor'}
          </motion.button>
        </div>
      </main>
    </>
  )
}

export default App
