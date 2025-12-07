export default function ActionPanel({ 
  currentPlayer, 
  onRollDice, 
  onBuyProperty, 
  onUpgradeProperty, 
  onSkip,
  diceRolling,
  showAction,
  gameState
}) {
  return (
    <div className="action-panel">
      <div className="panel-header">
        <div className="deco-line-short"></div>
        <span className="panel-title">ACTIONS</span>
        <div className="deco-line-short"></div>
      </div>

      {!currentPlayer.isAI && (
        <div className="action-buttons">
          {!showAction && !diceRolling && (
            <button 
              onClick={onRollDice}
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
              <p className="property-rent">Rent: ${showAction.property.rent} → ${showAction.property.upgradedRent}</p>
              <div className="popup-actions">
                <button 
                  onClick={onBuyProperty}
                  className="action-btn action-btn-success"
                  disabled={!showAction.canAfford}
                >
                  BUY ${showAction.property.buyPrice}
                </button>
                <button 
                  onClick={onSkip}
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
              <p className="property-rent">Rent: ${showAction.property.rent} → ${showAction.property.upgradedRent}</p>
              <div className="popup-actions">
                <button 
                  onClick={onUpgradeProperty}
                  className="action-btn action-btn-success"
                  disabled={!showAction.canAfford}
                >
                  UPGRADE ${showAction.property.upgradeCost}
                </button>
                <button 
                  onClick={onSkip}
                  className="action-btn action-btn-secondary"
                >
                  SKIP
                </button>
              </div>
            </div>
          )}

          {showAction && showAction.type === 'info' && (
            <div className="action-popup">
              <p className="info-message">{showAction.message}</p>
              <button 
                onClick={onSkip}
                className="action-btn action-btn-primary"
              >
                CONTINUE
              </button>
            </div>
          )}

          {showAction && showAction.type === 'chance' && (
            <div className="action-popup">
              <h3>🎴 CHANCE CARD</h3>
              <button 
                onClick={() => {
                  const newState = require('../../utils/hyperpolyGame').drawChanceCard(gameState)
                  // This would need to be handled differently in actual implementation
                }}
                className="action-btn action-btn-primary"
              >
                DRAW CARD
              </button>
            </div>
          )}
        </div>
      )}

      {currentPlayer.isAI && (
        <div className="ai-turn">
          <div className="ai-thinking">
            <div className="ai-avatar" style={{ backgroundColor: getPlayerColor(currentPlayer.id) }}>
              {currentPlayer.name[0]}
            </div>
            <p>AI is thinking...</p>
          </div>
        </div>
      )}
    </div>
  )
}

function getPlayerColor(playerId) {
  const colors = ['#2196f3', '#f44336', '#4caf50', '#ff9800']
  return colors[playerId % colors.length]
}
