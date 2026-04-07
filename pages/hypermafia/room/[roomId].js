import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { io } from 'socket.io-client'
import ParticleBackground from '../../../components/ParticleBackground'
import ConnectionLoader from '../../../components/ConnectionLoader'
import { PHASES, ROLES, getPlayerColor, getRoleColor, getRoleIcon } from '../../../utils/mafiaGame'

const SOCKET_URL = 'https://hypergrid-u9d2.onrender.com'

export default function HyperMafiaRoom() {
  const router = useRouter()
  const { roomId, username, host } = router.query

  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [gameState, setGameState] = useState(null)
  const [roomData, setRoomData] = useState({ players: [], host: null, gameStarted: false, settings: { nightTime: 30, dayTime: 60, voteTime: 30 }, readyPlayers: [] })
  const [myRole, setMyRole] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [nightTarget, setNightTarget] = useState(null)
  const [nightActionDone, setNightActionDone] = useState(false)
  const [voteTarget, setVoteTarget] = useState(null)
  const [timer, setTimer] = useState(0)
  const [phaseAnim, setPhaseAnim] = useState(false)
  const [investigateResult, setInvestigateResult] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState({ nightTime: 30, dayTime: 60, voteTime: 30 })
  const [isReady, setIsReady] = useState(false)
  const chatEndRef = useRef(null)
  const timerRef = useRef(null)
  const prevPhaseRef = useRef(null)

  const isHost = host === 'true'

  useEffect(() => {
    if (!roomId || !username) return
    const newSocket = io(SOCKET_URL, { transports: ['websocket', 'polling'], timeout: 20000 })
    newSocket.on('connect', () => {
      setConnected(true)
      newSocket.emit('joinMafiaRoom', { roomId, username, isHost: host === 'true' })
    })
    newSocket.on('mafiaRoomUpdate', (data) => {
      setRoomData(data)
      if (data.settings) setSettings(data.settings)
    })
    newSocket.on('mafiaGameStarted', (state) => {
      setGameState(state)
      setRoomData(prev => ({ ...prev, gameStarted: true }))
      const me = state.players.find(p => p.name === username)
      if (me) setMyRole(me.role)
    })
    newSocket.on('mafiaGameStateUpdate', (state) => {
      setGameState(prev => {
        if (prev && prev.phase !== state.phase) {
          setPhaseAnim(true)
          setTimeout(() => setPhaseAnim(false), 1800)
          // Reset night action state when phase changes
          if (state.phase === 'night_phase') setNightActionDone(false)
        }
        return state
      })
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

  // Server-driven timer sync
  useEffect(() => {
    if (!gameState) return
    clearInterval(timerRef.current)
    const durMap = {
      [PHASES.NIGHT]: settings.nightTime,
      [PHASES.DAY]: settings.dayTime,
      [PHASES.VOTING]: settings.voteTime,
    }
    const dur = durMap[gameState.phase]
    if (!dur) return
    setTimer(dur)
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [gameState?.phase, gameState?.round])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [gameState?.chatMessages])

  const emit = (event, data) => socket?.emit(event, { roomId, ...data })
  const me = gameState?.players.find(p => p.name === username)
  const alivePlayers = gameState?.players.filter(p => p.isAlive) || []
  const allVoted = gameState && alivePlayers.every(p => gameState.votes[p.id])
  const readyCount = roomData.readyPlayers?.length || 0
  const humanCount = roomData.players?.filter(p => !p.isBot).length || 0
  const allReady = readyCount >= humanCount && humanCount > 0

  const handleReady = () => {
    setIsReady(true)
    emit('mafiaPlayerReady', {})
  }
  const handleStartGame = () => emit('startMafiaGame', {})
  const handleAddBot = () => emit('addMafiaBot', {})
  const handleRemoveBot = () => emit('removeMafiaBot', {})
  const handleKickPlayer = (playerId) => emit('kickMafiaPlayer', { playerId })
  const handleSaveSettings = () => {
    emit('mafiaUpdateSettings', { settings })
    setShowSettings(false)
  }
  const handleNightAction = () => {
    if (!nightTarget || !me) return
    const actionMap = { [ROLES.MAFIA]: 'mafia_kill', [ROLES.DOCTOR]: 'doctor_save', [ROLES.DETECTIVE]: 'detective_investigate' }
    const action = actionMap[me.role]
    if (action) {
      emit('mafiaAction', { playerId: me.id, action, targetId: nightTarget })
      setNightTarget(null)
      setNightActionDone(true)
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

  const isNight = gameState?.phase === PHASES.NIGHT
  const isDay = gameState?.phase === PHASES.DAY || gameState?.phase === PHASES.VOTING

  // LOBBY
  if (!roomData.gameStarted) {
    return (
      <div className="mafia-container">
        <ParticleBackground />
        <MafiaHeader roomId={roomId} router={router} />
        <div className="mafia-lobby">
          <div className="mafia-lobby-card">
            <div className="mafia-lobby-title"><span>🔪</span> HYPERMAFIA</div>
            <div className="mafia-room-code">Room: <span>{roomId}</span></div>

            <div className="mafia-players-grid">
              {roomData.players.map((p, i) => (
                <div key={i} className={`mafia-lobby-player ${p.isBot ? 'is-bot' : ''} ${roomData.readyPlayers?.includes(p.id) ? 'is-ready' : ''}`}>
                  <div className="mafia-player-avatar" style={{ background: getPlayerColor(i) }}>{p.name[0].toUpperCase()}</div>
                  <span className="mafia-player-name">{p.name}</span>
                  {p.isBot && <span className="mafia-bot-badge">BOT</span>}
                  {p.name === roomData.host && <span className="mafia-host-badge">HOST</span>}
                  {roomData.readyPlayers?.includes(p.id) && <span className="mafia-ready-badge">✓ READY</span>}
                  {isHost && !p.isBot && p.name !== username && (
                    <button className="mafia-kick-btn" onClick={() => handleKickPlayer(p.id)}>✕</button>
                  )}
                </div>
              ))}
            </div>

            <div className="mafia-lobby-info">
              <span>{roomData.players.length}/12 players</span>
              <span className={allReady ? 'ready-all' : ''}>{readyCount}/{humanCount} ready</span>
            </div>

            {/* Settings Panel */}
            {showSettings && isHost && (
              <div className="mafia-settings-panel">
                <div className="mafia-settings-title">⚙️ GAME SETTINGS</div>
                <div className="mafia-settings-row">
                  <label>🌙 Night Time</label>
                  <div className="mafia-settings-control">
                    <button onClick={() => setSettings(s => ({ ...s, nightTime: Math.max(15, s.nightTime - 15) }))}>−</button>
                    <span>{settings.nightTime}s</span>
                    <button onClick={() => setSettings(s => ({ ...s, nightTime: Math.min(120, s.nightTime + 15) }))}>+</button>
                  </div>
                </div>
                <div className="mafia-settings-row">
                  <label>☀️ Discussion Time</label>
                  <div className="mafia-settings-control">
                    <button onClick={() => setSettings(s => ({ ...s, dayTime: Math.max(30, s.dayTime - 30) }))}>−</button>
                    <span>{settings.dayTime}s</span>
                    <button onClick={() => setSettings(s => ({ ...s, dayTime: Math.min(300, s.dayTime + 30) }))}>+</button>
                  </div>
                </div>
                <div className="mafia-settings-row">
                  <label>🗳️ Voting Time</label>
                  <div className="mafia-settings-control">
                    <button onClick={() => setSettings(s => ({ ...s, voteTime: Math.max(15, s.voteTime - 15) }))}>−</button>
                    <span>{settings.voteTime}s</span>
                    <button onClick={() => setSettings(s => ({ ...s, voteTime: Math.min(120, s.voteTime + 15) }))}>+</button>
                  </div>
                </div>
                <button className="mafia-btn mafia-btn-primary" onClick={handleSaveSettings}>SAVE SETTINGS</button>
              </div>
            )}

            <div className="mafia-host-controls">
              {isHost && (
                <>
                  <div className="mafia-bot-row">
                    <button className="mafia-btn mafia-btn-secondary" onClick={handleAddBot} disabled={roomData.players.length >= 12}>+ ADD BOT</button>
                    <button className="mafia-btn mafia-btn-secondary" onClick={handleRemoveBot} disabled={!roomData.players.some(p => p.isBot)}>− REMOVE BOT</button>
                    <button className="mafia-btn mafia-btn-secondary" onClick={() => setShowSettings(s => !s)}>⚙️ SETTINGS</button>
                  </div>
                  <button className="mafia-btn mafia-btn-primary" onClick={handleStartGame} disabled={roomData.players.length < 4}>
                    🔪 START GAME {allReady ? '(All Ready!)' : `(${readyCount}/${humanCount} ready)`}
                  </button>
                </>
              )}
              {!isHost && !isReady && (
                <button className="mafia-btn mafia-btn-ready" onClick={handleReady}>✓ READY UP</button>
              )}
              {!isHost && isReady && (
                <div className="mafia-waiting-msg">✓ You are ready! Waiting for host to start...</div>
              )}
            </div>

            <div className="mafia-settings-preview">
              <span>🌙 {settings.nightTime}s</span>
              <span>☀️ {settings.dayTime}s</span>
              <span>🗳️ {settings.voteTime}s</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // GAME OVER
  if (gameState?.phase === PHASES.GAME_END) {
    return (
      <div className="mafia-container">
        <ParticleBackground />
        <MafiaHeader roomId={roomId} router={router} />
        <div className="mafia-gameover">
          <div className="mafia-gameover-card">
            <div className="mafia-gameover-icon">{gameState.winner === 'mafia' ? '🔪' : '🏆'}</div>
            <h2 className="mafia-gameover-title">{gameState.winner === 'mafia' ? 'MAFIA WINS' : 'VILLAGERS WIN'}</h2>
            <p className="mafia-gameover-sub">{gameState.winner === 'mafia' ? 'The Mafia has taken over the village.' : 'The village has eliminated all Mafia members.'}</p>
            <div className="mafia-reveal-list">
              <h3>ROLES REVEALED</h3>
              {gameState.players.map((p, i) => (
                <div key={p.id} className="mafia-reveal-item">
                  <div className="mafia-player-avatar" style={{ background: getPlayerColor(i) }}>{p.name[0].toUpperCase()}</div>
                  <span className="mafia-reveal-name">{p.name}</span>
                  <span className="mafia-reveal-role" style={{ color: getRoleColor(p.role) }}>{getRoleIcon(p.role)} {p.role}</span>
                  {!p.isAlive && <span className="mafia-dead-tag">DEAD</span>}
                </div>
              ))}
            </div>
            <button className="mafia-btn mafia-btn-primary" onClick={() => router.push('/hypermafia')}>BACK TO LOBBY</button>
          </div>
        </div>
      </div>
    )
  }

  // MAIN GAME
  return (
    <div className={`mafia-container ${isNight ? 'mafia-night-bg' : 'mafia-day-bg'}`}>
      {/* Night/Day sky animation layer */}
      <div className={`mafia-sky ${isNight ? 'sky-night' : 'sky-day'}`}>
        {isNight && <NightSky />}
        {isDay && <DaySky />}
      </div>

      {/* Phase transition overlay */}
      {phaseAnim && (
        <div className={`mafia-phase-transition ${isNight ? 'transition-night' : 'transition-day'}`}>
          <div className="phase-transition-icon">{isNight ? '🌙' : '☀️'}</div>
          <div className="phase-transition-text">{isNight ? 'NIGHT FALLS' : 'DAY BREAKS'}</div>
        </div>
      )}

      <ParticleBackground />
      <MafiaHeader roomId={roomId} router={router} />

      <div className="mafia-game-layout">
        {/* Left: Players */}
        <div className="mafia-players-panel">
          <div className="mafia-panel-header">PLAYERS</div>
          <div className="mafia-players-list">
            {gameState.players.map((p, i) => (
              <div key={p.id} className={`mafia-player-row ${!p.isAlive ? 'dead' : ''} ${p.id === me?.id ? 'is-me' : ''}`}>
                <div className="mafia-player-avatar" style={{ background: p.isAlive ? getPlayerColor(i) : '#333' }}>{p.name[0].toUpperCase()}</div>
                <div className="mafia-player-info">
                  <span className="mafia-player-name">{p.name}</span>
                  {p.isBot && <span className="mafia-bot-badge">BOT</span>}
                  {p.id === me?.id && <span className="mafia-me-badge">YOU</span>}
                </div>
                <div className="mafia-player-status">
                  {!p.isAlive ? <span className="mafia-dead-icon">💀</span> : <span className="mafia-alive-icon">●</span>}
                  {p.isRevealed && <span className="mafia-role-tag" style={{ color: getRoleColor(p.role) }}>{getRoleIcon(p.role)}</span>}
                </div>
              </div>
            ))}
          </div>
          {myRole && (
            <div className="mafia-role-card" style={{ borderColor: getRoleColor(myRole) }}>
              <div className="mafia-role-icon">{getRoleIcon(myRole)}</div>
              <div className="mafia-role-name" style={{ color: getRoleColor(myRole) }}>{myRole}</div>
              <div className="mafia-role-desc">{getRoleDesc(myRole)}</div>
            </div>
          )}
        </div>

        {/* Center */}
        <div className="mafia-center-panel">
          {/* Phase bar with timer */}
          <div className={`mafia-phase-bar ${isNight ? 'phase-bar-night' : 'phase-bar-day'}`}>
            <div className="mafia-phase-label">{getPhaseLabel(gameState.phase)}</div>
            {timer > 0 && (
              <div className={`mafia-timer-ring ${timer <= 10 ? 'timer-urgent' : ''}`}>
                <svg viewBox="0 0 36 36" className="timer-svg">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5"/>
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke={timer <= 10 ? '#e74c3c' : isNight ? '#9b59b6' : '#f39c12'}
                    strokeWidth="2.5" strokeDasharray="100" strokeLinecap="round"
                    strokeDashoffset={100 - (timer / getMaxTimer(gameState.phase, settings)) * 100}
                    style={{ transition: 'stroke-dashoffset 1s linear', transformOrigin: 'center', transform: 'rotate(-90deg)' }}
                  />
                </svg>
                <span className="timer-num">{timer}</span>
              </div>
            )}
            <div className="mafia-round-label">Round {gameState.round}</div>
          </div>

          {/* NIGHT PHASE */}
          {gameState.phase === PHASES.NIGHT && (
            <div className="mafia-night-scene">
              {me?.isAlive && myRole !== ROLES.VILLAGER && !nightActionDone ? (
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
                        <button key={p.id} className={`mafia-target-btn ${nightTarget === p.id ? 'selected' : ''}`} onClick={() => setNightTarget(p.id)}>
                          <div className="mafia-player-avatar sm" style={{ background: getPlayerColor(i) }}>{p.name[0].toUpperCase()}</div>
                          {p.name}
                        </button>
                      ))}
                  </div>
                  <button className="mafia-btn mafia-btn-primary" onClick={handleNightAction} disabled={!nightTarget}>CONFIRM ACTION</button>
                  {investigateResult && myRole === ROLES.DETECTIVE && (
                    <div className="mafia-investigate-result">
                      Investigation: {investigateResult.isMafia ? '🔪 MAFIA MEMBER!' : '✅ NOT MAFIA'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mafia-night-waiting">
                  <div className="mafia-stars-anim">
                    {Array.from({ length: 12 }).map((_, i) => <span key={i} className="star" style={{ '--i': i }}>★</span>)}
                  </div>
                  <div className="mafia-moon-big">🌙</div>
                  {nightActionDone && me?.isAlive && myRole !== ROLES.VILLAGER ? (
                    <p className="night-action-confirmed">✅ Action confirmed. Waiting for others...</p>
                  ) : !me?.isAlive ? (
                    <p>You are dead. Watch the night unfold.</p>
                  ) : (
                    <p>Night is falling... wait for morning.</p>
                  )}
                  {investigateResult && myRole === ROLES.DETECTIVE && (
                    <div className="mafia-investigate-result" style={{ marginTop: '1rem' }}>
                      Investigation: {investigateResult.isMafia ? '🔪 MAFIA MEMBER!' : '✅ NOT MAFIA'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DAY / VOTING PHASE */}
          {(gameState.phase === PHASES.DAY || gameState.phase === PHASES.VOTING) && (
            <div className="mafia-chat-area">
              {gameState.lastKilled && (
                <div className="mafia-kill-notice">💀 {gameState.players.find(p => p.id === gameState.lastKilled)?.name} was killed last night.</div>
              )}
              {!gameState.lastKilled && gameState.round > 1 && (
                <div className="mafia-save-notice">💊 No one was killed last night!</div>
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
                  <input className="mafia-chat-input" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Say something..." maxLength={200} />
                  <button type="submit" className="mafia-btn mafia-btn-primary sm">SEND</button>
                </form>
              )}
            </div>
          )}

          {/* VOTING */}
          {gameState.phase === PHASES.VOTING && me?.isAlive && !gameState.votes[me.id] && (
            <div className="mafia-vote-panel">
              <h3>Vote to eliminate:</h3>
              <div className="mafia-target-list">
                {alivePlayers.filter(p => p.id !== me.id).map((p, i) => (
                  <button key={p.id} className={`mafia-target-btn ${voteTarget === p.id ? 'selected' : ''}`} onClick={() => setVoteTarget(p.id)}>
                    <div className="mafia-player-avatar sm" style={{ background: getPlayerColor(i) }}>{p.name[0].toUpperCase()}</div>
                    {p.name}
                    {Object.values(gameState.votes).filter(v => v === p.id).length > 0 && (
                      <span className="mafia-vote-count">{Object.values(gameState.votes).filter(v => v === p.id).length}v</span>
                    )}
                  </button>
                ))}
              </div>
              <button className="mafia-btn mafia-btn-primary" onClick={handleVote} disabled={!voteTarget}>CAST VOTE</button>
            </div>
          )}
          {gameState.phase === PHASES.VOTING && gameState.votes[me?.id] && (
            <div className="mafia-voted-msg">✅ Vote cast. Waiting for others...</div>
          )}

          {/* RESULT */}
          {gameState.phase === PHASES.RESULT && gameState.pendingResult && (
            <div className="mafia-result-panel">
              {gameState.pendingResult.type === 'eliminated' ? (
                <>
                  <div className="mafia-result-icon">⚖️</div>
                  <h3>{gameState.pendingResult.player.name} was eliminated!</h3>
                  <p style={{ color: getRoleColor(gameState.pendingResult.player.role) }}>{getRoleIcon(gameState.pendingResult.player.role)} {gameState.pendingResult.player.role}</p>
                </>
              ) : (
                <><div className="mafia-result-icon">🤝</div><h3>No majority — no one eliminated.</h3></>
              )}
            </div>
          )}

          {/* ROLE ASSIGNMENT */}
          {gameState.phase === PHASES.ROLE_ASSIGNMENT && myRole && (
            <div className="mafia-role-reveal">
              <div className="role-reveal-card" style={{ borderColor: getRoleColor(myRole) }}>
                <div className="role-reveal-icon">{getRoleIcon(myRole)}</div>
                <div className="role-reveal-name" style={{ color: getRoleColor(myRole) }}>YOU ARE THE {myRole.toUpperCase()}</div>
                <div className="role-reveal-desc">{getRoleDesc(myRole)}</div>
                {isHost && <button className="mafia-btn mafia-btn-primary" style={{ marginTop: '1rem' }} onClick={() => emit('mafiaPhaseChange', { phase: PHASES.NIGHT })}>🌙 START NIGHT</button>}
                {!isHost && <p className="role-reveal-wait">Waiting for host to start night...</p>}
              </div>
            </div>
          )}

          {/* Host override bar — always visible to host during game */}
          {isHost && gameState.phase !== PHASES.ROLE_ASSIGNMENT && gameState.phase !== PHASES.GAME_END && (
            <div className="mafia-host-bar">
              {gameState.phase === PHASES.NIGHT && (
                <button className="mafia-btn mafia-btn-secondary" onClick={() => emit('mafiaPhaseChange', { phase: PHASES.DAY })}>
                  ☀️ FORCE END NIGHT
                </button>
              )}
              {gameState.phase === PHASES.DAY && (
                <button className="mafia-btn mafia-btn-secondary" onClick={() => emit('mafiaPhaseChange', { phase: PHASES.VOTING })}>
                  🗳️ START VOTING
                </button>
              )}
              {gameState.phase === PHASES.VOTING && (
                <button className="mafia-btn mafia-btn-secondary" onClick={() => emit('mafiaResolveVotes', {})}>
                  ⚖️ FORCE RESOLVE
                </button>
              )}
              {gameState.phase === PHASES.RESULT && (
                <button className="mafia-btn mafia-btn-secondary" onClick={() => emit('mafiaNextRound', {})}>
                  ➡️ NEXT ROUND
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Log */}
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

function NightSky() {
  return (
    <div className="night-sky-anim">
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} className="night-star" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 60}%`, animationDelay: `${Math.random() * 3}s`, animationDuration: `${2 + Math.random() * 2}s` }} />
      ))}
      <div className="night-moon" />
    </div>
  )
}

function DaySky() {
  return (
    <div className="day-sky-anim">
      <div className="day-sun" />
      <div className="day-cloud cloud-1" />
      <div className="day-cloud cloud-2" />
      <div className="day-cloud cloud-3" />
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
    case ROLES.MAFIA: return 'Kill one villager each night. Stay hidden during the day.'
    case ROLES.DETECTIVE: return 'Investigate one player each night to learn their role.'
    case ROLES.DOCTOR: return 'Save one player from being killed each night.'
    default: return 'Find and eliminate all Mafia members by voting.'
  }
}

function getPhaseLabel(phase) {
  const labels = {
    [PHASES.NIGHT]: '🌙 Night Phase — Perform your action',
    [PHASES.DAY]: '☀️ Day Phase — Discuss and find the Mafia',
    [PHASES.VOTING]: '🗳️ Voting Phase — Cast your vote',
    [PHASES.RESULT]: '📋 Results',
    [PHASES.ROLE_ASSIGNMENT]: '🎭 Roles Assigned',
  }
  return labels[phase] || ''
}

function getMaxTimer(phase, settings) {
  if (phase === PHASES.NIGHT) return settings.nightTime
  if (phase === PHASES.DAY) return settings.dayTime
  if (phase === PHASES.VOTING) return settings.voteTime
  return 60
}
