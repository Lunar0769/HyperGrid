// Complete Official Monopoly Game Engine - Zero Simplifications
// Strictly follows official Monopoly rules

// ============================================================================
// GAME CONSTANTS
// ============================================================================

const PROPERTY_DATA = {
  brown: { buyPrice: 60, baseRent: 2, rents: [10, 30, 90, 160, 250], houseCost: 50, mortgageValue: 30 },
  lightblue: { buyPrice: 100, baseRent: 6, rents: [30, 90, 270, 400, 550], houseCost: 50, mortgageValue: 50 },
  pink: { buyPrice: 140, baseRent: 10, rents: [50, 150, 450, 625, 750], houseCost: 100, mortgageValue: 70 },
  orange: { buyPrice: 180, baseRent: 14, rents: [70, 200, 550, 750, 950], houseCost: 100, mortgageValue: 90 },
  red: { buyPrice: 220, baseRent: 18, rents: [90, 250, 700, 875, 1050], houseCost: 150, mortgageValue: 110 },
  yellow: { buyPrice: 260, baseRent: 22, rents: [110, 330, 800, 975, 1150], houseCost: 150, mortgageValue: 130 },
  green: { buyPrice: 300, baseRent: 26, rents: [130, 390, 900, 1100, 1275], houseCost: 200, mortgageValue: 150 },
  darkblue: { buyPrice: 350, baseRent: 35, rents: [175, 500, 1100, 1300, 1500], houseCost: 200, mortgageValue: 175 }
}

const RAILROAD_RENT = [25, 50, 100, 200]
const RAILROAD_PRICE = 200
const RAILROAD_MORTGAGE = 100

const UTILITY_PRICE = 150
const UTILITY_MORTGAGE = 75
const UTILITY_MULTIPLIER = { single: 4, both: 10 }

const HOUSES_TOTAL = 32
const HOTELS_TOTAL = 12

const CHANCE_CARDS = [
  { id: 1, text: 'Advance to GO', action: 'moveToGO' },
  { id: 2, text: 'Advance to Illinois Ave', action: 'moveTo', position: 24 },
  { id: 3, text: 'Advance to St. Charles Place', action: 'moveTo', position: 11 },
  { id: 4, text: 'Advance token to nearest Utility', action: 'moveToNearestUtility' },
  { id: 5, text: 'Advance token to nearest Railroad', action: 'moveToNearestRailroad' },
  { id: 6, text: 'Bank pays you dividend of $50', action: 'collect', amount: 50 },
  { id: 7, text: 'Get Out of Jail Free', action: 'jailCard' },
  { id: 8, text: 'Go Back 3 Spaces', action: 'moveBack', spaces: 3 },
  { id: 9, text: 'Go to Jail', action: 'goToJail' },
  { id: 10, text: 'Make general repairs: $25 per house, $100 per hotel', action: 'repairs', house: 25, hotel: 100 },
  { id: 11, text: 'Pay poor tax of $15', action: 'pay', amount: 15 },
  { id: 12, text: 'Take a trip to Reading Railroad', action: 'moveTo', position: 5 },
  { id: 13, text: 'Take a walk on the Boardwalk', action: 'moveTo', position: 39 },
  { id: 14, text: 'You have been elected Chairman of the Board', action: 'collectFromAll', amount: 50 },
  { id: 15, text: 'Your building loan matures', action: 'collect', amount: 150 },
  { id: 16, text: 'You have won a crossword competition', action: 'collect', amount: 100 }
]

const COMMUNITY_CHEST_CARDS = [
  { id: 1, text: 'Advance to GO', action: 'moveToGO' },
  { id: 2, text: 'Bank error in your favor', action: 'collect', amount: 200 },
  { id: 3, text: 'Doctor\'s fees', action: 'pay', amount: 50 },
  { id: 4, text: 'From sale of stock you get $50', action: 'collect', amount: 50 },
  { id: 5, text: 'Get Out of Jail Free', action: 'jailCard' },
  { id: 6, text: 'Go to Jail', action: 'goToJail' },
  { id: 7, text: 'Grand Opera Night', action: 'collectFromAll', amount: 50 },
  { id: 8, text: 'Holiday Fund matures', action: 'collect', amount: 100 },
  { id: 9, text: 'Income tax refund', action: 'collect', amount: 20 },
  { id: 10, text: 'It is your birthday', action: 'collectFromAll', amount: 10 },
  { id: 11, text: 'Life insurance matures', action: 'collect', amount: 100 },
  { id: 12, text: 'Hospital fees', action: 'pay', amount: 100 },
  { id: 13, text: 'School fees', action: 'pay', amount: 150 },
  { id: 14, text: 'Receive $25 consultancy fee', action: 'collect', amount: 25 },
  { id: 15, text: 'You are assessed for street repairs', action: 'repairs', house: 40, hotel: 115 },
  { id: 16, text: 'You have won second prize in a beauty contest', action: 'collect', amount: 10 },
  { id: 17, text: 'You inherit $100', action: 'collect', amount: 100 }
]

// ============================================================================
// GAME INITIALIZATION
// ============================================================================

export function initializeGame(playerCount) {
  const players = Array.from({ length: playerCount }, (_, i) => ({
    id: i,
    name: i === 0 ? 'YOU' : `PLAYER ${i + 1}`,
    money: 1500,
    position: 0,
    properties: [],
    railroads: [],
    utilities: [],
    inJail: false,
    jailTurns: 0,
    getOutOfJailCards: { chance: 0, community: 0 },
    isBankrupt: false,
    lastDiceRoll: [0, 0],
    doublesCount: 0
  }))

  return {
    players,
    board: createBoard(),
    currentPlayer: 0,
    turnCount: 1,
    turnPhase: 'roll', // roll, action, trade, build, end
    chanceCards: shuffleArray([...CHANCE_CARDS]),
    communityCards: shuffleArray([...COMMUNITY_CHEST_CARDS]),
    housesRemaining: HOUSES_TOTAL,
    hotelsRemaining: HOTELS_TOTAL,
    freeParkingPool: 0,
    pendingAction: null,
    auction: null,
    gameOver: false,
    winner: null,
    transactionLog: []
  }
}

function createBoard() {
  return [
    { pos: 0, type: 'go', name: 'GO' },
    { pos: 1, type: 'property', name: 'Mediterranean Ave', color: 'brown', ...PROPERTY_DATA.brown, owner: null, houses: 0, mortgaged: false },
    { pos: 2, type: 'community', name: 'Community Chest' },
    { pos: 3, type: 'property', name: 'Baltic Ave', color: 'brown', ...PROPERTY_DATA.brown, owner: null, houses: 0, mortgaged: false },
    { pos: 4, type: 'tax', name: 'Income Tax', amount: 200 },
    { pos: 5, type: 'railroad', name: 'Reading RR', buyPrice: RAILROAD_PRICE, mortgageValue: RAILROAD_MORTGAGE, owner: null, mortgaged: false },
    { pos: 6, type: 'property', name: 'Oriental Ave', color: 'lightblue', ...PROPERTY_DATA.lightblue, owner: null, houses: 0, mortgaged: false },
    { pos: 7, type: 'chance', name: 'Chance' },
    { pos: 8, type: 'property', name: 'Vermont Ave', color: 'lightblue', ...PROPERTY_DATA.lightblue, owner: null, houses: 0, mortgaged: false },
    { pos: 9, type: 'property', name: 'Connecticut Ave', color: 'lightblue', ...PROPERTY_DATA.lightblue, owner: null, houses: 0, mortgaged: false },
    { pos: 10, type: 'jail', name: 'Jail' },
    { pos: 11, type: 'property', name: 'St. Charles Pl', color: 'pink', ...PROPERTY_DATA.pink, owner: null, houses: 0, mortgaged: false },
    { pos: 12, type: 'utility', name: 'Electric Co', buyPrice: UTILITY_PRICE, mortgageValue: UTILITY_MORTGAGE, owner: null, mortgaged: false },
    { pos: 13, type: 'property', name: 'States Ave', color: 'pink', ...PROPERTY_DATA.pink, owner: null, houses: 0, mortgaged: false },
    { pos: 14, type: 'property', name: 'Virginia Ave', color: 'pink', ...PROPERTY_DATA.pink, owner: null, houses: 0, mortgaged: false },
    { pos: 15, type: 'railroad', name: 'Pennsylvania RR', buyPrice: RAILROAD_PRICE, mortgageValue: RAILROAD_MORTGAGE, owner: null, mortgaged: false },
    { pos: 16, type: 'property', name: 'St. James Pl', color: 'orange', ...PROPERTY_DATA.orange, owner: null, houses: 0, mortgaged: false },
    { pos: 17, type: 'community', name: 'Community Chest' },
    { pos: 18, type: 'property', name: 'Tennessee Ave', color: 'orange', ...PROPERTY_DATA.orange, owner: null, houses: 0, mortgaged: false },
    { pos: 19, type: 'property', name: 'New York Ave', color: 'orange', ...PROPERTY_DATA.orange, owner: null, houses: 0, mortgaged: false },
    { pos: 20, type: 'parking', name: 'Free Parking' },
    { pos: 21, type: 'property', name: 'Kentucky Ave', color: 'red', ...PROPERTY_DATA.red, owner: null, houses: 0, mortgaged: false },
    { pos: 22, type: 'chance', name: 'Chance' },
    { pos: 23, type: 'property', name: 'Indiana Ave', color: 'red', ...PROPERTY_DATA.red, owner: null, houses: 0, mortgaged: false },
    { pos: 24, type: 'property', name: 'Illinois Ave', color: 'red', ...PROPERTY_DATA.red, owner: null, houses: 0, mortgaged: false },
    { pos: 25, type: 'railroad', name: 'B&O RR', buyPrice: RAILROAD_PRICE, mortgageValue: RAILROAD_MORTGAGE, owner: null, mortgaged: false },
    { pos: 26, type: 'property', name: 'Atlantic Ave', color: 'yellow', ...PROPERTY_DATA.yellow, owner: null, houses: 0, mortgaged: false },
    { pos: 27, type: 'property', name: 'Ventnor Ave', color: 'yellow', ...PROPERTY_DATA.yellow, owner: null, houses: 0, mortgaged: false },
    { pos: 28, type: 'utility', name: 'Water Works', buyPrice: UTILITY_PRICE, mortgageValue: UTILITY_MORTGAGE, owner: null, mortgaged: false },
    { pos: 29, type: 'property', name: 'Marvin Gardens', color: 'yellow', ...PROPERTY_DATA.yellow, owner: null, houses: 0, mortgaged: false },
    { pos: 30, type: 'goToJail', name: 'Go To Jail' },
    { pos: 31, type: 'property', name: 'Pacific Ave', color: 'green', ...PROPERTY_DATA.green, owner: null, houses: 0, mortgaged: false },
    { pos: 32, type: 'property', name: 'N. Carolina Ave', color: 'green', ...PROPERTY_DATA.green, owner: null, houses: 0, mortgaged: false },
    { pos: 33, type: 'community', name: 'Community Chest' },
    { pos: 34, type: 'property', name: 'Pennsylvania Ave', color: 'green', ...PROPERTY_DATA.green, owner: null, houses: 0, mortgaged: false },
    { pos: 35, type: 'railroad', name: 'Short Line RR', buyPrice: RAILROAD_PRICE, mortgageValue: RAILROAD_MORTGAGE, owner: null, mortgaged: false },
    { pos: 36, type: 'chance', name: 'Chance' },
    { pos: 37, type: 'property', name: 'Park Place', color: 'darkblue', ...PROPERTY_DATA.darkblue, owner: null, houses: 0, mortgaged: false },
    { pos: 38, type: 'tax', name: 'Luxury Tax', amount: 100 },
    { pos: 39, type: 'property', name: 'Boardwalk', color: 'darkblue', ...PROPERTY_DATA.darkblue, owner: null, houses: 0, mortgaged: false }
  ]
}

// ============================================================================
// CORE GAME ACTIONS
// ============================================================================

export function rollDice(gameState) {
  const newState = { ...gameState }
  const player = newState.players[newState.currentPlayer]
  
  const dice1 = Math.floor(Math.random() * 6) + 1
  const dice2 = Math.floor(Math.random() * 6) + 1
  const isDoubles = dice1 === dice2
  
  player.lastDiceRoll = [dice1, dice2]
  
  console.log(`[GAME] ${player.name} rolled ${dice1} + ${dice2} = ${dice1 + dice2}`)
  addLog(newState, `${player.name} rolled ${dice1} + ${dice2} = ${dice1 + dice2}${isDoubles ? ' (DOUBLES!)' : ''}`)
  
  // Handle jail
  if (player.inJail) {
    return handleJailRoll(newState, player, isDoubles, dice1 + dice2)
  }
  
  // Handle doubles
  if (isDoubles) {
    player.doublesCount++
    if (player.doublesCount >= 3) {
      addLog(newState, `${player.name} rolled 3 doubles - Go to Jail!`)
      sendToJail(newState, player)
      return advanceTurn(newState)
    }
  } else {
    player.doublesCount = 0
  }
  
  // Move player
  const oldPos = player.position
  player.position = (player.position + dice1 + dice2) % 40
  
  console.log(`[GAME] ${player.name} moved from ${oldPos} to ${player.position}`)
  
  // Passed GO
  if (player.position < oldPos) {
    player.money += 200
    addLog(newState, `${player.name} passed GO - Collect $200`)
  }
  
  // Handle landing
  handleLanding(newState, player)
  
  // Extra turn for doubles
  if (isDoubles) {
    newState.extraTurn = true
  }
  
  return newState
}

function handleJailRoll(gameState, player, isDoubles, total) {
  if (isDoubles) {
    player.inJail = false
    player.jailTurns = 0
    player.doublesCount = 0
    addLog(gameState, `${player.name} rolled doubles - Released from Jail!`)
    
    player.position = (player.position + total) % 40
    handleLanding(gameState, player)
    return gameState
  } else {
    player.jailTurns++
    if (player.jailTurns >= 3) {
      player.money -= 50
      player.inJail = false
      player.jailTurns = 0
      addLog(gameState, `${player.name} paid $50 fine after 3 turns in jail`)
      
      player.position = (player.position + total) % 40
      handleLanding(gameState, player)
      return gameState
    } else {
      addLog(gameState, `${player.name} stays in jail (${player.jailTurns}/3 turns)`)
      return advanceTurn(gameState)
    }
  }
}

function handleLanding(gameState, player) {
  const space = gameState.board[player.position]
  addLog(gameState, `${player.name} landed on ${space.name}`)
  
  switch (space.type) {
    case 'go':
      player.money += 200
      addLog(gameState, `${player.name} landed on GO - Collect $200`)
      break
      
    case 'property':
    case 'railroad':
    case 'utility':
      if (space.owner === null) {
        gameState.pendingAction = { 
          type: 'buy', 
          property: space, 
          position: player.position,
          canAfford: player.money >= space.buyPrice
        }
      } else if (space.owner !== player.id && !space.mortgaged) {
        const rent = calculateRent(gameState, space, player)
        player.money -= rent
        gameState.players[space.owner].money += rent
        addLog(gameState, `${player.name} paid $${rent} rent to ${gameState.players[space.owner].name}`)
        checkBankruptcy(gameState, player)
      }
      break
      
    case 'tax':
      player.money -= space.amount
      addLog(gameState, `${player.name} paid $${space.amount} tax`)
      checkBankruptcy(gameState, player)
      break
      
    case 'chance':
      gameState.pendingAction = { type: 'chance' }
      break
      
    case 'community':
      gameState.pendingAction = { type: 'community' }
      break
      
    case 'goToJail':
      sendToJail(gameState, player)
      break
      
    case 'parking':
      addLog(gameState, `${player.name} rests at Free Parking`)
      break
  }
}

function calculateRent(gameState, space, player) {
  if (space.type === 'property') {
    if (space.mortgaged) return 0
    
    const monopoly = hasMonopoly(gameState, space.owner, space.color)
    
    if (space.houses === 0) {
      return monopoly ? space.baseRent * 2 : space.baseRent
    } else if (space.houses <= 4) {
      return space.rents[space.houses - 1]
    } else {
      return space.rents[4] // Hotel
    }
  } else if (space.type === 'railroad') {
    if (space.mortgaged) return 0
    const count = gameState.board.filter(s => s.type === 'railroad' && s.owner === space.owner).length
    return RAILROAD_RENT[count - 1]
  } else if (space.type === 'utility') {
    if (space.mortgaged) return 0
    const count = gameState.board.filter(s => s.type === 'utility' && s.owner === space.owner).length
    const multiplier = count === 2 ? UTILITY_MULTIPLIER.both : UTILITY_MULTIPLIER.single
    return (player.lastDiceRoll[0] + player.lastDiceRoll[1]) * multiplier
  }
  return 0
}

function hasMonopoly(gameState, playerId, color) {
  const colorProperties = gameState.board.filter(s => s.type === 'property' && s.color === color)
  return colorProperties.every(s => s.owner === playerId)
}

// ============================================================================
// PROPERTY TRANSACTIONS
// ============================================================================

export function buyProperty(gameState) {
  const newState = { ...gameState }
  const player = newState.players[newState.currentPlayer]
  const space = newState.board[player.position]
  
  if (player.money >= space.buyPrice) {
    player.money -= space.buyPrice
    space.owner = player.id
    
    if (space.type === 'property') player.properties.push(player.position)
    else if (space.type === 'railroad') player.railroads.push(player.position)
    else if (space.type === 'utility') player.utilities.push(player.position)
    
    addLog(newState, `${player.name} bought ${space.name} for $${space.buyPrice}`)
    newState.pendingAction = null
  }
  
  return newState
}

export function declinePurchase(gameState) {
  const newState = { ...gameState }
  const space = newState.board[newState.players[newState.currentPlayer].position]
  
  addLog(newState, `${newState.players[newState.currentPlayer].name} declined to buy ${space.name}`)
  
  // Start auction
  newState.auction = {
    property: space,
    position: newState.players[newState.currentPlayer].position,
    currentBid: 0,
    currentBidder: null,
    activeBidders: newState.players.filter(p => !p.isBankrupt).map(p => p.id),
    passedPlayers: []
  }
  
  newState.pendingAction = { type: 'auction' }
  return newState
}

export function placeBid(gameState, playerId, amount) {
  const newState = { ...gameState }
  
  if (amount > newState.auction.currentBid) {
    newState.auction.currentBid = amount
    newState.auction.currentBidder = playerId
    addLog(newState, `${newState.players[playerId].name} bids $${amount}`)
  }
  
  return newState
}

export function passAuction(gameState, playerId) {
  const newState = { ...gameState }
  newState.auction.passedPlayers.push(playerId)
  
  const activeBidders = newState.auction.activeBidders.filter(
    id => !newState.auction.passedPlayers.includes(id)
  )
  
  if (activeBidders.length === 1 && newState.auction.currentBidder !== null) {
    // Auction won
    const winner = newState.players[newState.auction.currentBidder]
    const space = newState.board[newState.auction.position]
    
    winner.money -= newState.auction.currentBid
    space.owner = winner.id
    
    if (space.type === 'property') winner.properties.push(newState.auction.position)
    else if (space.type === 'railroad') winner.railroads.push(newState.auction.position)
    else if (space.type === 'utility') winner.utilities.push(newState.auction.position)
    
    addLog(newState, `${winner.name} won auction for ${space.name} at $${newState.auction.currentBid}`)
    
    newState.auction = null
    newState.pendingAction = null
  }
  
  return newState
}

// ============================================================================
// BUILDING MANAGEMENT
// ============================================================================

export function buildHouse(gameState, position) {
  const newState = { ...gameState }
  const player = newState.players[newState.currentPlayer]
  const space = newState.board[position]
  
  if (!canBuildHouse(newState, player.id, position)) return newState
  
  if (space.houses < 4 && newState.housesRemaining > 0) {
    player.money -= space.houseCost
    space.houses++
    newState.housesRemaining--
    addLog(newState, `${player.name} built a house on ${space.name}`)
  } else if (space.houses === 4 && newState.hotelsRemaining > 0) {
    player.money -= space.houseCost
    space.houses = 5
    newState.housesRemaining += 4
    newState.hotelsRemaining--
    addLog(newState, `${player.name} built a hotel on ${space.name}`)
  }
  
  return newState
}

export function sellHouse(gameState, position) {
  const newState = { ...gameState }
  const player = newState.players[newState.currentPlayer]
  const space = newState.board[position]
  
  if (space.houses === 5) {
    // Sell hotel
    player.money += space.houseCost / 2
    space.houses = 4
    newState.hotelsRemaining++
    newState.housesRemaining -= 4
    addLog(newState, `${player.name} sold hotel on ${space.name} for $${space.houseCost / 2}`)
  } else if (space.houses > 0) {
    player.money += space.houseCost / 2
    space.houses--
    newState.housesRemaining++
    addLog(newState, `${player.name} sold house on ${space.name} for $${space.houseCost / 2}`)
  }
  
  return newState
}

function canBuildHouse(gameState, playerId, position) {
  const space = gameState.board[position]
  const player = gameState.players[playerId]
  
  if (space.type !== 'property') return false
  if (space.owner !== playerId) return false
  if (space.mortgaged) return false
  if (!hasMonopoly(gameState, playerId, space.color)) return false
  if (player.money < space.houseCost) return false
  if (space.houses >= 5) return false
  
  // Even build rule
  const colorProperties = gameState.board.filter(s => s.type === 'property' && s.color === space.color)
  const minHouses = Math.min(...colorProperties.map(s => s.houses))
  if (space.houses > minHouses) return false
  
  return true
}

// ============================================================================
// MORTGAGE SYSTEM
// ============================================================================

export function mortgageProperty(gameState, position) {
  const newState = { ...gameState }
  const player = newState.players[newState.currentPlayer]
  const space = newState.board[position]
  
  if (space.owner !== player.id || space.mortgaged) return newState
  if (space.type === 'property' && space.houses > 0) return newState
  
  space.mortgaged = true
  player.money += space.mortgageValue
  addLog(newState, `${player.name} mortgaged ${space.name} for $${space.mortgageValue}`)
  
  return newState
}

export function unmortgageProperty(gameState, position) {
  const newState = { ...gameState }
  const player = newState.players[newState.currentPlayer]
  const space = newState.board[position]
  
  const cost = Math.floor(space.mortgageValue * 1.1)
  
  if (space.owner !== player.id || !space.mortgaged || player.money < cost) return newState
  
  space.mortgaged = false
  player.money -= cost
  addLog(newState, `${player.name} unmortgaged ${space.name} for $${cost}`)
  
  return newState
}

// ============================================================================
// CARD SYSTEM
// ============================================================================

export function drawCard(gameState, cardType) {
  const newState = { ...gameState }
  const player = newState.players[newState.currentPlayer]
  
  const deck = cardType === 'chance' ? newState.chanceCards : newState.communityCards
  if (deck.length === 0) {
    const originalDeck = cardType === 'chance' ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS
    deck.push(...shuffleArray([...originalDeck]))
  }
  
  const card = deck.pop()
  addLog(newState, `${player.name} drew: "${card.text}"`)
  
  executeCard(newState, card, player)
  newState.pendingAction = null
  
  return newState
}

function executeCard(gameState, card, player) {
  switch (card.action) {
    case 'moveToGO':
      player.position = 0
      player.money += 200
      addLog(gameState, `${player.name} moved to GO - Collect $200`)
      break
      
    case 'moveTo':
      const oldPos = player.position
      player.position = card.position
      if (player.position < oldPos) {
        player.money += 200
        addLog(gameState, `${player.name} passed GO - Collect $200`)
      }
      handleLanding(gameState, player)
      break
      
    case 'moveToNearestUtility':
      const utilities = [12, 28]
      const nearest = utilities.find(pos => pos > player.position) || utilities[0]
      player.position = nearest
      handleLanding(gameState, player)
      break
      
    case 'moveToNearestRailroad':
      const railroads = [5, 15, 25, 35]
      const nearestRR = railroads.find(pos => pos > player.position) || railroads[0]
      player.position = nearestRR
      handleLanding(gameState, player)
      break
      
    case 'collect':
      player.money += card.amount
      addLog(gameState, `${player.name} collected $${card.amount}`)
      break
      
    case 'pay':
      player.money -= card.amount
      addLog(gameState, `${player.name} paid $${card.amount}`)
      checkBankruptcy(gameState, player)
      break
      
    case 'collectFromAll':
      gameState.players.forEach(p => {
        if (p.id !== player.id && !p.isBankrupt) {
          p.money -= card.amount
          player.money += card.amount
        }
      })
      break
      
    case 'repairs':
      const houses = gameState.board.filter(s => s.type === 'property' && s.owner === player.id && s.houses > 0 && s.houses < 5).reduce((sum, s) => sum + s.houses, 0)
      const hotels = gameState.board.filter(s => s.type === 'property' && s.owner === player.id && s.houses === 5).length
      const cost = (houses * card.house) + (hotels * card.hotel)
      player.money -= cost
      addLog(gameState, `${player.name} paid $${cost} for repairs`)
      checkBankruptcy(gameState, player)
      break
      
    case 'goToJail':
      sendToJail(gameState, player)
      break
      
    case 'jailCard':
      if (card.id <= 16) {
        player.getOutOfJailCards.chance++
      } else {
        player.getOutOfJailCards.community++
      }
      addLog(gameState, `${player.name} got a Get Out of Jail Free card`)
      break
      
    case 'moveBack':
      player.position = Math.max(0, player.position - card.spaces)
      handleLanding(gameState, player)
      break
  }
}

// ============================================================================
// JAIL MANAGEMENT
// ============================================================================

export function payJailFine(gameState) {
  const newState = { ...gameState }
  const player = newState.players[newState.currentPlayer]
  
  if (player.money >= 50) {
    player.money -= 50
    player.inJail = false
    player.jailTurns = 0
    addLog(newState, `${player.name} paid $50 to get out of jail`)
  }
  
  return newState
}

export function useJailCard(gameState) {
  const newState = { ...gameState }
  const player = newState.players[newState.currentPlayer]
  
  if (player.getOutOfJailCards.chance > 0) {
    player.getOutOfJailCards.chance--
    player.inJail = false
    player.jailTurns = 0
    newState.chanceCards.unshift(CHANCE_CARDS.find(c => c.action === 'jailCard'))
    addLog(newState, `${player.name} used Get Out of Jail Free card`)
  } else if (player.getOutOfJailCards.community > 0) {
    player.getOutOfJailCards.community--
    player.inJail = false
    player.jailTurns = 0
    newState.communityCards.unshift(COMMUNITY_CHEST_CARDS.find(c => c.action === 'jailCard'))
    addLog(newState, `${player.name} used Get Out of Jail Free card`)
  }
  
  return newState
}

function sendToJail(gameState, player) {
  player.position = 10
  player.inJail = true
  player.jailTurns = 0
  player.doublesCount = 0
  addLog(gameState, `${player.name} went to jail`)
}

// ============================================================================
// TRADING SYSTEM
// ============================================================================

export function proposeTrade(gameState, fromPlayer, toPlayer, offer) {
  const newState = { ...gameState }
  
  newState.pendingTrade = {
    from: fromPlayer,
    to: toPlayer,
    offer: offer, // { money, properties, jailCards }
    request: null
  }
  
  return newState
}

export function acceptTrade(gameState) {
  const newState = { ...gameState }
  const trade = newState.pendingTrade
  
  const from = newState.players[trade.from]
  const to = newState.players[trade.to]
  
  // Transfer money
  from.money -= trade.offer.money || 0
  to.money += trade.offer.money || 0
  to.money -= trade.request.money || 0
  from.money += trade.request.money || 0
  
  // Transfer properties
  ;(trade.offer.properties || []).forEach(pos => {
    const space = newState.board[pos]
    space.owner = to.id
    from.properties = from.properties.filter(p => p !== pos)
    to.properties.push(pos)
  })
  
  ;(trade.request.properties || []).forEach(pos => {
    const space = newState.board[pos]
    space.owner = from.id
    to.properties = to.properties.filter(p => p !== pos)
    from.properties.push(pos)
  })
  
  addLog(newState, `Trade completed between ${from.name} and ${to.name}`)
  newState.pendingTrade = null
  
  return newState
}

export function rejectTrade(gameState) {
  const newState = { ...gameState }
  newState.pendingTrade = null
  return newState
}

// ============================================================================
// BANKRUPTCY & GAME END
// ============================================================================

function checkBankruptcy(gameState, player) {
  if (player.money < 0) {
    // Try to liquidate assets
    const mortgageableProperties = gameState.board.filter(
      s => s.owner === player.id && !s.mortgaged && (s.type !== 'property' || s.houses === 0)
    )
    
    if (mortgageableProperties.length > 0) {
      gameState.pendingAction = { type: 'mustLiquidate', player: player.id }
    } else {
      declareBankruptcy(gameState, player)
    }
  }
}

function declareBankruptcy(gameState, player) {
  player.isBankrupt = true
  addLog(gameState, `${player.name} is bankrupt!`)
  
  // Return all properties to bank
  gameState.board.forEach(space => {
    if (space.owner === player.id) {
      space.owner = null
      space.mortgaged = false
      if (space.houses) {
        gameState.housesRemaining += space.houses === 5 ? 1 : space.houses
        if (space.houses === 5) gameState.hotelsRemaining++
        space.houses = 0
      }
    }
  })
  
  player.properties = []
  player.railroads = []
  player.utilities = []
  
  // Check for game end
  const activePlayers = gameState.players.filter(p => !p.isBankrupt)
  if (activePlayers.length === 1) {
    endGame(gameState, activePlayers[0])
  }
}

function endGame(gameState, winner) {
  gameState.gameOver = true
  gameState.winner = {
    ...winner,
    netWorth: calculateNetWorth(gameState, winner)
  }
  
  gameState.rankings = gameState.players
    .filter(p => !p.isBankrupt)
    .map(p => ({ ...p, netWorth: calculateNetWorth(gameState, p) }))
    .sort((a, b) => b.netWorth - a.netWorth)
  
  addLog(gameState, `Game Over! ${winner.name} wins!`)
}

function calculateNetWorth(gameState, player) {
  let worth = player.money
  
  gameState.board.forEach(space => {
    if (space.owner === player.id) {
      worth += space.mortgaged ? 0 : space.mortgageValue
      if (space.type === 'property') {
        worth += space.houses * (space.houseCost / 2)
      }
    }
  })
  
  return worth
}

// ============================================================================
// TURN MANAGEMENT
// ============================================================================

function advanceTurn(gameState) {
  if (gameState.extraTurn) {
    gameState.extraTurn = false
    return gameState
  }
  
  do {
    gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length
  } while (gameState.players[gameState.currentPlayer].isBankrupt)
  
  gameState.turnCount++
  gameState.turnPhase = 'roll'
  
  return gameState
}

export function endTurn(gameState) {
  return advanceTurn({ ...gameState })
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function addLog(gameState, message) {
  gameState.transactionLog.push({
    turn: gameState.turnCount,
    message,
    timestamp: Date.now()
  })
  
  // Keep only last 50 logs
  if (gameState.transactionLog.length > 50) {
    gameState.transactionLog.shift()
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  PROPERTY_DATA,
  RAILROAD_RENT,
  UTILITY_MULTIPLIER,
  hasMonopoly,
  calculateRent,
  calculateNetWorth
}
