// Logique pure du jeu de blocs (inspiré du célèbre jeu de briques).
// Plateau de 10 × 20 ; les lignes y < 0 sont au-dessus du plateau (invisibles).

export const W = 10
export const H = 20
export type Kind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
export const KINDS: Kind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
export type Board = (Kind | null)[] // W × H, ligne par ligne

// Forme de départ de chaque pièce, dans son carré (3×3, 4×4 pour I, 2×2 pour O).
const SPAWN: Record<Kind, { n: number; cells: [number, number][] }> = {
  I: { n: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { n: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { n: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { n: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { n: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { n: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { n: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
}

// Les 4 orientations de chaque pièce (rotation dans le sens des aiguilles d'une montre).
export const SHAPES: Record<Kind, [number, number][][]> = Object.fromEntries(
  KINDS.map(k => {
    const { n, cells } = SPAWN[k]
    const states = [cells]
    for (let r = 1; r < 4; r++) states.push(states[r - 1].map(([x, y]) => [n - 1 - y, x] as [number, number]))
    return [k, k === 'O' ? [cells, cells, cells, cells] : states]
  }),
) as Record<Kind, [number, number][][]>

// Décalages essayés lors d'une rotation (système SRS), en coordonnées « y vers le bas ».
// Clé : « départ>arrivée » ; 0 = départ, 1 = droite, 2 = tête en bas, 3 = gauche.
const flip = (t: [number, number][]) => t.map(([x, y]) => [x, -y] as [number, number])
const KICKS: Record<string, [number, number][]> = {
  '0>1': flip([[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]]),
  '1>0': flip([[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]),
  '1>2': flip([[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]),
  '2>1': flip([[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]]),
  '2>3': flip([[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]),
  '3>2': flip([[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]),
  '3>0': flip([[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]),
  '0>3': flip([[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]),
}
const KICKS_I: Record<string, [number, number][]> = {
  '0>1': flip([[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]]),
  '1>0': flip([[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]]),
  '1>2': flip([[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]),
  '2>1': flip([[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]]),
  '2>3': flip([[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]]),
  '3>2': flip([[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]]),
  '3>0': flip([[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]]),
  '0>3': flip([[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]),
}

export interface Piece {
  kind: Kind
  rot: number
  x: number
  y: number
}

export const emptyBoard = (): Board => new Array(W * H).fill(null)
export const cellsOf = (p: Piece) => SHAPES[p.kind][p.rot].map(([x, y]) => [p.x + x, p.y + y] as [number, number])

export function fits(b: Board, p: Piece): boolean {
  for (const [x, y] of cellsOf(p)) {
    if (x < 0 || x >= W || y >= H) return false
    if (y >= 0 && b[y * W + x]) return false
  }
  return true
}

export const spawn = (kind: Kind): Piece => ({ kind, rot: 0, x: kind === 'O' ? 4 : 3, y: kind === 'I' ? -1 : -1 })

export function tryMove(b: Board, p: Piece, dx: number, dy: number): Piece | null {
  const q = { ...p, x: p.x + dx, y: p.y + dy }
  return fits(b, q) ? q : null
}

// Rotation avec décalages : renvoie la pièce tournée, ou null si impossible.
export function tryRotate(b: Board, p: Piece, dir: 1 | -1): Piece | null {
  if (p.kind === 'O') return p
  const to = (p.rot + dir + 4) % 4
  const table = p.kind === 'I' ? KICKS_I : KICKS
  for (const [dx, dy] of table[`${p.rot}>${to}`]) {
    const q = { ...p, rot: to, x: p.x + dx, y: p.y + dy }
    if (fits(b, q)) return q
  }
  return null
}

export function dropDistance(b: Board, p: Piece): number {
  let d = 0
  while (fits(b, { ...p, y: p.y + d + 1 })) d++
  return d
}

// Pose la pièce ; renvoie le nouveau plateau, les lignes complètes et si elle dépasse en haut.
export function lock(b: Board, p: Piece): { board: Board; full: number[]; above: boolean } {
  const board = [...b]
  let above = true
  for (const [x, y] of cellsOf(p)) {
    if (y >= 0) {
      board[y * W + x] = p.kind
      above = false
    }
  }
  const full: number[] = []
  for (let y = 0; y < H; y++) {
    let ok = true
    for (let x = 0; x < W; x++) if (!board[y * W + x]) ok = false
    if (ok) full.push(y)
  }
  return { board, full, above }
}

export function clearRows(b: Board, rows: number[]): Board {
  const kept: (Kind | null)[][] = []
  for (let y = 0; y < H; y++) if (!rows.includes(y)) kept.push(b.slice(y * W, y * W + W))
  while (kept.length < H) kept.unshift(new Array(W).fill(null))
  return kept.flat()
}

// Sac de 7 : chaque série de 7 pièces contient une fois chaque pièce, dans le désordre.
export function newBag(random: () => number = Math.random): Kind[] {
  const bag = [...KINDS]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  return bag
}

// Points pour 1 à 4 lignes, multipliés par le niveau.
export const LINE_POINTS = [0, 100, 300, 500, 800]

// Temps de chute d'une ligne (ms) selon le niveau (courbe classique, de 1 s à très rapide).
export const gravityMs = (level: number) => Math.max(16, Math.pow(0.8 - (level - 1) * 0.007, level - 1) * 1000)
