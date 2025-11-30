import { useState } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const [username, setUsername] = useState('')
  const [roomId, setRoomId] = useState('')
  const [mode, setMode] = useState('create') // 'create' or 'join'
  const router = useRouter()

  const createRoom = () => {
    if (username.trim()) {
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
      router.push(`/room/${newRoomId}?username=${encodeURIComponent(username)}&host=true`)
    }
  }

  const joinRoom = () => {
    if (username.trim() && roomId.trim()) {
      router.push(`/room/${roomId.toUpperCase()}?username=${encodeURIComponent(username)}`)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (mode === 'create') {
        createRoom()
      } else {
        joinRoom()
      }
    }
  }

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="logo-section">
          <h1 className="title">Hyper Grid</h1>
          <p className="subtitle">Ultimate Tic Tac Toe • Multiplayer</p>
        </div>

        <div className="mode-selector">
          <button 
            className={`mode-btn ${mode === 'create' ? 'active' : ''}`}
            onClick={() => setMode('create')}
          >
            Create Room
          </button>
          <button 
            className={`mode-btn ${mode === 'join' ? 'active' : ''}`}
            onClick={() => setMode('join')}
          >
            Join Room
          </button>
        </div>

        <div className="form-container">
          <div className="input-group">
            <label>Your Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              className="input"
              autoFocus
            />
          </div>

          {mode === 'join' && (
            <div className="input-group">
              <label>Room ID</label>
              <input
                type="text"
                placeholder="Enter room code"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className="input"
                maxLength={6}
              />
            </div>
          )}

          <button 
            onClick={mode === 'create' ? createRoom : joinRoom} 
            className="btn btn-primary btn-large"
            disabled={!username.trim() || (mode === 'join' && !roomId.trim())}
          >
            {mode === 'create' ? '🎮 Create Room' : '🚀 Join Room'}
          </button>

          <div className="hint">
            Press <kbd>Enter</kbd> to continue
          </div>
        </div>
      </div>
    </div>
  )
}