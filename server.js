const { createServer } = require('http')
const { Server } = require('socket.io')

const httpServer = createServer((req, res) => {
  // Health check endpoint for Railway
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }))
    return
  }
  
  res.writeHead(404)
  res.end('Not found')
})

const io = new Server(httpServer, {
  cors: {
    origin: true, // Allow all origins temporarily for debugging
    methods: ["GET", "POST"],
    credentials: true
  }
})

// Game state storage
const rooms = new Map()
const hyperpolyRooms = new Map()
const mafiaRooms = new Map()

class GameRoom {
  constructor(roomId, hostId) {
    this.roomId = roomId
    this.hostId = hostId
    this.players = new Map()
    this.spectators = new Map()
    this.activePlayers = { X: null, O: null }
    this.gameState = {
      boards: Array.from({ length: 9 }, () => Array(9).fill(null)),
      subBoardWinners: Array(9).fill(null), // Track winners of each sub-board
      nextBoard: null,
      currentPlayer: 'X',
      gameStatus: 'waiting',
      canChooseBoard: false, // When true, current player can select any available board
      boardChooser: null // Who gets to choose the board (can be different from currentPlayer)
    }
  }

  addPlayer(socketId, username, isHost = false) {
    const player = { id: socketId, username, isHost }
    this.players.set(socketId, player)
    if (isHost) {
      this.hostId = socketId
    }
  }

  addSpectator(socketId, username) {
    const spectator = { id: socketId, username }
    this.spectators.set(socketId, spectator)
  }

  removePlayer(socketId) {
    this.players.delete(socketId)
    this.spectators.delete(socketId)
    
    // Remove from active players if they were assigned
    if (this.activePlayers.X && this.getPlayerByUsername(this.activePlayers.X)?.id === socketId) {
      this.activePlayers.X = null
    }
    if (this.activePlayers.O && this.getPlayerByUsername(this.activePlayers.O)?.id === socketId) {
      this.activePlayers.O = null
    }
  }

  getPlayerByUsername(username) {
    for (let player of this.players.values()) {
      if (player.username === username) return player
    }
    return null
  }

  assignPlayer(userId, symbol) {
    const player = this.players.get(userId)
    if (player) {
      // Clear previous assignment for this player
      if (this.activePlayers.X === player.username) this.activePlayers.X = null
      if (this.activePlayers.O === player.username) this.activePlayers.O = null
      
      // If symbol is 'clear', just remove the player assignment
      if (symbol === 'clear') {
        return
      }
      
      // Clear the symbol slot if another player was assigned to it
      if (symbol === 'X' || symbol === 'O') {
        this.activePlayers[symbol] = player.username
      }
    }
  }

  makeMove(socketId, boardIndex, cellIndex) {
    const player = this.players.get(socketId)
    if (!player || this.gameState.gameStatus !== 'playing') return false

    const playerSymbol = this.activePlayers.X === player.username ? 'X' : 
                        this.activePlayers.O === player.username ? 'O' : null
    
    if (!playerSymbol || playerSymbol !== this.gameState.currentPlayer) return false

    // Check if move is valid
    if (!this.gameState.canChooseBoard) {
      if (this.gameState.nextBoard !== null && this.gameState.nextBoard !== boardIndex) return false
    }
    if (this.gameState.boards[boardIndex][cellIndex] !== null) return false
    if (this.isSubBoardComplete(this.gameState.boards[boardIndex])) return false

    // Make the move
    this.gameState.boards[boardIndex][cellIndex] = playerSymbol

    // Check if this move won the sub-board
    const subBoardWinner = this.getSubBoardWinner(this.gameState.boards[boardIndex])
    if (subBoardWinner) {
      this.gameState.subBoardWinners[boardIndex] = subBoardWinner
    } else if (this.gameState.boards[boardIndex].every(cell => cell !== null)) {
      // Sub-board is tied (full but no winner)
      this.gameState.subBoardWinners[boardIndex] = 'tie'
    }

    // Determine next board based on the cell clicked
    const targetBoardIndex = cellIndex
    const targetBoardWinner = this.gameState.subBoardWinners[targetBoardIndex]
    const nextPlayer = playerSymbol === 'X' ? 'O' : 'X'
    
    if (targetBoardWinner && targetBoardWinner !== 'tie') {
      // Target board has a winner - the winner of that board gets to choose where the next player plays
      this.gameState.currentPlayer = nextPlayer // Next player will make the move
      this.gameState.boardChooser = targetBoardWinner // Winner of the board chooses where
      this.gameState.nextBoard = null
      this.gameState.canChooseBoard = true
    } else if (this.isSubBoardComplete(this.gameState.boards[targetBoardIndex])) {
      // Target board is tied or full, next player can choose any available board
      this.gameState.currentPlayer = nextPlayer
      this.gameState.boardChooser = nextPlayer
      this.gameState.nextBoard = null
      this.gameState.canChooseBoard = true
    } else {
      // Target board is available, next player must play there
      this.gameState.currentPlayer = nextPlayer
      this.gameState.boardChooser = null
      this.gameState.nextBoard = targetBoardIndex
      this.gameState.canChooseBoard = false
    }

    // Check for game win condition
    this.checkGameWin()

    return true
  }

  selectBoard(socketId, boardIndex) {
    const player = this.players.get(socketId)
    if (!player || this.gameState.gameStatus !== 'playing') return false

    const playerSymbol = this.activePlayers.X === player.username ? 'X' : 
                        this.activePlayers.O === player.username ? 'O' : null
    
    if (!playerSymbol) return false
    if (this.isSubBoardComplete(this.gameState.boards[boardIndex])) return false

    // Check if this player can choose a board
    if (!this.gameState.canChooseBoard) return false
    
    // Check if this player is the one who should choose the board
    const chooser = this.gameState.boardChooser || this.gameState.currentPlayer
    if (playerSymbol !== chooser) return false

    // Set the selected board as the next board
    this.gameState.nextBoard = boardIndex
    this.gameState.canChooseBoard = false
    this.gameState.boardChooser = null // Clear the board chooser

    return true
  }

  checkGameWin() {
    // Use the tracked sub-board winners for meta-game
    const gameWinner = this.getSubBoardWinner(this.gameState.subBoardWinners)
    if (gameWinner && gameWinner !== 'tie') {
      this.gameState.gameStatus = 'finished'
      this.gameState.winner = gameWinner
      return
    }
    
    // Check for tie - all sub-boards are either won or completely filled
    let allBoardsComplete = true
    for (let i = 0; i < 9; i++) {
      if (!this.isSubBoardComplete(this.gameState.boards[i])) {
        allBoardsComplete = false
        break
      }
    }
    
    if (allBoardsComplete) {
      this.gameState.gameStatus = 'finished'
      this.gameState.winner = 'tie'
    }
  }

  isSubBoardComplete(cells) {
    return cells.every(cell => cell !== null) || this.getSubBoardWinner(cells) !== null
  }

  getSubBoardWinner(cells) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ]

    for (let line of lines) {
      const [a, b, c] = line
      if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
        return cells[a]
      }
    }
    return null
  }

  startGame() {
    if (this.activePlayers.X && this.activePlayers.O) {
      this.gameState.gameStatus = 'playing'
      this.gameState.currentPlayer = 'X'
      this.gameState.nextBoard = null
      this.gameState.winner = null
      this.gameState.canChooseBoard = true // First player can choose any board
      this.gameState.boardChooser = 'X' // First player chooses their own board
      return true
    }
    return false
  }

  resetGame() {
    this.gameState = {
      boards: Array.from({ length: 9 }, () => Array(9).fill(null)),
      subBoardWinners: Array(9).fill(null),
      nextBoard: null,
      currentPlayer: 'X',
      gameStatus: 'waiting',
      winner: null,
      canChooseBoard: false,
      boardChooser: null
    }
  }

  getRoomData() {
    const host = Array.from(this.players.values()).find(p => p.id === this.hostId)
    return {
      players: Array.from(this.players.values()),
      spectators: Array.from(this.spectators.values()),
      host: host?.username || null,
      activePlayers: this.activePlayers
    }
  }
}

class HyperPolyRoom {
  constructor(roomId, hostId) {
    this.roomId = roomId
    this.hostId = hostId
    this.players = new Map()
    this.gameStarted = false
    this.gameState = null
  }

  addPlayer(socketId, username, isHost = false) {
    if (this.players.size >= 4) return false // Max 4 players
    const player = { id: socketId, username, isHost }
    this.players.set(socketId, player)
    if (isHost) {
      this.hostId = socketId
    }
    return true
  }

  removePlayer(socketId) {
    this.players.delete(socketId)
    // If host leaves, assign new host
    if (this.hostId === socketId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value
      const newHost = this.players.get(this.hostId)
      if (newHost) newHost.isHost = true
    }
  }

  startGame(initialGameState) {
    if (this.players.size >= 2 && !this.gameStarted) {
      this.gameStarted = true
      this.gameState = initialGameState
      return true
    }
    return false
  }

  updateGameState(newState) {
    this.gameState = newState
  }

  getRoomData() {
    const host = Array.from(this.players.values()).find(p => p.isHost)
    return {
      players: Array.from(this.players.values()).map(p => p.username),
      host: host?.username || null,
      gameStarted: this.gameStarted,
      playerCount: this.players.size
    }
  }
}

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id, 'from origin:', socket.handshake.headers.origin)

  socket.on('joinRoom', ({ roomId, username, isHost }) => {
    console.log('📥 joinRoom received:', { roomId, username, isHost, socketId: socket.id })
    let room = rooms.get(roomId)
    
    if (!room) {
      // Create new room
      room = new GameRoom(roomId, socket.id)
      rooms.set(roomId, room)
      room.addPlayer(socket.id, username, true)
    } else {
      // Join existing room
      if (room.players.size < 6) { // Max 6 people in room
        room.addPlayer(socket.id, username, false)
      } else {
        room.addSpectator(socket.id, username)
      }
    }

    socket.join(roomId)
    socket.roomId = roomId

    // Send room update to all clients in room
    io.to(roomId).emit('roomUpdate', room.getRoomData())
    io.to(roomId).emit('gameUpdate', room.gameState)
  })

  socket.on('assignPlayer', ({ roomId, userId, symbol }) => {
    const room = rooms.get(roomId)
    if (room && room.hostId === socket.id) {
      room.assignPlayer(userId, symbol)
      io.to(roomId).emit('roomUpdate', room.getRoomData())
    }
  })

  socket.on('startGame', ({ roomId }) => {
    const room = rooms.get(roomId)
    if (room && room.hostId === socket.id) {
      if (room.startGame()) {
        io.to(roomId).emit('gameUpdate', room.gameState)
      }
    }
  })

  socket.on('resetGame', ({ roomId }) => {
    const room = rooms.get(roomId)
    if (room && room.hostId === socket.id) {
      room.resetGame()
      io.to(roomId).emit('gameUpdate', room.gameState)
    }
  })

  socket.on('makeMove', ({ roomId, boardIndex, cellIndex }) => {
    const room = rooms.get(roomId)
    if (room && room.makeMove(socket.id, boardIndex, cellIndex)) {
      // Send complete game state update
      io.to(roomId).emit('gameUpdate', room.gameState)
    }
  })

  socket.on('selectBoard', ({ roomId, boardIndex }) => {
    const room = rooms.get(roomId)
    if (room && room.selectBoard(socket.id, boardIndex)) {
      // Send complete game state update
      io.to(roomId).emit('gameUpdate', room.gameState)
    }
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
    
    if (socket.roomId) {
      const room = rooms.get(socket.roomId)
      if (room) {
        room.removePlayer(socket.id)
        
        // If room is empty, delete it
        if (room.players.size === 0 && room.spectators.size === 0) {
          rooms.delete(socket.roomId)
        } else {
          // Update remaining clients
          io.to(socket.roomId).emit('roomUpdate', room.getRoomData())
        }
      }
    }

    if (socket.hyperpolyRoomId) {
      const room = hyperpolyRooms.get(socket.hyperpolyRoomId)
      if (room) {
        room.removePlayer(socket.id)
        
        // If room is empty, delete it
        if (room.players.size === 0) {
          hyperpolyRooms.delete(socket.hyperpolyRoomId)
        } else {
          // Update remaining clients
          io.to(socket.hyperpolyRoomId).emit('hyperpolyRoomUpdate', room.getRoomData())
        }
      }
    }

    if (socket.mafiaRoomId) {
      const room = mafiaRooms.get(socket.mafiaRoomId)
      if (room) {
        room.removePlayer(socket.id)
        if (room.players.size === 0) {
          mafiaRooms.delete(socket.mafiaRoomId)
        } else {
          io.to(socket.mafiaRoomId).emit('mafiaRoomUpdate', room.getRoomData())
        }
      }
    }
  })

  // HyperPoly Events
  socket.on('joinHyperPolyRoom', ({ roomId, username, isHost }) => {
    console.log('📥 joinHyperPolyRoom received:', { roomId, username, isHost, socketId: socket.id })
    let room = hyperpolyRooms.get(roomId)
    
    if (!room) {
      // Create new room
      room = new HyperPolyRoom(roomId, socket.id)
      hyperpolyRooms.set(roomId, room)
      room.addPlayer(socket.id, username, true)
    } else {
      // Join existing room
      if (!room.addPlayer(socket.id, username, false)) {
        socket.emit('error', { message: 'Room is full' })
        return
      }
    }

    socket.join(roomId)
    socket.hyperpolyRoomId = roomId

    // Send room update to all clients in room
    io.to(roomId).emit('hyperpolyRoomUpdate', room.getRoomData())
  })

  socket.on('startHyperPolyGame', ({ roomId, gameState }) => {
    const room = hyperpolyRooms.get(roomId)
    if (room && room.hostId === socket.id) {
      if (room.startGame(gameState)) {
        io.to(roomId).emit('hyperpolyGameStarted', gameState)
      }
    }
  })

  socket.on('hyperpolyGameUpdate', ({ roomId, gameState }) => {
    const room = hyperpolyRooms.get(roomId)
    if (room) {
      room.updateGameState(gameState)
      // Broadcast to all players except sender
      socket.to(roomId).emit('hyperpolyGameStateUpdate', gameState)
    }
  })

  socket.on('hyperpolyPlayerAction', ({ roomId, action, data }) => {
    const room = hyperpolyRooms.get(roomId)
    if (room) {
      // Broadcast player action to all other players
      socket.to(roomId).emit('hyperpolyPlayerAction', { action, data, playerId: socket.id })
    }
  })

  // ── HYPERMAFIA EVENTS ────────────────────────────────────────────────────

  socket.on('joinMafiaRoom', ({ roomId, username, isHost }) => {
    let room = mafiaRooms.get(roomId)
    if (!room) {
      room = new MafiaRoom(roomId, socket.id)
      mafiaRooms.set(roomId, room)
      room.addPlayer(socket.id, username, true)
    } else {
      if (!room.addPlayer(socket.id, username, false)) {
        socket.emit('error', { message: 'Room is full (max 12)' })
        return
      }
    }
    socket.join(roomId)
    socket.mafiaRoomId = roomId
    io.to(roomId).emit('mafiaRoomUpdate', room.getRoomData())
  })

  socket.on('addMafiaBot', ({ roomId }) => {
    const room = mafiaRooms.get(roomId)
    if (room && room.hostSocketId === socket.id) {
      room.addBot()
      io.to(roomId).emit('mafiaRoomUpdate', room.getRoomData())
    }
  })

  socket.on('removeMafiaBot', ({ roomId }) => {
    const room = mafiaRooms.get(roomId)
    if (room && room.hostSocketId === socket.id) {
      room.removeBot()
      io.to(roomId).emit('mafiaRoomUpdate', room.getRoomData())
    }
  })

  socket.on('kickMafiaPlayer', ({ roomId, playerId }) => {
    const room = mafiaRooms.get(roomId)
    if (room && room.hostSocketId === socket.id) {
      room.kickPlayer(playerId)
      io.to(roomId).emit('mafiaRoomUpdate', room.getRoomData())
    }
  })

  socket.on('startMafiaGame', ({ roomId }) => {
    const room = mafiaRooms.get(roomId)
    if (room && room.hostSocketId === socket.id) {
      if (room.startGame()) {
        io.to(roomId).emit('mafiaGameStarted', room.gameState)
        // Trigger bot actions for role assignment phase
        room.runBotActions(io)
      }
    }
  })

  socket.on('mafiaPhaseChange', ({ roomId, phase }) => {
    const room = mafiaRooms.get(roomId)
    if (room && room.hostSocketId === socket.id) {
      room.changePhase(phase)
      io.to(roomId).emit('mafiaGameStateUpdate', room.gameState)
      // Trigger bot actions for new phase
      setTimeout(() => room.runBotActions(io), 500)
    }
  })

  socket.on('mafiaAction', ({ roomId, playerId, action, targetId }) => {
    const room = mafiaRooms.get(roomId)
    if (room) {
      room.submitNightAction(playerId, action, targetId)
      io.to(roomId).emit('mafiaGameStateUpdate', room.gameState)
    }
  })

  socket.on('mafiaVote', ({ roomId, voterId, targetId }) => {
    const room = mafiaRooms.get(roomId)
    if (room) {
      room.castVote(voterId, targetId)
      io.to(roomId).emit('mafiaGameStateUpdate', room.gameState)
    }
  })

  socket.on('mafiaChatMessage', ({ roomId, playerId, message }) => {
    const room = mafiaRooms.get(roomId)
    if (room) {
      room.addChatMessage(playerId, message)
      io.to(roomId).emit('mafiaGameStateUpdate', room.gameState)
    }
  })

  socket.on('mafiaResolveVotes', ({ roomId }) => {
    const room = mafiaRooms.get(roomId)
    if (room && room.hostSocketId === socket.id) {
      room.resolveVotes()
      io.to(roomId).emit('mafiaGameStateUpdate', room.gameState)
    }
  })

  socket.on('mafiaNextRound', ({ roomId }) => {
    const room = mafiaRooms.get(roomId)
    if (room && room.hostSocketId === socket.id) {
      room.nextRound()
      io.to(roomId).emit('mafiaGameStateUpdate', room.gameState)
      setTimeout(() => room.runBotActions(io), 500)
    }
  })
})

// ============================================================================
// MAFIA ROOM CLASS
// ============================================================================

class MafiaRoom {
  constructor(roomId, hostSocketId) {
    this.roomId = roomId
    this.hostSocketId = hostSocketId
    this.players = new Map() // socketId -> player obj
    this.gameStarted = false
    this.gameState = null
    this.botTimers = []
  }

  addPlayer(socketId, username, isHost = false) {
    if (this.players.size >= 12) return false
    this.players.set(socketId, {
      id: socketId,
      name: username,
      isHost,
      isBot: false,
      isAlive: true,
      isRevealed: false,
      role: null
    })
    if (isHost) this.hostSocketId = socketId
    return true
  }

  addBot() {
    const bots = Array.from(this.players.values()).filter(p => p.isBot)
    if (bots.length >= 8 || this.players.size >= 12) return false
    const botId = `bot_${bots.length + 1}_${Date.now()}`
    this.players.set(botId, {
      id: botId,
      name: `Bot_${bots.length + 1}`,
      isBot: true,
      isAlive: true,
      isRevealed: false,
      role: null
    })
    return true
  }

  removeBot() {
    const bots = Array.from(this.players.entries()).filter(([, p]) => p.isBot)
    if (bots.length === 0) return false
    const [lastBotId] = bots[bots.length - 1]
    this.players.delete(lastBotId)
    return true
  }

  removePlayer(socketId) {
    this.players.delete(socketId)
    if (this.hostSocketId === socketId && this.players.size > 0) {
      const next = Array.from(this.players.values()).find(p => !p.isBot)
      if (next) {
        this.hostSocketId = next.id
        next.isHost = true
      }
    }
  }

  kickPlayer(playerId) {
    this.players.delete(playerId)
  }

  startGame() {
    if (this.players.size < 4 || this.gameStarted) return false
    this.gameStarted = true

    const playerList = Array.from(this.players.values())
    const count = playerList.length
    const mafiaCount = Math.max(1, Math.floor(count / 4))

    const rolePool = []
    for (let i = 0; i < mafiaCount; i++) rolePool.push('Mafia')
    rolePool.push('Detective')
    rolePool.push('Doctor')
    while (rolePool.length < count) rolePool.push('Villager')
    const shuffled = rolePool.sort(() => Math.random() - 0.5)

    const players = playerList.map((p, i) => ({ ...p, role: shuffled[i], isAlive: true, isRevealed: false }))
    // Update stored players with roles
    players.forEach(p => this.players.set(p.id, p))

    this.gameState = {
      players,
      phase: 'role_assignment',
      round: 1,
      nightActions: { mafiaTarget: null, doctorSave: null, detectiveInvestigate: null },
      votes: {},
      lastKilled: null,
      lastSaved: null,
      lastInvestigated: null,
      chatMessages: [],
      gameLog: [{ message: 'Game started! Roles have been assigned.', round: 1, timestamp: Date.now() }],
      winner: null,
      pendingResult: null
    }
    return true
  }

  submitNightAction(playerId, action, targetId) {
    if (!this.gameState || this.gameState.phase !== 'night_phase') return
    const player = this.gameState.players.find(p => p.id === playerId)
    if (!player || !player.isAlive) return

    if (action === 'mafia_kill' && player.role === 'Mafia') {
      this.gameState.nightActions.mafiaTarget = targetId
    } else if (action === 'doctor_save' && player.role === 'Doctor') {
      this.gameState.nightActions.doctorSave = targetId
    } else if (action === 'detective_investigate' && player.role === 'Detective') {
      this.gameState.nightActions.detectiveInvestigate = targetId
    }
  }

  castVote(voterId, targetId) {
    if (!this.gameState || this.gameState.phase !== 'voting_phase') return
    const voter = this.gameState.players.find(p => p.id === voterId)
    if (!voter || !voter.isAlive) return
    this.gameState.votes[voterId] = targetId
    this.addLog(`${voter.name} voted.`)
  }

  addChatMessage(playerId, message) {
    if (!this.gameState) return
    const player = this.gameState.players.find(p => p.id === playerId)
    if (!player) return
    if (this.gameState.phase === 'day_discussion' && !player.isAlive) return

    this.gameState.chatMessages.push({
      id: Date.now() + Math.random(),
      playerId,
      playerName: player.name,
      message: message.substring(0, 200),
      isBot: player.isBot,
      timestamp: Date.now()
    })
    if (this.gameState.chatMessages.length > 100) {
      this.gameState.chatMessages.shift()
    }
  }

  changePhase(phase) {
    if (!this.gameState) return

    if (phase === 'night_phase') {
      this.gameState.phase = 'night_phase'
      this.gameState.nightActions = { mafiaTarget: null, doctorSave: null, detectiveInvestigate: null }
      this.gameState.votes = {}
      this.gameState.lastKilled = null
      this.gameState.lastSaved = null
      this.gameState.lastInvestigated = null
      this.addLog(`--- Night ${this.gameState.round} begins ---`)

    } else if (phase === 'day_discussion') {
      const { mafiaTarget, doctorSave, detectiveInvestigate } = this.gameState.nightActions
      this.gameState.lastKilled = null
      this.gameState.lastSaved = null

      if (mafiaTarget && mafiaTarget !== doctorSave) {
        const victim = this.gameState.players.find(p => p.id === mafiaTarget)
        if (victim) {
          victim.isAlive = false
          victim.isRevealed = true
          this.gameState.lastKilled = victim.id
          this.addLog(`${victim.name} was killed during the night.`)
        }
      } else if (mafiaTarget && mafiaTarget === doctorSave) {
        this.gameState.lastSaved = mafiaTarget
        this.addLog(`Someone was saved by the Doctor last night.`)
      } else {
        this.addLog(`No one was killed last night.`)
      }

      if (detectiveInvestigate) {
        const inv = this.gameState.players.find(p => p.id === detectiveInvestigate)
        if (inv) {
          this.gameState.lastInvestigated = { id: inv.id, isMafia: inv.role === 'Mafia' }
        }
      }

      this.gameState.phase = 'day_discussion'
      this.addLog(`--- Day ${this.gameState.round} begins ---`)

      const win = this.checkWin()
      if (win) { this.gameState.winner = win; this.gameState.phase = 'game_end'; return }

    } else if (phase === 'voting_phase') {
      this.gameState.phase = 'voting_phase'
      this.gameState.votes = {}
      this.addLog(`Voting phase started.`)
    }
  }

  resolveVotes() {
    if (!this.gameState) return
    const alive = this.gameState.players.filter(p => p.isAlive)
    const counts = {}
    Object.values(this.gameState.votes).forEach(id => { counts[id] = (counts[id] || 0) + 1 })

    let max = 0, eliminated = null, tied = false
    Object.entries(counts).forEach(([id, c]) => {
      if (c > max) { max = c; eliminated = id; tied = false }
      else if (c === max) { tied = true }
    })

    if (tied || !eliminated || max < Math.ceil(alive.length / 2)) {
      this.addLog(`No majority reached. No one was eliminated.`)
      this.gameState.pendingResult = { type: 'no_elimination' }
    } else {
      const p = this.gameState.players.find(pl => pl.id === eliminated)
      if (p) {
        p.isAlive = false
        p.isRevealed = true
        this.addLog(`${p.name} was eliminated. They were ${p.role}.`)
        this.gameState.pendingResult = { type: 'eliminated', player: p }
      }
    }

    this.gameState.phase = 'result_phase'
    const win = this.checkWin()
    if (win) { this.gameState.winner = win; this.gameState.phase = 'game_end' }
  }

  nextRound() {
    if (!this.gameState) return
    this.gameState.round++
    this.gameState.pendingResult = null
    this.changePhase('night_phase')
  }

  checkWin() {
    const alive = this.gameState.players.filter(p => p.isAlive)
    const mafia = alive.filter(p => p.role === 'Mafia')
    const others = alive.filter(p => p.role !== 'Mafia')
    if (mafia.length === 0) return 'villagers'
    if (mafia.length >= others.length) return 'mafia'
    return null
  }

  addLog(msg) {
    if (!this.gameState) return
    this.gameState.gameLog.push({ message: msg, round: this.gameState.round, timestamp: Date.now() })
    if (this.gameState.gameLog.length > 200) this.gameState.gameLog.shift()
  }

  // Run all bot actions for current phase
  runBotActions(io) {
    if (!this.gameState) return
    const bots = this.gameState.players.filter(p => p.isBot && p.isAlive)

    if (this.gameState.phase === 'night_phase') {
      bots.forEach(bot => {
        const delay = 1000 + Math.random() * 2000
        setTimeout(() => {
          this.submitNightAction(bot.id, this._botNightAction(bot), this._botNightTarget(bot))
          io.to(this.roomId).emit('mafiaGameStateUpdate', this.gameState)
        }, delay)
      })
    }

    if (this.gameState.phase === 'day_discussion') {
      bots.forEach((bot, i) => {
        const delay = 2000 + i * 1500 + Math.random() * 1000
        setTimeout(() => {
          if (!this.gameState || this.gameState.phase !== 'day_discussion') return
          const msg = this._botChatMessage(bot)
          this.addChatMessage(bot.id, msg)
          io.to(this.roomId).emit('mafiaGameStateUpdate', this.gameState)
        }, delay)
      })
    }

    if (this.gameState.phase === 'voting_phase') {
      bots.forEach((bot, i) => {
        const delay = 500 + i * 800 + Math.random() * 500
        setTimeout(() => {
          if (!this.gameState || this.gameState.phase !== 'voting_phase') return
          const target = this._botVoteTarget(bot)
          if (target) {
            this.castVote(bot.id, target)
            io.to(this.roomId).emit('mafiaGameStateUpdate', this.gameState)
          }
        }, delay)
      })
    }
  }

  _botNightAction(bot) {
    if (bot.role === 'Mafia') return 'mafia_kill'
    if (bot.role === 'Doctor') return 'doctor_save'
    if (bot.role === 'Detective') return 'detective_investigate'
    return null
  }

  _botNightTarget(bot) {
    const alive = this.gameState.players.filter(p => p.isAlive)
    if (bot.role === 'Mafia') {
      const targets = alive.filter(p => p.role !== 'Mafia' && p.id !== bot.id)
      return targets.length ? targets[Math.floor(Math.random() * targets.length)].id : null
    }
    if (bot.role === 'Doctor') {
      return Math.random() < 0.6 ? bot.id : alive[Math.floor(Math.random() * alive.length)].id
    }
    if (bot.role === 'Detective') {
      const targets = alive.filter(p => p.id !== bot.id)
      return targets.length ? targets[Math.floor(Math.random() * targets.length)].id : null
    }
    return null
  }

  _botChatMessage(bot) {
    const alive = this.gameState.players.filter(p => p.isAlive && p.id !== bot.id)
    const roll = Math.random()
    const accusations = [
      `I think {t} is acting suspicious.`,
      `Has anyone noticed {t} being quiet?`,
      `I don't trust {t} at all.`,
      `My gut says {t} is mafia.`
    ]
    const defenses = [
      "I'm not mafia, I promise!",
      "Why would I be suspicious?",
      "I've been helping this whole time!"
    ]
    const general = [
      "We need to think carefully.",
      "Something doesn't add up.",
      "The mafia is among us.",
      "Let's not rush this decision.",
      "I was watching last night..."
    ]
    if (roll < 0.4 && alive.length > 0) {
      const t = alive[Math.floor(Math.random() * alive.length)]
      return accusations[Math.floor(Math.random() * accusations.length)].replace('{t}', t.name)
    }
    if (roll < 0.65) return defenses[Math.floor(Math.random() * defenses.length)]
    return general[Math.floor(Math.random() * general.length)]
  }

  _botVoteTarget(bot) {
    const alive = this.gameState.players.filter(p => p.isAlive && p.id !== bot.id)
    if (!alive.length) return null
    if (bot.role === 'Mafia') {
      const nonMafia = alive.filter(p => p.role !== 'Mafia')
      if (nonMafia.length) return nonMafia[Math.floor(Math.random() * nonMafia.length)].id
    }
    return alive[Math.floor(Math.random() * alive.length)].id
  }

  getRoomData() {
    const host = Array.from(this.players.values()).find(p => p.id === this.hostSocketId)
    return {
      players: Array.from(this.players.values()),
      host: host?.name || null,
      gameStarted: this.gameStarted,
      playerCount: this.players.size
    }
  }
}

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})