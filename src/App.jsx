import { useEffect, useRef, useState, useCallback } from 'react'
import { initAR, stopAR } from './game/ar'
import { playAmbient, stopAmbient } from './game/audio'
import './index.css'

// ─── Pantalla de inicio ───────────────────────────────────────────────────────
function MenuScreen({ onStart }) {
  return (
    <div className="screen">
      <h1>Light Hunt</h1>
      <p>Captura todos los orbes de luz antes de que se agote el tiempo</p>
      <button className="btn" onClick={onStart}>
        Iniciar
      </button>
    </div>
  )
}

function HUD({ score, timeLeft }) {
  return (
    <>
      <div className="hud">
        <div className="hud-box">⬡ {score}</div>
        <div className={`hud-box ${timeLeft <= 10 ? 'danger' : ''}`}>
          {timeLeft}s
        </div>
      </div>
      <div className="hint">toca los orbes para capturarlos</div>
    </>
  )
}

// ─── Pantalla de game over ────────────────────────────────────────────────────
function GameOver({ score, onRestart }) {
  return (
    <div className="screen">
      <h1>Game Over</h1>
      <div className="score-display">{score}</div>
      <p className="score-label">orbes capturados</p>
      <button className="btn" onClick={onRestart}>
        Jugar de nuevo
      </button>
    </div>
  )
}

// ─── App principal ────────────────────────────────────────────────────────────
export default function App() {
  const containerRef = useRef(null)
  const [gameState, setGameState] = useState('menu') // 'menu' | 'playing' | 'gameover'
  const [score, setScore]         = useState(0)
  const [timeLeft, setTimeLeft]   = useState(60)

  const handleStop = useCallback(() => {
    stopAR()
    stopAmbient()
    setGameState('gameover')
  }, [])

  const handleStart = useCallback(async () => {
    setScore(0)
    setTimeLeft(60)
    setGameState('playing')
    playAmbient()
    await initAR(containerRef.current, {
      onCapture: (points) => setScore(s => Math.max(0, s + points)),
    })
  }, [])

  // Countdown timer
  useEffect(() => {
    if (gameState !== 'playing') return
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          handleStop()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [gameState, handleStop])

  return (
    <>
      {/* Canvas de AR — siempre montado para que MindAR tenga el div */}
      <div ref={containerRef} id="ar-container" />

      {/* UI overlay */}
      {gameState === 'menu'     && <MenuScreen onStart={handleStart} />}
      {gameState === 'playing'  && <HUD score={score} timeLeft={timeLeft} />}
      {gameState === 'gameover' && <GameOver score={score} onRestart={handleStart} />}
    </>
  )
}