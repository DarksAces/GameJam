import { useEffect, useRef, useState, useCallback } from 'react'
import { initAR, stopAR, arState } from './game/ar'
import { playAmbient, stopAmbient } from './game/audio'
import { saveHighScore } from './services/firebase'
import LoginModal from './components/LoginModal'
import LobbyScreen from './components/LobbyScreen'
import Leaderboard from './components/Leaderboard'
import './index.css'

// ─── Componentes Minijuegos ───────────────────────────────────────────────────
function Muffins({ onMuffinClick }) {
  const [muffins, setMuffins] = useState([])
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMuffins(m => {
        if (m.length >= 6) return m
        return [...m, { id: Math.random(), x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 }]
      })
    }, 700)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="muffins-container">
      {muffins.map(m => (
        <div key={m.id} 
             className="muffin" 
             style={{ left: `${m.x}%`, top: `${m.y}%` }}
             onClick={(e) => {
                e.stopPropagation();
                onMuffinClick();
                setMuffins(curr => curr.filter(currM => currM.id !== m.id));
             }}>
          🧁
        </div>
      ))}
    </div>
  )
}

function CatMinigame({ onComplete }) {
  const [clicks, setClicks] = useState(0)
  const [timeLeft, setTimeLeft] = useState(50)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0) {
          onComplete(clicks)
          return 0
        }
        return t - 1
      })
    }, 100)
    return () => clearInterval(timer)
  }, [clicks, onComplete])

  const handleClick = (e) => {
    e.stopPropagation()
    setClicks(c => {
      const newC = c + 1
      if (newC >= 15) {
        onComplete(newC + Math.floor(timeLeft / 2))
      }
      return newC
    })
  }

  return (
    <div className="cat-minigame-overlay">
      <div className="cat-visual" onClick={handleClick}>
        <div className="cat-ears">/\_/\</div>
        <div className="cat-face">( o.o )</div>
        <div className="cat-belly">¡Ráscame!<br/>({Math.max(0, 15 - clicks)})</div>
      </div>
      <div className="cat-timer">Tiempo restante: {(timeLeft / 10).toFixed(1)}s</div>
    </div>
  )
}

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
function GameOver({ score, onRestart, onExit }) {
  return (
    <div className="screen">
      <h1>Game Over</h1>
      <div className="score-display">{score}</div>
      <p className="score-label">orbes capturados</p>
      <div className="modal-actions" style={{ pointerEvents: 'all' }}>
        <button className="btn btn-secondary" onClick={onExit}>Ver Lobby</button>
        <button className="btn" onClick={onRestart}>Jugar de nuevo</button>
      </div>
    </div>
  )
}

// ─── App principal ────────────────────────────────────────────────────────────
export default function App() {
  const containerRef = useRef(null)
  const [user, setUser] = useState(null)
  const [gameState, setGameState] = useState('menu') // 'menu' | 'lobby' | 'playing' | 'gameover'
  const [showLogin, setShowLogin] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(120)
  const [isMatchStarted, setIsMatchStarted] = useState(false)
  const [activeMessage, setActiveMessage] = useState("")
  const [activeEffect, setActiveEffect] = useState(null) // 'green' | 'shake'
  const [catMinigame, setCatMinigame] = useState(false)
  
  const scoreRef = useRef(0)
  const multiplierRef = useRef(1)
  const arStateRef = useRef({
    paranoia: false,
    speedMult: 1,
    spawnRateMult: 1
  })

  // Check for existing session
  useEffect(() => {
    const savedName = localStorage.getItem('game_username');
    if (savedName) setUser(savedName);
  }, [setUser]);

  const handleStop = useCallback(async (finalScore) => {
    console.log("🏁 Juego terminado. Puntuación final:", finalScore);
    stopAR()
    stopAmbient()
    setGameState('gameover')

    // Save high score automatically
    const uid = localStorage.getItem('game_uid');
    const name = localStorage.getItem('game_username');
    
    console.log("👤 Datos de sesión - UID:", uid, "Nombre:", name);

    if (uid && name) {
      await saveHighScore(uid, name, finalScore);
    } else {
      console.warn("⚠️ No se puede guardar: Falta UID o Nombre en localStorage");
    }
  }, [])

  const handleStartGame = useCallback(async () => {
    setScore(0)
    scoreRef.current = 0
    setTimeLeft(120)
    setIsMatchStarted(false)
    stopAR()
    stopAmbient()
    playAmbient()
    await initAR(containerRef.current, {
      onCapture: (points, type) => {
        // Lógica de puntos básica
        setScore(s => {
          const next = Math.max(0, s + (points * (multiplierRef.current || 1)))
          scoreRef.current = next
          return next
        })

        // Lógica de Poderes
        if (type === 'RED') {
          setActiveMessage("Que seas paranoide no quiere decir que no te estén persiguiendo")
          arState.paranoia = true
          setTimeout(() => arState.paranoia = false, 5000)
        } else if (type === 'GREEN') {
          setActiveMessage("Modo munchies activado")
          setActiveEffect('green')
          arState.speedMult = 0.5
          setTimeout(() => { setActiveEffect(null); arState.speedMult = 1 }, 5000)
        } else if (type === 'YELLOW') {
          setActiveMessage("Sobredosis de cafeína")
          setActiveEffect('shake')
          arState.speedMult = 2
          arState.spawnRateMult = 2
          multiplierRef.current = 2
          setTimeout(() => { 
            setActiveEffect(null)
            arState.speedMult = 1
            arState.spawnRateMult = 1
            multiplierRef.current = 1
          }, 5000)
        } else if (type === 'ORANGE') {
          setActiveMessage("Tu gato exige atención")
          setCatMinigame(true)
        }

        // Limpiar mensaje tras 3.5 segundos
        if (type !== 'BLUE') {
          setTimeout(() => setActiveMessage(""), 3500)
        }
      },
      onTargetFound: () => {
        console.log("📱 App.jsx: Target Found recibido! Iniciando cronómetro.");
        setIsMatchStarted(true);
      }
    })
    setGameState('playing')
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
    if (gameState !== 'playing' || !isMatchStarted) return
    console.log("⏰ Cronómetro ACTIVADO - 120s empezando...");
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval)
          handleStop(scoreRef.current)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [gameState, isMatchStarted, handleStop])

  return (
    <>
    <div className={`app-container ${activeEffect === 'green' ? 'effect-green' : ''} ${activeEffect === 'shake' ? 'shake' : ''}`}>
      {/* Canvas de AR — siempre montado para que MindAR tenga el div */}
      <div ref={containerRef} id="ar-container" />

      {/* Mensajes de Poder */}
      {activeMessage && <div className="message-toast">{activeMessage}</div>}

      {/* Capa de efectos visuales globales */}
      <div className={`effect-overlay ${activeEffect || ''}`} />

      {/* Minijuegos */}
      {activeEffect === 'green' && (
        <Muffins onMuffinClick={() => setScore(s => s + 2)} />
      )}
      
      {catMinigame && (
        <CatMinigame onComplete={(bonus) => {
          setScore(s => s + bonus)
          setCatMinigame(false)
        }} />
      )}

      {/* UI overlay */}
      {gameState === 'menu' && <MenuScreen onStart={handleInitiate} />}

      {gameState === 'lobby' && (
        <LobbyScreen
          username={user}
          onCreateGame={handleStartGame}
          onShowLeaderboard={() => setShowLeaderboard(true)}
        />
      )}

      {gameState === 'playing' && <HUD score={score} timeLeft={timeLeft} />}

      {!isMatchStarted && gameState === 'playing' && (
        <div className="target-hint">Encuadra tu cara para empezar</div>
      )}

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
    </div>
    </>
  )
}