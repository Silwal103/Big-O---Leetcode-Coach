/**
 * Icon-only button with an accessible name and a tooltip.
 *
 * @param {{ label: string, shortcut?: string, onClick: Function, disabled?: boolean, children: JSX.Element }} props
 * @returns {JSX.Element}
 */
export function IconButton({ label, shortcut, onClick, disabled, children }) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
