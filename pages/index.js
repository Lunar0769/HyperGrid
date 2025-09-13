import { useState } from 'react'
import { useRouter } from 'next/router'
import ParticleBackground from '../components/ParticleBackground'

export default function Home() {
  const [username, setUsername] = useState('')
  const [roomId, setRoomId] = useState('')
  const router = useRouter()

  const createRoom = () => {
    if (username.trim()) {
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
      router.push(`/room/${newRoomId}?username=${encodeURIComponent(username)}&host=true`)
    }
  }

  const joinRoom = () => {
    if (username.trim() && roomId.trim()) {
      router.push(`/room/${roomId.toUpperCase()}?username=${encodeURIComponent(username)}`)
    }
  }

  return (
    <div className="home-container">
      <ParticleBackground />
      <div className="home-content">
        <h1 className="title">Mega Tic Tac Toe</h1>
        <div className="form-container">
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input"
          />
          <button onClick={createRoom} className="btn btn-primary">
            Create Room
          </button>
          <div className="divider">OR</div>
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            className="input"
          />
          <button onClick={joinRoom} className="btn btn-secondary">
            Join Room
          </button>
        </div>
      </div>
    </div>
  )
}