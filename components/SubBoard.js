import Cell from './Cell'

export default function SubBoard({ 
  cells, 
  boardIndex, 
  isActive, 
  canSelectBoard,
  showNextMoveIndicator,
  onCellClick, 
  onBoardSelect,
  winner,
  canClick = true
}) {
  const boardClasses = [
    'sub-board',
    isActive ? 'active' : '',
    canSelectBoard ? 'selectable' : '',
    showNextMoveIndicator ? 'next-move-indicator' : '',
    winner ? 'won' : '',
    winner === 'tie' ? 'tied' : ''
  ].filter(Boolean).join(' ')

  const handleBoardClick = (e) => {
    // Only trigger board selection if in selection mode and not clicking on a cell
    if (canSelectBoard && onBoardSelect) {
      // Check if the click is on the overlay or its children, but not on cells
      const isOverlayClick = e.target.classList.contains('sub-board-overlay') || 
                            e.target.classList.contains('selection-hint') ||
                            e.target.closest('.sub-board-overlay')
      
      if (isOverlayClick) {
        e.preventDefault()
        e.stopPropagation()
        onBoardSelect()
      }
    }
  }

  return (
    <div className={boardClasses} onClick={handleBoardClick}>
      {winner && winner !== 'tie' && <div className="winner-overlay">{winner}</div>}
      {winner === 'tie' && <div className="tie-overlay">TIE</div>}
      
      {canSelectBoard && (
        <div 
          className="sub-board-overlay"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('Board overlay clicked:', boardIndex)
            onBoardSelect()
          }}
        >
          <div className="selection-hint">
            Click to select this board
          </div>
        </div>
      )}
      
      <div className="cells-grid">
        {cells.map((value, cellIndex) => (
          <Cell
            key={cellIndex}
            value={value}
            onClick={() => onCellClick(cellIndex)}
            disabled={!isActive || value !== null || winner || !canClick}
            symbol={value}
          />
        ))}
      </div>
    </div>
  )
}