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
  type BoardSize,
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
const DEFAULT_BOARD_SIZE: BoardSize = 3
const MOVE_TIME_LIMIT_SECONDS = 10

const createEmptyBoard = (boardSize: BoardSize): Cell[] => Array(boardSize * boardSize).fill(null)

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

const boardSizeOptions: Array<{
  value: BoardSize
  label: string
  hint: string
}> = [
  {
    value: 3,
    label: '3 x 3',
    hint: 'Classic quick match.',
  },
  {
    value: 4,
    label: '4 x 4',
    hint: 'More space, longer tactics.',
  },
  {
    value: 5,
    label: '5 x 5',
    hint: 'Extended strategy arena.',
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
  const [boardSize, setBoardSize] = useState<BoardSize>(DEFAULT_BOARD_SIZE)
  const [board, setBoard] = useState<Cell[]>(() => createEmptyBoard(DEFAULT_BOARD_SIZE))
  const [isHumanTurn, setIsHumanTurn] = useState(true)
  const [moveTimeLeft, setMoveTimeLeft] = useState(MOVE_TIME_LIMIT_SECONDS)
  const [timedOutTurn, setTimedOutTurn] = useState<'human' | 'ai' | null>(null)
  const [score, dispatchScore] = useReducer(scoreReducer, {
    wins: 0,
    losses: 0,
    draws: 0,
  })
  const lastOutcomeRef = useRef('')

  const winner = useMemo(() => calculateWinner(board, boardSize), [board, boardSize])
  const timeoutWinner = useMemo(() => {
    if (!timedOutTurn) {
      return null
    }

    return timedOutTurn === 'human' ? AI_MARK : HUMAN_MARK
  }, [timedOutTurn])
  const effectiveWinner = winner ?? timeoutWinner
  const winningLine = useMemo(
    () => (winner ? getWinningLine(board, boardSize) : null),
    [board, boardSize, winner],
  )
  const isDraw = useMemo(() => !effectiveWinner && isBoardFull(board), [board, effectiveWinner])
  const gameOver = Boolean(effectiveWinner) || isDraw
  const boardSignature = useMemo(
    () => board.map((cell) => cell ?? '-').join(''),
    [board],
  )
  const isAiThinking = view === 'arena' && !isHumanTurn && !gameOver

  const decisiveRounds = useMemo(() => score.wins + score.losses, [score.losses, score.wins])
  const totalRounds = useMemo(
    () => score.wins + score.losses + score.draws,
    [score.draws, score.losses, score.wins],
  )
  const playerWinRate = useMemo(
    () => (decisiveRounds > 0 ? (score.wins / decisiveRounds) * 100 : 0),
    [decisiveRounds, score.wins],
  )
  const aiWinRate = useMemo(
    () => (decisiveRounds > 0 ? (score.losses / decisiveRounds) * 100 : 0),
    [decisiveRounds, score.losses],
  )
  const winLeader = useMemo(() => {
    if (decisiveRounds === 0) {
      return 'none'
    }

    if (Math.abs(playerWinRate - aiWinRate) < Number.EPSILON) {
      return 'tie'
    }

    return playerWinRate > aiWinRate ? 'player' : 'ai'
  }, [aiWinRate, decisiveRounds, playerWinRate])
  const timerProgress = useMemo(
    () => Math.max((moveTimeLeft / MOVE_TIME_LIMIT_SECONDS) * 100, 0),
    [moveTimeLeft],
  )

  useEffect(() => {
    if (view !== 'arena' || !gameOver) {
      lastOutcomeRef.current = ''
      return
    }

    const outcomeKey = timedOutTurn
      ? `timeout-${timedOutTurn}-${boardSize}-${boardSignature}`
      : effectiveWinner
        ? `winner-${effectiveWinner}-${boardSize}-${boardSignature}`
        : `draw-${boardSize}-${boardSignature}`

    if (lastOutcomeRef.current === outcomeKey) {
      return
    }

    lastOutcomeRef.current = outcomeKey

    if (effectiveWinner === HUMAN_MARK) {
      dispatchScore('win')
      void confetti({
        particleCount: 120,
        spread: 72,
        startVelocity: 45,
        origin: { y: 0.68 },
      })
      return
    }

    if (effectiveWinner === AI_MARK) {
      dispatchScore('loss')
      return
    }

    dispatchScore('draw')
  }, [boardSignature, boardSize, effectiveWinner, gameOver, timedOutTurn, view])

  useEffect(() => {
    if (!isAiThinking) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setBoard((currentBoard) => {
        const moveIndex = getAiMove(currentBoard, difficulty, AI_MARK, HUMAN_MARK, boardSize)

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
  }, [boardSize, difficulty, isAiThinking])

  useEffect(() => {
    if (view !== 'arena' || gameOver) {
      return
    }

    setMoveTimeLeft(MOVE_TIME_LIMIT_SECONDS)

    const intervalId = window.setInterval(() => {
      setMoveTimeLeft((currentValue) => Math.max(currentValue - 1, 0))
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [gameOver, isHumanTurn, view])

  useEffect(() => {
    if (view !== 'arena' || gameOver || moveTimeLeft > 0) {
      return
    }

    setTimedOutTurn(isHumanTurn ? 'human' : 'ai')
  }, [gameOver, isHumanTurn, moveTimeLeft, view])

  const currentDifficulty = useMemo(
    () => difficultyOptions.find((option) => option.value === difficulty),
    [difficulty],
  )

  const status = useMemo(() => {
    if (timedOutTurn === 'human') {
      return {
        title: 'Time up! AI wins this round.',
        subtitle: 'Your 10-second move window expired. Restart to try again.',
      }
    }

    if (timedOutTurn === 'ai') {
      return {
        title: 'AI timed out. You win this round!',
        subtitle: 'The AI ran out of the 10-second move window.',
      }
    }

    if (effectiveWinner === HUMAN_MARK) {
      return {
        title: 'Congrats! You won this round.',
        subtitle: 'Perfect callouts and timing. Ready for the next battle?',
      }
    }

    if (effectiveWinner === AI_MARK) {
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
  }, [currentDifficulty?.label, effectiveWinner, isDraw, isHumanTurn, timedOutTurn])

  const leaderMessage = useMemo(() => {
    if (winLeader === 'none') {
      return 'No decisive rounds yet. Complete a few games to compare win rates.'
    }

    if (winLeader === 'tie') {
      return `It is tied at ${playerWinRate.toFixed(1)}% each.`
    }

    if (winLeader === 'player') {
      return `Player leads by ${(playerWinRate - aiWinRate).toFixed(1)} percentage points.`
    }

    return `AI leads by ${(aiWinRate - playerWinRate).toFixed(1)} percentage points.`
  }, [aiWinRate, playerWinRate, winLeader])

  const startNewRound = (nextBoardSize: BoardSize = boardSize) => {
    setBoard(createEmptyBoard(nextBoardSize))
    setIsHumanTurn(true)
    setTimedOutTurn(null)
    setMoveTimeLeft(MOVE_TIME_LIMIT_SECONDS)
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

  const handleBoardSizeSelect = (nextBoardSize: BoardSize) => {
    setBoardSize(nextBoardSize)
    startNewRound(nextBoardSize)
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
                  <Target size={16} /> Board size up to 5 x 5
                </span>
                <span>
                  <Trophy size={16} /> Live stats dashboard
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
                <button type="button" className="ghost-button" onClick={() => startNewRound()}>
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
                  <Target size={18} /> Grid Size
                </h3>
                <div className="grid-size-controls" role="group" aria-label="Select board size">
                  {boardSizeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`size-button ${boardSize === option.value ? 'active' : ''}`}
                      onClick={() => handleBoardSizeSelect(option.value)}
                      aria-pressed={boardSize === option.value}
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

                <div className="stats-dashboard" aria-label="Game stats dashboard">
                  <h3>
                    <Trophy size={18} /> Game Stats Dashboard
                  </h3>
                  <div className="stats-grid">
                    <article className={`stat-card ${winLeader === 'player' ? 'leader' : ''}`}>
                      <p>Player Win %</p>
                      <strong>{playerWinRate.toFixed(1)}%</strong>
                      <small>{score.wins} wins</small>
                    </article>
                    <article className={`stat-card ${winLeader === 'ai' ? 'leader' : ''}`}>
                      <p>AI Win %</p>
                      <strong>{aiWinRate.toFixed(1)}%</strong>
                      <small>{score.losses} wins</small>
                    </article>
                  </div>
                  <p className="stats-note">{leaderMessage}</p>
                  <p className="stats-note subtle">
                    Decisive rounds: {decisiveRounds} · Total rounds: {totalRounds}
                  </p>
                </div>
              </aside>

              <main className="panel board-panel">
                <div className={`status-card ${effectiveWinner === HUMAN_MARK ? 'win' : ''} ${effectiveWinner === AI_MARK ? 'lose' : ''}`}>
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

                <div className={`move-timer ${moveTimeLeft <= 3 && !gameOver ? 'danger' : ''}`}>
                  <div className="timer-head">
                    <span>{isHumanTurn ? 'Player' : 'AI'} move timer</span>
                    <strong>{moveTimeLeft}s</strong>
                  </div>
                  <div
                    className="timer-track"
                    role="progressbar"
                    aria-label="Move timer"
                    aria-valuemin={0}
                    aria-valuemax={MOVE_TIME_LIMIT_SECONDS}
                    aria-valuenow={moveTimeLeft}
                  >
                    <motion.div
                      className="timer-fill"
                      initial={false}
                      animate={{ width: `${timerProgress}%` }}
                      transition={{ duration: 0.2, ease: 'linear' }}
                    />
                  </div>
                </div>

                <div
                  className={`board board-${boardSize}`}
                  style={{
                    gridTemplateColumns: `repeat(${boardSize}, minmax(58px, 1fr))`,
                  }}
                  role="grid"
                  aria-label={`${boardSize} by ${boardSize} tic tac toe board`}
                >
                  {board.map((cell, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`cell ${winningLine?.includes(index) ? 'winning' : ''}`}
                      onClick={() => handleCellClick(index)}
                      disabled={cell !== null || !isHumanTurn || gameOver || isAiThinking}
                      aria-label={`Row ${Math.floor(index / boardSize) + 1}, Column ${(index % boardSize) + 1}${cell ? `, ${cell}` : ''}`}
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
                  <button type="button" className="primary-button" onClick={() => startNewRound()}>
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
