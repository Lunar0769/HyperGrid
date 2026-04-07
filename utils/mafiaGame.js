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

const BOT_NAMES = [] // replaced by generateBotName()


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
// BOT INTELLIGENCE SYSTEM
// ============================================================================

// ── Name Generation ──────────────────────────────────────────────────────────
const NAME_FRAGMENTS = {
  prefix: ['Dark', 'Neo', 'Shadow', 'Silent', 'Ghost', 'Alpha', 'Toxic', 'Mystic', 'Void', 'Neon', 'Hyper', 'Rogue'],
  core:   ['Raven', 'Nix', 'Kira', 'Blaze', 'Knight', 'Wolf', 'Hunter', 'Zed', 'Viper', 'Storm', 'Byte', 'Flux'],
  suffix: ['X', '99', '_YT', '_OP', '_47', '.exe', '_live', '_GG', '007', '_pro']
}
const PERSONALITY_NAMES = {
  aggressive: ['Blaze', 'Hunter', 'Toxic', 'Alpha', 'Viper', 'Storm'],
  passive:    ['Silent', 'Ghost', 'Void', 'Byte'],
  manipulator:['Mystic', 'Shadow', 'Nix', 'Rogue']
}
const _usedBotNames = new Set()

function generateBotName(personality) {
  const patterns = [
    () => NAME_FRAGMENTS.prefix[_r(NAME_FRAGMENTS.prefix.length)] + NAME_FRAGMENTS.core[_r(NAME_FRAGMENTS.core.length)],
    () => NAME_FRAGMENTS.core[_r(NAME_FRAGMENTS.core.length)] + NAME_FRAGMENTS.suffix[_r(NAME_FRAGMENTS.suffix.length)],
    () => NAME_FRAGMENTS.prefix[_r(NAME_FRAGMENTS.prefix.length)] + '_' + NAME_FRAGMENTS.core[_r(NAME_FRAGMENTS.core.length)],
    () => NAME_FRAGMENTS.core[_r(NAME_FRAGMENTS.core.length)] + '_' + (Math.floor(Math.random() * 990) + 10),
  ]
  // Bias toward personality-linked names
  const personalityPool = PERSONALITY_NAMES[personality] || []
  for (let i = 0; i < 10; i++) {
    let name
    if (personalityPool.length && Math.random() < 0.5) {
      const base = personalityPool[_r(personalityPool.length)]
      name = base + NAME_FRAGMENTS.suffix[_r(NAME_FRAGMENTS.suffix.length)]
    } else {
      name = patterns[_r(patterns.length)]()
    }
    if (!_usedBotNames.has(name)) { _usedBotNames.add(name); return name }
  }
  // Fallback with timestamp uniqueness
  const fallback = 'Player' + Date.now().toString().slice(-4)
  _usedBotNames.add(fallback)
  return fallback
}

function _r(n) { return Math.floor(Math.random() * n) }

// ── Personality System ────────────────────────────────────────────────────────
const PERSONALITIES = ['aggressive', 'passive', 'manipulator']

function randomPersonality() {
  return PERSONALITIES[_r(PERSONALITIES.length)]
}

// ── Message Templates ─────────────────────────────────────────────────────────
const TEMPLATES = {
  accusation: [
    "I've been watching {target}, something feels off.",
    "{target} is acting strange this round.",
    "Why is {target} so quiet? Very suspicious.",
    "My gut says {target} is mafia. Vote them.",
    "I don't trust {target} at all.",
    "{target} hasn't said much. That's suspicious.",
    "Has anyone else noticed {target} being weird?",
    "I'm calling it — {target} is mafia.",
  ],
  defense: [
    "That doesn't make sense, I voted with you.",
    "Why are you targeting me suddenly?",
    "If I was mafia, I wouldn't play like this.",
    "I'm not mafia, I promise!",
    "Think about it — why would mafia act like me?",
    "I've been helping this whole time!",
    "You're all wrong about me.",
  ],
  agreement: [
    "Yeah I agree with {player}.",
    "{player} might be right about {target}.",
    "I was thinking the same thing.",
    "That makes sense to me.",
    "Agreed. Let's vote {target}.",
  ],
  doubt: [
    "Not fully convinced yet.",
    "Something feels off but I'm not sure.",
    "Maybe, but let's hear more first.",
    "I'm not sure about that accusation.",
    "Could be, could not be.",
  ],
  neutral: [
    "I have a bad feeling about someone here...",
    "We need to think carefully before voting.",
    "Something doesn't add up.",
    "The mafia is among us. I can feel it.",
    "Has anyone noticed anything unusual?",
    "Let's not rush this decision.",
    "I trust most of you... most.",
    "We should vote based on behavior, not guesses.",
  ]
}

// ── Suspicion Engine ──────────────────────────────────────────────────────────
function computeSuspicion(botMemory, targetId) {
  let score = 0
  const mem = botMemory[targetId] || {}
  score += (mem.accusedBy || 0) * 10
  score += (mem.randomAccusations || 0) * 8
  score += (mem.defensiveCount || 0) * 6
  score += (mem.silentRounds || 0) * 10
  score -= (mem.agreedWithMajority || 0) * 5
  return Math.min(100, Math.max(0, score))
}

function classifyMessage(text) {
  const t = text.toLowerCase()
  if (/is mafia|sus|i think|definitely|vote them|calling it/.test(t)) return 'accusation'
  if (/not mafia|trust me|why me|i promise|wrong about/.test(t)) return 'defense'
  if (/agree|true|yeah|same|right/.test(t)) return 'agreement'
  if (/maybe|not sure|idk|could be|not convinced/.test(t)) return 'doubt'
  return 'neutral'
}

// ── Bot Chat Decision ─────────────────────────────────────────────────────────
export function getBotResponse(bot, gameState, recentMessages) {
  const alive = gameState.players.filter(p => p.isAlive && p.id !== bot.id)
  if (!alive.length) return null

  const personality = bot.personality || 'passive'
  const memory = bot.memory || {}

  // Check if bot was recently accused
  const wasAccused = recentMessages.some(m =>
    m.message && m.message.toLowerCase().includes(bot.name.toLowerCase()) &&
    classifyMessage(m.message) === 'accusation'
  )

  // Find highest suspicion target
  const suspicionScores = alive.map(p => ({ p, score: computeSuspicion(memory, p.id) }))
  suspicionScores.sort((a, b) => b.score - a.score)
  const topSuspect = suspicionScores[0]?.p

  // Check if majority is accusing someone
  const accusationCounts = {}
  recentMessages.slice(-6).forEach(m => {
    if (classifyMessage(m.message) === 'accusation') {
      alive.forEach(p => {
        if (m.message.toLowerCase().includes(p.name.toLowerCase())) {
          accusationCounts[p.id] = (accusationCounts[p.id] || 0) + 1
        }
      })
    }
  })
  const majorityTarget = Object.entries(accusationCounts).sort((a, b) => b[1] - a[1])[0]

  // Decision engine
  let msgType, target, player

  if (wasAccused) {
    // Respond with defense
    msgType = 'defense'
  } else if (topSuspect && computeSuspicion(memory, topSuspect.id) > 30) {
    // Accuse high-suspicion target
    msgType = 'accusation'
    target = topSuspect
  } else if (majorityTarget && majorityTarget[1] >= 2) {
    // Join or doubt majority
    if (personality === 'manipulator' && Math.random() < 0.7) {
      msgType = 'agreement'
      target = alive.find(p => p.id === majorityTarget[0])
      player = recentMessages.slice(-6).find(m => classifyMessage(m.message) === 'accusation')
    } else if (personality === 'passive') {
      msgType = 'doubt'
    } else {
      msgType = 'accusation'
      target = alive.find(p => p.id === majorityTarget[0])
    }
  } else {
    // Personality-based fallback
    const roll = Math.random()
    if (personality === 'aggressive') {
      msgType = roll < 0.8 ? 'accusation' : 'neutral'
      target = alive[_r(alive.length)]
    } else if (personality === 'passive') {
      if (roll < 0.5) return null // Silent
      msgType = roll < 0.7 ? 'neutral' : 'doubt'
    } else {
      // manipulator
      msgType = roll < 0.4 ? 'agreement' : roll < 0.7 ? 'accusation' : 'neutral'
      target = alive[_r(alive.length)]
    }
  }

  // Pick template
  const pool = TEMPLATES[msgType] || TEMPLATES.neutral
  // Avoid repetition: filter out last used if possible
  const lastMsg = bot._lastMsg || ''
  const filtered = pool.filter(t => t !== lastMsg)
  const template = (filtered.length ? filtered : pool)[_r((filtered.length || pool.length))]

  let msg = template
  if (target) msg = msg.replace('{target}', target.name)
  if (player) msg = msg.replace('{player}', player.playerName || 'someone')
  msg = msg.replace('{target}', alive[_r(alive.length)].name)
  msg = msg.replace('{player}', alive[_r(alive.length)].name)

  return msg
}

// ── Update Bot Memory from Chat ───────────────────────────────────────────────
export function updateBotMemory(bot, messages, players) {
  const memory = bot.memory || {}
  messages.forEach(msg => {
    const type = classifyMessage(msg.message || '')
    players.forEach(p => {
      if (!memory[p.id]) memory[p.id] = {}
      if (type === 'accusation' && msg.message.toLowerCase().includes(p.name.toLowerCase())) {
        memory[p.id].accusedBy = (memory[p.id].accusedBy || 0) + 1
      }
      if (type === 'defense' && msg.playerId === p.id) {
        memory[p.id].defensiveCount = (memory[p.id].defensiveCount || 0) + 1
      }
    })
  })
  return memory
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
