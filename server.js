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
    origin: [
      "http://localhost:3000",
      "https://your-vercel-app.vercel.app", // Replace with your actual Vercel URL
      /\.vercel\.app$/
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
})

// Game state storage
const rooms = new Map()

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

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('joinRoom', ({ roomId, username, isHost }) => {
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
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})