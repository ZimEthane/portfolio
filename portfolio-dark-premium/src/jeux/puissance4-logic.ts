// Logique pure du Puissance 4 et IA (minimax avec élagage alpha-bêta).
// Plateau : 6 lignes × 7 colonnes, case = 0 (vide), 1 ou 2 (joueurs). Ligne 0 = en haut.

export const ROWS = 6
export const COLS = 7
export type Cell = 0 | 1 | 2
export type Board = Cell[]

export const emptyBoard = (): Board => new Array(ROWS * COLS).fill(0)
export const idx = (r: number, c: number) => r * COLS + c

// Ligne où tomberait un jeton dans cette colonne (-1 si pleine).
export function dropRow(b: Board, c: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (b[idx(r, c)] === 0) return r
  return -1
}

export function play(b: Board, c: number, p: 1 | 2): { board: Board; row: number } | null {
  const r = dropRow(b, c)
  if (r < 0) return null
  const board = [...b]
  board[idx(r, c)] = p
  return { board, row: r }
}

const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]]

// Cases gagnantes passant par (r, c), ou null.
export function winAt(b: Board, r: number, c: number): number[] | null {
  const p = b[idx(r, c)]
  if (!p) return null
  for (const [dr, dc] of DIRS) {
    const line = [idx(r, c)]
    for (const s of [1, -1]) {
      let rr = r + dr * s
      let cc = c + dc * s
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && b[idx(rr, cc)] === p) {
        line.push(idx(rr, cc))
        rr += dr * s
        cc += dc * s
      }
    }
    if (line.length >= 4) return line
  }
  return null
}

export const isFull = (b: Board) => b.slice(0, COLS).every(v => v !== 0)
export const validCols = (b: Board) => [3, 2, 4, 1, 5, 0, 6].filter(c => b[idx(0, c)] === 0)

// Toutes les fenêtres de 4 cases alignées, calculées une fois.
const WINDOWS: number[][] = []
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    for (const [dr, dc] of DIRS) {
      const w: number[] = []
      for (let k = 0; k < 4; k++) {
        const rr = r + dr * k
        const cc = c + dc * k
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break
        w.push(idx(rr, cc))
      }
      if (w.length === 4) WINDOWS.push(w)
    }
  }
}

// Évaluation d'une position du point de vue de p : alignements prometteurs, contrôle du centre.
function evaluate(b: Board, p: 1 | 2): number {
  const o = p === 1 ? 2 : 1
  let score = 0
  for (let r = 0; r < ROWS; r++) {
    const v = b[idx(r, 3)]
    if (v === p) score += 3
    else if (v === o) score -= 3
  }
  for (const w of WINDOWS) {
    let mine = 0
    let theirs = 0
    for (const i of w) {
      if (b[i] === p) mine++
      else if (b[i] === o) theirs++
    }
    if (mine && theirs) continue
    if (mine === 3) score += 5
    else if (mine === 2) score += 2
    if (theirs === 3) score -= 4
    else if (theirs === 2) score -= 1
  }
  return score
}

const WIN = 1_000_000

function negamax(b: Board, depth: number, alpha: number, beta: number, p: 1 | 2): number {
  const cols = validCols(b)
  if (!cols.length) return 0
  if (depth === 0) return evaluate(b, p)
  const o = p === 1 ? 2 : 1
  let best = -Infinity
  for (const c of cols) {
    const r = dropRow(b, c)
    b[idx(r, c)] = p
    const v = winAt(b, r, c) ? WIN + depth : -negamax(b, depth - 1, -beta, -alpha, o)
    b[idx(r, c)] = 0
    if (v > best) best = v
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best
}

export type Level = 'facile' | 'moyen' | 'difficile'
const DEPTH: Record<Level, number> = { facile: 2, moyen: 4, difficile: 7 }

// Coup choisi par l'IA pour le joueur p.
export function bestMove(board: Board, p: 1 | 2, level: Level, random: () => number = Math.random): number {
  const cols = validCols(board)
  const o = p === 1 ? 2 : 1
  const b = [...board]
  // Gagner tout de suite, sinon bloquer une victoire adverse immédiate.
  for (const who of [p, o] as const) {
    for (const c of cols) {
      const r = dropRow(b, c)
      b[idx(r, c)] = who
      const wins = winAt(b, r, c)
      b[idx(r, c)] = 0
      if (wins && (who === p || level !== 'facile' || random() < 0.6)) return c
    }
  }
  // Niveau facile : parfois un coup au hasard.
  if (level === 'facile' && random() < 0.35) return cols[Math.floor(random() * cols.length)]

  let bestScore = -Infinity
  let choices: number[] = []
  for (const c of cols) {
    const r = dropRow(b, c)
    b[idx(r, c)] = p
    const v = -negamax(b, DEPTH[level] - 1, -Infinity, Infinity, o)
    b[idx(r, c)] = 0
    if (v > bestScore) {
      bestScore = v
      choices = [c]
    } else if (v === bestScore) choices.push(c)
  }
  // À score égal, on varie un peu (en privilégiant le centre, déjà en tête de liste).
  return random() < 0.7 ? choices[0] : choices[Math.floor(random() * choices.length)]
}
