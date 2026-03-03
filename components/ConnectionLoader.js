import { useState, useEffect } from 'react'

export default function ConnectionLoader({ message = 'Connecting to server...' }) {
  const [heights, setHeights] = useState([0, 0, 0, 0, 0, 0, 0])
  const [droplets, setDroplets] = useState([false, false, false, false, false, false, false])
  const [dots, setDots] = useState('')
  
  const colors = [
    { from: '#a855f7', to: '#ec4899', shadow: '#a855f7' }, // purple to pink
    { from: '#3b82f6', to: '#a855f7', shadow: '#3b82f6' }, // blue to purple
    { from: '#06b6d4', to: '#3b82f6', shadow: '#06b6d4' }, // cyan to blue
    { from: '#10b981', to: '#06b6d4', shadow: '#10b981' }, // green to cyan
    { from: '#eab308', to: '#10b981', shadow: '#eab308' }, // yellow to green
    { from: '#f97316', to: '#eab308', shadow: '#f97316' }, // orange to yellow
    { from: '#ef4444', to: '#f97316', shadow: '#ef4444' }  // red to orange
  ]
  
  useEffect(() => {
    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    
    // Animate liquid bars
    const liquidInterval = setInterval(() => {
      setHeights(prev => prev.map((height, index) => {
        const maxHeight = 80
        const delay = index * 0.8
        const time = Date.now() * 0.001
        
        const primaryWave = Math.sin(time + delay)
        const bounceWave = Math.sin(time * 4 + delay) * 0.15
        const ripple = Math.sin(time * 8 + delay) * 0.05
        const combinedWave = primaryWave + bounceWave + ripple
        
        return maxHeight * combinedWave
      }))
      
      setDroplets(prev => prev.map((_, index) => {
        const delay = index * 0.8
        const time = Date.now() * 0.001
        const waveValue = Math.sin(time + delay)
        return waveValue > 0.8
      }))
    }, 32)
    
    return () => {
      clearInterval(dotsInterval)
      clearInterval(liquidInterval)
    }
  }, [])
  
  return (
    <div className="connection-loader-container">
      <div className="liquid-loader-content">
        <div className="liquid-bars">
          {heights.map((height, index) => {
            const color = colors[index]
            const time = Date.now()
            
            return (
              <div key={index} className="liquid-bar-wrapper">
                {/* Droplet */}
                <div 
                  className="liquid-droplet"
                  style={{
                    background: `linear-gradient(135deg, ${color.from}, ${color.to})`,
                    opacity: droplets[index] ? 1 : 0,
                    transform: droplets[index] 
                      ? `translateY(${Math.sin(time * 0.008 + index * 0.5) * 3}px) scale(${0.8 + Math.sin(time * 0.006 + index * 0.3) * 0.4})`
                      : 'translateY(10px) scale(0.5)',
                    boxShadow: droplets[index] ? `0 0 15px ${color.shadow}66` : 'none'
                  }}
                />
                
                {/* Main liquid bar */}
                <div 
                  className="liquid-bar"
                  style={{
                    height: `${Math.abs(height)}px`,
                    background: `linear-gradient(to top, ${color.from}, ${color.to})`,
                    transform: height < 0 ? 'scaleY(-1)' : 'scaleY(1)',
                    boxShadow: `0 0 20px ${color.shadow}80, inset 0 0 20px rgba(255,255,255,0.1)`
                  }}
                >
                  {/* Surface tension */}
                  <div 
                    className="liquid-surface"
                    style={{
                      transform: `translateY(${Math.sin(time * 0.003 + index * 0.5) * 1}px) scaleY(${0.8 + Math.sin(time * 0.004 + index * 0.3) * 0.3})`
                    }}
                  />
                  
                  {/* Wave effect */}
                  <div 
                    className="liquid-wave"
                    style={{
                      transform: `translateY(${Math.sin(time * 0.002 + index * 0.5) * 2}px)`
                    }}
                  />
                  
                  {/* Shimmer */}
                  <div 
                    className="liquid-shimmer"
                    style={{
                      transform: `translateX(${Math.sin(time * 0.0015 + index * 0.7) * 8}px)`
                    }}
                  />
                  
                  {/* Bubble */}
                  <div 
                    className="liquid-bubble"
                    style={{
                      top: `${20 + Math.sin(time * 0.003 + index * 0.8) * 10}%`,
                      left: `${30 + Math.sin(time * 0.002 + index * 0.6) * 20}%`,
                      transform: `scale(${0.5 + Math.sin(time * 0.004 + index * 0.4) * 0.5})`,
                      opacity: Math.sin(time * 0.005 + index * 0.9) * 0.3 + 0.3
                    }}
                  />
                </div>
                
                {/* Base droplet */}
                <div 
                  className="liquid-base-droplet"
                  style={{
                    background: `linear-gradient(135deg, ${color.from}, ${color.to})`,
                    opacity: Math.sin(time * 0.003 + index * 0.9) * 0.4 + 0.6,
                    transform: `scale(${0.6 + Math.sin(time * 0.002 + index * 0.6) * 0.4}) translateY(${Math.sin(time * 0.004 + index * 0.8) * 1}px)`,
                    boxShadow: `0 2px 8px ${color.shadow}66`
                  }}
                />
              </div>
            )
          })}
        </div>
        
        <div className="liquid-loader-text">
          <div className="liquid-message">{message}{dots}</div>
          <div className="liquid-subtext">Please wait</div>
        </div>
      </div>
    </div>
  )
}
