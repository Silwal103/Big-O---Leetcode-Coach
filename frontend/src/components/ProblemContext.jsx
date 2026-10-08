import { useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { LANGUAGES, contextSummary, isContextEmpty } from '../lib/context'

/**
 * Collapsible editor for the problem context sent with every tutor request.
 * Opens on its own while the context is empty, until the user toggles it.
 *
 * @param {{ context: object, onChange: Function }} props
 * @returns {JSX.Element}
 */
export function ProblemContext({ context, onChange }) {
  const shouldReduceMotion = useReducedMotion()
  const [userOpen, setUserOpen] = useState(null)
  const open = userOpen ?? isContextEmpty(context)
  const toggleRef = useRef(null)
  const panelId = useId()
  const set = field => event => onChange({ ...context, [field]: event.target.value })

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && open) {
      setUserOpen(false)
      toggleRef.current?.focus()
    }
  }

  return (
    <section className="problem-context" onKeyDown={handleKeyDown}>
      <button
        ref={toggleRef}
        type="button"
        className="problem-context__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setUserOpen(!open)}
      >
        <span className="problem-context__label">Problem details</span>
        <span className="problem-context__summary">{contextSummary(context)}</span>
        <span className="problem-context__action">{open ? 'Done' : 'Edit'}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            className="problem-context__fields"
            initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <label htmlFor="problem-title">Current problem</label>
            <input
              id="problem-title"
              value={context.title}
              onChange={set('title')}
              placeholder="Import a LeetCode problem or enter a title"
            />
            <label htmlFor="problem-description">Problem statement</label>
            <textarea
              id="problem-description"
              value={context.description}
              onChange={set('description')}
              placeholder="Problem statement (editable)"
              rows={3}
            />
            <label htmlFor="problem-constraints">Constraints</label>
            <textarea
              id="problem-constraints"
              value={context.constraints}
              onChange={set('constraints')}
              placeholder="Constraints (optional)"
              rows={2}
            />
            <label htmlFor="problem-examples">Examples</label>
            <textarea
              id="problem-examples"
              value={context.examples}
              onChange={set('examples')}
              placeholder="Examples (optional)"
              rows={2}
            />
            <label htmlFor="code-language">Code language</label>
            <select id="code-language" value={context.language} onChange={set('language')}>
              <option value="">Select a language</option>
              {LANGUAGES.map(language => (
                <option key={language.value} value={language.value}>{language.label}</option>
              ))}
            </select>
            <label htmlFor="current-code">Current code</label>
            <textarea
              id="current-code"
              className="problem-context__code"
              value={context.code}
              onChange={set('code')}
              placeholder="Your current code (editable)"
              rows={4}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
