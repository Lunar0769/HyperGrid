export default function GameBoard({ board, players, currentPlayer }) {
  const getSpaceColor = (space) => {
    if (space.type === 'property') {
      // Use actual Monopoly color groups
      const colorMap = {
        'brown': '#8B4513',
        'lightblue': '#87CEEB',
        'pink': '#FF69B4',
        'orange': '#FFA500',
        'red': '#FF0000',
        'yellow': '#FFFF00',
        'green': '#008000',
        'darkblue': '#000080'
      }
      return colorMap[space.color] || '#424242'
    }
    if (space.type === 'railroad') return '#000000'
    if (space.type === 'utility') return '#FFFFFF'
    if (space.type === 'chance') return '#FF6B35'
    if (space.type === 'community') return '#4ECDC4'
    if (space.type === 'go') return '#00FF00'
    if (space.type === 'jail') return '#FFA500'
    if (space.type === 'parking') return '#FF0000'
    if (space.type === 'goToJail') return '#FF0000'
    if (space.type === 'tax') return '#000000'
    return '#424242'
  }

  const getPlayersOnSpace = (position) => {
    return players.filter(p => p.position === position && !p.isBankrupt)
  }

  const renderSpace = (space, index) => {
    const playersHere = getPlayersOnSpace(index)
    const isCorner = [0, 10, 20, 30].includes(index)
    
    return (
      <div
        key={index}
        className={`board-space ${isCorner ? 'corner-space' : ''}`}
        style={{
          borderColor: getSpaceColor(space),
          backgroundColor: space.owner !== null ? `${getSpaceColor(space)}20` : 'transparent'
        }}
      >
        <div className="space-number">{index}</div>
        <div className="space-name">{space.name}</div>
        
        {space.type === 'property' && (
          <>
            <div 
              className="property-color-bar"
              style={{ backgroundColor: getSpaceColor(space) }}
            ></div>
            <div className="space-info">
              <div className="space-price">${space.buyPrice}</div>
              {space.houses > 0 && space.houses < 5 && (
                <div className="space-houses">
                  {'🏠'.repeat(space.houses)}
                </div>
              )}
              {space.houses === 5 && (
                <div className="space-hotel">🏨</div>
              )}
              {space.owner !== null && (
                <div 
                  className="space-owner"
                  style={{ backgroundColor: getPlayerColor(space.owner) }}
                ></div>
              )}
            </div>
          </>
        )}

        {(space.type === 'railroad' || space.type === 'utility') && (
          <div className="space-info">
            <div className="space-price">${space.buyPrice}</div>
            {space.owner !== null && (
              <div 
                className="space-owner"
                style={{ backgroundColor: getPlayerColor(space.owner) }}
              ></div>
            )}
          </div>
        )}

        {space.type === 'tax' && (
          <div className="space-info">
            <div className="space-price">${space.amount}</div>
          </div>
        )}
        
        {playersHere.length > 0 && (
          <div className="space-players">
            {playersHere.map(player => (
              <div
                key={player.id}
                className={`player-token ${player.id === currentPlayer ? 'active' : ''}`}
                style={{ backgroundColor: getPlayerColor(player.id) }}
              >
                {player.name[0]}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Proper Monopoly board layout - clockwise from GO
  // Bottom row: 0-10 (left to right)
  const bottomRow = board.slice(0, 11) // GO to Jail (0-10)
  
  // Right column: 11-19 (bottom to top - REVERSED for correct sequence)
  const rightColumn = board.slice(11, 20).reverse() // 19-11 (reversed for bottom-to-top display)
  
  // Top row: 20-30 (right to left)
  const topRow = board.slice(20, 31).reverse() // 30-20 (reversed for right-to-left display)
  
  // Left column: 31-39 (top to bottom - NOT REVERSED)
  const leftColumn = board.slice(31, 40) // 31-39 (top-to-bottom display)

  return (
    <div className="hyperpoly-board">
      {/* Top Row (spaces 30-20, displayed right to left) */}
      <div className="board-track top">
        {topRow.map((space, idx) => {
          const actualIndex = 30 - idx // Convert back to actual board index
          return renderSpace(space, actualIndex)
        })}
      </div>

      {/* Left Column (spaces 31-39, displayed top to bottom) */}
      <div className="board-track left">
        {leftColumn.map((space, idx) => {
          const actualIndex = 31 + idx // Correct sequence: 31, 32, 33...39
          return renderSpace(space, actualIndex)
        })}
      </div>

      {/* Center */}
      <div className="board-center">
        <h2>HYPERPOLY</h2>
        <p>Mini Monopoly</p>
      </div>

      {/* Right Column (spaces 11-19, displayed bottom to top) */}
      <div className="board-track right">
        {rightColumn.map((space, idx) => {
          const actualIndex = 19 - idx // Correct sequence: 19, 18, 17...11
          return renderSpace(space, actualIndex)
        })}
      </div>

      {/* Bottom Row (spaces 0-10, displayed left to right) */}
      <div className="board-track bottom">
        {bottomRow.map((space, idx) => renderSpace(space, idx))}
      </div>
    </div>
  )
}

function getPlayerColor(playerId) {
  const colors = ['#2196f3', '#f44336', '#4caf50', '#ff9800']
  return colors[playerId % colors.length]
}
