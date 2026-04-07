// ============================================================================
// HYPERMAFIA - Complete Mafia Game Engine
// ============================================================================

export const PHASES = {
  WAITING: 'waiting_lobby',
  ROLE_ASSIGNMENT: 'role_assignment',
  NIGHT: 'night_phase',
  DAY: 'day_discussion',
  VOTING: 'voting_phase',
  RESULT: 'result_phase',
  GAME_END: 'game_end'
}

export const ROLES = {
  MAFIA: 'Mafia',
  DETECTIVE: 'Detective',
  DOCTOR: 'Doctor',
  VILLAGER: 'Villager'
}

const BOT_NAMES = ['Bot_1', 'Bot_2', 'Bot_3', 'Bot_4', 'Bot_5', 'Bot_6', 'Bot_7', 'Bot_8']

const BOT_MESSAGES = {
  day: [
    "I have a bad feeling about someone here...",
    "We need to think carefully before voting.",
    "Something doesn't add up.",
    "I was watching last night. Very suspicious.",
    "Let's not rush this decision.",
    "I trust most of you... most.",
    "The mafia is among us. I can feel it.",
    "Has anyone noticed anything unusual?",
    "We should vote based on behavior, not guesses.",
    "I'm innocent, I swear on my life."
  ],
  accusation: [
    "I think {target} is acting suspicious.",
    "Has anyone else noticed {target} being quiet?",
    "I don't trust {target} at all.",
    "{target} hasn't said much. That's suspicious.",
    "My gut says {target} is mafia.",
    "Vote {target} — something's off about them."
  ],
  defense: [
    "I'm not mafia, I promise!",
    "Why would I be suspicious? I'm just a villager.",
    "You're all wrong about me.",
    "I've been helping this whole time!",
    "Think about it — why would mafia act like me?"
  ]
}

// ============================================================================
// ROLE ASSIGNMENT
// ============================================================================

export function assignRoles(players) {
  const count = players.length
  const mafiaCount = Math.max(1, Math.floor(count / 4))
  
  const rolePool = []
  for (let i = 0; i < mafiaCount; i++) rolePool.push(ROLES.MAFIA)
  rolePool.push(ROLES.DETECTIVE)
  rolePool.push(ROLES.DOCTOR)
  while (rolePool.length < count) rolePool.push(ROLES.VILLAGER)

  // Shuffle roles
  const shuffled = [...rolePool].sort(() => Math.random() - 0.5)
  
  return players.map((p, i) => ({ ...p, role: shuffled[i], isAlive: true, isRevealed: false }))
}

// ============================================================================
// GAME INITIALIZATION
// ============================================================================

export function initializeMafiaGame(players) {
  const withRoles = assignRoles(players)
  
  return {
    players: withRoles,
    phase: PHASES.ROLE_ASSIGNMENT,
    round: 1,
    nightActions: { mafiaTarget: null, doctorSave: null, detectiveInvestigate: null },
    votes: {},
    lastKilled: null,
    lastSaved: null,
    lastInvestigated: null,
    chatMessages: [],
    gameLog: [],
    winner: null,
    phaseTimer: null,
    pendingResult: null
  }
}

// ============================================================================
// PHASE TRANSITIONS
// ============================================================================

export function startNightPhase(gameState) {
  const newState = { ...gameState }
  newState.phase = PHASES.NIGHT
  newState.nightActions = { mafiaTarget: null, doctorSave: null, detectiveInvestigate: null }
  newState.votes = {}
  addGameLog(newState, `--- Night ${newState.round} begins ---`)
  return newState
}

export function startDayPhase(gameState) {
  const newState = { ...gameState }
  
  // Resolve night actions
  const { mafiaTarget, doctorSave, detectiveInvestigate } = newState.nightActions
  
  newState.lastKilled = null
  newState.lastSaved = null
  newState.lastInvestigated = null

  if (mafiaTarget && mafiaTarget !== doctorSave) {
    const victim = newState.players.find(p => p.id === mafiaTarget)
    if (victim) {
      victim.isAlive = false
      victim.isRevealed = true
      newState.lastKilled = victim.id
      addGameLog(newState, `${victim.name} was killed during the night.`)
    }
  } else if (mafiaTarget && mafiaTarget === doctorSave) {
    newState.lastSaved = mafiaTarget
    addGameLog(newState, `Someone was saved by the Doctor last night.`)
  }

  if (detectiveInvestigate) {
    const investigated = newState.players.find(p => p.id === detectiveInvestigate)
    if (investigated) {
      newState.lastInvestigated = {
        id: investigated.id,
        isMafia: investigated.role === ROLES.MAFIA
      }
    }
  }

  newState.phase = PHASES.DAY
  addGameLog(newState, `--- Day ${newState.round} begins ---`)
  
  const winCheck = checkWinCondition(newState)
  if (winCheck) {
    newState.phase = PHASES.GAME_END
    newState.winner = winCheck
    return newState
  }

  return newState
}

export function startVotingPhase(gameState) {
  const newState = { ...gameState }
  newState.phase = PHASES.VOTING
  newState.votes = {}
  addGameLog(newState, `Voting phase started.`)
  return newState
}

export function castVote(gameState, voterId, targetId) {
  const newState = { ...gameState }
  const voter = newState.players.find(p => p.id === voterId)
  if (!voter || !voter.isAlive) return newState
  
  newState.votes = { ...newState.votes, [voterId]: targetId }
  addGameLog(newState, `${voter.name} voted.`)
  return newState
}

export function resolveVotes(gameState) {
  const newState = { ...gameState }
  const alivePlayers = newState.players.filter(p => p.isAlive)
  
  // Count votes
  const voteCounts = {}
  Object.values(newState.votes).forEach(targetId => {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1
  })

  // Find max votes
  let maxVotes = 0
  let eliminated = null
  let tied = false

  Object.entries(voteCounts).forEach(([id, count]) => {
    if (count > maxVotes) {
      maxVotes = count
      eliminated = id
      tied = false
    } else if (count === maxVotes) {
      tied = true
    }
  })

  newState.pendingResult = null

  if (tied || !eliminated || maxVotes < Math.ceil(alivePlayers.length / 2)) {
    // No majority - skip elimination
    addGameLog(newState, `No majority reached. No one was eliminated.`)
    newState.pendingResult = { type: 'no_elimination' }
  } else {
    const player = newState.players.find(p => p.id === eliminated)
    if (player) {
      player.isAlive = false
      player.isRevealed = true
      addGameLog(newState, `${player.name} was eliminated by vote. They were ${player.role}.`)
      newState.pendingResult = { type: 'eliminated', player }
    }
  }

  newState.phase = PHASES.RESULT
  
  const winCheck = checkWinCondition(newState)
  if (winCheck) {
    newState.winner = winCheck
    newState.phase = PHASES.GAME_END
  }

  return newState
}

// ============================================================================
// WIN CONDITIONS
// ============================================================================

export function checkWinCondition(gameState) {
  const alive = gameState.players.filter(p => p.isAlive)
  const aliveMafia = alive.filter(p => p.role === ROLES.MAFIA)
  const aliveVillagers = alive.filter(p => p.role !== ROLES.MAFIA)

  if (aliveMafia.length === 0) return 'villagers'
  if (aliveMafia.length >= aliveVillagers.length) return 'mafia'
  return null
}

// ============================================================================
// NIGHT ACTIONS
// ============================================================================

export function submitNightAction(gameState, playerId, action, targetId) {
  const newState = { ...gameState }
  const player = newState.players.find(p => p.id === playerId)
  if (!player || !player.isAlive) return newState

  if (action === 'mafia_kill' && player.role === ROLES.MAFIA) {
    newState.nightActions = { ...newState.nightActions, mafiaTarget: targetId }
  } else if (action === 'doctor_save' && player.role === ROLES.DOCTOR) {
    newState.nightActions = { ...newState.nightActions, doctorSave: targetId }
  } else if (action === 'detective_investigate' && player.role === ROLES.DETECTIVE) {
    newState.nightActions = { ...newState.nightActions, detectiveInvestigate: targetId }
  }

  return newState
}

// ============================================================================
// CHAT
// ============================================================================

export function addChatMessage(gameState, playerId, message) {
  const newState = { ...gameState }
  const player = newState.players.find(p => p.id === playerId)
  if (!player) return newState

  // Only alive players can chat during day
  if (newState.phase === PHASES.DAY && !player.isAlive) return newState

  newState.chatMessages = [
    ...newState.chatMessages,
    {
      id: Date.now(),
      playerId,
      playerName: player.name,
      message,
      isBot: player.isBot,
      timestamp: Date.now()
    }
  ].slice(-100) // Keep last 100 messages

  return newState
}

// ============================================================================
// BOT LOGIC
// ============================================================================

export function createBot(index, existingBots = 0) {
  const botIndex = existingBots + index + 1
  return {
    id: `bot_${botIndex}_${Date.now()}`,
    name: `Bot_${botIndex}`,
    isBot: true,
    isAlive: true,
    isRevealed: false,
    role: null,
    difficulty: 'medium'
  }
}

export function runBotNightAction(gameState, bot) {
  const newState = { ...gameState }
  const alivePlayers = newState.players.filter(p => p.isAlive)
  const aliveNonMafia = alivePlayers.filter(p => p.role !== ROLES.MAFIA)
  const aliveMafia = alivePlayers.filter(p => p.role === ROLES.MAFIA)

  if (bot.role === ROLES.MAFIA) {
    // Mafia: pick random non-mafia target
    const targets = aliveNonMafia.filter(p => p.id !== bot.id)
    if (targets.length > 0) {
      const target = targets[Math.floor(Math.random() * targets.length)]
      return submitNightAction(newState, bot.id, 'mafia_kill', target.id)
    }
  } else if (bot.role === ROLES.DOCTOR) {
    // Doctor: 60% chance save self, else random
    const saveSelf = Math.random() < 0.6
    const target = saveSelf ? bot : alivePlayers[Math.floor(Math.random() * alivePlayers.length)]
    return submitNightAction(newState, bot.id, 'doctor_save', target.id)
  } else if (bot.role === ROLES.DETECTIVE) {
    // Detective: investigate random alive player (not self)
    const targets = alivePlayers.filter(p => p.id !== bot.id)
    if (targets.length > 0) {
      const target = targets[Math.floor(Math.random() * targets.length)]
      return submitNightAction(newState, bot.id, 'detective_investigate', target.id)
    }
  }

  return newState
}

export function getBotChatMessage(bot, gameState) {
  const alivePlayers = gameState.players.filter(p => p.isAlive && p.id !== bot.id)
  const roll = Math.random()

  if (roll < 0.4 && alivePlayers.length > 0) {
    // Accusation
    const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)]
    const template = BOT_MESSAGES.accusation[Math.floor(Math.random() * BOT_MESSAGES.accusation.length)]
    return template.replace('{target}', target.name)
  } else if (roll < 0.7) {
    // Defense (if bot is being accused)
    return BOT_MESSAGES.defense[Math.floor(Math.random() * BOT_MESSAGES.defense.length)]
  } else {
    // General day message
    return BOT_MESSAGES.day[Math.floor(Math.random() * BOT_MESSAGES.day.length)]
  }
}

export function getBotVote(bot, gameState) {
  const alivePlayers = gameState.players.filter(p => p.isAlive && p.id !== bot.id)
  if (alivePlayers.length === 0) return null

  // Mafia bots vote for non-mafia
  if (bot.role === ROLES.MAFIA) {
    const nonMafia = alivePlayers.filter(p => p.role !== ROLES.MAFIA)
    if (nonMafia.length > 0) {
      return nonMafia[Math.floor(Math.random() * nonMafia.length)].id
    }
  }

  // Others vote randomly (with slight suspicion weighting)
  return alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id
}

// ============================================================================
// UTILITIES
// ============================================================================

function addGameLog(gameState, message) {
  gameState.gameLog = [
    ...(gameState.gameLog || []),
    { message, timestamp: Date.now(), round: gameState.round }
  ].slice(-200)
}

export function getPlayerColor(index) {
  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a', '#ff5722', '#607d8b']
  return colors[index % colors.length]
}

export function getRoleColor(role) {
  switch (role) {
    case ROLES.MAFIA: return '#e74c3c'
    case ROLES.DETECTIVE: return '#3498db'
    case ROLES.DOCTOR: return '#2ecc71'
    default: return '#95a5a6'
  }
}

export function getRoleIcon(role) {
  switch (role) {
    case ROLES.MAFIA: return '🔪'
    case ROLES.DETECTIVE: return '🔍'
    case ROLES.DOCTOR: return '💊'
    default: return '👤'
  }
}
