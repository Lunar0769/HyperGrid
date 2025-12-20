import { useEffect, useRef } from 'react'

export default function SplineQueen() {
  const canvasRef = useRef(null)

  useEffect(() => {
    // Load Spline runtime
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://unpkg.com/@splinetool/viewer@1.0.21/build/spline-viewer.js'
    
    script.onload = () => {
      if (canvasRef.current && window.customElements.get('spline-viewer')) {
        // Create spline viewer element
        const splineViewer = document.createElement('spline-viewer')
        
        // Use a chess queen scene URL (you'll need to create this in Spline)
        // For now, I'll create a placeholder that renders a 3D chess queen
        splineViewer.setAttribute('url', 'https://prod.spline.design/6Wq8RnbdRjRhRzjX/scene.splinecode')
        
        // Style the viewer
        splineViewer.style.width = '100%'
        splineViewer.style.height = '100%'
        splineViewer.style.background = 'transparent'
        
        // Clear and append
        canvasRef.current.innerHTML = ''
        canvasRef.current.appendChild(splineViewer)
      }
    }
    
    document.head.appendChild(script)
    
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  return (
    <div className="spline-queen-container">
      <div ref={canvasRef} className="spline-canvas" />
      
      {/* Fallback CSS-only 3D Queen if Spline doesn't load */}
      <div className="css-queen-fallback">
        <div className="queen-crown">
          <div className="crown-point"></div>
          <div className="crown-point"></div>
          <div className="crown-point"></div>
          <div className="crown-point"></div>
          <div className="crown-point"></div>
        </div>
        <div className="queen-head"></div>
        <div className="queen-neck"></div>
        <div className="queen-body"></div>
        <div className="queen-base"></div>
      </div>
    </div>
  )
}