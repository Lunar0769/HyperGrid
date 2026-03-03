import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { io } from 'socket.io-client'
import ParticleBackground from '../../../components/ParticleBackground'
import GameBoard from '../../../components/hyperpoly/GameBoard'
import PlayerPanel from '../../../components/hyperpoly/PlayerPanel'
import ConnectionLoader from '../../../components/ConnectionLoader'
import { initializeGame, rollDice, buyProperty, upgradeProperty, drawCard } from '../../../utils/hyperpolyGame'

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
    
    console.log('Rolling dice for player:', currentPlayer.name, 'at position:', currentPlayer.position)
    setDiceRolling(true)
    
    // Roll dice immediately
    const newState = rollDice(gameState)
    console.log('After roll - New position:', newState.players[newState.currentPlayer].position)
    console.log('Dice roll:', newState.players[newState.currentPlayer].lastDiceRoll)
    console.log('Pending action:', newState.pendingAction)
    
    // Update local state first for immediate feedback
    setGameState(newState)
    
    // Broadcast to other players
    socket.emit('hyperpolyGameUpdate', {
      roomId,
      gameState: newState
    })
    
    // Handle pending actions
    if (newState.pendingAction) {
      setShowAction(newState.pendingAction)
    }
    
    // Stop dice rolling animation
    setTimeout(() => {
      setDiceRolling(false)
    }, 800)
  }

  const handleBuyProperty = () => {
    if (!socket) return
    const newState = buyProperty(gameState)
    newState.pendingAction = null
    
    // Advance turn if no extra turn
    if (!newState.extraTurn) {
      do {
        newState.currentPlayer = (newState.currentPlayer + 1) % newState.players.length
      } while (newState.players[newState.currentPlayer].isBankrupt)
      newState.turnCount++
    } else {
      newState.extraTurn = false
    }
    
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
    
    // Determine card type from pending action
    const cardType = showAction?.type === 'chance' ? 'chance' : 'community'
    const newState = drawCard(gameState, cardType)
    
    // Advance turn if no extra turn
    if (!newState.extraTurn) {
      do {
        newState.currentPlayer = (newState.currentPlayer + 1) % newState.players.length
      } while (newState.players[newState.currentPlayer].isBankrupt)
      newState.turnCount++
    } else {
      newState.extraTurn = false
    }
    
    setGameState(newState)
    setShowAction(null)

    // Broadcast to other players
    socket.emit('hyperpolyGameUpdate', {
      roomId,
      gameState: newState
    })
  }

  const handlePayJailFine = () => {
    if (!socket) return
    const newState = { ...gameState }
    const player = newState.players[newState.currentPlayer]
    
    if (player.money >= 50) {
      player.money -= 50
      player.inJail = false
      player.jailTurns = 0
      setGameState(newState)
      setShowAction(null)

      // Broadcast to other players
      socket.emit('hyperpolyGameUpdate', {
        roomId,
        gameState: newState
      })
    }
  }

  const handleUseJailCard = () => {
    if (!socket) return
    const newState = { ...gameState }
    const player = newState.players[newState.currentPlayer]
    
    if (player.getOutOfJailCards > 0) {
      player.getOutOfJailCards--
      player.inJail = false
      player.jailTurns = 0
      setGameState(newState)
      setShowAction(null)

      // Broadcast to other players
      socket.emit('hyperpolyGameUpdate', {
        roomId,
        gameState: newState
      })
    }
  }

  const handleSkip = () => {
    if (!socket) return
    
    const newState = { ...gameState }
    newState.pendingAction = null
    
    // Clear extra turn flag if it exists
    if (newState.extraTurn) {
      newState.extraTurn = false
    } else {
      // Move to next player (skip bankrupted players)
      do {
        newState.currentPlayer = (newState.currentPlayer + 1) % newState.players.length
      } while (newState.players[newState.currentPlayer].isBankrupt)
      
      newState.turnCount++
    }
    
    setGameState(newState)
    setShowAction(null)

    // Broadcast to other players
    socket.emit('hyperpolyGameUpdate', {
      roomId,
      gameState: newState
    })
  }

  // Helper function to calculate net worth
  const calculateNetWorth = (gameState, player) => {
    let netWorth = player.money
    
    gameState.board.forEach(space => {
      if (space.owner === player.id) {
        if (space.type === 'property') {
          netWorth += space.buyPrice
          netWorth += space.houses * space.upgradeCost
        } else if (space.type === 'railroad' || space.type === 'utility') {
          netWorth += space.buyPrice
        }
      }
    })
    
    return netWorth
  }

  if (!roomId || !username) {
    return <ConnectionLoader message="Loading room..." />
  }

  if (!connected) {
    return <ConnectionLoader message="Connecting to server..." />
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
                    {gameState?.extraTurn && (
                      <div className="extra-turn-notice">
                        <h3>🎲 DOUBLES! ROLL AGAIN!</h3>
                      </div>
                    )}

                    {currentPlayer?.lastDiceRoll && currentPlayer.lastDiceRoll[0] > 0 && (
                      <div className="last-dice-roll">
                        <span>Last Roll: </span>
                        <span className="dice-display">
                          🎲 {currentPlayer.lastDiceRoll[0]} + {currentPlayer.lastDiceRoll[1]} = {currentPlayer.lastDiceRoll[0] + currentPlayer.lastDiceRoll[1]}
                        </span>
                        {currentPlayer.lastDiceRoll[0] === currentPlayer.lastDiceRoll[1] && (
                          <span className="doubles-indicator"> (DOUBLES!)</span>
                        )}
                      </div>
                    )}

                    {currentPlayer?.inJail && (
                      <div className="jail-actions">
                        <h3>🔒 IN JAIL</h3>
                        <p>Turns in jail: {currentPlayer.jailTurns}/3</p>
                        <div className="jail-options">
                          <button 
                            onClick={handlePayJailFine}
                            className="action-btn action-btn-warning"
                            disabled={currentPlayer.money < 50}
                          >
                            PAY $50 FINE
                          </button>
                          {currentPlayer.getOutOfJailCards > 0 && (
                            <button 
                              onClick={handleUseJailCard}
                              className="action-btn action-btn-success"
                            >
                              USE GET OUT OF JAIL CARD
                            </button>
                          )}
                          <button 
                            onClick={handleRollDice}
                            className="action-btn action-btn-primary"
                            disabled={diceRolling}
                          >
                            🎲 ROLL FOR DOUBLES
                          </button>
                        </div>
                      </div>
                    )}

                    {!currentPlayer?.inJail && !showAction && !diceRolling && (
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

                    {showAction && (showAction.type === 'chance' || showAction.type === 'community') && (
                      <div className="action-popup">
                        <h3>{showAction.type === 'chance' ? '🎴 CHANCE CARD' : '📦 COMMUNITY CHEST'}</h3>
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
