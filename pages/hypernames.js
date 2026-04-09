import { useState } from 'react'
import { useRouter } from 'next/router'
import ParticleBackground from '../components/ParticleBackground'

export default function HyperNamesHome() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [roomId, setRoomId] = useState('')
  const [mode, setMode] = useState('single')   // single | create | join | botvsbot
  const [difficulty, setDifficulty] = useState('medium')

  const go = () => {
    if (!username.trim()) return
    if (mode === 'single') {
      router.push(`/hypernames/room/solo?username=${encodeURIComponent(username)}&mode=single&difficulty=${difficulty}`)
    } else if (mode === 'botvsbot') {
      router.push(`/hypernames/room/bvb?username=${encodeURIComponent(username)}&mode=botvsbot`)
    } else if (mode === 'create') {
      const id = Math.random().toString(36).substring(2, 8).toUpperCase()
      router.push(`/hypernames/room/${id}?username=${encodeURIComponent(username)}&host=true&mode=multi`)
    } else {
      if (!roomId.trim()) return
      router.push(`/hypernames/room/${roomId.toUpperCase()}?username=${encodeURIComponent(username)}&mode=multi`)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') go() }

  const MODES = [
    { id: 'single',   label: '🤖 VS AI',        desc: 'You guess, AI gives clues' },
    { id: 'create',   label: '🌐 MULTIPLAYER',   desc: 'Create a room' },
    { id: 'join',     label: '🔗 JOIN ROOM',     desc: 'Join existing room' },
    { id: 'botvsbot', label: '👁 BOT VS BOT',    desc: 'Watch AI play itself' },
  ]

  return (
    <div className="home-container-tech">
      <ParticleBackground />
      <div className="tech-header">
        <div className="tech-header-content">
          <div className="tech-logo">
            <div className="tech-logo-text" style={{ color: '#3498db' }}>HYPERNAMES</div>
            <div className="tech-divider"></div>
            <span className="tech-est">CODENAMES</span>
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
              <span className="deco-number">004</span>
              <div className="deco-line-long"></div>
            </div>

            <div className="title-section-tech">
              <div className="dither-accent" style={{ background: 'rgba(52,152,219,0.3)' }}></div>
              <h1 className="title-tech" style={{ color: '#3498db' }}>
                CODENAMES
                <span className="title-sub-tech" style={{ color: '#3498db' }}>WORD DEDUCTION</span>
              </h1>
            </div>

            <div className="deco-dots">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="deco-dot" style={{ background: 'rgba(52,152,219,0.4)' }}></div>
              ))}
            </div>

            <div className="description-tech">
              <p>5×5 grid • AI Spymaster • Semantic clues • 2-8 players</p>
            </div>

            {/* Mode selector */}
            <div className="cn-mode-grid">
              {MODES.map(m => (
                <button key={m.id} className={`cn-mode-btn ${mode === m.id ? 'active' : ''}`}
                  onClick={() => setMode(m.id)}>
                  <span className="cn-mode-label">{m.label}</span>
                  <span className="cn-mode-desc">{m.desc}</span>
                </button>
              ))}
            </div>

            <div className="input-section-tech">
              <div className="input-group-tech">
                <label className="input-label-tech">PLAYER.NAME</label>
                <input type="text" placeholder="Enter your name" value={username}
                  onChange={e => setUsername(e.target.value)} onKeyPress={handleKey}
                  className="input-tech" autoFocus />
              </div>

              {mode === 'join' && (
                <div className="input-group-tech">
                  <label className="input-label-tech">ROOM.ID</label>
                  <input type="text" placeholder="6-digit code" value={roomId}
                    onChange={e => setRoomId(e.target.value.toUpperCase())} onKeyPress={handleKey}
                    className="input-tech" maxLength={6} />
                </div>
              )}

              {mode === 'single' && (
                <div className="input-group-tech">
                  <label className="input-label-tech">DIFFICULTY</label>
                  <div className="cn-diff-row">
                    {['easy','medium','hard'].map(d => (
                      <button key={d} className={`cn-diff-btn ${difficulty === d ? 'active' : ''}`}
                        onClick={() => setDifficulty(d)}>
                        {d.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={go} className="btn-tech-primary"
              disabled={!username.trim() || (mode === 'join' && !roomId.trim())}
              style={{ borderColor: '#3498db', color: '#3498db' }}>
              <span className="btn-corner btn-corner-tl"></span>
              <span className="btn-corner btn-corner-br"></span>
              🔤 {mode === 'single' ? 'PLAY VS AI' : mode === 'botvsbot' ? 'WATCH BOTS' : mode === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'}
            </button>

            <div className="deco-line-bottom">
              <span className="deco-symbol" style={{ color: '#3498db' }}>∞</span>
              <div className="deco-line-long"></div>
              <span className="deco-text">HYPERNAMES</span>
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
            <span className="render-text">◐ SEMANTIC AI</span>
            <span className="render-frame">500+ WORDS</span>
          </div>
        </div>
      </div>
    </div>
  )
}
