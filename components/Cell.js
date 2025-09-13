export default function Cell({ value, onClick, disabled, symbol }) {
  const cellClasses = [
    'cell',
    value ? 'filled' : '',
    value ? value.toLowerCase() : '',
    disabled ? 'disabled' : ''
  ].filter(Boolean).join(' ')

  return (
    <button
      className={cellClasses}
      onClick={onClick}
      disabled={disabled}
    >
      {value}
    </button>
  )
}