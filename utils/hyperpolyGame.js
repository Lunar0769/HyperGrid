// Game initialization and logic

const PROPERTY_TIERS = {
  low: { buyPrice: 60, rent: 6, upgradedRent: 30, upgradeCost: 50 },
  mid: { buyPrice: 100, rent: 12, upgradedRent: 60, upgradeCost: 80 },
  high: { buyPrice: 180, rent: 25, upgradedRent: 120, upgradeCost: 120 }
}

const CHANCE_CARDS = [
  { id: 1, type: 'positive', name: 'Bank Error', action: 'collect', amount: 100 },
  { id: 2, type: 'positive', name: 'Tax Refund', action: 'collect', amount: 75 },
  { id: 3, type: 'positive', name: 'Birthday', action: 'collectFromAll', amount: 20 },
  { id: 4, type: 'positive', name: 'Lottery', action: 'collect', amount: 150 },
  { id: 5, type: 'positive', name: 'Advance to GO', action: 'teleportGO' },
  { id: 6, type: 'positive', name: 'Free Upgrade', action: 'freeUpgrade' },
  { id: 7, type: 'positive', name: 'Rent Holiday', action: 'rentHoliday' },
  { id: 8, type: 'positive', name: 'Double Dice', action: 'rollAgain' },
  { id: 9, type: 'negative', name: 'Repairs', action: 'payPerUpgrade', amount: 40 },
  { id: 10, type: 'negative', name: 'Speeding Fine', action: 'pay', amount: 50 },
  { id: 11, type: 'negative', name: 'Go to Jail', action: 'goToJail' },
  { id: 12, type: 'negative', name: 'Property Tax', action: 'payPerProperty', amount: 30 },
  { id: 13, type: 'negative', name: 'Back 3 Spaces', action: 'moveBack', spaces: 3 },
  { id: 14, type: 'negative', name: 'Pay Each Player', action: 'payToAll', amount: 30 },
  { id: 15, type: 'negative', name: 'Downgrade', action: 'downgrade' },
  { id: 16, type: 'negative', name: 'Rent Double', action: 'doubleRent' }
]

export function initializeGame(playerCount) {
  const startingMoney = playerCount === 2 ? 500 : 400
  
  // Create players
  const players = Array.from({ length: playerCount }, (_, i) => ({
    id: i,
    name: i === 0 ? 'YOU' : `PLAYER ${i + 1}`,
    money: startingMoney,
    position: 0,
    properties: [],
    isAI: i !== 0,
    isBankrupt: false,
    rentHoliday: false,
    doubleRent: false
  }))

  // Create board (40 spaces)
  const board = createBoard()

  return {
    players,
    board,
    currentPlayer: 0,
    turnCount: 1,
    chanceCards: shuffleArray([...CHANCE_CARDS]),
    gameOver: false,
    winner: null,
    rankings: [],
    pendingAction: null
  }
}

function createBoard() {
  const board = []
  
  // Corner spaces
  board[0] = { type: 'go', name: 'GO' }
  board[10] = { type: 'jail', name: 'JAIL' }
  board[20] = { type: 'parking', name: 'FREE PARKING' }
  board[30] = { type: 'goToJail', name: 'GO TO JAIL' }

  // Properties (12 total)
  const propertyPositions = [1, 3, 6, 8, 11, 13, 16, 18, 21, 23, 26, 28]
  propertyPositions.forEach((pos, index) => {
    let tier
    if (index < 4) tier = 'low'
    else if (index < 8) tier = 'mid'
    else tier = 'high'
    
    board[pos] = {
      type: 'property',
      name: `Property ${index + 1}`,
      tier,
      ...PROPERTY_TIERS[tier],
      owner: null,
      upgraded: false
    }
  })

  // Chance spaces (8 total)
  const chancePositions = [2, 7, 12, 17, 22, 27, 32, 37]
  chancePositions.forEach(pos => {
    board[pos] = { type: 'chance', name: 'CHANCE' }
  })

  // Safe spaces (fill remaining)
  for (let i = 0; i < 40; i++) {
    if (!board[i]) {
      board[i] = { type: 'safe', name: 'SAFE' }
    }
  }

  return board
}

export function rollDice(gameState) {
  const dice1 = Math.floor(Math.random() * 6) + 1
  const dice2 = Math.floor(Math.random() * 6) + 1
  const total = dice1 + dice2

  const newState = { ...gameState }
  const player = newState.players[newState.currentPlayer]
  
  // Move player
  const oldPosition = player.position
  player.position = (player.position + total) % 40
  
  // Check if passed GO
  if (player.position < oldPosition) {
    player.money += 200
  }

  // Handle landing
  const space = newState.board[player.position]
  newState.pendingAction = handleLanding(newState, space, player)

  return newState
}

function handleLanding(gameState, space, player) {
  switch (space.type) {
    case 'go':
      player.money += 200
      return { type: 'info', message: 'Collected $200 from GO!' }
    
    case 'property':
      if (!space.owner) {
        return { 
          type: 'buy', 
          property: space,
          canAfford: player.money >= space.buyPrice
        }
      } else if (space.owner === player.id) {
        if (!space.upgraded && player.money >= space.upgradeCost) {
          return {
            type: 'upgrade',
            property: space,
            canAfford: true
          }
        }
      } else {
        const rent = space.upgraded ? space.upgradedRent : space.rent
        const finalRent = player.doubleRent ? rent * 2 : rent
        player.money -= finalRent
        gameState.players[space.owner].money += finalRent
        player.doubleRent = false
        return { type: 'info', message: `Paid $${finalRent} rent!` }
      }
      break
    
    case 'chance':
      return { type: 'chance' }
    
    case 'goToJail':
      player.position = 10
      return { type: 'info', message: 'Sent to JAIL!' }
    
    case 'parking':
      return { type: 'info', message: 'Free Parking - Rest!' }
  }
  
  return null
}

export function buyProperty(gameState) {
  const newState = { ...gameState }
  const player = newState.players[newState.currentPlayer]
  const space = newState.board[player.position]
  
  if (space.type === 'property' && !space.owner && player.money >= space.buyPrice) {
    player.money -= space.buyPrice
    space.owner = player.id
    player.properties.push(player.position)
  }
  
  newState.pendingAction = null
  return advanceTurn(newState)
}

export function upgradeProperty(gameState) {
  const newState = { ...gameState }
  const player = newState.players[newState.currentPlayer]
  const space = newState.board[player.position]
  
  if (space.type === 'property' && space.owner === player.id && !space.upgraded) {
    if (player.money >= space.upgradeCost) {
      player.money -= space.upgradeCost
      space.upgraded = true
    }
  }
  
  newState.pendingAction = null
  return advanceTurn(newState)
}

export function drawChanceCard(gameState) {
  const newState = { ...gameState }
  
  if (newState.chanceCards.length === 0) {
    newState.chanceCards = shuffleArray([...CHANCE_CARDS])
  }
  
  const card = newState.chanceCards.pop()
  const player = newState.players[newState.currentPlayer]
  
  // Execute card action
  executeChanceCard(newState, card, player)
  
  newState.pendingAction = null
  return advanceTurn(newState)
}

function executeChanceCard(gameState, card, player) {
  switch (card.action) {
    case 'collect':
      player.money += card.amount
      break
    case 'pay':
      player.money -= card.amount
      break
    case 'collectFromAll':
      gameState.players.forEach(p => {
        if (p.id !== player.id && !p.isBankrupt) {
          p.money -= card.amount
          player.money += card.amount
        }
      })
      break
    case 'payToAll':
      gameState.players.forEach(p => {
        if (p.id !== player.id && !p.isBankrupt) {
          player.money -= card.amount
          p.money += card.amount
        }
      })
      break
    case 'teleportGO':
      player.position = 0
      player.money += 200
      break
    case 'goToJail':
      player.position = 10
      break
    case 'rentHoliday':
      player.rentHoliday = true
      break
    case 'doubleRent':
      player.doubleRent = true
      break
    case 'payPerProperty':
      player.money -= card.amount * player.properties.length
      break
    case 'payPerUpgrade':
      const upgradedCount = player.properties.filter(pos => 
        gameState.board[pos].upgraded
      ).length
      player.money -= card.amount * upgradedCount
      break
  }
}

function advanceTurn(gameState) {
  const newState = { ...gameState }
  
  // Check for bankruptcy
  const player = newState.players[newState.currentPlayer]
  if (player.money < 0) {
    player.isBankrupt = true
    // Return properties to bank
    player.properties.forEach(pos => {
      newState.board[pos].owner = null
      newState.board[pos].upgraded = false
    })
  }
  
  // Check win conditions
  const activePlayers = newState.players.filter(p => !p.isBankrupt)
  if (activePlayers.length === 1) {
    return endGame(newState, 'elimination')
  }
  
  if (newState.turnCount >= 50) {
    return endGame(newState, 'turnLimit')
  }
  
  // Check monopoly win
  if (player.properties.length >= 8) {
    return endGame(newState, 'monopoly')
  }
  
  // Next player
  newState.currentPlayer = (newState.currentPlayer + 1) % newState.players.length
  newState.turnCount++
  
  // Skip bankrupt players
  while (newState.players[newState.currentPlayer].isBankrupt) {
    newState.currentPlayer = (newState.currentPlayer + 1) % newState.players.length
  }
  
  return newState
}

function endGame(gameState, reason) {
  const newState = { ...gameState }
  newState.gameOver = true
  
  // Calculate net worth
  const rankings = newState.players.map(player => {
    let netWorth = player.money
    player.properties.forEach(pos => {
      const prop = newState.board[pos]
      netWorth += prop.buyPrice
      if (prop.upgraded) netWorth += prop.upgradeCost
    })
    return { ...player, netWorth }
  }).sort((a, b) => b.netWorth - a.netWorth)
  
  newState.winner = rankings[0]
  newState.rankings = rankings
  
  return newState
}

function shuffleArray(array) {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}
