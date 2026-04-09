// ============================================================================
// HYPERNAMES - Codenames Game Engine + Semantic AI
// ============================================================================

// ── Word Pool (500+ words across categories) ─────────────────────────────────
export const WORD_POOL = [
  // Objects
  'ANCHOR','APPLE','ARROW','AXE','BALL','BELL','BOOK','BOTTLE','BOX','BRIDGE',
  'BRUSH','BUCKET','CAMERA','CANDLE','CAR','CARD','CHAIN','CLOCK','CLOUD','COIN',
  'CROWN','CUP','DIAMOND','DOOR','DRUM','EGG','FAN','FEATHER','FLAG','FLASK',
  'FORK','FRAME','GEAR','GLASS','GLOVE','HAMMER','HOOK','KEY','KNIFE','LAMP',
  'LENS','LOCK','MAP','MASK','MIRROR','NEEDLE','NET','PIPE','PLATE','RING',
  'ROPE','SCALE','SCREEN','SHIELD','SHOE','SIGN','SPOON','STAR','STONE','SWORD',
  'TABLE','TORCH','TOWER','TRAP','TREE','UMBRELLA','VASE','WATCH','WHEEL','WIRE',
  // Places
  'AFRICA','AIRPORT','AMAZON','ARCTIC','BANK','BEACH','BERLIN','CAVE','CHINA',
  'CHURCH','CITY','CLIFF','COAST','COURT','DESERT','DOCK','EGYPT','FARM','FIELD',
  'FOREST','FRANCE','GARDEN','GATE','GREECE','HARBOR','HILL','INDIA','ISLAND',
  'JAPAN','JUNGLE','LAKE','LONDON','MARKET','MARS','MINE','MOON','MOUNTAIN',
  'MUSEUM','OCEAN','PALACE','PARK','PERU','PLAIN','PORT','PRISON','PYRAMID',
  'RIVER','ROME','SCHOOL','SPACE','SPAIN','STATION','TEMPLE','TOKYO','VALLEY',
  'VILLAGE','VOLCANO','WALL','WELL','WOODS',
  // Actions
  'ATTACK','BAKE','BLAST','BREAK','BUILD','BURN','CATCH','CHARGE','CHASE','CLIMB',
  'COOK','CRASH','CUT','DANCE','DIVE','DRAW','DRIVE','DROP','DIG','ESCAPE',
  'FALL','FIGHT','FLY','FOLLOW','FREEZE','GRAB','GROW','GUARD','HACK','HIDE',
  'HUNT','JUMP','KICK','LAUNCH','LEAD','LEAP','LIFT','LOCK','MARCH','MINE',
  'MOVE','OPEN','PAINT','PLANT','PULL','PUSH','RUN','SAIL','SEARCH','SHOOT',
  'SINK','SLIDE','SPIN','STEAL','STRIKE','SWIM','THROW','TRACK','TRAP','TURN',
  // Abstract
  'AGENT','ALARM','ANGEL','ANSWER','BALANCE','BATTLE','BOND','CHAOS','CODE',
  'CONTROL','CRISIS','CURSE','DANGER','DARK','DAWN','DEATH','DREAM','DUSK',
  'ECHO','ENERGY','EVIL','FAITH','FAME','FATE','FEAR','FIRE','FORCE','GHOST',
  'GLORY','GRACE','GREED','GUILT','HEART','HERO','HONOR','HOPE','HORROR','ICE',
  'IDEA','ILLUSION','JUSTICE','KARMA','LEGEND','LIGHT','LOGIC','LUCK','MAGIC',
  'MIND','MYTH','NIGHT','ORDER','PAIN','PEACE','POWER','PRIDE','RAGE','REASON',
  'RISK','RULE','SECRET','SHADOW','SIGNAL','SILENCE','SOUL','SPIRIT','STORM',
  'STRENGTH','TERROR','THEORY','THOUGHT','TIME','TRUTH','VOID','WAR','WISDOM',
  // Tech theme
  'ALGORITHM','ARRAY','BINARY','BIT','BUFFER','BUG','BYTE','CACHE','CHIP','CIPHER',
  'CIRCUIT','CLONE','CLUSTER','COMPILE','CORE','CRASH','CRYPTO','DATA','DEBUG',
  'DEPLOY','DEVICE','DOMAIN','DRONE','ENCRYPT','ENGINE','EXPLOIT','FILE','FIREWALL',
  'FLASH','FRAME','GRID','HACK','HOST','INDEX','INPUT','KERNEL','LASER','LINK',
  'LOG','LOOP','MATRIX','MEMORY','MESH','MODULE','NETWORK','NODE','OUTPUT','PACKET',
  'PATCH','PIXEL','PLUGIN','PORT','PROCESS','PROTOCOL','PROXY','QUERY','QUEUE',
  'RADAR','RAM','REBOOT','RELAY','RENDER','ROBOT','ROOT','ROUTER','RUNTIME','SCAN',
  'SCRIPT','SERVER','SIGNAL','SOCKET','SOURCE','STACK','STREAM','SYNC','SYSTEM',
  'TERMINAL','TOKEN','TRACE','UPLOAD','USER','VECTOR','VIRUS','WAVE','WEB','ZERO',
  // Space theme
  'ASTEROID','ATLAS','AURORA','BEACON','COMET','COSMOS','CRATER','ECLIPSE','GALAXY',
  'GRAVITY','HORIZON','LAUNCH','METEOR','NEBULA','NOVA','ORBIT','PHOTON','PLANET',
  'PLASMA','PROBE','PULSAR','QUASAR','ROCKET','SATELLITE','SOLAR','STATION','SUN',
  'SUPERNOVA','TELESCOPE','TITAN','UNIVERSE','WARP','ZENITH',
  // Crime/Spy theme
  'ALIAS','AMBUSH','ASSASSIN','BADGE','BRIBE','BUREAU','CASE','CIPHER','CLUE',
  'CONTACT','COVER','CRIME','DETECTIVE','DISGUISE','DOUBLE','EVIDENCE','EXPOSE',
  'FRAME','FUGITIVE','HEIST','INFORMANT','INTEL','INTERROGATE','MOLE','OPERATION',
  'PROFILE','PURSUIT','RAID','RANSOM','ROGUE','SAFE','SNIPER','SPY','STAKE',
  'SUSPECT','TARGET','UNDERCOVER','VAULT','WITNESS'
]

// ── Semantic similarity map (pre-computed concept clusters) ──────────────────
// Each word maps to related concepts with a similarity score 0-1
const SEMANTIC_MAP = buildSemanticMap()

function buildSemanticMap() {
  const clusters = [
    { words: ['FIRE','FLAME','BURN','TORCH','HEAT','LIGHT','SUN','STAR','NOVA','PLASMA'], score: 0.75 },
    { words: ['WATER','OCEAN','RIVER','LAKE','RAIN','WAVE','FLOOD','SWIM','DIVE','ANCHOR'], score: 0.72 },
    { words: ['DARK','NIGHT','SHADOW','VOID','BLACK','GHOST','DEATH','DUSK','ECLIPSE'], score: 0.70 },
    { words: ['LIGHT','DAWN','SUN','STAR','AURORA','BEAM','FLASH','GLOW','SIGNAL'], score: 0.70 },
    { words: ['WAR','BATTLE','FIGHT','ATTACK','STRIKE','WEAPON','SWORD','SHIELD','ARMOR'], score: 0.78 },
    { words: ['SPY','AGENT','MOLE','COVER','ALIAS','DISGUISE','INTEL','CIPHER','CODE','SECRET'], score: 0.82 },
    { words: ['SPACE','ORBIT','PLANET','ROCKET','SATELLITE','COSMOS','GALAXY','STAR','MOON','MARS'], score: 0.80 },
    { words: ['TECH','HACK','CODE','SYSTEM','NETWORK','SERVER','ROBOT','CHIP','BINARY','MATRIX'], score: 0.78 },
    { words: ['CRIME','HEIST','THEFT','VAULT','SAFE','BANK','MONEY','GOLD','DIAMOND','COIN'], score: 0.75 },
    { words: ['NATURE','FOREST','TREE','RIVER','MOUNTAIN','FIELD','GARDEN','PLANT','GROW'], score: 0.72 },
    { words: ['CITY','MARKET','BANK','STATION','TOWER','BRIDGE','ROAD','PORT','DOCK'], score: 0.68 },
    { words: ['MAGIC','SPELL','CURSE','GHOST','SPIRIT','SOUL','MYTH','LEGEND','ANGEL'], score: 0.70 },
    { words: ['FOOD','APPLE','EGG','COOK','BAKE','PLATE','FORK','SPOON','CUP','BOTTLE'], score: 0.72 },
    { words: ['MUSIC','DRUM','BELL','DANCE','RHYTHM','BEAT','WAVE','ECHO','SIGNAL'], score: 0.65 },
    { words: ['HUNT','CHASE','TRACK','TRAP','CATCH','PREY','TARGET','ARROW','BOW'], score: 0.75 },
    { words: ['BUILD','HAMMER','NAIL','BRICK','WALL','TOWER','BRIDGE','FRAME','GEAR'], score: 0.72 },
    { words: ['COLD','ICE','FREEZE','SNOW','ARCTIC','WINTER','CRYSTAL','GLASS'], score: 0.75 },
    { words: ['POWER','ENERGY','FORCE','CHARGE','ELECTRIC','LASER','BEAM','CORE'], score: 0.72 },
    { words: ['MIND','BRAIN','THOUGHT','IDEA','LOGIC','REASON','THEORY','WISDOM'], score: 0.70 },
    { words: ['FEAR','HORROR','TERROR','DARK','GHOST','CURSE','TRAP','DANGER'], score: 0.72 },
    { words: ['KING','CROWN','PALACE','THRONE','RULE','POWER','GLORY','HONOR'], score: 0.75 },
    { words: ['SHIP','ANCHOR','SAIL','PORT','HARBOR','OCEAN','WAVE','DOCK'], score: 0.78 },
    { words: ['BIRD','FEATHER','FLY','WING','EAGLE','ARROW','SKY','CLOUD'], score: 0.68 },
    { words: ['MONEY','COIN','GOLD','BANK','VAULT','SAFE','DIAMOND','RING'], score: 0.75 },
    { words: ['WEAPON','SWORD','KNIFE','AXE','GUN','BULLET','ARROW','BOMB'], score: 0.80 },
  ]

  const map = {}
  clusters.forEach(cluster => {
    cluster.words.forEach(w1 => {
      if (!map[w1]) map[w1] = {}
      cluster.words.forEach(w2 => {
        if (w1 !== w2) {
          map[w1][w2] = Math.max(map[w1][w2] || 0, cluster.score - Math.random() * 0.1)
        }
      })
    })
  })
  return map
}

export function getSimilarity(word1, word2) {
  const w1 = word1.toUpperCase()
  const w2 = word2.toUpperCase()
  if (w1 === w2) return 1.0
  // Check semantic map
  const score = SEMANTIC_MAP[w1]?.[w2] || SEMANTIC_MAP[w2]?.[w1] || 0
  if (score > 0) return score
  // Fallback: letter overlap heuristic
  const s1 = new Set(w1.split(''))
  const s2 = new Set(w2.split(''))
  const intersection = [...s1].filter(c => s2.has(c)).length
  return Math.min(0.35, intersection / Math.max(s1.size, s2.size) * 0.5)
}

// ── Board Generation ──────────────────────────────────────────────────────────
export function generateBoard(theme = 'general') {
  const pool = [...WORD_POOL].sort(() => Math.random() - 0.5)
  const words = pool.slice(0, 25)

  // Assign roles: 9 red, 8 blue, 7 neutral, 1 assassin
  const roles = [
    ...Array(9).fill('red'),
    ...Array(8).fill('blue'),
    ...Array(7).fill('neutral'),
    'assassin'
  ].sort(() => Math.random() - 0.5)

  return words.map((word, i) => ({
    word,
    role: roles[i],
    revealed: false,
    index: i
  }))
}

// ── AI Spymaster ──────────────────────────────────────────────────────────────
export function generateAIClue(board, team, difficulty = 'medium') {
  const teamWords   = board.filter(c => c.role === team && !c.revealed).map(c => c.word)
  const enemyWords  = board.filter(c => c.role === (team === 'red' ? 'blue' : 'red') && !c.revealed).map(c => c.word)
  const neutralWords= board.filter(c => c.role === 'neutral' && !c.revealed).map(c => c.word)
  const assassin    = board.find(c => c.role === 'assassin' && !c.revealed)?.word

  if (teamWords.length === 0) return null

  // Generate candidate clues from word pool (excluding board words)
  const boardWords = new Set(board.map(c => c.word.toUpperCase()))
  const candidates = WORD_POOL.filter(w => !boardWords.has(w.toUpperCase())).slice(0, 120)

  let bestClue = null
  let bestScore = -Infinity
  let bestTargets = []

  candidates.forEach(candidate => {
    // Score each team word against this candidate
    const teamScores = teamWords.map(w => ({
      word: w,
      sim: getSimilarity(candidate, w)
    })).sort((a, b) => b.sim - a.sim)

    // Try linking 1, 2, or 3 words
    for (let count = Math.min(3, teamWords.length); count >= 1; count--) {
      const targets = teamScores.slice(0, count)
      const minTeamSim = Math.min(...targets.map(t => t.sim))
      if (minTeamSim < 0.4) continue

      const maxEnemySim = Math.max(0, ...enemyWords.map(w => getSimilarity(candidate, w)))
      const assassinSim = assassin ? getSimilarity(candidate, assassin) : 0

      // Safety filters
      if (assassinSim > 0.65) continue
      if (maxEnemySim > minTeamSim) continue

      // Difficulty-based risk tolerance
      const riskTolerance = { easy: 0.3, medium: 0.5, hard: 0.65 }[difficulty]
      if (assassinSim > riskTolerance) continue

      // Scoring formula
      const teamScore = targets.reduce((s, t) => s + t.sim, 0) * 2
      const enemyPenalty = maxEnemySim * 1.5
      const assassinPenalty = assassinSim * 5
      const score = teamScore - enemyPenalty - assassinPenalty + (count * 0.3)

      if (score > bestScore) {
        bestScore = score
        bestClue = candidate
        bestTargets = targets.map(t => t.word)
      }
    }
  })

  if (!bestClue) {
    // Fallback: pick any safe word
    bestClue = candidates.find(c => {
      const assassinSim = assassin ? getSimilarity(c, assassin) : 0
      return assassinSim < 0.3
    }) || candidates[0]
    bestTargets = [teamWords[0]]
  }

  return {
    word: bestClue,
    number: bestTargets.length,
    targets: bestTargets,
    confidence: Math.min(1, bestScore / 3)
  }
}

// ── AI Guesser ────────────────────────────────────────────────────────────────
export function aiGuess(clueWord, clueNumber, board, team, difficulty = 'medium') {
  const unrevealedWords = board.filter(c => !c.revealed)
  const assassin = board.find(c => c.role === 'assassin' && !c.revealed)?.word

  const randomness = { easy: 0.4, medium: 0.2, hard: 0.05 }[difficulty]
  const mistakeRate = { easy: 0.3, medium: 0.15, hard: 0.05 }[difficulty]
  const threshold = { easy: 0.35, medium: 0.5, hard: 0.6 }[difficulty]

  const scored = unrevealedWords.map(cell => {
    let sim = getSimilarity(clueWord, cell.word)
    // Add randomness
    sim += (Math.random() - 0.5) * randomness
    // Assassin avoidance
    if (cell.role === 'assassin') sim -= 0.5
    return { ...cell, sim }
  }).sort((a, b) => b.sim - a.sim)

  const guesses = []
  for (let i = 0; i < Math.min(clueNumber + 1, scored.length); i++) {
    const candidate = scored[i]
    if (candidate.sim < threshold) break
    // Mistake: occasionally pick wrong word
    if (Math.random() < mistakeRate && i > 0) break
    guesses.push(candidate)
  }

  return guesses
}

// ── Win Condition ─────────────────────────────────────────────────────────────
export function checkWin(board) {
  const redLeft  = board.filter(c => c.role === 'red'  && !c.revealed).length
  const blueLeft = board.filter(c => c.role === 'blue' && !c.revealed).length
  const assassinRevealed = board.find(c => c.role === 'assassin' && c.revealed)

  if (assassinRevealed) return { winner: assassinRevealed.revealedBy === 'red' ? 'blue' : 'red', reason: 'assassin' }
  if (redLeft === 0)  return { winner: 'red',  reason: 'all_found' }
  if (blueLeft === 0) return { winner: 'blue', reason: 'all_found' }
  return null
}

export function getTeamScore(board) {
  return {
    red:  { total: 9, found: board.filter(c => c.role === 'red'  && c.revealed).length },
    blue: { total: 8, found: board.filter(c => c.role === 'blue' && c.revealed).length }
  }
}
