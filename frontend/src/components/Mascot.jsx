/**
 * Big-O mark: an "O" ring with two cursor-like eyes.
 * Only the idle pose for now; states arrive with the mascot task.
 *
 * @param {{ size?: number }} props
 * @returns {JSX.Element}
 */
export function Mascot({ size = 24 }) {
  return (
    <svg className="mascot" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle className="mascot__ring" cx="12" cy="12" r="8.5" />
      <rect className="mascot__eye" x="8.6" y="9.6" width="1.8" height="3.6" rx="0.9" />
      <rect className="mascot__eye" x="13.6" y="9.6" width="1.8" height="3.6" rx="0.9" />
    </svg>
  )
}
