import { useState } from 'react'
import { useRouter } from 'next/router'
import ParticleBackground from '../components/ParticleBackground'

export default function HyperPolyHome() {
  const router = useRouter()
  const [playerCount, setPlayerCount] = useState(2)

  const startGame = () => {
    router.push(`/hyperpoly/game?players=${playerCount}`)
  }

  return (
    <div className="home-container-tech">
      <ParticleBackground />
      
      {/* Top Header */}
      <div className="tech-header">
        <div className="tech-header-content">
          <div className="tech-logo">
            <div className="tech-logo-text">HYPERPOLY</div>
            <div className="tech-divider"></div>
            <span className="tech-est">MINI MONOPOLY</span>
          </div>
          <button onClick={() => router.push('/')} className="btn-tech-header">
            <span className="btn-corner btn-corner-tl"></span>
            <span className="btn-corner btn-corner-br"></span>
            BACK
          </button>
        </div>
      </div>

      {/* Corner Frames */}
      <div className="corner-frame corner-tl"></div>
      <div className="corner-frame corner-tr"></div>
      <div className="corner-frame corner-bl"></div>
      <div className="corner-frame corner-br"></div>

      {/* Main Content */}
      <div className="home-content-tech">
        <div className="content-wrapper-tech">
          <div className="content-inner-tech">
            <div className="deco-line-top">
              <div className="deco-line-short"></div>
              <span className="deco-number">001</span>
              <div className="deco-line-long"></div>
            </div>

            <div className="title-section-tech">
              <div className="dither-accent"></div>
              <h1 className="title-tech">
                FAST-PACED
                <span className="title-sub-tech">PROPERTY EMPIRE</span>
              </h1>
            </div>

            <div className="deco-dots">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="deco-dot"></div>
              ))}
            </div>

            <div className="description-tech">
              <p>10 minute games • 40 spaces • 12 properties • Chance cards</p>
            </div>

            <div className="input-section-tech">
              <div className="input-group-tech">
                <label className="input-label-tech">PLAYERS</label>
                <div className="player-selector">
                  {[2, 3, 4].map(count => (
                    <button
                      key={count}
                      onClick={() => setPlayerCount(count)}
                      className={`player-count-btn ${playerCount === count ? 'active' : ''}`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={startGame} className="btn-tech-primary">
              <span className="btn-corner btn-corner-tl"></span>
              <span className="btn-corner btn-corner-br"></span>
              START GAME
            </button>

            <div className="deco-line-bottom">
              <span className="deco-symbol">∞</span>
              <div className="deco-line-long"></div>
              <span className="deco-text">HYPERPOLY</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="tech-footer">
        <div className="tech-footer-content">
          <div className="tech-status">
            <span className="status-text">SYSTEM.READY</span>
            <span className="status-version">V1.0.0</span>
          </div>
          <div className="tech-render">
            <span className="render-text">◐ GAME MODE</span>
            <span className="render-frame">SINGLE PLAYER</span>
          </div>
        </div>
      </div>
    </div>
  )
}
