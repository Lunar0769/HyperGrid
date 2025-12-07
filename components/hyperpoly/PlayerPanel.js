export default function PlayerPanel({ players, currentPlayer }) {
  return (
    <div className="player-panel">
      <div className="panel-header">
        <div className="deco-line-short"></div>
        <span className="panel-title">PLAYERS</span>
        <div className="deco-line-short"></div>
      </div>
      
      <div className="players-list">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`player-card ${index === currentPlayer ? 'active' : ''} ${player.isBankrupt ? 'bankrupt' : ''}`}
          >
            <div className="player-header">
              <div 
                className="player-avatar"
                style={{ backgroundColor: getPlayerColor(player.id) }}
              >
                {player.name[0]}
              </div>
              <div className="player-info">
                <div className="player-name">{player.name}</div>
                {player.isBankrupt && <div className="bankrupt-badge">BANKRUPT</div>}
              </div>
            </div>
            
            {!player.isBankrupt && (
              <div className="player-stats">
                <div className="stat-item">
                  <span className="stat-label">CASH</span>
                  <span className="stat-value">${player.money}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">PROPERTIES</span>
                  <span className="stat-value">🏠 {player.properties.length}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function getPlayerColor(playerId) {
  const colors = ['#2196f3', '#f44336', '#4caf50', '#ff9800']
  return colors[playerId % colors.length]
}
