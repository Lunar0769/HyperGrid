import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import io from 'socket.io-client'
import ParticleBackground from '../../components/ParticleBackground'
import GameBoard from '../../components/GameBoard'
import RoomInfo from '../../components/RoomInfo'

export default function Room() {
  const router = useRouter()
  const { roomId, username, host } = router.query

  const [socket, setSocket] = useState(null)
  const [gameState, setGameState] = useState({
    boards: Array.from({ length: 9 }, () => Array(9).fill(null)),
    subBoardWinners: Array(9).fill(null),
    nextBoard: null,
    currentPlayer: 'X',
    gameStatus: 'waiting',
    winner: null,
    canChooseBoard: false,
    boardChooser: null
  })
  const [roomData, setRoomData] = useState({
    players: [],
    spectators: [],
    host: null,
    activePlayers: { X: null, O: null }
  })

  useEffect(() => {
    if (!roomId || !username) return

    // Use the same backend URL for both games
    const socketUrl = 'https://hypergrid-backend-latest.onrender.com'
    console.log('Connecting to WebSocket server:', socketUrl)
    const newSocket = io(socketUrl)
    setSocket(newSocket)

    console.log('Emitting joinRoom:', { roomId, username, isHost: host === 'true' })
    newSocket.emit('joinRoom', {
      roomId,
      username,
      isHost: host === 'true'
    })

    newSocket.on('connect', () => {
      console.log('✅ Connected to WebSocket server')
    })

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error)
    })

    newSocket.on('roomUpdate', (data) => {
      console.log('Room update received:', data)
      setRoomData(data)
    })

    newSocket.on('gameUpdate', (data) => {
      console.log('Game update received:', data)
      setGameState(data)
    })

    newSocket.on('playerMove', (data) => {
      setGameState(prev => ({
        ...prev,
        boards: data.boards,
        nextBoard: data.nextBoard,
        currentPlayer: data.currentPlayer
      }))
    })

    return () => newSocket.close()
  }, [roomId, username, host])

  const makeMove = (boardIndex, cellIndex) => {
    if (socket && gameState.gameStatus === 'playing') {
      socket.emit('makeMove', { roomId, boardIndex, cellIndex })
    }
  }

  const selectBoard = (boardIndex) => {
    console.log('selectBoard called:', { boardIndex, canChooseBoard: gameState.canChooseBoard, gameStatus: gameState.gameStatus })
    if (socket && gameState.gameStatus === 'playing' && gameState.canChooseBoard) {
      console.log('Emitting selectBoard:', { roomId, boardIndex })
      socket.emit('selectBoard', { roomId, boardIndex })
    }
  }

  const assignPlayer = (userId, symbol) => {
    if (socket && roomData.host === username) {
      socket.emit('assignPlayer', { roomId, userId, symbol })
    }
  }

  const startGame = () => {
    if (socket && roomData.host === username) {
      socket.emit('startGame', { roomId })
    }
  }

  if (!roomId || !username) {
    return <div>Loading...</div>
  }

  return (
    <div className="room-container-tech">
      <ParticleBackground />

      {/* Top Header */}
      <div className="tech-header">
        <div className="tech-header-content">
          <div className="tech-logo">
            <div className="tech-logo-text">HYPERGRID</div>
            <div className="tech-divider"></div>
            <span className="tech-est">ROOM: {roomId}</span>
          </div>
          <div className="tech-header-actions">
            {gameState.gameStatus === 'finished' && roomData.host === username && (
              <button
                onClick={() => {
                  if (socket) {
                    socket.emit('resetGame', { roomId })
                  }
                }}
                className="btn-tech-header"
              >
                <span className="btn-corner btn-corner-tl"></span>
                <span className="btn-corner btn-corner-br"></span>
                NEW GAME
              </button>
            )}
            <button
              onClick={() => router.push('/')}
              className="btn-tech-header btn-tech-secondary"
            >
              <span className="btn-corner btn-corner-tl"></span>
              <span className="btn-corner btn-corner-br"></span>
              EXIT
            </button>
          </div>
        </div>
      </div>

      {/* Corner Frame Accents */}
      <div className="corner-frame corner-tl"></div>
      <div className="corner-frame corner-tr"></div>
      <div className="corner-frame corner-bl"></div>
      <div className="corner-frame corner-br"></div>

      {/* Main Content */}
      <div className="room-content-tech">
        <div className="room-layout-tech">
          {/* Room Info Sidebar */}
          <div className="room-sidebar-tech">
            <div className="sidebar-header-tech">
              <div className="deco-line-short"></div>
              <span className="sidebar-title-tech">PLAYERS</span>
              <div className="deco-line-short"></div>
            </div>
            <RoomInfo
              roomData={roomData}
              currentUser={username}
              onAssignPlayer={assignPlayer}
              onStartGame={startGame}
              gameStatus={gameState.gameStatus}
            />
          </div>

          {/* Game Section */}
          <div className="game-section-tech">
            <GameBoard
              boards={gameState.boards}
              subBoardWinners={gameState.subBoardWinners}
              nextBoard={gameState.nextBoard}
              currentPlayer={gameState.currentPlayer}
              canChooseBoard={gameState.canChooseBoard}
              boardChooser={gameState.boardChooser}
              gameStatus={gameState.gameStatus}
              winner={gameState.winner}
              isHost={roomData.host === username}
              onNewGame={() => {
                if (socket) {
                  socket.emit('resetGame', { roomId })
                }
              }}
              onStartGame={startGame}
              canStartGame={roomData.host === username && roomData.activePlayers.X && roomData.activePlayers.O}
              onCellClick={makeMove}
              onBoardSelect={selectBoard}
              playerSymbol={
                roomData.activePlayers.X === username ? 'X' :
                roomData.activePlayers.O === username ? 'O' : null
              }
            />
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="tech-footer">
        <div className="tech-footer-content">
          <div className="tech-status">
            <span className="status-text">GAME.{gameState.gameStatus.toUpperCase()}</span>
            <div className="status-bars">
              {Array.from({ length: 8 }).map((_, i) => (
                <div 
                  key={i} 
                  className="status-bar"
                  style={{ height: `${4 + (i % 4) * 2}px` }}
                ></div>
              ))}
            </div>
            <span className="status-version">PLAYER: {username}</span>
          </div>
          <div className="tech-render">
            <span className="render-text">◐ LIVE</span>
            <div className="render-dots">
              <div className="render-dot render-dot-1"></div>
              <div className="render-dot render-dot-2"></div>
              <div className="render-dot render-dot-3"></div>
            </div>
            <span className="render-frame">TURN: {gameState.currentPlayer}</span>
          </div>
        </div>
      </div>
    </div>
  )
}