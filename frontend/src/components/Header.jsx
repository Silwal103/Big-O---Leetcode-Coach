import { IconButton } from './IconButton'
import { Mascot } from './Mascot'

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

/**
 * Sticky app header: brand, current problem, and session actions.
 *
 * @param {object} props
 * @param {string} props.title - Current problem title.
 * @param {string} props.status - Import status line.
 * @param {string} props.mascotState - Pose for the brand mascot.
 * @param {boolean} props.canRefresh - Whether tab import is available (extension mode).
 * @param {boolean} props.busy - Disables actions while a request is in flight.
 * @param {boolean} props.hasMessages - Enables Clear chat.
 * @param {Function} props.onRefresh
 * @param {Function} props.onNewProblem
 * @param {Function} props.onClearChat
 * @returns {JSX.Element}
 */
export function Header({ title, status, mascotState, canRefresh, busy, hasMessages, onRefresh, onNewProblem, onClearChat }) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <Mascot size={22} state={mascotState} />
        <h1 className="app-header__title">Big-O</h1>
      </div>

      <div className="problem-chip" title={title || undefined}>
        <span className="problem-chip__title">{title || 'No problem yet'}</span>
        <span className="problem-chip__meta">{status}</span>
      </div>

      <div className="app-header__actions">
        {canRefresh && (
          <IconButton label="Refresh from tab" onClick={onRefresh} disabled={busy}>
            <svg {...iconProps}><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v2.6h-2.6" /></svg>
          </IconButton>
        )}
        <IconButton label="New problem" onClick={onNewProblem} disabled={busy}>
          <svg {...iconProps}><path d="M8 3.5v9M3.5 8h9" /></svg>
        </IconButton>
        <IconButton label="Clear chat" onClick={onClearChat} disabled={busy || !hasMessages}>
          <svg {...iconProps}><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" /></svg>
        </IconButton>
      </div>
    </header>
  )
}
