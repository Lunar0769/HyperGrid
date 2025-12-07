import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import ParticleBackground from '../../components/ParticleBackground'
import GameBoard from '../../components/hyperpoly/GameBoard'
import PlayerPanel from '../../components/hyperpoly/PlayerPanel'
import ActionPanel from '../../components/hyperpoly/ActionPanel'
import { initializeGame, rollDice, buyProperty, upgradeProperty, drawChanceCard } from '../../utils/hyperpolyGame'

export default function HyperPolyGame() {
  const router = useRouter()
  const { players } = router.query
  
  const [gameState, setGameState] = useState(null)
  const [diceRolling, setDiceRolling] = useState(false)
  const [showAction, setShowAction] = useState(null)

  useEffect(() => {
    if (players) {
      const initialState = initializeGame(parseInt(players))
      setGameState(initialState)
    }
  }, [players])

  const handleRollDice = () => {
    if (!gameState || diceRolling) return
    
    setDiceRolling(true)
    setTimeout(() => {
      const newState = rollDice(gameState)
      setGameState(newState)
      setDiceRolling(false)
      
      // Show action popup if needed
      if (newState.pendingAction) {
        setShowAction(newState.pendingAction)
      }
    }, 1000)
  }

  const handleBuyProperty = () => {
    const newState = buyProperty(gameState)
    setGameState(newState)
    setShowAction(null)
  }

  const handleUpgradeProperty = () => {
    const newState = upgradeProperty(gameState)
    setGameState(newState)
    setShowAction(null)
  }

  const handleSkip = () => {
    setShowAction(null)
    // Move to next player
    const newState = {
      ...gameState,
      currentPlayer: (gameState.currentPlayer + 1) % gameState.players.length,
      turnCount: gameState.turnCount + 1
    }
    setGameState(newState)
  }

  if (!gameState) {
    return <div className="loading-screen">Loading...</div>
  }

  const currentPlayer = gameState.players[gameState.currentPlayer]
  const isGameOver = gameState.gameOver

  return (
    <div className="hyperpoly-container">
      <ParticleBackground />

      {/* Top Header */}
      <div className="tech-header">
        <div className="tech-header-content">
          <div className="tech-logo">
            <div className="tech-logo-text">HYPERPOLY</div>
            <div className="tech-divider"></div>
            <span className="tech-est">TURN: {gameState.turnCount}/50</span>
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
            <PlayerPanel players={gameState.players} currentPlayer={gameState.currentPlayer} />
            
            <ActionPanel
              currentPlayer={currentPlayer}
              onRollDice={handleRollDice}
              onBuyProperty={handleBuyProperty}
              onUpgradeProperty={handleUpgradeProperty}
              onSkip={handleSkip}
              diceRolling={diceRolling}
              showAction={showAction}
              gameState={gameState}
            />
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
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
              <button onClick={() => router.reload()} className="btn-tech-primary">
                PLAY AGAIN
              </button>
              <button onClick={() => router.push('/hyperpoly')} className="btn-tech-secondary">
                EXIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer */}
      <div className="tech-footer">
        <div className="tech-footer-content">
          <div className="tech-status">
            <span className="status-text">GAME.ACTIVE</span>
            <span className="status-version">PLAYER: {currentPlayer.name}</span>
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
