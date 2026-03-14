import { useEffect, useRef, useState, useCallback } from 'react'
import { initAR, stopAR } from './game/ar'
import { playAmbient, stopAmbient } from './game/audio'
import { saveHighScore } from './services/firebase'
import LoginModal from './components/LoginModal'
import LobbyScreen from './components/LobbyScreen'
import Leaderboard from './components/Leaderboard'
import './index.css'

// ─── Pantalla de inicio (Original) ─────────────────────────────────────────────
function MenuScreen({ onStart }) {
  return (
    <div className="screen">
      <h1>Light Hunt</h1>
      <p>Apunta al portal con tu cámara y captura los orbes de luz antes de que desaparezcan</p>
      <button className="btn" onClick={onStart}>
        Iniciar
      </button>
    </div>
  )
}

// ─── HUD durante la partida ───────────────────────────────────────────────────
function HUD({ score, timeLeft }) {
  return (
    <>
      <div className="hud">
        <div className="hud-box">⬡ {score}</div>
        <div className={`hud-box ${timeLeft <= 10 ? 'danger' : ''}`}>
          {timeLeft}s
        </div>
      </div>
      <div className="hint">apunta al portal → toca los orbes</div>
    </>
  )
}

// ─── Pantalla de game over ────────────────────────────────────────────────────
function GameOver({ score, onRestart, onExit }) {
  return (
    <div className="screen">
      <h1>Game Over</h1>
      <div className="score-display">{score}</div>
      <p className="score-label">orbes capturados</p>
      <div className="modal-actions" style={{pointerEvents: 'all'}}>
        <button className="btn btn-secondary" onClick={onExit}>Ver Lobby</button>
        <button className="btn" onClick={onRestart}>Reiniciar</button>
      </div>
    </div>
  )
}

// ─── App principal ────────────────────────────────────────────────────────────
export default function App() {
  const containerRef = useRef(null)
  const [user, setUser]           = useState(null)
  const [gameState, setGameState] = useState('menu') // 'menu' | 'lobby' | 'playing' | 'gameover'
  const [showLogin, setShowLogin] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [score, setScore]         = useState(0)
  const [timeLeft, setTimeLeft]   = useState(60)

  // Check for existing session
  useEffect(() => {
    const savedName = localStorage.getItem('game_username');
    if (savedName) setUser(savedName);
  }, []);

  const handleStop = useCallback(async (finalScore) => {
    stopAR()
    stopAmbient()
    setGameState('gameover')
    
    // Save high score automatically
    const uid = localStorage.getItem('game_uid');
    const name = localStorage.getItem('game_username');
    if (uid && name) {
      await saveHighScore(uid, name, finalScore);
    }
  }, [])

  const handleStartGame = useCallback(async () => {
    setScore(0)
    setTimeLeft(60)
    setGameState('playing')
    playAmbient()
    await initAR(containerRef.current, {
      onCapture: () => setScore(s => s + 1),
    })
  }, [])

  const handleInitiate = () => {
    if (user) {
      setGameState('lobby');
    } else {
      setShowLogin(true);
    }
  };

  const handleLoginSuccess = (username) => {
    setUser(username);
    setShowLogin(false);
    setGameState('lobby');
  };

  // Countdown timer
  useEffect(() => {
    if (gameState !== 'playing') return
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval)
          handleStop(score) // Pass the current score to be saved
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [gameState, handleStop, score])

  return (
    <>
      {/* Canvas de AR — siempre montado para que MindAR tenga el div */}
      <div ref={containerRef} id="ar-container" />

      {/* UI overlay */}
      {gameState === 'menu'     && <MenuScreen onStart={handleInitiate} />}
      
      {gameState === 'lobby'    && (
        <LobbyScreen 
          username={user} 
          onCreateGame={handleStartGame} 
          onShowLeaderboard={() => setShowLeaderboard(true)} 
        />
      )}

      {gameState === 'playing'  && <HUD score={score} timeLeft={timeLeft} />}
      
      {gameState === 'gameover' && (
        <GameOver 
          score={score} 
          onRestart={handleStartGame} 
          onExit={() => setGameState('lobby')} 
        />
      )}

      {showLogin && (
        <LoginModal 
          onLoginSuccess={handleLoginSuccess} 
          onCancel={() => setShowLogin(false)} 
        />
      )}

      {showLeaderboard && (
        <Leaderboard onClose={() => setShowLeaderboard(false)} />
      )}
    </>
  )
}