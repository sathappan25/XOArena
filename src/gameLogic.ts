export type Player = 'X' | 'O'
export type Cell = Player | null
export type Difficulty = 'easy' | 'medium' | 'hard'

const WIN_PATTERNS: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export function calculateWinner(board: Cell[]): Player | null {
  for (const pattern of WIN_PATTERNS) {
    const [a, b, c] = pattern
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }
  return null
}

export function getWinningLine(board: Cell[]): number[] | null {
  for (const pattern of WIN_PATTERNS) {
    const [a, b, c] = pattern
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return pattern
    }
  }
  return null
}

export function isBoardFull(board: Cell[]): boolean {
  return board.every((cell) => cell !== null)
}

function getAvailableMoves(board: Cell[]): number[] {
  return board
    .map((cell, index) => (cell === null ? index : -1))
    .filter((index) => index >= 0)
}

function pickRandomMove(moves: number[]): number {
  return moves[Math.floor(Math.random() * moves.length)]
}

function findImmediateMove(board: Cell[], player: Player): number | null {
  const availableMoves = getAvailableMoves(board)

  for (const move of availableMoves) {
    const simulation = [...board]
    simulation[move] = player
    if (calculateWinner(simulation) === player) {
      return move
    }
  }

  return null
}

function minimax(
  board: Cell[],
  depth: number,
  isMaximizing: boolean,
  aiPlayer: Player,
  humanPlayer: Player,
): number {
  const winner = calculateWinner(board)

  if (winner === aiPlayer) {
    return 10 - depth
  }

  if (winner === humanPlayer) {
    return depth - 10
  }

  if (isBoardFull(board)) {
    return 0
  }

  const availableMoves = getAvailableMoves(board)

  if (isMaximizing) {
    let bestScore = Number.NEGATIVE_INFINITY

    for (const move of availableMoves) {
      const simulation = [...board]
      simulation[move] = aiPlayer
      bestScore = Math.max(
        bestScore,
        minimax(simulation, depth + 1, false, aiPlayer, humanPlayer),
      )
    }

    return bestScore
  }

  let bestScore = Number.POSITIVE_INFINITY

  for (const move of availableMoves) {
    const simulation = [...board]
    simulation[move] = humanPlayer
    bestScore = Math.min(
      bestScore,
      minimax(simulation, depth + 1, true, aiPlayer, humanPlayer),
    )
  }

  return bestScore
}

function getBestMoveWithMinimax(
  board: Cell[],
  aiPlayer: Player,
  humanPlayer: Player,
): number | null {
  const availableMoves = getAvailableMoves(board)

  if (availableMoves.length === 0) {
    return null
  }

  let bestScore = Number.NEGATIVE_INFINITY
  let bestMove = availableMoves[0]

  for (const move of availableMoves) {
    const simulation = [...board]
    simulation[move] = aiPlayer
    const score = minimax(simulation, 0, false, aiPlayer, humanPlayer)

    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return bestMove
}

function getMediumMove(
  board: Cell[],
  aiPlayer: Player,
  humanPlayer: Player,
): number | null {
  const availableMoves = getAvailableMoves(board)

  if (availableMoves.length === 0) {
    return null
  }

  const winningMove = findImmediateMove(board, aiPlayer)
  if (winningMove !== null) {
    return winningMove
  }

  const blockMove = findImmediateMove(board, humanPlayer)
  if (blockMove !== null) {
    return blockMove
  }

  const preferredOrder = [4, 0, 2, 6, 8, 1, 3, 5, 7]
  const strategicMove = preferredOrder.find((index) => board[index] === null)

  if (strategicMove !== undefined && Math.random() < 0.65) {
    return strategicMove
  }

  if (Math.random() < 0.4) {
    const bestMove = getBestMoveWithMinimax(board, aiPlayer, humanPlayer)
    if (bestMove !== null) {
      return bestMove
    }
  }

  return pickRandomMove(availableMoves)
}

export function getAiMove(
  board: Cell[],
  difficulty: Difficulty,
  aiPlayer: Player = 'O',
  humanPlayer: Player = 'X',
): number {
  const availableMoves = getAvailableMoves(board)

  if (availableMoves.length === 0) {
    return -1
  }

  if (difficulty === 'easy') {
    return pickRandomMove(availableMoves)
  }

  if (difficulty === 'medium') {
    return getMediumMove(board, aiPlayer, humanPlayer) ?? pickRandomMove(availableMoves)
  }

  return getBestMoveWithMinimax(board, aiPlayer, humanPlayer) ?? pickRandomMove(availableMoves)
}