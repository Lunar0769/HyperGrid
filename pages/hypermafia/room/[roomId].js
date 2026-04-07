import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { io } from 'socket.io-client'
import ParticleBackground from '../../../components/ParticleBackground'
import ConnectionLoader from '../../../components/ConnectionLoader'
import {
  PHASES, ROLES, getPlayerColor, getRoleColor, getRoleIcon,
  getBotChatMessage, getBotVote, runBotNightAction
} from '../../../utils/mafiaGame'

const SOCKET_URL = 'https://hypergrid-u9d2.onrender.com'
const DAY_TIMER = 60

export default function HyperMafiaRoom() {
  const router = useRouter()
  const { roomId, username, host } = router.query

  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [gameState, setGameState] = useState(null)
  const [roomData, setRoomData] = useState({ players: [], host: null, gameStarted: false })
  const [myRole, setMyRole] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [nightTarget, setNightTarget] = useState(null)
  const [voteTarget, setVoteTarget] = useState(null)
  const [timer, setTimer] = useState(DAY_TIMER)
  const [phaseMsg, setPhaseMsg] = useState('')
  const [investigateResult, setInvestigateResult] = useState(null)
  const chatEndRef = useRef(null)
  const timerRef = useRef(null)

  const isHost = host === 'true'

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !username) return

    const newSocket = io(SOCKET_URL, { transports: ['websocket', 'polling'], timeout: 20000 })

    newSocket.on('connect', () => {
      setConnected(true)
      newSocket.emit('joinMafiaRoom', { roomId, username, isHost: host === 'true' })
    })

    newSocket.on('mafiaRoomUpdate', (data) => setRoomData(data))

    newSocket.on('mafiaGameStarted', (state) => {
      setGameState(state)
      setRoomData(prev => ({ ...prev, gameStarted: true }))
      // Find my role
      const me = state.players.find(p => p.name === username)
      if (me) setMyRole(me.role)
    })

    newSocket.on('mafiaGameStateUpdate', (state) => {
      setGameState(state)
      const me = state.players.find(p => p.name === username)
      if (me) setMyRole(me.role)
      if (state.lastInvestigated && me?.role === ROLES.DETECTIVE) {
        setInvestigateResult(state.lastInvestigated)
      }
    })

    newSocket.on('disconnect', () => setConnected(false))

    setSocket(newSocket)
    return () => newSocket.close()
  }, [roomId, username, host])

  // ── Day timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameState) return
    clearInterval(timerRef.current)

    if (gameState.phase === PHASES.DAY) {
      setTimer(DAY_TIMER)
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            if (isHost) handleStartVoting()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [gameState?.phase])

  // ── Auto-scroll chat ──────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [gameState?.chatMessages])

  // ── Phase messages ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameState) return
    const msgs = {
      [PHASES.NIGHT]: '🌙 Night falls... perform your action.',
      [PHASES.DAY]: '☀️ Day breaks. Discuss and find the Mafia.',
      [PHASES.VOTING]: '🗳️ Vote to eliminate a suspect.',
      [PHASES.RESULT]: '📋 Results are in...',
      [PHASES.GAME_END]: gameState.winner === 'mafia' ? '🔪 Mafia wins!' : '🏆 Villagers win!'
    }
    setPhaseMsg(msgs[gameState.phase] || '')
  }, [gameState?.phase])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const emit = (event, data) => socket?.emit(event, { roomId, ...data })

  const me = gameState?.players.find(p => p.name === username)
  const alivePlayers = gameState?.players.filter(p => p.isAlive) || []
  const allVoted = gameState && alivePlayers.every(p => gameState.votes[p.id])

  // ── Host actions ──────────────────────────────────────────────────────────
  const handleStartGame = () => emit('startMafiaGame', {})
  const handleAddBot = () => emit('addMafiaBot', {})
  const handleRemoveBot = () => emit('removeMafiaBot', {})
  const handleKickPlayer = (playerId) => emit('kickMafiaPlayer', { playerId })

  const handleStartNight = () => emit('mafiaPhaseChange', { phase: PHASES.NIGHT })
  const handleStartDay = () => emit('mafiaPhaseChange', { phase: PHASES.DAY })
  const handleStartVoting = () => emit('mafiaPhaseChange', { phase: PHASES.VOTING })
  const handleResolveVotes = () => emit('mafiaResolveVotes', {})
  const handleNextRound = () => emit('mafiaNextRound', {})

  // ── Player actions ────────────────────────────────────────────────────────
  const handleNightAction = () => {
    if (!nightTarget || !me) return
    const actionMap = {
      [ROLES.MAFIA]: 'mafia_kill',
      [ROLES.DOCTOR]: 'doctor_save',
      [ROLES.DETECTIVE]: 'detective_investigate'
    }
    const action = actionMap[me.role]
    if (action) {
      emit('mafiaAction', { playerId: me.id, action, targetId: nightTarget })
      setNightTarget(null)
    }
  }

  const handleVote = () => {
    if (!voteTarget || !me) return
    emit('mafiaVote', { voterId: me.id, targetId: voteTarget })
    setVoteTarget(null)
  }

  const handleSendChat = (e) => {
    e.preventDefault()
    if (!chatInput.trim() || !me) return
    emit('mafiaChatMessage', { playerId: me.id, message: chatInput.trim() })
    setChatInput('')
  }

  if (!roomId || !username) return <ConnectionLoader message="Loading room..." />
  if (!connected) return <ConnectionLoader message="Connecting to server..." />

  // ── LOBBY ─────────────────────────────────────────────────────────────────
  if (!roomData.gameStarted) {
    return (
      <div className="mafia-container">
        <ParticleBackground />
        <MafiaHeader roomId={roomId} router={router} />

        <div className="mafia-lobby">
          <div className="mafia-lobby-card">
            <div className="mafia-lobby-title">
              <span className="mafia-phase-icon">🔪</span>
              HYPERMAFIA
            </div>
            <div className="mafia-room-code">Room: <span>{roomId}</span></div>

            <div className="mafia-players-grid">
              {roomData.players.map((p, i) => (
                <div key={i} className={`mafia-lobby-player ${p.isBot ? 'is-bot' : ''}`}>
                  <div className="mafia-player-avatar" style={{ background: getPlayerColor(i) }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="mafia-player-name">{p.name}</span>
                  {p.isBot && <span className="mafia-bot-badge">BOT</span>}
                  {p.name === roomData.host && <span className="mafia-host-badge">HOST</span>}
                  {isHost && !p.isBot && p.name !== username && (
                    <button className="mafia-kick-btn" onClick={() => handleKickPlayer(p.id)}>✕</button>
                  )}
                </div>
              ))}
            </div>

            <div className="mafia-lobby-info">
              <span>{roomData.players.length}/12 players</span>
              <span>Min 4 required</span>
            </div>

            {isHost && (
              <div className="mafia-host-controls">
                <button className="mafia-btn mafia-btn-secondary" onClick={handleAddBot}
                  disabled={roomData.players.length >= 12}>
                  + ADD BOT
                </button>
                <button className="mafia-btn mafia-btn-secondary" onClick={handleRemoveBot}
                  disabled={!roomData.players.some(p => p.isBot)}>
                  − REMOVE BOT
                </button>
                <button className="mafia-btn mafia-btn-primary" onClick={handleStartGame}
                  disabled={roomData.players.length < 4}>
                  🔪 START GAME
                </button>
              </div>
            )}

            {!isHost && (
              <div className="mafia-waiting-msg">
                Waiting for host to start the game...
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── GAME OVER ─────────────────────────────────────────────────────────────
  if (gameState?.phase === PHASES.GAME_END) {
    const mafiaPlayers = gameState.players.filter(p => p.role === ROLES.MAFIA)
    return (
      <div className="mafia-container">
        <ParticleBackground />
        <MafiaHeader roomId={roomId} router={router} />
        <div className="mafia-gameover">
          <div className="mafia-gameover-card">
            <div className="mafia-gameover-icon">
              {gameState.winner === 'mafia' ? '🔪' : '🏆'}
            </div>
            <h2 className="mafia-gameover-title">
              {gameState.winner === 'mafia' ? 'MAFIA WINS' : 'VILLAGERS WIN'}
            </h2>
            <p className="mafia-gameover-sub">
              {gameState.winner === 'mafia'
                ? 'The Mafia has taken over the village.'
                : 'The village has eliminated all Mafia members.'}
            </p>
            <div className="mafia-reveal-list">
              <h3>ROLES REVEALED</h3>
              {gameState.players.map((p, i) => (
                <div key={p.id} className="mafia-reveal-item">
                  <div className="mafia-player-avatar" style={{ background: getPlayerColor(i) }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="mafia-reveal-name">{p.name}</span>
                  <span className="mafia-reveal-role" style={{ color: getRoleColor(p.role) }}>
                    {getRoleIcon(p.role)} {p.role}
                  </span>
                  {!p.isAlive && <span className="mafia-dead-tag">DEAD</span>}
                </div>
              ))}
            </div>
            <button className="mafia-btn mafia-btn-primary" onClick={() => router.push('/hypermafia')}>
              BACK TO LOBBY
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN GAME ─────────────────────────────────────────────────────────────
  return (
    <div className="mafia-container">
      <ParticleBackground />
      <MafiaHeader roomId={roomId} router={router} />

      <div className="mafia-game-layout">
        {/* Left: Players */}
        <div className="mafia-players-panel">
          <div className="mafia-panel-header">PLAYERS</div>
          <div className="mafia-players-list">
            {gameState.players.map((p, i) => (
              <div key={p.id} className={`mafia-player-row ${!p.isAlive ? 'dead' : ''} ${p.id === me?.id ? 'is-me' : ''}`}>
                <div className="mafia-player-avatar" style={{ background: p.isAlive ? getPlayerColor(i) : '#333' }}>
                  {p.name[0].toUpperCase()}
                </div>
                <div className="mafia-player-info">
                  <span className="mafia-player-name">{p.name}</span>
                  {p.isBot && <span className="mafia-bot-badge">BOT</span>}
                  {p.id === me?.id && <span className="mafia-me-badge">YOU</span>}
                </div>
                <div className="mafia-player-status">
                  {!p.isAlive ? (
                    <span className="mafia-dead-icon">💀</span>
                  ) : (
                    <span className="mafia-alive-icon">●</span>
                  )}
                  {p.isRevealed && (
                    <span className="mafia-role-tag" style={{ color: getRoleColor(p.role) }}>
                      {getRoleIcon(p.role)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* My Role Card */}
          {myRole && (
            <div className="mafia-role-card" style={{ borderColor: getRoleColor(myRole) }}>
              <div className="mafia-role-icon">{getRoleIcon(myRole)}</div>
              <div className="mafia-role-name" style={{ color: getRoleColor(myRole) }}>{myRole}</div>
              <div className="mafia-role-desc">{getRoleDesc(myRole)}</div>
            </div>
          )}
        </div>

        {/* Center: Main action area */}
        <div className="mafia-center-panel">
          {/* Phase indicator */}
          <div className="mafia-phase-bar">
            <div className="mafia-phase-label">{phaseMsg}</div>
            {gameState.phase === PHASES.DAY && (
              <div className="mafia-timer">
                <span className={timer <= 10 ? 'timer-urgent' : ''}>{timer}s</span>
              </div>
            )}
            <div className="mafia-round-label">Round {gameState.round}</div>
          </div>

          {/* Night Phase */}
          {gameState.phase === PHASES.NIGHT && me?.isAlive && myRole !== ROLES.VILLAGER && (
            <div className="mafia-night-panel">
              <h3 className="mafia-night-title">
                {myRole === ROLES.MAFIA && '🔪 Choose your target'}
                {myRole === ROLES.DOCTOR && '💊 Choose who to save'}
                {myRole === ROLES.DETECTIVE && '🔍 Choose who to investigate'}
              </h3>
              <div className="mafia-target-list">
                {alivePlayers
                  .filter(p => myRole === ROLES.MAFIA ? p.role !== ROLES.MAFIA : true)
                  .filter(p => p.id !== me.id || myRole === ROLES.DOCTOR)
                  .map((p, i) => (
                    <button
                      key={p.id}
                      className={`mafia-target-btn ${nightTarget === p.id ? 'selected' : ''}`}
                      onClick={() => setNightTarget(p.id)}
                    >
                      <div className="mafia-player-avatar sm" style={{ background: getPlayerColor(i) }}>
                        {p.name[0].toUpperCase()}
                      </div>
                      {p.name}
                    </button>
                  ))}
              </div>
              <button className="mafia-btn mafia-btn-primary" onClick={handleNightAction} disabled={!nightTarget}>
                CONFIRM ACTION
              </button>
              {investigateResult && myRole === ROLES.DETECTIVE && (
                <div className="mafia-investigate-result">
                  Investigation result: {investigateResult.isMafia
                    ? '🔪 MAFIA MEMBER!'
                    : '✅ NOT MAFIA'}
                </div>
              )}
            </div>
          )}

          {gameState.phase === PHASES.NIGHT && (me?.role === ROLES.VILLAGER || !me?.isAlive) && (
            <div className="mafia-night-waiting">
              <div className="mafia-moon">🌙</div>
              <p>Night is falling... wait for morning.</p>
            </div>
          )}

          {/* Day Phase - Chat */}
          {(gameState.phase === PHASES.DAY || gameState.phase === PHASES.VOTING) && (
            <div className="mafia-chat-area">
              {gameState.lastKilled && (
                <div className="mafia-kill-notice">
                  💀 {gameState.players.find(p => p.id === gameState.lastKilled)?.name} was killed last night.
                </div>
              )}
              {gameState.lastSaved && !gameState.lastKilled && (
                <div className="mafia-save-notice">
                  💊 Someone was saved by the Doctor last night!
                </div>
              )}

              <div className="mafia-chat-messages">
                {gameState.chatMessages.map(msg => (
                  <div key={msg.id} className={`mafia-chat-msg ${msg.playerId === me?.id ? 'mine' : ''}`}>
                    <span className="mafia-chat-author">{msg.playerName}</span>
                    <span className="mafia-chat-text">{msg.message}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {me?.isAlive && gameState.phase === PHASES.DAY && (
                <form className="mafia-chat-input-row" onSubmit={handleSendChat}>
                  <input
                    className="mafia-chat-input"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Say something..."
                    maxLength={200}
                  />
                  <button type="submit" className="mafia-btn mafia-btn-primary sm">SEND</button>
                </form>
              )}
            </div>
          )}

          {/* Voting Phase */}
          {gameState.phase === PHASES.VOTING && me?.isAlive && !gameState.votes[me.id] && (
            <div className="mafia-vote-panel">
              <h3>Vote to eliminate:</h3>
              <div className="mafia-target-list">
                {alivePlayers.filter(p => p.id !== me.id).map((p, i) => (
                  <button
                    key={p.id}
                    className={`mafia-target-btn ${voteTarget === p.id ? 'selected' : ''}`}
                    onClick={() => setVoteTarget(p.id)}
                  >
                    <div className="mafia-player-avatar sm" style={{ background: getPlayerColor(i) }}>
                      {p.name[0].toUpperCase()}
                    </div>
                    {p.name}
                    {gameState.votes && Object.values(gameState.votes).filter(v => v === p.id).length > 0 && (
                      <span className="mafia-vote-count">
                        {Object.values(gameState.votes).filter(v => v === p.id).length} votes
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button className="mafia-btn mafia-btn-primary" onClick={handleVote} disabled={!voteTarget}>
                CAST VOTE
              </button>
            </div>
          )}

          {gameState.phase === PHASES.VOTING && gameState.votes[me?.id] && (
            <div className="mafia-voted-msg">✅ Vote cast. Waiting for others...</div>
          )}

          {/* Result Phase */}
          {gameState.phase === PHASES.RESULT && gameState.pendingResult && (
            <div className="mafia-result-panel">
              {gameState.pendingResult.type === 'eliminated' ? (
                <>
                  <div className="mafia-result-icon">⚖️</div>
                  <h3>{gameState.pendingResult.player.name} was eliminated!</h3>
                  <p style={{ color: getRoleColor(gameState.pendingResult.player.role) }}>
                    They were {getRoleIcon(gameState.pendingResult.player.role)} {gameState.pendingResult.player.role}
                  </p>
                </>
              ) : (
                <>
                  <div className="mafia-result-icon">🤝</div>
                  <h3>No majority — no one eliminated.</h3>
                </>
              )}
            </div>
          )}

          {/* Host controls */}
          {isHost && (
            <div className="mafia-host-bar">
              {gameState.phase === PHASES.ROLE_ASSIGNMENT && (
                <button className="mafia-btn mafia-btn-primary" onClick={handleStartNight}>
                  🌙 START NIGHT
                </button>
              )}
              {gameState.phase === PHASES.NIGHT && (
                <button className="mafia-btn mafia-btn-primary" onClick={handleStartDay}>
                  ☀️ END NIGHT
                </button>
              )}
              {gameState.phase === PHASES.DAY && (
                <button className="mafia-btn mafia-btn-secondary" onClick={handleStartVoting}>
                  🗳️ START VOTING
                </button>
              )}
              {gameState.phase === PHASES.VOTING && (
                <button className="mafia-btn mafia-btn-primary" onClick={handleResolveVotes}
                  disabled={!allVoted}>
                  ⚖️ RESOLVE VOTES
                </button>
              )}
              {gameState.phase === PHASES.RESULT && (
                <button className="mafia-btn mafia-btn-primary" onClick={handleNextRound}>
                  ➡️ NEXT ROUND
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Game log */}
        <div className="mafia-log-panel">
          <div className="mafia-panel-header">GAME LOG</div>
          <div className="mafia-log-list">
            {[...(gameState.gameLog || [])].reverse().map((entry, i) => (
              <div key={i} className="mafia-log-entry">
                <span className="mafia-log-round">R{entry.round}</span>
                <span className="mafia-log-msg">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MafiaHeader({ roomId, router }) {
  return (
    <div className="tech-header">
      <div className="tech-header-content">
        <div className="tech-logo">
          <div className="tech-logo-text" style={{ color: '#e74c3c' }}>HYPERMAFIA</div>
          <div className="tech-divider"></div>
          <span className="tech-est">ROOM: {roomId}</span>
        </div>
        <button onClick={() => router.push('/hypermafia')} className="btn-tech-header">
          <span className="btn-corner btn-corner-tl"></span>
          <span className="btn-corner btn-corner-br"></span>
          EXIT
        </button>
      </div>
    </div>
  )
}

function getRoleDesc(role) {
  switch (role) {
    case ROLES.MAFIA: return 'Kill one villager each night. Stay hidden.'
    case ROLES.DETECTIVE: return 'Investigate one player each night.'
    case ROLES.DOCTOR: return 'Save one player from being killed each night.'
    default: return 'Find and eliminate all Mafia members.'
  }
}
