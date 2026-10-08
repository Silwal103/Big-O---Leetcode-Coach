/**
 * Big-O mark: an "O" ring with two cursor-like eyes.
 * Each state is a distinct static pose; motion is layered on in CSS only when
 * the OS allows it, so reduced-motion users still see the state.
 *
 * @param {{ size?: number, state?: 'idle'|'thinking'|'analyzing'|'hint'|'success'|'error' }} props
 * @returns {JSX.Element}
 */
export function Mascot({ size = 24, state = 'idle' }) {
  return (
    <svg className={`mascot mascot--${state}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle className="mascot__ring" cx="12" cy="12" r="8.5" />
      <g className="mascot__eyes">
        <rect className="mascot__eye" x="8.6" y="9.6" width="1.8" height="3.6" rx="0.9" />
        <rect className="mascot__eye" x="13.6" y="9.6" width="1.8" height="3.6" rx="0.9" />
      </g>
      <path className="mascot__curve" d="M8 15.5C11 15.5 13.5 14 16 8.5" />
      <circle className="mascot__spark" cx="19.6" cy="4.4" r="1.5" />
    </svg>
  )
}
