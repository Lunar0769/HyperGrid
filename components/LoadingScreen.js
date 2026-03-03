import { useEffect, useState } from 'react'

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0)
  const [loadingText, setLoadingText] = useState('INITIALIZING SYSTEM...')
  
  useEffect(() => {
    const messages = [
      { text: 'INITIALIZING SYSTEM...', progress: 20 },
      { text: 'LOADING GAME ASSETS...', progress: 40 },
      { text: 'CONNECTING TO SERVERS...', progress: 60 },
      { text: 'SYNCING MULTIPLAYER DATA...', progress: 80 },
      { text: 'RENDERING INTERFACE...', progress: 95 },
      { text: 'SYSTEM READY', progress: 100 }
    ]
    
    let currentIndex = 0
    
    const updateProgress = () => {
      if (currentIndex < messages.length) {
        const message = messages[currentIndex]
        setLoadingText(message.text)
        
        // Animate progress
        const startProgress = progress
        const targetProgress = message.progress
        const steps = 20
        const increment = (targetProgress - startProgress) / steps
        let step = 0
        
        const progressInterval = setInterval(() => {
          step++
          const newProgress = Math.min(startProgress + (increment * step), targetProgress)
          setProgress(Math.floor(newProgress))
          
          if (step >= steps) {
            clearInterval(progressInterval)
            currentIndex++
            
            if (currentIndex < messages.length) {
              setTimeout(updateProgress, 400)
            } else {
              // Complete loading
              setTimeout(() => {
                if (onComplete) onComplete()
              }, 600)
            }
          }
        }, 30)
      }
    }
    
    // Start loading sequence
    setTimeout(updateProgress, 500)
  }, [])
  
  return (
    <div className="loading-screen">
      <div className="loading-noise"></div>
      
      <div className="loading-content">
        <div className="loading-logo">
          <div className="loading-logo-text">HYPERGRID</div>
          <div className="loading-logo-subtitle">GAME HUB</div>
        </div>
        
        <div className="loading-bar-container">
          <div className="loading-bar-bg">
            <div 
              className="loading-bar-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="loading-percentage">{progress}%</div>
        </div>
        
        <div className="loading-text">
          <span className="loading-bracket">&gt;</span>
          <span className="loading-status">
            {loadingText}
            <span className="loading-cursor">_</span>
          </span>
        </div>
        
        <div className="loading-dots">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
      </div>
      
      <div className="loading-grid">
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i} className="loading-grid-cell"></div>
        ))}
      </div>
    </div>
  )
}
