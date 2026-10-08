import { useEffect, useRef } from 'react'
import { isTypingTarget } from '../lib/keys'
import { STEPS, nextHintMode, stepForLevel } from '../lib/ladder'

/**
 * Guided hint path: progress rail, one primary "Next hint", secondary actions,
 * and the full solution behind a confirmation dialog.
 *
 * @param {object} props
 * @param {number} props.level - Current hint level (0-5).
 * @param {boolean} props.busy - Disables actions while a request is in flight.
 * @param {Function} props.onRequest - Receives a tutor mode id.
 * @returns {JSX.Element}
 */
export function HintLadder({ level, busy, onRequest }) {
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)
  const solutionRef = useRef(null)
  const step = stepForLevel(level)
  const upcoming = stepForLevel(Math.min(level + 1, 4))

  // Alt+H / Alt+R / Alt+E, matched on the physical key so macOS Option doesn't break it.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!event.altKey || event.metaKey || event.ctrlKey || busy || isTypingTarget(event.target)) return
      const mode = { KeyH: nextHintMode(level), KeyR: 'review_approach', KeyE: 'explain_concept' }[event.code]
      if (!mode) return
      event.preventDefault()
      onRequest(mode)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [level, busy, onRequest])

  const openSolutionDialog = () => {
    const dialog = dialogRef.current
    dialog.returnValue = ''
    dialog.showModal()
    cancelRef.current?.focus()
  }

  const handleDialogClose = () => {
    if (dialogRef.current.returnValue === 'reveal') onRequest('show_solution')
    solutionRef.current?.focus()
  }

  return (
    <section className="ladder" aria-label="Hint path">
      <div className="ladder__caption">
        <span className="ladder__step">{step ? step.label : 'No hints yet'}</span>
        <span className="ladder__next">
          {level >= 5 ? 'Solution revealed' : `Next: ${upcoming.label} · ${level}/5`}
        </span>
      </div>
      <div
        className="ladder__rail"
        role="progressbar"
        aria-label="Hints used"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={level}
        aria-valuetext={step ? `Step ${level} of 5: ${step.label}` : 'No hints yet'}
      >
        {STEPS.map(({ level: stepLevel }) => (
          <span
            key={stepLevel}
            className={`ladder__seg${stepLevel <= level ? ' is-done' : ''}${stepLevel === 5 ? ' ladder__seg--solution' : ''}`}
          />
        ))}
      </div>

      <div className="ladder__actions">
        <button type="button" className="btn btn--primary" title="Next hint (Alt+H)" disabled={busy}
          onClick={() => onRequest(nextHintMode(level))}>
          Next hint
        </button>
        <button type="button" className="btn" title="Explain the concept (Alt+E)" disabled={busy}
          onClick={() => onRequest('explain_concept')}>
          Explain
        </button>
        <button type="button" className="btn" title="Review my code (Alt+R)" disabled={busy}
          onClick={() => onRequest('review_approach')}>
          Review code
        </button>
        <button ref={solutionRef} type="button" className="btn btn--quiet-warn" disabled={busy}
          onClick={openSolutionDialog}>
          Solution
        </button>
      </div>

      <dialog ref={dialogRef} className="confirm" aria-labelledby="confirm-title" onClose={handleDialogClose}>
        <form method="dialog">
          <h2 id="confirm-title" className="confirm__title">Reveal the full solution?</h2>
          <p className="confirm__body">This skips the good part. Another hint might be all you need.</p>
          <div className="confirm__actions">
            <button ref={cancelRef} value="cancel" className="btn">Keep thinking</button>
            <button value="reveal" className="btn btn--warn">Reveal solution</button>
          </div>
        </form>
      </dialog>
    </section>
  )
}
