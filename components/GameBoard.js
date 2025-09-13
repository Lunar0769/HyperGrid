import SubBoard from './SubBoard'

export default function GameBoard({ 
  boards, 
  nextBoard, 
  currentPlayer, 
  onCellClick, 
  onBoardSelect,
  playerSymbol,
  canChooseBoard = false,
  boardChooser = null,
  waitingForOpponentChoice = false,
  choosingPlayer = null,
  subBoardWinners = []
}) {
  const isMyTurn = currentPlayer === playerSymbol
  const isSpectator = !playerSymbol
  const canIChooseBoard = canChooseBoard && (boardChooser === playerSymbol || (!boardChooser && isMyTurn))

  // Calculate which board will be next after current player's move
  const getNextMoveIndicator = (boardIndex) => {
    if (isMyTurn || isSpectator) return false
    
    // If it's opponent's turn and this board is where they'll send us next
    if (nextBoard === null || nextBoard === boardIndex) {
      return !isSubBoardComplete(boards[boardIndex])
    }
    return false
  }

  return (
    <div className="game-container">
      <div className="game-header">
        <h2>Current Turn: {currentPlayer}</h2>
        {playerSymbol ? (
          <p className={`turn-indicator ${isMyTurn ? 'my-turn' : ''}`}>
            You are: {playerSymbol} {isMyTurn ? '(Your turn!)' : '(Opponent\'s turn)'}
          </p>
        ) : (
          <p className="spectator-indicator">
            👁️ Spectating - {currentPlayer}'s turn
          </p>
        )}
        
        {canIChooseBoard && (
          <p className="board-selection-hint">
            🎯 {boardChooser && boardChooser !== currentPlayer ? 
              `You get to choose where ${currentPlayer} plays next!` :
              'You were sent to a completed board! Click any available sub-board to play there!'
            }
          </p>
        )}
        
        {canChooseBoard && !canIChooseBoard && (
          <p className="next-move-hint">
            🎯 {boardChooser} is choosing where you will play next...
          </p>
        )}
        
        {!canChooseBoard && !isMyTurn && !isSpectator && nextBoard === null && (
          <p className="next-move-hint">
            🎯 Opponent can choose any available board
          </p>
        )}
        
        {!canChooseBoard && !isMyTurn && !isSpectator && nextBoard !== null && (
          <p className="next-move-hint">
            🎯 You must play in the highlighted board
          </p>
        )}
      </div>
      
      <div className="mega-board">
        {boards.map((cells, boardIndex) => {
          const subBoardWinner = subBoardWinners[boardIndex] || getSubBoardWinner(cells)
          const isBoardComplete = isSubBoardComplete(cells)
          
          const isActive = isMyTurn && 
                          !canChooseBoard &&
                          (nextBoard === null || nextBoard === boardIndex) &&
                          !isBoardComplete
          
          const canSelectBoard = canIChooseBoard && !isBoardComplete
          
          const showNextMoveIndicator = getNextMoveIndicator(boardIndex)
          
          return (
            <SubBoard
              key={boardIndex}
              cells={cells}
              boardIndex={boardIndex}
              isActive={isActive}
              canSelectBoard={canSelectBoard}
              showNextMoveIndicator={showNextMoveIndicator}
              onCellClick={(cellIndex) => {
                // Only allow clicks if player is assigned and it's their turn and not in board selection mode
                if (playerSymbol && isMyTurn && !canChooseBoard) {
                  onCellClick(boardIndex, cellIndex)
                }
              }}
              onBoardSelect={() => {
                // Allow board selection if in board selection mode
                if (playerSymbol && onBoardSelect && canSelectBoard) {
                  onBoardSelect(boardIndex)
                }
              }}
              winner={subBoardWinner}
              canClick={!!playerSymbol && isMyTurn && !canChooseBoard}
            />
          )
        })}
      </div>
    </div>
  )
}

function isSubBoardComplete(cells) {
  return cells.every(cell => cell !== null) || getSubBoardWinner(cells) !== null
}

function getSubBoardWinner(cells) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ]

  for (let line of lines) {
    const [a, b, c] = line
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a]
    }
  }
  return null
}