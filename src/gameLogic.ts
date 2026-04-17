export type Player = 'X' | 'O'
export type Cell = Player | null
export type Difficulty = 'easy' | 'medium' | 'hard'
export type BoardSize = 3 | 4 | 5

const winPatternCache = new Map<number, number[][]>()

function inferBoardSize(board: Cell[]): number {
  const boardSize = Math.sqrt(board.length)

  if (!Number.isInteger(boardSize)) {
    throw new Error('Board length must be a perfect square.')
  }

  return boardSize
}

function getWinPatterns(boardSize: number): number[][] {
  const cached = winPatternCache.get(boardSize)
  if (cached) {
    return cached
  }

  const patterns: number[][] = []

  for (let row = 0; row < boardSize; row += 1) {
    const rowPattern: number[] = []
    for (let col = 0; col < boardSize; col += 1) {
      rowPattern.push(row * boardSize + col)
    }
    patterns.push(rowPattern)
  }

  for (let col = 0; col < boardSize; col += 1) {
    const columnPattern: number[] = []
    for (let row = 0; row < boardSize; row += 1) {
      columnPattern.push(row * boardSize + col)
    }
    patterns.push(columnPattern)
  }

  const diagonalLeftToRight: number[] = []
  const diagonalRightToLeft: number[] = []

  for (let index = 0; index < boardSize; index += 1) {
    diagonalLeftToRight.push(index * boardSize + index)
    diagonalRightToLeft.push(index * boardSize + (boardSize - 1 - index))
  }

  patterns.push(diagonalLeftToRight, diagonalRightToLeft)
  winPatternCache.set(boardSize, patterns)
  return patterns
}

export function calculateWinner(board: Cell[], boardSize?: number): Player | null {
  const size = boardSize ?? inferBoardSize(board)

  for (const pattern of getWinPatterns(size)) {
    const firstCell = board[pattern[0]]
    if (!firstCell) {
      continue
    }

    if (pattern.every((index) => board[index] === firstCell)) {
      return firstCell
    }
  }

  return null
}

export function getWinningLine(board: Cell[], boardSize?: number): number[] | null {
  const size = boardSize ?? inferBoardSize(board)

  for (const pattern of getWinPatterns(size)) {
    const firstCell = board[pattern[0]]
    if (!firstCell) {
      continue
    }

    if (pattern.every((index) => board[index] === firstCell)) {
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

function findImmediateMove(
  board: Cell[],
  player: Player,
  boardSize: number,
): number | null {
  const availableMoves = getAvailableMoves(board)

  for (const move of availableMoves) {
    const simulation = [...board]
    simulation[move] = player
    if (calculateWinner(simulation, boardSize) === player) {
      return move
    }
  }

  return null
}

function getCenterMoves(boardSize: number): number[] {
  if (boardSize % 2 === 1) {
    return [Math.floor((boardSize * boardSize) / 2)]
  }

  const topLeftCenter = boardSize / 2 - 1
  const topRightCenter = boardSize / 2

  return [
    topLeftCenter * boardSize + topLeftCenter,
    topLeftCenter * boardSize + topRightCenter,
    topRightCenter * boardSize + topLeftCenter,
    topRightCenter * boardSize + topRightCenter,
  ]
}

function getPriorityMoves(boardSize: number): number[] {
  const totalCells = boardSize * boardSize
  const centerMoves = getCenterMoves(boardSize)
  const cornerMoves = [
    0,
    boardSize - 1,
    boardSize * (boardSize - 1),
    totalCells - 1,
  ]
  const centerPoint = (boardSize - 1) / 2

  const remainingMoves = Array.from({ length: totalCells }, (_, index) => index)
    .filter((index) => !centerMoves.includes(index) && !cornerMoves.includes(index))
    .sort((left, right) => {
      const leftRow = Math.floor(left / boardSize)
      const leftCol = left % boardSize
      const rightRow = Math.floor(right / boardSize)
      const rightCol = right % boardSize
      const leftDistance = Math.abs(leftRow - centerPoint) + Math.abs(leftCol - centerPoint)
      const rightDistance =
        Math.abs(rightRow - centerPoint) + Math.abs(rightCol - centerPoint)

      return leftDistance - rightDistance
    })

  return [...new Set([...centerMoves, ...cornerMoves, ...remainingMoves])]
}

function minimax(
  board: Cell[],
  depth: number,
  isMaximizing: boolean,
  aiPlayer: Player,
  humanPlayer: Player,
  boardSize: number,
): number {
  const winner = calculateWinner(board, boardSize)

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
        minimax(simulation, depth + 1, false, aiPlayer, humanPlayer, boardSize),
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
      minimax(simulation, depth + 1, true, aiPlayer, humanPlayer, boardSize),
    )
  }

  return bestScore
}

function getBestMoveWithMinimax(
  board: Cell[],
  aiPlayer: Player,
  humanPlayer: Player,
  boardSize: number,
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
    const score = minimax(simulation, 0, false, aiPlayer, humanPlayer, boardSize)

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
  boardSize: number,
): number | null {
  const availableMoves = getAvailableMoves(board)

  if (availableMoves.length === 0) {
    return null
  }

  const winningMove = findImmediateMove(board, aiPlayer, boardSize)
  if (winningMove !== null) {
    return winningMove
  }

  const blockMove = findImmediateMove(board, humanPlayer, boardSize)
  if (blockMove !== null) {
    return blockMove
  }

  const preferredOrder = getPriorityMoves(boardSize)
  const strategicMove = preferredOrder.find((index) => board[index] === null)

  if (strategicMove !== undefined && Math.random() < 0.72) {
    return strategicMove
  }

  if (boardSize === 3 && Math.random() < 0.45) {
    const bestMove = getBestMoveWithMinimax(board, aiPlayer, humanPlayer, boardSize)
    if (bestMove !== null) {
      return bestMove
    }
  }

  return pickRandomMove(availableMoves)
}

function scoreHeuristicMove(
  board: Cell[],
  move: number,
  aiPlayer: Player,
  humanPlayer: Player,
  boardSize: number,
): number {
  const aiSimulation = [...board]
  aiSimulation[move] = aiPlayer

  if (calculateWinner(aiSimulation, boardSize) === aiPlayer) {
    return 1000
  }

  const humanSimulation = [...board]
  humanSimulation[move] = humanPlayer

  if (calculateWinner(humanSimulation, boardSize) === humanPlayer) {
    return 800
  }

  const relevantPatterns = getWinPatterns(boardSize).filter((pattern) => pattern.includes(move))
  let score = 0

  for (const pattern of relevantPatterns) {
    let aiCount = 0
    let humanCount = 0

    for (const index of pattern) {
      if (aiSimulation[index] === aiPlayer) {
        aiCount += 1
      } else if (aiSimulation[index] === humanPlayer) {
        humanCount += 1
      }
    }

    if (humanCount === 0) {
      score += aiCount * aiCount + 2
    } else if (aiCount === 0) {
      score += humanCount
    }
  }

  const row = Math.floor(move / boardSize)
  const col = move % boardSize
  const centerPoint = (boardSize - 1) / 2
  const distanceFromCenter = Math.abs(row - centerPoint) + Math.abs(col - centerPoint)

  return score + Math.max(0, boardSize - distanceFromCenter) + Math.random() * 0.05
}

function getStrategicMoveForLargeBoard(
  board: Cell[],
  aiPlayer: Player,
  humanPlayer: Player,
  boardSize: number,
): number | null {
  const availableMoves = getAvailableMoves(board)

  if (availableMoves.length === 0) {
    return null
  }

  let bestScore = Number.NEGATIVE_INFINITY
  let bestMove = availableMoves[0]

  for (const move of availableMoves) {
    const score = scoreHeuristicMove(board, move, aiPlayer, humanPlayer, boardSize)
    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return bestMove
}

export function getAiMove(
  board: Cell[],
  difficulty: Difficulty,
  aiPlayer: Player = 'O',
  humanPlayer: Player = 'X',
  boardSize?: number,
): number {
  const size = boardSize ?? inferBoardSize(board)
  const availableMoves = getAvailableMoves(board)

  if (availableMoves.length === 0) {
    return -1
  }

  if (difficulty === 'easy') {
    return pickRandomMove(availableMoves)
  }

  if (difficulty === 'medium') {
    return getMediumMove(board, aiPlayer, humanPlayer, size) ?? pickRandomMove(availableMoves)
  }

  if (size === 3) {
    return (
      getBestMoveWithMinimax(board, aiPlayer, humanPlayer, size) ??
      pickRandomMove(availableMoves)
    )
  }

  return (
    getStrategicMoveForLargeBoard(board, aiPlayer, humanPlayer, size) ??
    pickRandomMove(availableMoves)
  )
}
