export default function GameBoard({ board, players, currentPlayer }) {
  const getSpaceColor = (space) => {
    if (space.type === 'property') {
      if (space.tier === 'low') return '#4caf50'
      if (space.tier === 'mid') return '#ff9800'
      if (space.tier === 'high') return '#f44336'
    }
    if (space.type === 'chance') return '#9c27b0'
    if (space.type === 'go') return '#2196f3'
    if (space.type === 'jail') return '#607d8b'
    return '#424242'
  }

  const getPlayersOnSpace = (position) => {
    return players.filter(p => p.position === position && !p.isBankrupt)
  }

  return (
    <div className="hyperpoly-board">
      {board.map((space, index) => {
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
              <div className="space-info">
                <div className="space-price">${space.buyPrice}</div>
                {space.upgraded && <div className="space-upgrade">🏠</div>}
                {space.owner !== null && (
                  <div 
                    className="space-owner"
                    style={{ backgroundColor: getPlayerColor(space.owner) }}
                  ></div>
                )}
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
      })}
    </div>
  )
}

function getPlayerColor(playerId) {
  const colors = ['#2196f3', '#f44336', '#4caf50', '#ff9800']
  return colors[playerId % colors.length]
}
