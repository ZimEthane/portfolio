// Logique pure du démineur : aucune dépendance à React, chaque action renvoie une nouvelle partie.

export type CellState = 'hidden' | 'open' | 'flag'
export type Status = 'ready' | 'playing' | 'won' | 'lost'

export interface Level {
  id: string
  label: string
  rows: number
  cols: number
  mines: number
}

// Les trois niveaux historiques du démineur de Windows.
export const LEVELS: Level[] = [
  { id: 'debutant', label: 'Débutant', rows: 9, cols: 9, mines: 10 },
  { id: 'intermediaire', label: 'Intermédiaire', rows: 16, cols: 16, mines: 40 },
  { id: 'expert', label: 'Expert', rows: 16, cols: 30, mines: 99 },
]

// Bornes du mode personnalisé.
export const CUSTOM_LIMITS = { minSide: 5, maxRows: 24, maxCols: 30, minMines: 1 }

export interface Game {
  rows: number
  cols: number
  mines: number
  mine: boolean[]
  adj: number[] // nombre de mines voisines
  state: CellState[]
  status: Status
  opened: number
  flags: number
  exploded: number | null // case qui a fait perdre
  startedAt: number | null
  endedAt: number | null
}

export function createGame(rows: number, cols: number, mines: number): Game {
  const total = rows * cols
  return {
    rows,
    cols,
    mines: Math.min(mines, total - 1),
    mine: new Array(total).fill(false),
    adj: new Array(total).fill(0),
    state: new Array(total).fill('hidden'),
    status: 'ready',
    opened: 0,
    flags: 0,
    exploded: null,
    startedAt: null,
    endedAt: null,
  }
}

export function neighbors(i: number, rows: number, cols: number): number[] {
  const r = Math.floor(i / cols)
  const c = i % cols
  const out: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc)
    }
  }
  return out
}

// Pose les mines au premier clic : la case cliquée et ses voisines restent libres
// (si la grille le permet), donc le premier clic ouvre toujours une zone.
function placeMines(g: Game, safe: number, random: () => number): Pick<Game, 'mine' | 'adj'> {
  const total = g.rows * g.cols
  const around = [safe, ...neighbors(safe, g.rows, g.cols)]
  const excluded = new Set(total - around.length >= g.mines ? around : [safe])
  const candidates: number[] = []
  for (let i = 0; i < total; i++) if (!excluded.has(i)) candidates.push(i)
  // Mélange de Fisher-Yates partiel : on ne tire que le nombre de mines voulu.
  for (let k = 0; k < g.mines; k++) {
    const j = k + Math.floor(random() * (candidates.length - k))
    ;[candidates[k], candidates[j]] = [candidates[j], candidates[k]]
  }
  const mine = new Array(total).fill(false)
  for (let k = 0; k < g.mines; k++) mine[candidates[k]] = true
  const adj = mine.map((_, i) => neighbors(i, g.rows, g.cols).filter(n => mine[n]).length)
  return { mine, adj }
}

const isOver = (g: Game) => g.status === 'won' || g.status === 'lost'

export function reveal(g: Game, i: number, now = Date.now(), random: () => number = Math.random): Game {
  if (isOver(g) || g.state[i] !== 'hidden') return g

  let next: Game = { ...g, state: [...g.state] }
  if (g.status === 'ready') {
    next = { ...next, ...placeMines(g, i, random), status: 'playing', startedAt: now }
  }

  if (next.mine[i]) {
    return { ...next, status: 'lost', exploded: i, endedAt: now }
  }

  // Ouverture en cascade des zones sans mine autour.
  const stack = [i]
  let opened = next.opened
  while (stack.length) {
    const cur = stack.pop()!
    if (next.state[cur] !== 'hidden') continue
    next.state[cur] = 'open'
    opened++
    if (next.adj[cur] === 0) {
      for (const n of neighbors(cur, next.rows, next.cols)) if (next.state[n] === 'hidden') stack.push(n)
    }
  }
  next.opened = opened

  if (opened === next.rows * next.cols - next.mines) {
    // Victoire : toutes les mines sont marquées automatiquement.
    next.state = next.state.map((s, k) => (next.mine[k] ? 'flag' : s))
    return { ...next, status: 'won', flags: next.mines, endedAt: now }
  }
  return next
}

export function toggleFlag(g: Game, i: number): Game {
  if (isOver(g) || g.state[i] === 'open') return g
  const state = [...g.state]
  const flagged = state[i] === 'flag'
  state[i] = flagged ? 'hidden' : 'flag'
  return { ...g, state, flags: g.flags + (flagged ? -1 : 1) }
}

// "Accord" : sur un chiffre déjà ouvert, si le bon nombre de drapeaux l'entoure,
// on ouvre d'un coup toutes ses voisines cachées.
export function chord(g: Game, i: number, now = Date.now()): Game {
  if (isOver(g) || g.state[i] !== 'open' || g.adj[i] === 0) return g
  const around = neighbors(i, g.rows, g.cols)
  const flags = around.filter(n => g.state[n] === 'flag').length
  if (flags !== g.adj[i]) return g
  let next = g
  for (const n of around) next = reveal(next, n, now)
  return next
}

// Chrono en secondes avec un dixième, une fois la partie terminée.
export const elapsedSeconds = (g: Game, now = Date.now()) =>
  g.startedAt === null ? 0 : ((g.endedAt ?? now) - g.startedAt) / 1000
