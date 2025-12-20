import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { io } from 'socket.io-client'
import ParticleBackground from '../../../components/ParticleBackground'
import GameBoard from '../../../components/hyperpoly/GameBoard'
import PlayerPanel from '../../../components/hyperpoly/PlayerPanel'
import { initializeGame, rollDice, buyProperty, upgradeProperty, drawChanceCard } from '../../../utils/hyperpolyGame'

export default function HyperPolyRoom() {
  const router = useRouter()
  const { roomId, username, host } = router.query

  const [socket, setSocket] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [roomData, setRoomData] = useState({
    players: [],
    host: null,
    gameStarted: false,
    playerCount: 0
  })
  const [diceRolling, setDiceRolling] = useState(false)
  const [showAction, setShowAction] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!roomId || !username) return

    // Use deployed Render backend
    const socketUrl = 'https://hypergrid-u9d2.onrender.com'
    
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    })

    newSocket.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
      // Join the HyperPoly room
      newSocket.emit('joinHyperPolyRoom', {
        roomId,
        username,
        isHost: host === 'true'
      })
    })

    newSocket.on('hyperpolyRoomUpdate', (data) => {
      console.log('Room update:', data)
      setRoomData(data)
    })

    newSocket.on('hyperpolyGameStarted', (initialGameState) => {
      console.log('Game started:', initialGameState)
      setGameState(initialGameState)
      setRoomData(prev => ({ ...prev, gameStarted: true }))
    })

    newSocket.on('hyperpolyGameStateUpdate', (newGameState) => {
      console.log('Game state update:', newGameState)
      setGameState(newGameState)
      setDiceRolling(false)
      setShowAction(newGameState.pendingAction)
    })

    newSocket.on('hyperpolyPlayerAction', ({ action, data }) => {
      console.log('Player action:', action, data)
      // Handle other player actions if needed
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    newSocket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [roomId, username, host])

  const startGame = () => {
    if (roomData.host === username && roomData.playerCount >= 2 && socket) {
      const playerCount = Math.min(roomData.playerCount, 4) // Max 4 players
      const initialState = initializeGame(playerCount)
      
      // Update player names with real players (no AI for multiplayer)
      initialState.players = initialState.players.map((player, index) => ({
        ...player,
        name: roomData.players[index] || player.name,
        isAI: false // All players are human in multiplayer
      }))
      
      socket.emit('startHyperPolyGame', {
        roomId,
        gameState: initialState
      })
    }
  }

  const handleRollDice = () => {
    if (!gameState || diceRolling || !socket) return
    
    const currentPlayer = gameState.players[gameState.currentPlayer]
    if (currentPlayer.name !== username) return // Not your turn
    
    setDiceRolling(true)
    setTimeout(() => {
      const newState = rollDice(gameState)
      setGameState(newState)
      setDiceRolling(false)
      
      if (newState.pendingAction) {
        setShowAction(newState.pendingAction)
      }

      // Broadcast game state to other players
      socket.emit('hyperpolyGameUpdate', {
        roomId,
        gameState: newState
      })
    }, 1000)
  }

  const handleBuyProperty = () => {
    if (!socket) return
    const newState = buyProperty(gameState)
    setGameState(newState)
    setShowAction(null)

    // Broadcast to other players
    socket.emit('hyperpolyGameUpdate', {
      roomId,
      gameState: newState
    })
  }

  const handleUpgradeProperty = () => {
    if (!socket) return
    const newState = upgradeProperty(gameState)
    setGameState(newState)
    setShowAction(null)

    // Broadcast to other players
    socket.emit('hyperpolyGameUpdate', {
      roomId,
      gameState: newState
    })
  }

  const handleDrawChance = () => {
    if (!socket) return
    const newState = drawChanceCard(gameState)
    setGameState(newState)
    setShowAction(null)

    // Broadcast to other players
    socket.emit('hyperpolyGameUpdate', {
      roomId,
      gameState: newState
    })
  }

  const handleSkip = () => {
    if (!socket) return
    setShowAction(null)
    const newState = {
      ...gameState,
      currentPlayer: (gameState.currentPlayer + 1) % gameState.players.length,
      turnCount: gameState.turnCount + 1,
      pendingAction: null
    }
    setGameState(newState)

    // Broadcast to other players
    socket.emit('hyperpolyGameUpdate', {
      roomId,
      gameState: newState
    })
  }

  if (!roomId || !username) {
    return <div className="loading-screen">Loading...</div>
  }

  if (!connected) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h2>Connecting to server...</h2>
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  const currentPlayer = gameState?.players[gameState.currentPlayer]
  const isMyTurn = currentPlayer?.name === username
  const isGameOver = gameState?.gameOver

  return (
    <div className="hyperpoly-container">
      <ParticleBackground />

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

      <div className="corner-frame corner-tl"></div>
      <div className="corner-frame corner-tr"></div>
      <div className="corner-frame corner-bl"></div>
      <div className="corner-frame corner-br"></div>

      <div className="hyperpoly-game-content">
        {!roomData.gameStarted ? (
          <div className="waiting-lobby">
            <div className="lobby-content">
              <h2>READY TO PLAY</h2>
              <p className="room-code">Room Code: <span>{roomId}</span></p>
              
              <div className="players-waiting">
                <h3>Players ({roomData.playerCount}/4)</h3>
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

              <div className="waiting-message">
                {roomData.playerCount < 2 
                  ? "Waiting for more players to join..." 
                  : "Ready to start! Minimum 2 players required."
                }
              </div>

              {roomData.host === username && roomData.playerCount >= 2 && (
                <button onClick={startGame} className="btn-tech-primary">
                  START GAME
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="hyperpoly-layout">
            <div className="hyperpoly-board-section">
              <GameBoard 
                board={gameState.board}
                players={gameState.players}
                currentPlayer={gameState.currentPlayer}
              />
            </div>

            <div className="hyperpoly-side-panel">
              <PlayerPanel 
                players={gameState.players} 
                currentPlayer={gameState.currentPlayer} 
              />
              
              {isMyTurn && !currentPlayer?.isAI && (
                <div className="action-panel">
                  <div className="panel-header">
                    <div className="deco-line-short"></div>
                    <span className="panel-title">ACTIONS</span>
                    <div className="deco-line-short"></div>
                  </div>

                  <div className="action-buttons">
                    {!showAction && !diceRolling && (
                      <button 
                        onClick={handleRollDice}
                        className="action-btn action-btn-primary"
                      >
                        <span className="btn-corner btn-corner-tl"></span>
                        <span className="btn-corner btn-corner-br"></span>
                        🎲 ROLL DICE
                      </button>
                    )}

                    {diceRolling && (
                      <div className="dice-rolling">
                        <div className="dice-animation">🎲</div>
                        <span>Rolling...</span>
                      </div>
                    )}

                    {showAction && showAction.type === 'buy' && (
                      <div className="action-popup">
                        <h3>BUY PROPERTY?</h3>
                        <p className="property-name">{showAction.property.name}</p>
                        <p className="property-price">Price: ${showAction.property.buyPrice}</p>
                        <div className="popup-actions">
                          <button 
                            onClick={handleBuyProperty}
                            className="action-btn action-btn-success"
                            disabled={!showAction.canAfford}
                          >
                            BUY
                          </button>
                          <button 
                            onClick={handleSkip}
                            className="action-btn action-btn-secondary"
                          >
                            SKIP
                          </button>
                        </div>
                      </div>
                    )}

                    {showAction && showAction.type === 'upgrade' && (
                      <div className="action-popup">
                        <h3>UPGRADE PROPERTY?</h3>
                        <p className="property-name">{showAction.property.name}</p>
                        <p className="property-price">Cost: ${showAction.property.upgradeCost}</p>
                        <div className="popup-actions">
                          <button 
                            onClick={handleUpgradeProperty}
                            className="action-btn action-btn-success"
                          >
                            UPGRADE
                          </button>
                          <button 
                            onClick={handleSkip}
                            className="action-btn action-btn-secondary"
                          >
                            SKIP
                          </button>
                        </div>
                      </div>
                    )}

                    {showAction && showAction.type === 'chance' && (
                      <div className="action-popup">
                        <h3>🎴 CHANCE CARD</h3>
                        <button 
                          onClick={handleDrawChance}
                          className="action-btn action-btn-primary"
                        >
                          DRAW CARD
                        </button>
                      </div>
                    )}

                    {showAction && showAction.type === 'info' && (
                      <div className="action-popup">
                        <p className="info-message">{showAction.message}</p>
                        <button 
                          onClick={handleSkip}
                          className="action-btn action-btn-primary"
                        >
                          CONTINUE
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isGameOver && (
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
