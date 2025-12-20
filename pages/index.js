import { useRouter } from 'next/router'
import ParticleBackground from '../components/ParticleBackground'

export default function Home() {
  const router = useRouter()

  return (
    <div className="home-container-tech">
      <ParticleBackground />
      
      <div className="tech-header">
        <div className="tech-header-content">
          <div className="tech-logo">
            <div className="tech-logo-text">HYPERGRID</div>
            <div className="tech-divider"></div>
            <span className="tech-est">GAME HUB</span>
          </div>
          <div className="tech-coords">
            <span>LAT: 37.7749°</span>
            <div className="tech-dot"></div>
            <span>LONG: 122.4194°</span>
          </div>
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
              <span className="deco-number">001</span>
              <div className="deco-line-long"></div>
            </div>

            <div className="title-section-tech">
              <div className="dither-accent"></div>
              <h1 className="title-tech">
                MULTIPLAYER
                <span className="title-sub-tech">GAME HUB</span>
              </h1>
            </div>

            <div className="deco-dots">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="deco-dot"></div>
              ))}
            </div>

            <div className="game-selection">
              <div className="game-card">
                <div className="game-card-header">
                  <h3>HYPERGRID</h3>
                  <span className="game-badge">MULTIPLAYER</span>
                </div>
                <p className="game-description">Ultimate Tic Tac Toe • 9 boards • Strategic gameplay</p>
                
                <button 
                  onClick={() => router.push('/hypergrid')}
                  className="btn-tech-primary"
                >
                  <span className="btn-corner btn-corner-tl"></span>
                  <span className="btn-corner btn-corner-br"></span>
                  ⚡ PLAY HYPERGRID
                </button>
              </div>

              <div className="game-divider">
                <div className="divider-line"></div>
                <span className="divider-text">OR</span>
                <div className="divider-line"></div>
              </div>

              <div className="game-card">
                <div className="game-card-header">
                  <h3>HYPERPOLY</h3>
                  <span className="game-badge game-badge-new">NEW</span>
                </div>
                <p className="game-description">Mini Monopoly • 10 min games • 2-4 players • Room-based</p>
                
                <button 
                  onClick={() => router.push('/hyperpoly')}
                  className="btn-tech-primary"
                >
                  <span className="btn-corner btn-corner-tl"></span>
                  <span className="btn-corner btn-corner-br"></span>
                  🎲 PLAY HYPERPOLY
                </button>
              </div>
            </div>

            <div className="deco-line-bottom">
              <span className="deco-symbol">∞</span>
              <div className="deco-line-long"></div>
              <span className="deco-text">HYPERGRID</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tech-footer">
        <div className="tech-footer-content">
          <div className="tech-status">
            <span className="status-text">SYSTEM.ACTIVE</span>
            <div className="status-bars">
              {Array.from({ length: 8 }).map((_, i) => (
                <div 
                  key={i} 
                  className="status-bar"
                  style={{ height: `${4 + (i % 4) * 2}px` }}
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
