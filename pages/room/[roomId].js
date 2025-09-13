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

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
    console.log('Connecting to WebSocket server:', socketUrl)
    const newSocket = io(socketUrl)
    setSocket(newSocket)

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
    <div className="room-container">
      <ParticleBackground />
      <div className="room-content">
        <div className="room-header">
          <h1>Room: {roomId}</h1>
          <button 
            onClick={() => router.push('/')}
            className="btn btn-secondary"
          >
            Leave Room
          </button>
        </div>
        
        <div className="room-layout">
          <RoomInfo 
            roomData={roomData}
            currentUser={username}
            onAssignPlayer={assignPlayer}
            onStartGame={startGame}
            gameStatus={gameState.gameStatus}
          />
          
          <div className="game-section">
            {gameState.gameStatus === 'playing' ? (
              <GameBoard 
                boards={gameState.boards}
                subBoardWinners={gameState.subBoardWinners}
                nextBoard={gameState.nextBoard}
                currentPlayer={gameState.currentPlayer}
                canChooseBoard={gameState.canChooseBoard}
                boardChooser={gameState.boardChooser}
                onCellClick={makeMove}
                onBoardSelect={selectBoard}
                playerSymbol={
                  roomData.activePlayers.X === username ? 'X' :
                  roomData.activePlayers.O === username ? 'O' : null
                }
              />
            ) : gameState.gameStatus === 'finished' ? (
              <div className="game-results">
                <h2>🎉 Game Over! 🎉</h2>
                <div className="winner-announcement">
                  {gameState.winner === 'tie' ? (
                    <p>It's a tie! Great game! 🤝</p>
                  ) : (
                    <p>🏆 Player {gameState.winner} wins! 🏆</p>
                  )}
                </div>
                <GameBoard 
                  boards={gameState.boards}
                  subBoardWinners={gameState.subBoardWinners}
                  nextBoard={null}
                  currentPlayer={gameState.currentPlayer}
                  canChooseBoard={false}
                  onCellClick={() => {}} // No clicks allowed
                  onBoardSelect={() => {}} // No board selection allowed
                  playerSymbol={null} // Show as spectator
                />
                {roomData.host === username && (
                  <button 
                    onClick={() => {
                      if (socket) {
                        socket.emit('resetGame', { roomId })
                      }
                    }}
                    className="btn btn-primary"
                    style={{ marginTop: '2rem' }}
                  >
                    Start New Game
                  </button>
                )}
              </div>
            ) : (
              <div className="waiting-area">
                <h2>Waiting for game to start...</h2>
                <p>Host needs to assign players and start the game</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}