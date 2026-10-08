import { useState, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { getActiveTabContext, isExtension } from './extension'
import { Composer } from './components/Composer'
import { Header } from './components/Header'
import { Message } from './components/Message'
import { ProblemContext } from './components/ProblemContext'
import { canRetry, isTypingTarget } from './lib/keys'
import { EMPTY_CONTEXT, loadStore, saveStore, sessionFor, sessionKeyForImport, upsertSession } from './sessions'

/**
 * Phase 1 — Minimal Chat UI
 *
 * A simple chat interface that sends messages to the FastAPI backend
 * and displays the structured response from the LangChain → Gemini chain.
 *
 * No problem panel, code editor, or hint buttons yet — those come in later phases.
 */

const API_BASE = 'http://localhost:8000'

const TUTOR_MODES = [
  { id: 'hint', label: 'Give me a hint', message: 'Give me a hint.' },
  { id: 'stronger_hint', label: 'Stronger hint', message: 'Give me a stronger hint.' },
  { id: 'explain_concept', label: 'Explain concept', message: 'Explain the key DSA concept for this problem.' },
  { id: 'review_approach', label: 'Review my approach', message: 'Review my current approach and code.' },
  { id: 'show_solution', label: 'Show solution', message: 'Show me the complete solution.' },
]

/**
 * Render the tutor interface and coordinate its persisted session state.
 *
 * @returns {JSX.Element} The Big-O application.
 */
function App() {
  const shouldReduceMotion = useReducedMotion()
  const motionTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }
  const [initialStore] = useState(() => loadStore(localStorage))
  const storeRef = useRef(initialStore)
  const [activeKey, setActiveKey] = useState(initialStore.activeKey)
  const [messages, setMessages] = useState(() => sessionFor(initialStore).messages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [context, setContext] = useState(() => sessionFor(initialStore).context)
  const [contextStatus, setContextStatus] = useState(isExtension ? 'Ready to import' : 'Web app mode')
  const [hintLevel, setHintLevel] = useState(() => sessionFor(initialStore).hintLevel)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    storeRef.current = upsertSession(storeRef.current, activeKey, { messages, context, hintLevel })
    if (!saveStore(localStorage, storeRef.current)) {
      setError("Couldn't save this session. Browser storage may be full.")
    }
  }, [activeKey, messages, context, hintLevel])

  const refreshContext = async () => {
    setContextStatus('Reading current tab…')
    setError(null)
    try {
      const imported = await getActiveTabContext()
      const found = Object.fromEntries(Object.entries(imported).filter(([, value]) => value))
      const currentKey = storeRef.current.activeKey
      const key = sessionKeyForImport(currentKey, imported)
      if (key === currentKey) {
        setContext(previous => ({ ...previous, ...found }))
      } else {
        // The persist effect has already saved the outgoing session; swap all state in one batch.
        const next = sessionFor(storeRef.current, key)
        setActiveKey(key)
        setMessages(next.messages)
        setHintLevel(next.hintLevel)
        setContext({ ...next.context, ...found })
      }
      setContextStatus(imported.title ? 'Synced from tab' : 'No LeetCode problem found')
    } catch (err) {
      setContextStatus('Import failed')
      setError(err.message || 'Could not read the current tab.')
    }
  }

  /**
   * Switch to a blank 'untitled' session (saved sessions are kept) and notify the backend.
   *
   * @returns {Promise<void>}
   */
  const resetSession = async () => {
    if (loading) return

    setActiveKey('untitled')
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

  /** Clear the conversation while preserving the active problem context. */
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

  /**
   * Send a contextual tutor request and append its response to the chat.
   *
   * @param {string} requestedMode - The tutor assistance mode to request.
   * @param {string} requestedMessage - The message to send to the tutor.
   * @param {boolean} [retry] - Resend the trailing unanswered user message instead of adding a new one.
   * @returns {Promise<void>}
   */
  const sendMessage = async (requestedMode = 'chat', requestedMessage = input, retry = false) => {
    const trimmed = requestedMessage.trim()
    if (!trimmed || loading) return

    // Clear any previous error
    setError(null)

    // Add user message to chat
    // On retry the failed message is already shown; don't add it twice or repeat it in history.
    const priorMessages = retry ? messages.slice(0, -1) : messages
    if (!retry) {
      setMessages(prev => [...prev, { role: 'user', content: trimmed, mode: requestedMode }])
      setInput('')
    }
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
          history: priorMessages.slice(-10).map(message => ({
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
        correctness: data.correctness,
        timeComplexity: data.time_complexity,
        spaceComplexity: data.space_complexity,
        issues: data.issues,
        nextHint: data.next_hint,
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

  /**
   * Submit the predefined message associated with a tutor mode.
   *
   * @param {string} mode - The tutor assistance mode to request.
   * @param {string} message - The predefined message for the selected mode.
   */
  const requestTutorMode = (mode, message) => {
    sendMessage(mode, message)
  }

  /** Resend the last unanswered user message with its original mode. */
  const retryLastMessage = () => {
    const last = messages.at(-1)
    sendMessage(last.mode || 'chat', last.content, true)
  }

  // "/" focuses the composer from anywhere except while typing in a field.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <Header
        title={context.title}
        status={contextStatus}
        hintLevel={hintLevel}
        canRefresh={isExtension}
        busy={loading}
        hasMessages={messages.length > 0}
        onRefresh={refreshContext}
        onNewProblem={resetSession}
        onClearChat={clearConversation}
      />

      {/* Main Chat Area */}
      <main className="app-main">
        <ProblemContext context={context} onChange={setContext} />
        <div className="chat-area" role="log" aria-live="polite" aria-label="Conversation">
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
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={motionTransition}
            >
              <Message message={msg} />
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
            <motion.div
              className="error-banner"
              role="alert"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={motionTransition}
            >
              <span className="error-banner__text">{error}</span>
              {canRetry(messages) && !loading && (
                <button type="button" className="error-banner__retry" onClick={retryLastMessage}>
                  Retry
                </button>
              )}
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="dock">
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
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={() => sendMessage()}
            disabled={loading}
            inputRef={inputRef}
          />
        </div>
      </main>
    </>
  )
}

export default App
