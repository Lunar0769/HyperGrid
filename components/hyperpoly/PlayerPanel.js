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
                <div className="stat-item">
                  <span className="stat-label">RAILROADS</span>
                  <span className="stat-value">🚂 {player.railroads.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">UTILITIES</span>
                  <span className="stat-value">⚡ {player.utilities.length}</span>
                </div>
                {player.houses > 0 && (
                  <div className="stat-item">
                    <span className="stat-label">HOUSES</span>
                    <span className="stat-value">🏠 {player.houses}</span>
                  </div>
                )}
                {player.hotels > 0 && (
                  <div className="stat-item">
                    <span className="stat-label">HOTELS</span>
                    <span className="stat-value">🏨 {player.hotels}</span>
                  </div>
                )}
                {player.getOutOfJailCards > 0 && (
                  <div className="stat-item">
                    <span className="stat-label">JAIL CARDS</span>
                    <span className="stat-value">🗝️ {player.getOutOfJailCards}</span>
                  </div>
                )}
                {player.inJail && (
                  <div className="stat-item jail-status">
                    <span className="stat-label">STATUS</span>
                    <span className="stat-value">🔒 IN JAIL ({player.jailTurns}/3)</span>
                  </div>
                )}
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
