import { useState } from 'react'
import { useRouter } from 'next/router'
import ParticleBackground from '../components/ParticleBackground'

export default function HyperMafiaHome() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [roomId, setRoomId] = useState('')
  const [mode, setMode] = useState('create')

  const createRoom = () => {
    if (username.trim()) {
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
      router.push(`/hypermafia/room/${newRoomId}?username=${encodeURIComponent(username)}&host=true`)
    }
  }

  const joinRoom = () => {
    if (username.trim() && roomId.trim()) {
      router.push(`/hypermafia/room/${roomId.toUpperCase()}?username=${encodeURIComponent(username)}`)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') mode === 'create' ? createRoom() : joinRoom()
  }

  return (
    <div className="home-container-tech">
      <ParticleBackground />

      <div className="tech-header">
        <div className="tech-header-content">
          <div className="tech-logo">
            <div className="tech-logo-text" style={{ color: '#e74c3c' }}>HYPERMAFIA</div>
            <div className="tech-divider"></div>
            <span className="tech-est">SOCIAL DEDUCTION</span>
          </div>
          <button onClick={() => router.push('/')} className="btn-tech-header">
            <span className="btn-corner btn-corner-tl"></span>
            <span className="btn-corner btn-corner-br"></span>
            BACK
          </button>
        </div>
      </div>

      <div className="corner-frame corner-tl"></div>
      <div className="corner-frame corner-tr"></div>
      <div className="corner-frame corner-bl"></div>
      <div className="corner-frame corner-br"></div>

      <div className="home-content-tech">
        <div className="content-wrapper-tech">
          <div className="content-inner-tech">
            <div className="deco-line-top">
              <div className="deco-line-short"></div>
              <span className="deco-number">003</span>
              <div className="deco-line-long"></div>
            </div>

            <div className="title-section-tech">
              <div className="dither-accent" style={{ background: 'rgba(231,76,60,0.3)' }}></div>
              <h1 className="title-tech" style={{ color: '#e74c3c' }}>
                SOCIAL
                <span className="title-sub-tech" style={{ color: '#e74c3c' }}>DEDUCTION GAME</span>
              </h1>
            </div>

            <div className="deco-dots">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="deco-dot" style={{ background: 'rgba(231,76,60,0.4)' }}></div>
              ))}
            </div>

            <div className="description-tech">
              <p>4–12 players • Mafia vs Villagers • AI bots • Night & Day phases</p>
            </div>

            <div className="mafia-roles-preview">
              <div className="role-preview-item">
                <span className="role-icon">🔪</span>
                <span className="role-label">MAFIA</span>
              </div>
              <div className="role-preview-item">
                <span className="role-icon">🔍</span>
                <span className="role-label">DETECTIVE</span>
              </div>
              <div className="role-preview-item">
                <span className="role-icon">💊</span>
                <span className="role-label">DOCTOR</span>
              </div>
              <div className="role-preview-item">
                <span className="role-icon">👤</span>
                <span className="role-label">VILLAGER</span>
              </div>
            </div>

            <div className="mode-selector-tech">
              <button
                className={`mode-btn-tech ${mode === 'create' ? 'active' : ''}`}
                onClick={() => setMode('create')}
                style={mode === 'create' ? { borderColor: '#e74c3c', color: '#e74c3c' } : {}}
              >
                <span className="mode-corner mode-corner-tl"></span>
                <span className="mode-corner mode-corner-br"></span>
                CREATE ROOM
              </button>
              <button
                className={`mode-btn-tech ${mode === 'join' ? 'active' : ''}`}
                onClick={() => setMode('join')}
                style={mode === 'join' ? { borderColor: '#e74c3c', color: '#e74c3c' } : {}}
              >
                <span className="mode-corner mode-corner-tl"></span>
                <span className="mode-corner mode-corner-br"></span>
                JOIN ROOM
              </button>
            </div>

            <div className="input-section-tech">
              <div className="input-group-tech">
                <label className="input-label-tech">PLAYER.NAME</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="input-tech"
                  autoFocus
                />
              </div>

              {mode === 'join' && (
                <div className="input-group-tech">
                  <label className="input-label-tech">ROOM.ID</label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    onKeyPress={handleKeyPress}
                    className="input-tech"
                    maxLength={6}
                  />
                </div>
              )}
            </div>

            <button
              onClick={mode === 'create' ? createRoom : joinRoom}
              className="btn-tech-primary"
              disabled={!username.trim() || (mode === 'join' && !roomId.trim())}
              style={{ borderColor: '#e74c3c', color: '#e74c3c' }}
            >
              <span className="btn-corner btn-corner-tl"></span>
              <span className="btn-corner btn-corner-br"></span>
              {mode === 'create' ? '🔪 CREATE ROOM' : '🔪 JOIN ROOM'}
            </button>

            <div className="deco-line-bottom">
              <span className="deco-symbol" style={{ color: '#e74c3c' }}>∞</span>
              <div className="deco-line-long"></div>
              <span className="deco-text">HYPERMAFIA</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tech-footer">
        <div className="tech-footer-content">
          <div className="tech-status">
            <span className="status-text">SYSTEM.READY</span>
            <span className="status-version">V1.0.0</span>
          </div>
          <div className="tech-render">
            <span className="render-text">◐ GAME MODE</span>
            <span className="render-frame">4-12 PLAYERS</span>
          </div>
        </div>
      </div>
    </div>
  )
}
