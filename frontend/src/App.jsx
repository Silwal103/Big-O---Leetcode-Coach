import { useState, useRef, useEffect } from 'react'
import './App.css'

/**
 * Phase 1 — Minimal Chat UI
 *
 * A simple chat interface that sends messages to the FastAPI backend
 * and displays the structured response from the LangChain → Gemini chain.
 *
 * No problem panel, code editor, or hint buttons yet — those come in later phases.
 */

const API_BASE = 'http://localhost:8000'

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    // Clear any previous error
    setError(null)

    // Add user message to chat
    const userMessage = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}/api/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
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
        <span className="app-header__badge">Phase 1</span>
      </header>

      {/* Main Chat Area */}
      <main className="app-main">
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
            <div key={idx} className={`message message--${msg.role}`}>
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
            </div>
          ))}

          {loading && (
            <div className="message message--ai">
              <span className="message__label">Tutor</span>
              <div className="message__bubble">
                <div className="loading-dots">
                  <span className="loading-dots__dot" />
                  <span className="loading-dots__dot" />
                  <span className="loading-dots__dot" />
                </div>
              </div>
            </div>
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
          <button
            className="input-area__btn"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            id="ask-tutor-btn"
          >
            {loading ? 'Thinking…' : 'Ask Tutor'}
          </button>
        </div>
      </main>
    </>
  )
}

export default App
