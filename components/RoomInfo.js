export default function RoomInfo({ 
  roomData, 
  currentUser, 
  onAssignPlayer, 
  onStartGame, 
  gameStatus 
}) {
  const isHost = roomData.host === currentUser
  const canStartGame = roomData.activePlayers.X && roomData.activePlayers.O

  return (
    <div className="room-info">
      <div className="section">
        <h3>Room Members</h3>
        <div className="members-list">
          {roomData.players.map(player => (
            <div key={player.id} className="member-item">
              <span className="member-name">
                {player.username}
                {player.username === roomData.host && ' 👑'}
              </span>
              {isHost && gameStatus === 'waiting' && (
                <div className="player-controls">
                  <button
                    onClick={() => onAssignPlayer(player.id, 'X')}
                    className={`btn btn-small ${
                      roomData.activePlayers.X === player.username ? 'active' : ''
                    }`}
                  >
                    X
                  </button>
                  <button
                    onClick={() => onAssignPlayer(player.id, 'O')}
                    className={`btn btn-small ${
                      roomData.activePlayers.O === player.username ? 'active' : ''
                    }`}
                  >
                    O
                  </button>
                  {(roomData.activePlayers.X === player.username || roomData.activePlayers.O === player.username) && (
                    <button
                      onClick={() => onAssignPlayer(player.id, 'clear')}
                      className="btn btn-small btn-clear"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {roomData.spectators.length > 0 && (
        <div className="section">
          <h3>Spectators</h3>
          <div className="spectators-list">
            {roomData.spectators.map(spectator => (
              <div key={spectator.id} className="spectator-item">
                {spectator.username}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <h3>Game Status</h3>
        <div className="game-status">
          <div className="players-assigned">
            <div className="player-slot">
              <span className="symbol">X:</span>
              <span className="player-name">
                {roomData.activePlayers.X || 'Not assigned'}
              </span>
            </div>
            <div className="player-slot">
              <span className="symbol">O:</span>
              <span className="player-name">
                {roomData.activePlayers.O || 'Not assigned'}
              </span>
            </div>
          </div>
          
          {isHost && gameStatus === 'waiting' && (
            <button
              onClick={onStartGame}
              className="btn btn-primary"
              disabled={!canStartGame}
            >
              {canStartGame ? 'Start Game' : 'Assign both players first'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}