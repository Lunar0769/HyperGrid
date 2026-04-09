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
const namesRooms = new Map()

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

    if (socket.namesRoomId) {
      const room = namesRooms.get(socket.namesRoomId)
      if (room) {
        room.removePlayer(socket.id)
        if (room.players.size === 0) {
          namesRooms.delete(socket.namesRoomId)
        } else {
          io.to(socket.namesRoomId).emit('namesRoomUpdate', room.getRoomData())
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
        // Auto-start night after 8s role reveal
        setTimeout(() => {
          if (room.gameState && room.gameState.phase === 'role_assignment') {
            room.changePhase('night_phase')
            io.to(roomId).emit('mafiaGameStateUpdate', room.gameState)
            room.runBotActions(io)
            room.startPhaseTimer(io)
          }
        }, 8000)
      }
    }
  })

  socket.on('mafiaPhaseChange', ({ roomId, phase }) => {
    const room = mafiaRooms.get(roomId)
    if (room && room.hostSocketId === socket.id) {
      room.changePhase(phase)
      io.to(roomId).emit('mafiaGameStateUpdate', room.gameState)
      setTimeout(() => room.runBotActions(io), 500)
      // Restart the auto-timer for the new phase
      room.startPhaseTimer(io)
    }
  })

  socket.on('mafiaAction', ({ roomId, playerId, action, targetId }) => {
    const room = mafiaRooms.get(roomId)
    if (room) {
      const allDone = room.submitNightAction(playerId, action, targetId)
      io.to(roomId).emit('mafiaGameStateUpdate', room.gameState)

      // If all human night actions are done, advance to day after a short delay
      if (allDone) {
        if (room.phaseTimer) clearTimeout(room.phaseTimer)
        setTimeout(() => {
          if (room.gameState && room.gameState.phase === 'night_phase') {
            room.changePhase('day_discussion')
            io.to(roomId).emit('mafiaGameStateUpdate', room.gameState)
            room.runBotActions(io)
            room.startPhaseTimer(io)
          }
        }, 1500) // small delay so player sees "action confirmed"
      }
    }
  })

  socket.on('mafiaVote', ({ roomId, voterId, targetId }) => {
    const room = mafiaRooms.get(roomId)
    if (room) {
      room.castVote(voterId, targetId)
      io.to(roomId).emit('mafiaGameStateUpdate', room.gameState)

      // Auto-resolve if all alive players have voted
      if (room.gameState && room.gameState.phase === 'voting_phase') {
        const alive = room.gameState.players.filter(p => p.isAlive)
        const allVoted = alive.every(p => room.gameState.votes[p.id])
        if (allVoted) {
          if (room.phaseTimer) clearTimeout(room.phaseTimer)
          setTimeout(() => {
            if (room.gameState && room.gameState.phase === 'voting_phase') {
              room.resolveVotes()
              io.to(roomId).emit('mafiaGameStateUpdate', room.gameState)
              if (room.gameState.phase !== 'game_end') {
                setTimeout(() => {
                  if (room.gameState && room.gameState.phase === 'result_phase') {
                    room.nextRound()
                    io.to(roomId).emit('mafiaGameStateUpdate', room.gameState)
                    room.runBotActions(io)
                    room.startPhaseTimer(io)
                  }
                }, 4000)
              }
            }
          }, 1000)
        }
      }
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
      if (room.gameState.phase !== 'game_end') {
        setTimeout(() => {
          if (room.gameState && room.gameState.phase === 'result_phase') {
            room.nextRound()
            io.to(roomId).emit('mafiaGameStateUpdate', room.gameState)
            room.runBotActions(io)
            room.startPhaseTimer(io)
          }
        }, 4000)
      }
    }
  })

  socket.on('mafiaNextRound', ({ roomId }) => {
    const room = mafiaRooms.get(roomId)
    if (room && room.hostSocketId === socket.id) {
      room.nextRound()
      io.to(roomId).emit('mafiaGameStateUpdate', room.gameState)
      setTimeout(() => room.runBotActions(io), 500)
      room.startPhaseTimer(io)
    }
  })

  socket.on('mafiaPlayerReady', ({ roomId }) => {
    const room = mafiaRooms.get(roomId)
    if (room) {
      room.setPlayerReady(socket.id)
      io.to(roomId).emit('mafiaRoomUpdate', room.getRoomData())
    }
  })

  socket.on('mafiaUpdateSettings', ({ roomId, settings }) => {
    const room = mafiaRooms.get(roomId)
    if (room && room.hostSocketId === socket.id) {
      room.updateSettings(settings)
      io.to(roomId).emit('mafiaRoomUpdate', room.getRoomData())
    }
  })

  // ── HYPERNAMES EVENTS ────────────────────────────────────────────────────

  socket.on('joinNamesRoom', ({ roomId, username, isHost }) => {
    let room = namesRooms.get(roomId)
    if (!room) {
      room = new CodenamesRoom(roomId, socket.id)
      namesRooms.set(roomId, room)
    }
    room.addPlayer(socket.id, username, isHost)
    socket.join(roomId)
    socket.namesRoomId = roomId
    io.to(roomId).emit('namesRoomUpdate', room.getRoomData())
  })

  socket.on('startNamesGame', ({ roomId }) => {
    const room = namesRooms.get(roomId)
    if (room && room.hostSocketId === socket.id) {
      room.startGame()
      io.to(roomId).emit('namesGameStarted', room.gameState)
    }
  })

  socket.on('namesClue', ({ roomId, clue }) => {
    const room = namesRooms.get(roomId)
    if (room && room.gameState) {
      room.gameState.currentClue = clue
      room.gameState.phase = 'guessing'
      room.gameState.guessesLeft = clue.number + 1
      room.gameState.lastClue = clue
      io.to(roomId).emit('namesGameStateUpdate', room.gameState)
    }
  })

  socket.on('namesGuess', ({ roomId, index }) => {
    const room = namesRooms.get(roomId)
    if (room && room.gameState) {
      room.revealCell(index)
      io.to(roomId).emit('namesGameStateUpdate', room.gameState)
    }
  })

  socket.on('namesEndTurn', ({ roomId }) => {
    const room = namesRooms.get(roomId)
    if (room && room.gameState) {
      room.endTurn()
      io.to(roomId).emit('namesGameStateUpdate', room.gameState)
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
    this.readyPlayers = new Set()
    this.settings = { nightTime: 30, dayTime: 60, voteTime: 30 }
    this.phaseTimer = null
  }

  setPlayerReady(socketId) {
    this.readyPlayers.add(socketId)
  }

  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings }
  }

  startPhaseTimer(io) {
    if (this.phaseTimer) clearTimeout(this.phaseTimer)
    if (!this.gameState) return
    const durMap = {
      'night_phase': this.settings.nightTime * 1000,
      'day_discussion': this.settings.dayTime * 1000,
      'voting_phase': this.settings.voteTime * 1000,
    }
    const dur = durMap[this.gameState.phase]
    if (!dur) return
    this.phaseTimer = setTimeout(() => {
      if (!this.gameState) return
      if (this.gameState.phase === 'night_phase') {
        this.changePhase('day_discussion')
        io.to(this.roomId).emit('mafiaGameStateUpdate', this.gameState)
        this.runBotActions(io)
        this.startPhaseTimer(io)
      } else if (this.gameState.phase === 'day_discussion') {
        this.changePhase('voting_phase')
        io.to(this.roomId).emit('mafiaGameStateUpdate', this.gameState)
        this.runBotActions(io)
        this.startPhaseTimer(io)
      } else if (this.gameState.phase === 'voting_phase') {
        this.resolveVotes()
        io.to(this.roomId).emit('mafiaGameStateUpdate', this.gameState)
        if (this.gameState.phase !== 'game_end') {
          // Auto next round after 5s result display
          setTimeout(() => {
            if (this.gameState && this.gameState.phase === 'result_phase') {
              this.nextRound()
              io.to(this.roomId).emit('mafiaGameStateUpdate', this.gameState)
              this.runBotActions(io)
              this.startPhaseTimer(io)
            }
          }, 5000)
        }
      }
    }, dur)
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
    const personality = ['aggressive', 'passive', 'manipulator'][Math.floor(Math.random() * 3)]
    const name = this._generateBotName(personality)
    const botId = `bot_${bots.length + 1}_${Date.now()}`
    this.players.set(botId, {
      id: botId,
      name,
      isBot: true,
      isAlive: true,
      isRevealed: false,
      role: null,
      personality,
      memory: {},
      _lastMsg: ''
    })
    return true
  }

  _generateBotName(personality) {
    const prefix = ['Dark','Neo','Shadow','Silent','Ghost','Alpha','Toxic','Mystic','Void','Neon','Hyper','Rogue']
    const core   = ['Raven','Nix','Kira','Blaze','Knight','Wolf','Hunter','Zed','Viper','Storm','Byte','Flux']
    const suffix = ['X','99','_YT','_OP','_47','.exe','_live','_GG','007','_pro']
    const personalityNames = {
      aggressive: ['Blaze','Hunter','Toxic','Alpha','Viper','Storm'],
      passive:    ['Silent','Ghost','Void','Byte'],
      manipulator:['Mystic','Shadow','Nix','Rogue']
    }
    const used = new Set(Array.from(this.players.values()).map(p => p.name))
    const pool = personalityNames[personality] || []
    for (let i = 0; i < 10; i++) {
      let name
      const r = n => Math.floor(Math.random() * n)
      if (pool.length && Math.random() < 0.5) {
        name = pool[r(pool.length)] + suffix[r(suffix.length)]
      } else {
        const pat = r(4)
        if (pat === 0) name = prefix[r(prefix.length)] + core[r(core.length)]
        else if (pat === 1) name = core[r(core.length)] + suffix[r(suffix.length)]
        else if (pat === 2) name = prefix[r(prefix.length)] + '_' + core[r(core.length)]
        else name = core[r(core.length)] + '_' + (Math.floor(Math.random() * 990) + 10)
      }
      if (!used.has(name)) return name
    }
    return 'Player' + Date.now().toString().slice(-4)
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

    const players = playerList.map((p, i) => ({
      ...p,
      role: shuffled[i],
      isAlive: true,
      isRevealed: false,
      personality: p.isBot ? (p.personality || 'passive') : undefined,
      memory: p.isBot ? {} : undefined,
      _lastMsg: p.isBot ? '' : undefined
    }))
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
    if (!this.gameState || this.gameState.phase !== 'night_phase') return false
    const player = this.gameState.players.find(p => p.id === playerId)
    if (!player || !player.isAlive) return false

    if (action === 'mafia_kill' && player.role === 'Mafia') {
      this.gameState.nightActions.mafiaTarget = targetId
    } else if (action === 'doctor_save' && player.role === 'Doctor') {
      this.gameState.nightActions.doctorSave = targetId
    } else if (action === 'detective_investigate' && player.role === 'Detective') {
      this.gameState.nightActions.detectiveInvestigate = targetId
    }

    // Check if all human players with night roles have acted
    return this._allNightActionsDone()
  }

  _allNightActionsDone() {
    if (!this.gameState) return false
    const alive = this.gameState.players.filter(p => p.isAlive)
    const humanMafia      = alive.filter(p => !p.isBot && p.role === 'Mafia')
    const humanDoctor     = alive.filter(p => !p.isBot && p.role === 'Doctor')
    const humanDetective  = alive.filter(p => !p.isBot && p.role === 'Detective')

    const na = this.gameState.nightActions
    const mafiaOk     = humanMafia.length === 0     || na.mafiaTarget !== null
    const doctorOk    = humanDoctor.length === 0    || na.doctorSave !== null
    const detectiveOk = humanDetective.length === 0 || na.detectiveInvestigate !== null

    return mafiaOk && doctorOk && detectiveOk
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

  // ── Bot Intelligence Engine ────────────────────────────────────────────────
  runBotActions(io) {
    if (!this.gameState) return
    const bots = this.gameState.players.filter(p => p.isBot && p.isAlive)

    // ── Night phase ──────────────────────────────────────────────────────────
    if (this.gameState.phase === 'night_phase') {
      bots.forEach(bot => {
        const delay = 1000 + Math.random() * 2500
        setTimeout(() => {
          if (!this.gameState || this.gameState.phase !== 'night_phase') return
          const action = this._botNightAction(bot)
          const target = this._botNightTarget(bot)
          if (action && target) {
            this.submitNightAction(bot.id, action, target)
            io.to(this.roomId).emit('mafiaGameStateUpdate', this.gameState)
          }
        }, delay)
      })
    }

    // ── Day discussion: multi-message with typing delay ──────────────────────
    if (this.gameState.phase === 'day_discussion') {
      // Update bot memory from recent chat
      bots.forEach(bot => {
        bot.memory = this._updateBotMemory(bot, this.gameState.chatMessages, this.gameState.players)
      })

      bots.forEach((bot, i) => {
        // Each bot sends 1-3 messages spread across the day phase
        const msgCount = bot.personality === 'passive' ? 1 : bot.personality === 'aggressive' ? 3 : 2
        for (let m = 0; m < msgCount; m++) {
          const baseDelay = 2000 + i * 1200 + m * 4000 + Math.random() * 2000
          setTimeout(() => {
            if (!this.gameState || this.gameState.phase !== 'day_discussion') return
            const msg = this._botChatMessage(bot)
            if (msg) {
              bot._lastMsg = msg
              this.addChatMessage(bot.id, msg)
              io.to(this.roomId).emit('mafiaGameStateUpdate', this.gameState)
            }
          }, baseDelay)
        }
      })
    }

    // ── Voting phase: suspicion-weighted vote ────────────────────────────────
    if (this.gameState.phase === 'voting_phase') {
      bots.forEach((bot, i) => {
        const delay = 800 + i * 600 + Math.random() * 800
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
    const r = arr => arr[Math.floor(Math.random() * arr.length)]
    if (bot.role === 'Mafia') {
      const targets = alive.filter(p => p.role !== 'Mafia' && p.id !== bot.id)
      return targets.length ? r(targets).id : null
    }
    if (bot.role === 'Doctor') {
      return Math.random() < 0.6 ? bot.id : r(alive).id
    }
    if (bot.role === 'Detective') {
      const targets = alive.filter(p => p.id !== bot.id)
      return targets.length ? r(targets).id : null
    }
    return null
  }

  _botChatMessage(bot) {
    const alive = this.gameState.players.filter(p => p.isAlive && p.id !== bot.id)
    if (!alive.length) return null
    const recent = this.gameState.chatMessages.slice(-10)
    const personality = bot.personality || 'passive'
    const memory = bot.memory || {}
    const r = arr => arr[Math.floor(Math.random() * arr.length)]

    // Was bot accused recently?
    const wasAccused = recent.some(m =>
      m.message && m.message.toLowerCase().includes(bot.name.toLowerCase()) &&
      /is mafia|sus|i think|definitely|vote them/.test(m.message.toLowerCase())
    )

    // Highest suspicion target
    const suspicionScores = alive.map(p => {
      const mem = memory[p.id] || {}
      let score = (mem.accusedBy || 0) * 10 + (mem.defensiveCount || 0) * 6 + (mem.silentRounds || 0) * 10
      score -= (mem.agreedWithMajority || 0) * 5
      return { p, score: Math.min(100, Math.max(0, score)) }
    }).sort((a, b) => b.score - a.score)
    const topSuspect = suspicionScores[0]?.score > 20 ? suspicionScores[0].p : null

    // Majority accusation target
    const accCounts = {}
    recent.forEach(m => {
      if (/is mafia|sus|vote/.test((m.message || '').toLowerCase())) {
        alive.forEach(p => {
          if (m.message.toLowerCase().includes(p.name.toLowerCase()))
            accCounts[p.id] = (accCounts[p.id] || 0) + 1
        })
      }
    })
    const majorityEntry = Object.entries(accCounts).sort((a, b) => b[1] - a[1])[0]
    const majorityTarget = majorityEntry && majorityEntry[1] >= 2 ? alive.find(p => p.id === majorityEntry[0]) : null

    const TEMPLATES = {
      accusation: [
        `I've been watching {t}, something feels off.`,
        `{t} is acting strange this round.`,
        `Why is {t} so quiet? Very suspicious.`,
        `My gut says {t} is mafia. Vote them.`,
        `I don't trust {t} at all.`,
        `{t} hasn't said much. That's suspicious.`,
        `I'm calling it — {t} is mafia.`,
      ],
      defense: [
        `That doesn't make sense, I voted with you.`,
        `Why are you targeting me suddenly?`,
        `If I was mafia, I wouldn't play like this.`,
        `I'm not mafia, I promise!`,
        `Think about it — why would mafia act like me?`,
        `I've been helping this whole time!`,
      ],
      agreement: [
        `Yeah I agree, {t} is suspicious.`,
        `I was thinking the same thing about {t}.`,
        `Agreed. Let's vote {t}.`,
        `That makes sense to me.`,
      ],
      doubt: [
        `Not fully convinced yet.`,
        `Something feels off but I'm not sure.`,
        `Maybe, but let's hear more first.`,
        `I'm not sure about that accusation.`,
      ],
      neutral: [
        `I have a bad feeling about someone here...`,
        `We need to think carefully before voting.`,
        `Something doesn't add up.`,
        `The mafia is among us. I can feel it.`,
        `Has anyone noticed anything unusual?`,
        `Let's not rush this decision.`,
        `I trust most of you... most.`,
      ]
    }

    let msgType = 'neutral', target = null

    if (wasAccused) {
      msgType = 'defense'
    } else if (topSuspect) {
      msgType = 'accusation'; target = topSuspect
    } else if (majorityTarget) {
      if (personality === 'manipulator' && Math.random() < 0.7) {
        msgType = 'agreement'; target = majorityTarget
      } else if (personality === 'passive') {
        msgType = 'doubt'
      } else {
        msgType = 'accusation'; target = majorityTarget
      }
    } else {
      const roll = Math.random()
      if (personality === 'aggressive') {
        msgType = roll < 0.8 ? 'accusation' : 'neutral'
        target = r(alive)
      } else if (personality === 'passive') {
        if (roll < 0.5) return null
        msgType = roll < 0.7 ? 'neutral' : 'doubt'
      } else {
        msgType = roll < 0.4 ? 'agreement' : roll < 0.7 ? 'accusation' : 'neutral'
        target = r(alive)
      }
    }

    const pool = TEMPLATES[msgType] || TEMPLATES.neutral
    const lastMsg = bot._lastMsg || ''
    const filtered = pool.filter(t => t !== lastMsg)
    const template = r(filtered.length ? filtered : pool)
    let msg = template.replace('{t}', target ? target.name : r(alive).name)
    return msg
  }

  _botVoteTarget(bot) {
    const alive = this.gameState.players.filter(p => p.isAlive && p.id !== bot.id)
    if (!alive.length) return null
    const r = arr => arr[Math.floor(Math.random() * arr.length)]
    const memory = bot.memory || {}

    // Mafia bots vote strategically for non-mafia
    if (bot.role === 'Mafia') {
      const nonMafia = alive.filter(p => p.role !== 'Mafia')
      if (nonMafia.length) return r(nonMafia).id
    }

    // Suspicion-weighted vote (70%) vs random (30%)
    if (Math.random() < 0.7) {
      const scored = alive.map(p => {
        const mem = memory[p.id] || {}
        return { p, score: (mem.accusedBy || 0) * 10 + (mem.defensiveCount || 0) * 6 }
      }).sort((a, b) => b.score - a.score)
      if (scored[0].score > 0) return scored[0].p.id
    }
    return r(alive).id
  }

  _updateBotMemory(bot, messages, players) {
    const memory = bot.memory || {}
    messages.slice(-20).forEach(msg => {
      const text = (msg.message || '').toLowerCase()
      const isAccusation = /is mafia|sus|i think|definitely|vote them|calling it/.test(text)
      const isDefense = /not mafia|trust me|why me|i promise|wrong about/.test(text)
      players.forEach(p => {
        if (!memory[p.id]) memory[p.id] = {}
        if (isAccusation && text.includes(p.name.toLowerCase())) {
          memory[p.id].accusedBy = (memory[p.id].accusedBy || 0) + 1
        }
        if (isDefense && msg.playerId === p.id) {
          memory[p.id].defensiveCount = (memory[p.id].defensiveCount || 0) + 1
        }
      })
    })
    return memory
  }

  getRoomData() {
    const host = Array.from(this.players.values()).find(p => p.id === this.hostSocketId)
    return {
      players: Array.from(this.players.values()),
      host: host?.name || null,
      gameStarted: this.gameStarted,
      playerCount: this.players.size,
      settings: this.settings,
      readyPlayers: Array.from(this.readyPlayers)
    }
  }
}

// ============================================================================
// CODENAMES ROOM CLASS
// ============================================================================

const CN_WORD_POOL = [
  'ANCHOR','APPLE','ARROW','AXE','BALL','BELL','BOOK','BOTTLE','BOX','BRIDGE',
  'BRUSH','BUCKET','CAMERA','CANDLE','CAR','CARD','CHAIN','CLOCK','CLOUD','COIN',
  'CROWN','CUP','DIAMOND','DOOR','DRUM','EGG','FAN','FEATHER','FLAG','FLASK',
  'FORK','FRAME','GEAR','GLASS','GLOVE','HAMMER','HOOK','KEY','KNIFE','LAMP',
  'LENS','LOCK','MAP','MASK','MIRROR','NEEDLE','NET','PIPE','PLATE','RING',
  'ROPE','SCALE','SCREEN','SHIELD','SHOE','SIGN','SPOON','STAR','STONE','SWORD',
  'TABLE','TORCH','TOWER','TRAP','TREE','UMBRELLA','VASE','WATCH','WHEEL','WIRE',
  'AFRICA','AIRPORT','AMAZON','ARCTIC','BANK','BEACH','BERLIN','CAVE','CHINA',
  'CHURCH','CITY','CLIFF','COAST','COURT','DESERT','DOCK','EGYPT','FARM','FIELD',
  'FOREST','FRANCE','GARDEN','GATE','GREECE','HARBOR','HILL','INDIA','ISLAND',
  'JAPAN','JUNGLE','LAKE','LONDON','MARKET','MARS','MINE','MOON','MOUNTAIN',
  'MUSEUM','OCEAN','PALACE','PARK','PERU','PLAIN','PORT','PRISON','PYRAMID',
  'RIVER','ROME','SCHOOL','SPACE','SPAIN','STATION','TEMPLE','TOKYO','VALLEY',
  'VILLAGE','VOLCANO','WALL','WELL','WOODS','ATTACK','BAKE','BLAST','BREAK',
  'BUILD','BURN','CATCH','CHARGE','CHASE','CLIMB','COOK','CRASH','CUT','DANCE',
  'DIVE','DRAW','DRIVE','DROP','DIG','ESCAPE','FALL','FIGHT','FLY','FOLLOW',
  'FREEZE','GRAB','GROW','GUARD','HACK','HIDE','HUNT','JUMP','KICK','LAUNCH',
  'LEAD','LEAP','LIFT','MARCH','MOVE','OPEN','PAINT','PLANT','PULL','PUSH',
  'RUN','SAIL','SEARCH','SHOOT','SINK','SLIDE','SPIN','STEAL','STRIKE','SWIM',
  'THROW','TRACK','TURN','AGENT','ALARM','ANGEL','ANSWER','BALANCE','BATTLE',
  'BOND','CHAOS','CODE','CONTROL','CRISIS','CURSE','DANGER','DARK','DAWN',
  'DEATH','DREAM','DUSK','ECHO','ENERGY','EVIL','FAITH','FAME','FATE','FEAR',
  'FIRE','FORCE','GHOST','GLORY','GRACE','GREED','GUILT','HEART','HERO','HONOR',
  'HOPE','HORROR','ICE','IDEA','JUSTICE','KARMA','LEGEND','LIGHT','LOGIC','LUCK',
  'MAGIC','MIND','MYTH','NIGHT','ORDER','PAIN','PEACE','POWER','PRIDE','RAGE',
  'REASON','RISK','RULE','SECRET','SHADOW','SIGNAL','SILENCE','SOUL','SPIRIT',
  'STORM','STRENGTH','TERROR','THEORY','THOUGHT','TIME','TRUTH','VOID','WAR',
  'WISDOM','ALGORITHM','ARRAY','BINARY','BIT','BUFFER','BUG','BYTE','CACHE',
  'CHIP','CIPHER','CIRCUIT','CLONE','CLUSTER','CORE','CRYPTO','DATA','DEBUG',
  'DEPLOY','DEVICE','DOMAIN','DRONE','ENCRYPT','ENGINE','EXPLOIT','FILE',
  'FIREWALL','FLASH','GRID','HOST','INDEX','INPUT','KERNEL','LASER','LINK',
  'LOG','LOOP','MATRIX','MEMORY','MESH','MODULE','NETWORK','NODE','OUTPUT',
  'PACKET','PATCH','PIXEL','PLUGIN','PROCESS','PROTOCOL','PROXY','QUERY',
  'QUEUE','RADAR','RAM','REBOOT','RELAY','RENDER','ROBOT','ROOT','ROUTER',
  'RUNTIME','SCAN','SCRIPT','SERVER','SOCKET','SOURCE','STACK','STREAM','SYNC',
  'SYSTEM','TERMINAL','TOKEN','TRACE','UPLOAD','USER','VECTOR','VIRUS','WAVE',
  'WEB','ZERO','ASTEROID','ATLAS','AURORA','BEACON','COMET','COSMOS','CRATER',
  'ECLIPSE','GALAXY','GRAVITY','HORIZON','METEOR','NEBULA','NOVA','ORBIT',
  'PHOTON','PLANET','PLASMA','PROBE','PULSAR','QUASAR','ROCKET','SATELLITE',
  'SOLAR','SUN','SUPERNOVA','TELESCOPE','TITAN','UNIVERSE','WARP','ZENITH',
  'ALIAS','AMBUSH','ASSASSIN','BADGE','BRIBE','BUREAU','CASE','CLUE','CONTACT',
  'COVER','CRIME','DETECTIVE','DISGUISE','DOUBLE','EVIDENCE','EXPOSE','FUGITIVE',
  'HEIST','INFORMANT','INTEL','MOLE','OPERATION','PROFILE','PURSUIT','RAID',
  'RANSOM','ROGUE','SAFE','SNIPER','SPY','STAKE','SUSPECT','TARGET','UNDERCOVER',
  'VAULT','WITNESS'
]

class CodenamesRoom {
  constructor(roomId, hostSocketId) {
    this.roomId = roomId
    this.hostSocketId = hostSocketId
    this.players = new Map()
    this.gameStarted = false
    this.gameState = null
  }

  addPlayer(socketId, username, isHost = false) {
    if (this.players.size >= 8) return false
    this.players.set(socketId, { id: socketId, name: username, isHost })
    if (isHost) this.hostSocketId = socketId
    return true
  }

  removePlayer(socketId) {
    this.players.delete(socketId)
    if (this.hostSocketId === socketId && this.players.size > 0) {
      const next = this.players.values().next().value
      if (next) { this.hostSocketId = next.id; next.isHost = true }
    }
  }

  startGame() {
    this.gameStarted = true
    const pool = [...CN_WORD_POOL].sort(() => Math.random() - 0.5).slice(0, 25)
    const roles = [...Array(9).fill('red'), ...Array(8).fill('blue'), ...Array(7).fill('neutral'), 'assassin'].sort(() => Math.random() - 0.5)
    const board = pool.map((word, i) => ({ word, role: roles[i], revealed: false, index: i }))
    this.gameState = {
      board, turn: 'red', phase: 'spymaster',
      currentClue: null, guessesLeft: 0, lastClue: null,
      winner: null, round: 1
    }
  }

  revealCell(index) {
    if (!this.gameState) return
    const cell = this.gameState.board[index]
    if (!cell || cell.revealed) return
    cell.revealed = true
    cell.revealedBy = this.gameState.turn

    // Check assassin
    if (cell.role === 'assassin') {
      this.gameState.winner = { winner: this.gameState.turn === 'red' ? 'blue' : 'red', reason: 'assassin' }
      this.gameState.phase = 'end'; return
    }

    // Check win
    const redLeft  = this.gameState.board.filter(c => c.role === 'red'  && !c.revealed).length
    const blueLeft = this.gameState.board.filter(c => c.role === 'blue' && !c.revealed).length
    if (redLeft === 0)  { this.gameState.winner = { winner: 'red',  reason: 'all_found' }; this.gameState.phase = 'end'; return }
    if (blueLeft === 0) { this.gameState.winner = { winner: 'blue', reason: 'all_found' }; this.gameState.phase = 'end'; return }

    // Wrong guess
    if (cell.role !== this.gameState.turn) { this.endTurn(); return }

    this.gameState.guessesLeft--
    if (this.gameState.guessesLeft <= 0) this.endTurn()
  }

  endTurn() {
    if (!this.gameState) return
    this.gameState.turn = this.gameState.turn === 'red' ? 'blue' : 'red'
    this.gameState.phase = 'spymaster'
    this.gameState.currentClue = null
    this.gameState.guessesLeft = 0
    this.gameState.round++
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