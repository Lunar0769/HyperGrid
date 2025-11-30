# 🎮 Hyper Grid - Multiplayer Game

A real-time multiplayer Ultimate Tic Tac Toe game built with Next.js and Socket.IO, featuring animated dotted surface effects and room management.

![Game Screenshot](https://via.placeholder.com/800x400/1a1a2e/16213e?text=Mega+Tic+Tac+Toe)

## Features

- **Ultimate Tic Tac Toe Rules**: 9 sub-boards in a 3x3 grid with strategic gameplay
- **Real-time Multiplayer**: WebSocket-based synchronization using Socket.IO
- **Room Management**: Host controls who can play, spectator mode
- **Particle Background**: Animated particle effects for visual appeal
- **Responsive Design**: Works on desktop and mobile devices

## Game Rules

1. The game consists of 9 small tic-tac-toe boards arranged in a 3×3 grid
2. After the first move, each move forces the opponent to play in the corresponding sub-board
3. If a sub-board is won or filled, it's marked and no more moves can be played there
4. If sent to a completed board, players can choose any available board
5. Win by getting three sub-boards in a row on the main grid

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development servers**:
   ```bash
   npm run dev:full
   ```
   
   This will start both the Next.js frontend (port 3000) and Socket.IO server (port 3001).

   Alternatively, you can run them separately:
   ```bash
   # Terminal 1 - Socket.IO Server
   npm run server
   
   # Terminal 2 - Next.js Frontend
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

## How to Play

### Creating a Room
1. Enter your name on the home page
2. Click "Create Room" to generate a new room
3. Share the room ID with other players

### Joining a Room
1. Enter your name and the room ID
2. Click "Join Room"
3. Wait for the host to assign player roles

### Host Controls
- Assign X and O roles to players
- Start the game when both players are assigned
- Other participants become spectators

### Gameplay
- Only assigned players can make moves
- Click on cells in the active sub-board (highlighted in green)
- Follow Ultimate Tic Tac Toe rules for board selection

## Project Structure

```
├── components/
│   ├── Cell.js              # Individual cell component
│   ├── GameBoard.js         # Main game board with 9 sub-boards
│   ├── ParticleBackground.js # Animated particle effects
│   ├── RoomInfo.js          # Room management sidebar
│   └── SubBoard.js          # 3x3 sub-board component
├── pages/
│   ├── _app.js              # Next.js app wrapper
│   ├── index.js             # Home page (create/join room)
│   └── room/[roomId].js     # Game room page
├── styles/
│   └── globals.css          # Global styles and responsive design
├── server.js                # Socket.IO server with game logic
└── package.json             # Dependencies and scripts
```

## Technical Details

### Frontend (Next.js)
- React hooks for state management
- Socket.IO client for real-time communication
- Canvas-based particle animation
- CSS Grid for responsive game board layout

### Backend (Socket.IO)
- Room-based game sessions
- Real-time move synchronization
- Game state validation
- Player role management

### Game Logic
- Ultimate Tic Tac Toe rule enforcement
- Sub-board win detection
- Turn management
- Active board highlighting

## Customization

### Styling
- Modify `styles/globals.css` for visual changes
- Particle effects can be customized in `components/ParticleBackground.js`
- Color scheme uses CSS custom properties for easy theming

### Game Rules
- Server-side game logic is in the `GameRoom` class in `server.js`
- Client-side validation in `components/GameBoard.js`

## Deployment

### Frontend (Vercel/Netlify)
1. Build the Next.js app: `npm run build`
2. Deploy the `out` folder to your hosting service

### Backend (Heroku/Railway)
1. Deploy `server.js` to your Node.js hosting service
2. Update the Socket.IO URL in `pages/room/[roomId].js`

## Troubleshooting

- **Connection Issues**: Ensure both frontend (3000) and backend (3001) are running
- **Room Not Found**: Check that the room ID is correct and the server is running
- **Moves Not Working**: Verify you're assigned as a player and it's your turn

## License

This project is open source and available under the MIT License.