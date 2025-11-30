import confetti from 'canvas-confetti'

// Victory confetti effect
export const fireVictoryConfetti = () => {
  const duration = 3000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 }

  const randomInRange = (min, max) => Math.random() * (max - min) + min

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      return clearInterval(interval)
    }

    const particleCount = 50 * (timeLeft / duration)

    // Fire from left side
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#00ffff', '#0080ff', '#ff0080', '#00ff80']
    })

    // Fire from right side
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#00ffff', '#0080ff', '#ff0080', '#00ff80']
    })
  }, 250)
}

// Side cannons effect
export const fireSideCannons = () => {
  const end = Date.now() + 3000
  const colors = ['#00ffff', '#0080ff', '#ff0080', '#00ff80']

  const frame = () => {
    if (Date.now() > end) return

    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      startVelocity: 60,
      origin: { x: 0, y: 0.5 },
      colors: colors,
      zIndex: 1000
    })

    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1, y: 0.5 },
      colors: colors,
      zIndex: 1000
    })

    requestAnimationFrame(frame)
  }

  frame()
}

// Stars effect
export const fireStars = () => {
  const defaults = {
    spread: 360,
    ticks: 50,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
    zIndex: 1000
  }

  const shoot = () => {
    confetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2,
      shapes: ['star']
    })

    confetti({
      ...defaults,
      particleCount: 10,
      scalar: 0.75,
      shapes: ['circle']
    })
  }

  setTimeout(shoot, 0)
  setTimeout(shoot, 100)
  setTimeout(shoot, 200)
}
