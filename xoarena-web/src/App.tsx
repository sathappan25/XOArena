import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bot,
  Flame,
  Home,
  MoonStar,
  Palette,
  RefreshCcw,
  Sparkles,
  Sun,
  Target,
  Trophy,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import {
  calculateWinner,
  getAiMove,
  getWinningLine,
  isBoardFull,
  type Cell,
  type Difficulty,
} from './gameLogic'
import './App.css'

type View = 'landing' | 'arena'
type Theme = 'light' | 'dark' | 'crimson'

const HUMAN_MARK = 'X'
const AI_MARK = 'O'
const EMPTY_BOARD: Cell[] = Array(9).fill(null)

type ScoreState = {
  wins: number
  losses: number
  draws: number
}

type ScoreAction = 'win' | 'loss' | 'draw'

function scoreReducer(state: ScoreState, action: ScoreAction): ScoreState {
  if (action === 'win') {
    return { ...state, wins: state.wins + 1 }
  }

  if (action === 'loss') {
    return { ...state, losses: state.losses + 1 }
  }

  return { ...state, draws: state.draws + 1 }
}

const difficultyOptions: Array<{
  value: Difficulty
  label: string
  hint: string
}> = [
  {
    value: 'easy',
    label: 'Easy',
    hint: 'Relaxed AI with random moves.',
  },
  {
    value: 'medium',
    label: 'Medium',
    hint: 'Smart AI with occasional mistakes.',
  },
  {
    value: 'hard',
    label: 'Hard',
    hint: 'Unbeatable minimax challenger.',
  },
]

const themeOptions: Array<{
  value: Theme
  label: string
  Icon: LucideIcon
}> = [
  {
    value: 'light',
    label: 'Light',
    Icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    Icon: MoonStar,
  },
  {
    value: 'crimson',
    label: 'Crimson',
    Icon: Flame,
  },
]

function App() {
  const [view, setView] = useState<View>('landing')
  const [theme, setTheme] = useState<Theme>('light')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [board, setBoard] = useState<Cell[]>([...EMPTY_BOARD])
  const [isHumanTurn, setIsHumanTurn] = useState(true)
  const [score, dispatchScore] = useReducer(scoreReducer, {
    wins: 0,
    losses: 0,
    draws: 0,
  })
  const lastOutcomeRef = useRef('')

  const winner = useMemo(() => calculateWinner(board), [board])
  const winningLine = useMemo(() => getWinningLine(board), [board])
  const isDraw = useMemo(() => !winner && isBoardFull(board), [board, winner])
  const gameOver = Boolean(winner) || isDraw
  const boardSignature = useMemo(
    () => board.map((cell) => cell ?? '-').join(''),
    [board],
  )
  const isAiThinking = view === 'arena' && !isHumanTurn && !gameOver

  useEffect(() => {
    if (view !== 'arena' || !gameOver) {
      lastOutcomeRef.current = ''
      return
    }

    const outcomeKey = winner ? `winner-${winner}-${boardSignature}` : `draw-${boardSignature}`

    if (lastOutcomeRef.current === outcomeKey) {
      return
    }

    lastOutcomeRef.current = outcomeKey

    if (winner === HUMAN_MARK) {
      dispatchScore('win')
      void confetti({
        particleCount: 120,
        spread: 72,
        startVelocity: 45,
        origin: { y: 0.68 },
      })
      return
    }

    if (winner === AI_MARK) {
      dispatchScore('loss')
      return
    }

    dispatchScore('draw')
  }, [boardSignature, gameOver, view, winner])

  useEffect(() => {
    if (!isAiThinking) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setBoard((currentBoard) => {
        const moveIndex = getAiMove(currentBoard, difficulty, AI_MARK, HUMAN_MARK)

        if (moveIndex < 0 || currentBoard[moveIndex] !== null) {
          return currentBoard
        }

        const nextBoard = [...currentBoard]
        nextBoard[moveIndex] = AI_MARK
        return nextBoard
      })
      setIsHumanTurn(true)
    }, 520)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [difficulty, isAiThinking])

  const currentDifficulty = useMemo(
    () => difficultyOptions.find((option) => option.value === difficulty),
    [difficulty],
  )

  const status = useMemo(() => {
    if (winner === HUMAN_MARK) {
      return {
        title: 'Congrats! You won this round.',
        subtitle: 'Perfect callouts and timing. Ready for the next battle?',
      }
    }

    if (winner === AI_MARK) {
      return {
        title: 'Try again!',
        subtitle: 'The AI took this one. Shift strategy and rematch.',
      }
    }

    if (isDraw) {
      return {
        title: 'Draw game.',
        subtitle: 'No empty tiles left. Start another round to settle it.',
      }
    }

    if (isHumanTurn) {
      return {
        title: 'Your turn',
        subtitle: 'Place X on any open tile to pressure the AI.',
      }
    }

    return {
      title: 'AI is thinking...',
      subtitle: `${currentDifficulty?.label ?? 'Current'} mode is calculating the best move.`,
    }
  }, [currentDifficulty?.label, isDraw, isHumanTurn, winner])

  const startNewRound = () => {
    setBoard([...EMPTY_BOARD])
    setIsHumanTurn(true)
    lastOutcomeRef.current = ''
  }

  const handleStartGame = () => {
    startNewRound()
    setView('arena')
  }

  const handleDifficultySelect = (nextDifficulty: Difficulty) => {
    setDifficulty(nextDifficulty)
    startNewRound()
  }

  const handleCellClick = (index: number) => {
    if (view !== 'arena' || !isHumanTurn || isAiThinking || gameOver) {
      return
    }

    if (board[index] !== null) {
      return
    }

    setBoard((currentBoard) => {
      if (currentBoard[index] !== null) {
        return currentBoard
      }

      const nextBoard = [...currentBoard]
      nextBoard[index] = HUMAN_MARK
      return nextBoard
    })

    setIsHumanTurn(false)
  }

  return (
    <div className={`app theme-${theme}`}>
      <div className="backdrop-orb orb-one" aria-hidden="true"></div>
      <div className="backdrop-orb orb-two" aria-hidden="true"></div>

      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.section
            key="landing"
            className="panel landing"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.42, ease: 'easeOut' }}
          >
            <div className="theme-row">
              <span className="theme-label">
                <Palette size={16} /> Theme
              </span>
              <div className="theme-controls" role="group" aria-label="Theme selector">
                {themeOptions.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`theme-button ${theme === value ? 'active' : ''}`}
                    onClick={() => setTheme(value)}
                    aria-pressed={theme === value}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="landing-content">
              <motion.p
                className="eyebrow"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Sparkles size={16} /> Human vs AI Arena
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
              >
                XOArena
              </motion.h1>
              <motion.p
                className="landing-copy"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
              >
                A responsive Tic-Tac-Toe experience with polished motion, themed visuals, and
                adaptive AI levels from easy to hard.
              </motion.p>

              <motion.div
                className="landing-highlights"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
              >
                <span>
                  <Target size={16} /> Three AI levels
                </span>
                <span>
                  <Palette size={16} /> Three live themes
                </span>
                <span>
                  <Trophy size={16} /> Round score tracking
                </span>
              </motion.div>

              <motion.button
                type="button"
                className="cta-button"
                onClick={handleStartGame}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.34 }}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                Start Game
              </motion.button>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="arena"
            className="arena"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <header className="panel arena-header">
              <div>
                <h2>XOArena</h2>
                <p>Play as {HUMAN_MARK} against AI as {AI_MARK}</p>
              </div>
              <div className="header-actions">
                <button type="button" className="ghost-button" onClick={() => setView('landing')}>
                  <Home size={16} /> Home
                </button>
                <button type="button" className="ghost-button" onClick={startNewRound}>
                  <RefreshCcw size={16} /> Restart Round
                </button>
              </div>
            </header>

            <div className="arena-grid">
              <aside className="panel control-panel">
                <h3>
                  <Bot size={18} /> AI Difficulty
                </h3>
                <div className="difficulty-grid" role="group" aria-label="Select AI difficulty">
                  {difficultyOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`difficulty-button ${difficulty === option.value ? 'active' : ''}`}
                      onClick={() => handleDifficultySelect(option.value)}
                      aria-pressed={difficulty === option.value}
                    >
                      <span>{option.label}</span>
                      <small>{option.hint}</small>
                    </button>
                  ))}
                </div>

                <h3>
                  <Palette size={18} /> Arena Theme
                </h3>
                <div className="theme-controls" role="group" aria-label="Theme selector">
                  {themeOptions.map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      className={`theme-button ${theme === value ? 'active' : ''}`}
                      onClick={() => setTheme(value)}
                      aria-pressed={theme === value}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="score-grid" aria-label="Scoreboard">
                  <div className="score-pill">
                    <Trophy size={16} />
                    <span>Wins: {score.wins}</span>
                  </div>
                  <div className="score-pill">
                    <Bot size={16} />
                    <span>Losses: {score.losses}</span>
                  </div>
                  <div className="score-pill">
                    <Target size={16} />
                    <span>Draws: {score.draws}</span>
                  </div>
                </div>
              </aside>

              <main className="panel board-panel">
                <div className={`status-card ${winner === HUMAN_MARK ? 'win' : ''} ${winner === AI_MARK ? 'lose' : ''}`}>
                  <h3>{status.title}</h3>
                  <p>{status.subtitle}</p>
                </div>

                <div className="turn-badges">
                  <span className={`turn-badge ${isHumanTurn && !gameOver ? 'active' : ''}`}>
                    <UserRound size={15} /> You ({HUMAN_MARK})
                  </span>
                  <span className={`turn-badge ${!isHumanTurn && !gameOver ? 'active' : ''}`}>
                    <Bot size={15} /> AI ({AI_MARK})
                  </span>
                </div>

                <div className="board" role="grid" aria-label="Tic tac toe board">
                  {board.map((cell, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`cell ${winningLine?.includes(index) ? 'winning' : ''}`}
                      onClick={() => handleCellClick(index)}
                      disabled={cell !== null || !isHumanTurn || gameOver || isAiThinking}
                      aria-label={`Cell ${index + 1}${cell ? `, ${cell}` : ''}`}
                    >
                      <AnimatePresence mode="wait">
                        {cell && (
                          <motion.span
                            key={`${cell}-${index}`}
                            className={`mark ${cell === HUMAN_MARK ? 'x-mark' : 'o-mark'}`}
                            initial={{ opacity: 0, scale: 0.2, rotate: -14 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.4 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                          >
                            {cell}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  ))}
                </div>

                <div className="action-row">
                  <button type="button" className="primary-button" onClick={startNewRound}>
                    <RefreshCcw size={16} /> Play Again
                  </button>
                </div>
              </main>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
