import { useState } from 'react'
import { useRouter } from 'next/router'
import ParticleBackground from '../components/ParticleBackground'

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
    <div className="home-container-tech">
      <ParticleBackground />
      
      {/* Top Header */}
      <div className="tech-header">
        <div className="tech-header-content">
          <div className="tech-logo">
            <div className="tech-logo-text">HYPERGRID</div>
            <div className="tech-divider"></div>
            <span className="tech-est">EST. 2025</span>
          </div>
          <div className="tech-coords">
            <span>LAT: 37.7749°</span>
            <div className="tech-dot"></div>
            <span>LONG: 122.4194°</span>
          </div>
        </div>
      </div>

      {/* Corner Frame Accents */}
      <div className="corner-frame corner-tl"></div>
      <div className="corner-frame corner-tr"></div>
      <div className="corner-frame corner-bl"></div>
      <div className="corner-frame corner-br"></div>

      {/* Main Content */}
      <div className="home-content-tech">
        <div className="content-wrapper-tech">
          <div className="content-inner-tech">
            {/* Top decorative line */}
            <div className="deco-line-top">
              <div className="deco-line-short"></div>
              <span className="deco-number">001</span>
              <div className="deco-line-long"></div>
            </div>

            {/* Title */}
            <div className="title-section-tech">
              <div className="dither-accent"></div>
              <h1 className="title-tech">
                ULTIMATE
                <span className="title-sub-tech">TIC TAC TOE</span>
              </h1>
            </div>

            {/* Decorative dots */}
            <div className="deco-dots">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="deco-dot"></div>
              ))}
            </div>

            {/* Description */}
            <div className="description-tech">
              <p>Where strategy meets geometry — 9 boards, infinite possibilities</p>
            </div>

            {/* Mode Selector */}
            <div className="mode-selector-tech">
              <button 
                className={`mode-btn-tech ${mode === 'create' ? 'active' : ''}`}
                onClick={() => setMode('create')}
              >
                <span className="mode-corner mode-corner-tl"></span>
                <span className="mode-corner mode-corner-br"></span>
                CREATE ROOM
              </button>
              <button 
                className={`mode-btn-tech ${mode === 'join' ? 'active' : ''}`}
                onClick={() => setMode('join')}
              >
                <span className="mode-corner mode-corner-tl"></span>
                <span className="mode-corner mode-corner-br"></span>
                JOIN ROOM
              </button>
            </div>

            {/* Input Fields */}
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

            {/* Action Button */}
            <button 
              onClick={mode === 'create' ? createRoom : joinRoom} 
              className="btn-tech-primary"
              disabled={!username.trim() || (mode === 'join' && !roomId.trim())}
            >
              <span className="btn-corner btn-corner-tl"></span>
              <span className="btn-corner btn-corner-br"></span>
              {mode === 'create' ? 'INITIALIZE ROOM' : 'CONNECT TO ROOM'}
            </button>

            {/* HyperPoly Link */}
            <button 
              onClick={() => router.push('/hyperpoly')}
              className="btn-tech-secondary"
              style={{ marginTop: '0.5rem' }}
            >
              <span className="btn-corner btn-corner-tl"></span>
              <span className="btn-corner btn-corner-br"></span>
              🎲 PLAY HYPERPOLY
            </button>

            {/* Bottom technical notation */}
            <div className="deco-line-bottom">
              <span className="deco-symbol">∞</span>
              <div className="deco-line-long"></div>
              <span className="deco-text">HYPERGRID</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="tech-footer">
        <div className="tech-footer-content">
          <div className="tech-status">
            <span className="status-text">SYSTEM.ACTIVE</span>
            <div className="status-bars">
              {Array.from({ length: 8 }).map((_, i) => (
                <div 
                  key={i} 
                  className="status-bar"
                  style={{ height: `${Math.random() * 8 + 4}px` }}
                ></div>
              ))}
            </div>
            <span className="status-version">V1.0.0</span>
          </div>
          <div className="tech-render">
            <span className="render-text">◐ RENDERING</span>
            <div className="render-dots">
              <div className="render-dot render-dot-1"></div>
              <div className="render-dot render-dot-2"></div>
              <div className="render-dot render-dot-3"></div>
            </div>
            <span className="render-frame">FRAME: ∞</span>
          </div>
        </div>
      </div>
    </div>
  )
}