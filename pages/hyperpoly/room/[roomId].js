import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import io from 'socket.io-client'
import ParticleBackground from '../../../components/ParticleBackground'
import GameBoard from '../../../components/hyperpoly/GameBoard'
import PlayerPanel from '../../../components/hyperpoly/PlayerPanel'
import ActionPanel from '../../../components/hyperpoly/ActionPanel'

export default function HyperPolyRoom() {
  const router = useRouter()
  const { roomId, username, host } = router.query

  const [socket, setSocket] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [roomData, setRoomData] = useState({
    players: [],
    host: null,
    gameStarted: false
  })

  useEffect(() => {
    if (!roomId || !username) return

    const socketUrl = 'https://hypergrid-u9d2.onrender.com'
    const newSocket = io(socketUrl)
    setSocket(newSocket)

    newSocket.emit('joinHyperPolyRoom', {
      roomId,
      username,
      isHost: host === 'true'
    })

    newSocket.on('hyperPolyRoomUpdate', (data) => {
      setRoomData(data)
    })

    newSocket.on('hyperPolyGameUpdate', (data) => {
      setGameState(data)
    })

    return () => newSocket.close()
  }, [roomId, username, host])

  const startGame = () => {
    if (socket && roomData.host === username && roomData.players.length >= 2) {
      socket.emit('startHyperPolyGame', { roomId })
    }
  }

  const handleRollDice = () => {
    if (socket && gameState) {
      socket.emit('hyperPolyRollDice', { roomId })
    }
  }

  const handleBuyProperty = () => {
    if (socket) {
      socket.emit('hyperPolyBuyProperty', { roomId })
    }
  }

  const handleUpgradeProperty = () => {
    if (socket) {
      socket.emit('hyperPolyUpgradeProperty', { roomId })
    }
  }

  const handleSkip = () => {
    if (socket) {
      socket.emit('hyperPolySkipAction', { roomId })
    }
  }

  if (!roomId || !username) {
    return <div className="loading-screen">Loading...</div>
  }

  const currentPlayer = gameState?.players[gameState.currentPlayer]
  const isMyTurn = currentPlayer?.name === username

  return (
    <div className="hyperpoly-container">
      <ParticleBackground />

      {/* Top Header */}
      <div className="tech-header">
        <div className="tech-header-content">
          <div className="tech-logo">
            <div className="tech-logo-text">HYPERPOLY</div>
            <div className="tech-divider"></div>
            <span className="tech-est">ROOM: {roomId}</span>
          </div>
          <button onClick={() => router.push('/hyperpoly')} className="btn-tech-header">
            <span className="btn-corner btn-corner-tl"></span>
            <span className="btn-corner btn-corner-br"></span>
            EXIT
          </button>
        </div>
      </div>

      {/* Corner Frames */}
      <div className="corner-frame corner-tl"></div>
      <div className="corner-frame corner-tr"></div>
      <div className="corner-frame corner-bl"></div>
      <div className="corner-frame corner-br"></div>

      {/* Main Game Area */}
      <div className="hyperpoly-game-content">
        {!roomData.gameStarted ? (
          <div className="waiting-lobby">
            <div className="lobby-content">
              <h2>WAITING FOR PLAYERS</h2>
              <p className="room-code">Room Code: <span>{roomId}</span></p>
              
              <div className="players-waiting">
                <h3>Players ({roomData.players.length}/4)</h3>
                {roomData.players.map((player, index) => (
                  <div key={index} className="waiting-player">
                    <div 
                      className="player-avatar"
                      style={{ backgroundColor: getPlayerColor(index) }}
                    >
                      {player[0]}
                    </div>
                    <span>{player}</span>
                    {player === roomData.host && <span className="host-badge">HOST</span>}
                  </div>
                ))}
              </div>

              {roomData.host === username && roomData.players.length >= 2 && (
                <button onClick={startGame} className="btn-tech-primary">
                  <span className="btn-corner btn-corner-tl"></span>
                  <span className="btn-corner btn-corner-br"></span>
                  START GAME ({roomData.players.length} PLAYERS)
                </button>
              )}

              {roomData.host === username && roomData.players.length < 2 && (
                <p className="waiting-message">Waiting for at least 2 players...</p>
              )}

              {roomData.host !== username && (
                <p className="waiting-message">Waiting for host to start the game...</p>
              )}
            </div>
          </div>
        ) : (
          <div className="hyperpoly-layout">
            {/* Game Board */}
            <div className="hyperpoly-board-section">
              <GameBoard 
                board={gameState.board}
                players={gameState.players}
                currentPlayer={gameState.currentPlayer}
              />
            </div>

            {/* Side Panel */}
            <div className="hyperpoly-side-panel">
              <PlayerPanel 
                players={gameState.players} 
                currentPlayer={gameState.currentPlayer} 
              />
              
              {isMyTurn && (
                <ActionPanel
                  currentPlayer={currentPlayer}
                  onRollDice={handleRollDice}
                  onBuyProperty={handleBuyProperty}
                  onUpgradeProperty={handleUpgradeProperty}
                  onSkip={handleSkip}
                  diceRolling={false}
                  showAction={gameState.pendingAction}
                  gameState={gameState}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Game Over Modal */}
      {gameState?.gameOver && (
        <div className="game-over-modal">
          <div className="game-over-content">
            <h2>🏆 GAME OVER 🏆</h2>
            <div className="winner-info">
              <p className="winner-name">WINNER: {gameState.winner.name}</p>
              <p className="winner-worth">Net Worth: ${gameState.winner.netWorth}</p>
            </div>
            <div className="rankings">
              <h3>RANKINGS:</h3>
              {gameState.rankings.map((player, index) => (
                <div key={player.id} className="rank-item">
                  <span>{index + 1}. {player.name}</span>
                  <span>${player.netWorth} 💰</span>
                </div>
              ))}
            </div>
            <div className="game-over-actions">
              <button onClick={() => router.push('/hyperpoly')} className="btn-tech-primary">
                EXIT TO LOBBY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer */}
      <div className="tech-footer">
        <div className="tech-footer-content">
          <div className="tech-status">
            <span className="status-text">
              {roomData.gameStarted ? `TURN: ${gameState?.turnCount || 1}/50` : 'WAITING'}
            </span>
            <span className="status-version">PLAYER: {username}</span>
          </div>
          <div className="tech-render">
            <span className="render-text">◐ LIVE</span>
            <div className="render-dots">
              <div className="render-dot render-dot-1"></div>
              <div className="render-dot render-dot-2"></div>
              <div className="render-dot render-dot-3"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getPlayerColor(playerId) {
  const colors = ['#2196f3', '#f44336', '#4caf50', '#ff9800']
  return colors[playerId % colors.length]
}
