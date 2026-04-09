import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import { io } from 'socket.io-client'
import ParticleBackground from '../../../components/ParticleBackground'
import ConnectionLoader from '../../../components/ConnectionLoader'
import {
  generateBoard, generateAIClue, aiGuess, checkWin, getTeamScore
} from '../../../utils/codenamesGame'

const SOCKET_URL = 'https://hypergrid-u9d2.onrender.com'

// ── Role colors ───────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  red:      { bg: '#c0392b', border: '#e74c3c', text: '#fff' },
  blue:     { bg: '#2980b9', border: '#3498db', text: '#fff' },
  neutral:  { bg: '#555',    border: '#777',    text: '#ccc' },
  assassin: { bg: '#111',    border: '#e74c3c', text: '#e74c3c' },
  hidden:   { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.2)', text: '#fff' }
}

export default function HyperNamesRoom() {
  const router = useRouter()
  const { roomId, username, host, mode, difficulty } = router.query

  const [socket, setSocket]       = useState(null)
  const [connected, setConnected] = useState(false)
  const [gameState, setGameState] = useState(null)
  const [roomData, setRoomData]   = useState({ players: [], host: null, gameStarted: false })
  const [clueInput, setClueInput] = useState('')
  const [clueNum, setClueNum]     = useState(1)
  const [guessesLeft, setGuessesLeft] = useState(0)
  const [aiThinking, setAiThinking]   = useState(false)
  const [lastClue, setLastClue]       = useState(null)
  const [aiExplain, setAiExplain]     = useState(null)
  const [hoveredCell, setHoveredCell] = useState(null)
  const [revealAnim, setRevealAnim]   = useState(null)
  const [log, setLog]                 = useState([])

  const isSingle   = mode === 'single'
  const isBvB      = mode === 'botvsbot'
  const isMulti    = mode === 'multi'
  const isHost     = host === 'true'
  const diff       = difficulty || 'medium'

  const addLog = useCallback((msg) => {
    setLog(prev => [...prev.slice(-40), { msg, ts: Date.now() }])
  }, [])

  // ── Socket (multiplayer only) ─────────────────────────────────────────────
  useEffect(() => {
    if (!isMulti || !roomId || !username) return
    const s = io(SOCKET_URL, { transports: ['websocket', 'polling'], timeout: 20000 })
    s.on('connect', () => {
      setConnected(true)
      s.emit('joinNamesRoom', { roomId, username, isHost: host === 'true' })
    })
    s.on('namesRoomUpdate', setRoomData)
    s.on('namesGameStarted', (state) => { setGameState(state); setRoomData(p => ({ ...p, gameStarted: true })) })
    s.on('namesGameStateUpdate', (state) => {
      setGameState(state)
      if (state.lastClue) setLastClue(state.lastClue)
    })
    s.on('disconnect', () => setConnected(false))
    setSocket(s)
    return () => s.close()
  }, [roomId, username, host, isMulti])

  // ── Single player / BvB: init locally ────────────────────────────────────
  useEffect(() => {
    if (!isSingle && !isBvB) return
    if (!username) return
    const board = generateBoard()
    const state = {
      board,
      turn: 'red',
      phase: 'spymaster',
      currentClue: null,
      guessesLeft: 0,
      winner: null,
      round: 1
    }
    setGameState(state)
    addLog('Game started! AI is thinking...')
    setTimeout(() => runAISpymaster(state), 1200)
  }, [username]) // eslint-disable-line

  // ── BvB: auto-run guesser after clue ─────────────────────────────────────
  useEffect(() => {
    if (!isBvB || !gameState || gameState.phase !== 'guessing' || !gameState.currentClue) return
    const timer = setTimeout(() => runAIGuesser(gameState), 1500)
    return () => clearTimeout(timer)
  }, [gameState?.phase, gameState?.round, gameState?.currentClue?.word]) // eslint-disable-line

  function runAISpymaster(state) {
    if (!state) return
    setAiThinking(true)
    setTimeout(() => {
      const clue = generateAIClue(state.board, state.turn, diff)
      if (!clue) { setAiThinking(false); return }
      setLastClue(clue)
      setAiExplain(clue)
      addLog(`AI clue: "${clue.word.toUpperCase()}" for ${clue.number} — targeting: ${clue.targets.join(', ')}`)
      const newState = {
        ...state,
        phase: 'guessing',
        currentClue: clue,
        guessesLeft: clue.number + 1  // +1 bonus guess
      }
      setGameState(newState)
      setAiThinking(false)
    }, 800)
  }

  function runAIGuesser(state) {
    if (!state || !state.currentClue) return
    const guesses = aiGuess(state.currentClue.word, state.currentClue.number, state.board, state.turn, diff)
    let delay = 0
    let workingState = { ...state }

    guesses.forEach((guess) => {
      delay += 1200
      setTimeout(() => {
        setGameState(prev => {
          if (!prev || prev.phase !== 'guessing') return prev
          const next = revealCell(prev, guess.index)
          workingState = next
          return next
        })
      }, delay)
    })

    setTimeout(() => {
      setGameState(prev => {
        if (!prev || prev.phase === 'end') return prev
        if (prev.phase === 'guessing') {
          // still guessing — force end turn
          const nextTurn = prev.turn === 'red' ? 'blue' : 'red'
          const next = { ...prev, turn: nextTurn, phase: 'spymaster', currentClue: null, guessesLeft: 0 }
          setTimeout(() => runAISpymaster(next), 1000)
          return next
        }
        return prev
      })
    }, delay + 1000)
  }

  function revealCell(state, index) {
    const cell = state.board[index]
    if (!cell || cell.revealed) return state

    const newBoard = state.board.map((c, i) =>
      i === index ? { ...c, revealed: true, revealedBy: state.turn } : c
    )

    addLog(`Revealed: ${cell.word} → ${cell.role.toUpperCase()}`)
    setRevealAnim(index)
    setTimeout(() => setRevealAnim(null), 600)

    // Assassin
    if (cell.role === 'assassin') {
      addLog('💀 ASSASSIN! Game over.')
      return { ...state, board: newBoard, phase: 'end', winner: { winner: state.turn === 'red' ? 'blue' : 'red', reason: 'assassin' } }
    }

    // Check win after reveal
    const redLeft  = newBoard.filter(c => c.role === 'red'  && !c.revealed).length
    const blueLeft = newBoard.filter(c => c.role === 'blue' && !c.revealed).length
    if (redLeft === 0)  return { ...state, board: newBoard, phase: 'end', winner: { winner: 'red',  reason: 'all_found' } }
    if (blueLeft === 0) return { ...state, board: newBoard, phase: 'end', winner: { winner: 'blue', reason: 'all_found' } }

    // Wrong team word — pass turn
    if (cell.role !== state.turn) {
      addLog(`Wrong! Turn passes.`)
      const nextTurn = state.turn === 'red' ? 'blue' : 'red'
      const next = { ...state, board: newBoard, turn: nextTurn, phase: 'spymaster', currentClue: null, guessesLeft: 0 }
      if (isSingle || isBvB) setTimeout(() => runAISpymaster(next), 1000)
      return next
    }

    // Correct — decrement guesses
    const newGuessesLeft = state.guessesLeft - 1
    addLog(`Correct! ${newGuessesLeft} guess${newGuessesLeft !== 1 ? 'es' : ''} left.`)

    if (newGuessesLeft <= 0) {
      addLog('No guesses left. Turn passes.')
      const nextTurn = state.turn === 'red' ? 'blue' : 'red'
      const next = { ...state, board: newBoard, turn: nextTurn, phase: 'spymaster', currentClue: null, guessesLeft: 0 }
      if (isSingle || isBvB) setTimeout(() => runAISpymaster(next), 1000)
      return next
    }

    return { ...state, board: newBoard, guessesLeft: newGuessesLeft }
  }

  // ── Human guess click ─────────────────────────────────────────────────────
  const handleCellClick = (cell) => {
    if (!gameState || gameState.phase !== 'guessing') return
    if (cell.revealed) return
    if (isSingle && gameState.turn !== 'red') return // human is red guesser
    if (isBvB) return

    if (isMulti) {
      socket?.emit('namesGuess', { roomId, index: cell.index })
      return
    }

    setGameState(prev => revealCell(prev, cell.index))
  }

  // ── Human spymaster clue (multiplayer) ───────────────────────────────────
  const handleSubmitClue = () => {
    if (!clueInput.trim() || clueNum < 1) return
    const clue = { word: clueInput.trim().toUpperCase(), number: clueNum, targets: [] }
    if (isMulti) {
      socket?.emit('namesClue', { roomId, clue })
    } else {
      setLastClue(clue)
      setGameState(prev => ({ ...prev, phase: 'guessing', currentClue: clue, guessesLeft: clue.number + 1 }))
      setGuessesLeft(clue.number + 1)
    }
    setClueInput('')
  }

  const handleEndTurn = () => {
    if (isMulti) { socket?.emit('namesEndTurn', { roomId }); return }
    setGameState(prev => {
      const nextTurn = prev.turn === 'red' ? 'blue' : 'red'
      const next = { ...prev, turn: nextTurn, phase: 'spymaster', currentClue: null, guessesLeft: 0 }
      if (isSingle || isBvB) setTimeout(() => runAISpymaster(next), 800)
      return next
    })
  }

  const handleNewGame = () => {
    const board = generateBoard()
    const state = { board, turn: 'red', phase: 'spymaster', currentClue: null, guessesLeft: 0, winner: null, round: 1 }
    setGameState(state)
    setLastClue(null)
    setAiExplain(null)
    setLog([])
    addLog('New game started!')
    if (isSingle || isBvB) setTimeout(() => runAISpymaster(state), 1000)
  }

  // ── Multiplayer lobby ─────────────────────────────────────────────────────
  if (isMulti && !connected) return <ConnectionLoader message="Connecting..." />
  if (isMulti && !roomData.gameStarted) {
    return (
      <div className="cn-container">
        <ParticleBackground />
        <NamesHeader roomId={roomId} router={router} />
        <div className="cn-lobby">
          <div className="cn-lobby-card">
            <div className="cn-lobby-title">🔤 HYPERNAMES</div>
            <div className="cn-room-code">Room: <span>{roomId}</span></div>
            <div className="cn-players-list">
              {roomData.players.map((p, i) => (
                <div key={i} className="cn-lobby-player">
                  <div className="cn-player-dot" style={{ background: i % 2 === 0 ? '#e74c3c' : '#3498db' }}></div>
                  <span>{p.name || p}</span>
                  {(p.name || p) === roomData.host && <span className="mafia-host-badge">HOST</span>}
                </div>
              ))}
            </div>
            <div className="cn-lobby-info">{roomData.players.length}/8 players</div>
            {isHost && (
              <button className="mafia-btn mafia-btn-primary"
                onClick={() => socket?.emit('startNamesGame', { roomId })}
                disabled={roomData.players.length < 2}>
                🔤 START GAME
              </button>
            )}
            {!isHost && <div className="mafia-waiting-msg">Waiting for host...</div>}
          </div>
        </div>
      </div>
    )
  }

  if (!gameState) return <ConnectionLoader message="Loading game..." />

  const score = getTeamScore(gameState.board)
  const isMyTurn = isSingle ? gameState.turn === 'red' : true
  const isSpymasterPhase = gameState.phase === 'spymaster'
  const isGuessingPhase  = gameState.phase === 'guessing'
  const isEnd            = gameState.phase === 'end'
  const isSpymaster      = isMulti // in multiplayer, show spymaster view to spymaster role

  return (
    <div className="cn-container">
      <ParticleBackground />
      <NamesHeader roomId={roomId} router={router} />

      {/* Score bar */}
      <div className="cn-score-bar">
        <div className="cn-score-team red">
          <span className="cn-score-label">RED</span>
          <span className="cn-score-num">{score.red.found}/{score.red.total}</span>
        </div>
        <div className="cn-turn-indicator" style={{ color: gameState.turn === 'red' ? '#e74c3c' : '#3498db' }}>
          {isEnd ? (gameState.winner?.winner?.toUpperCase() + ' WINS!') :
           aiThinking ? '🤖 AI thinking...' :
           isGuessingPhase ? `${gameState.turn.toUpperCase()} GUESSING — ${gameState.guessesLeft} left` :
           `${gameState.turn.toUpperCase()} SPYMASTER`}
        </div>
        <div className="cn-score-team blue">
          <span className="cn-score-num">{score.blue.found}/{score.blue.total}</span>
          <span className="cn-score-label">BLUE</span>
        </div>
      </div>

      {/* Clue display */}
      {lastClue && !isEnd && (
        <div className="cn-clue-display">
          <span className="cn-clue-word">{lastClue.word}</span>
          <span className="cn-clue-num">{lastClue.number}</span>
          {aiExplain && isSingle && (
            <span className="cn-clue-explain">AI targets: {aiExplain.targets.join(', ')}</span>
          )}
        </div>
      )}

      {/* 5×5 Board */}
      <div className="cn-board">
        {gameState.board.map((cell, i) => {
          const revealed = cell.revealed
          const colors = revealed ? ROLE_COLORS[cell.role] : ROLE_COLORS.hidden
          const isHovered = hoveredCell === i
          const isAnimating = revealAnim === i
          const canClick = isGuessingPhase && !revealed && !isBvB && (isSingle ? gameState.turn === 'red' : true)

          return (
            <div
              key={i}
              className={`cn-cell ${revealed ? 'revealed' : ''} ${isAnimating ? 'reveal-anim' : ''} ${canClick ? 'clickable' : ''}`}
              style={{
                background: colors.bg,
                borderColor: isHovered && canClick ? '#fff' : colors.border,
                color: colors.text,
                transform: isAnimating ? 'scale(1.08)' : isHovered && canClick ? 'scale(1.03)' : 'scale(1)'
              }}
              onClick={() => handleCellClick(cell)}
              onMouseEnter={() => setHoveredCell(i)}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="cn-cell-word">{cell.word}</span>
              {revealed && cell.role === 'assassin' && <span className="cn-assassin-icon">💀</span>}
              {revealed && cell.role === 'red'  && <span className="cn-role-dot" style={{ background: '#e74c3c' }}></span>}
              {revealed && cell.role === 'blue' && <span className="cn-role-dot" style={{ background: '#3498db' }}></span>}
            </div>
          )
        })}
      </div>

      {/* Action panel */}
      <div className="cn-action-panel">
        {isEnd ? (
          <div className="cn-end-panel">
            <div className="cn-end-icon">{gameState.winner?.reason === 'assassin' ? '💀' : '🏆'}</div>
            <div className="cn-end-title" style={{ color: gameState.winner?.winner === 'red' ? '#e74c3c' : '#3498db' }}>
              {gameState.winner?.winner?.toUpperCase()} WINS
            </div>
            <div className="cn-end-reason">
              {gameState.winner?.reason === 'assassin' ? 'Assassin was revealed!' : 'All words found!'}
            </div>
            <button className="mafia-btn mafia-btn-primary" onClick={handleNewGame}>🔄 NEW GAME</button>
          </div>
        ) : aiThinking ? (
          <div className="cn-thinking">
            <div className="cn-thinking-dots"><span></span><span></span><span></span></div>
            <span>AI Spymaster is thinking...</span>
          </div>
        ) : isGuessingPhase && !isBvB ? (
          <div className="cn-guess-panel">
            <div className="cn-guess-info">
              Click a word to guess • <strong>{gameState.guessesLeft}</strong> guess{gameState.guessesLeft !== 1 ? 'es' : ''} remaining
            </div>
            {(isSingle || isMulti) && (
              <button className="mafia-btn mafia-btn-secondary" onClick={handleEndTurn}>
                ⏭ END TURN
              </button>
            )}
          </div>
        ) : isSpymasterPhase && !isSingle && !isBvB ? (
          <div className="cn-spymaster-panel">
            <input className="cn-clue-input" placeholder="Clue word..." value={clueInput}
              onChange={e => setClueInput(e.target.value.toUpperCase())}
              onKeyPress={e => e.key === 'Enter' && handleSubmitClue()} />
            <div className="cn-num-row">
              {[1,2,3,4,5].map(n => (
                <button key={n} className={`cn-num-btn ${clueNum === n ? 'active' : ''}`}
                  onClick={() => setClueNum(n)}>{n}</button>
              ))}
            </div>
            <button className="mafia-btn mafia-btn-primary" onClick={handleSubmitClue}
              disabled={!clueInput.trim()}>
              GIVE CLUE
            </button>
          </div>
        ) : isBvB ? (
          <div className="cn-bvb-info">👁 Bot vs Bot — watching AI play</div>
        ) : null}
      </div>

      {/* Game log */}
      <div className="cn-log">
        {[...log].reverse().slice(0, 8).map((entry, i) => (
          <div key={i} className="cn-log-entry" style={{ opacity: 1 - i * 0.1 }}>{entry.msg}</div>
        ))}
      </div>
    </div>
  )
}

function NamesHeader({ roomId, router }) {
  return (
    <div className="tech-header">
      <div className="tech-header-content">
        <div className="tech-logo">
          <div className="tech-logo-text" style={{ color: '#3498db' }}>HYPERNAMES</div>
          <div className="tech-divider"></div>
          <span className="tech-est">{roomId === 'solo' ? 'VS AI' : roomId === 'bvb' ? 'BOT VS BOT' : `ROOM: ${roomId}`}</span>
        </div>
        <button onClick={() => router.push('/hypernames')} className="btn-tech-header">
          <span className="btn-corner btn-corner-tl"></span>
          <span className="btn-corner btn-corner-br"></span>
          EXIT
        </button>
      </div>
    </div>
  )
}
