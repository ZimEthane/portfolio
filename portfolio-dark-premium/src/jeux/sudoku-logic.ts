// Logique pure du Sudoku : résolution, génération de grilles à solution unique, vérifications.
// Grille = 81 nombres (0 = case vide), lue ligne par ligne.

export type Grid = number[]
export type Level = 'facile' | 'moyen' | 'difficile'

// Nombre de chiffres donnés visé pour chaque niveau.
export const CLUES: Record<Level, number> = { facile: 40, moyen: 32, difficile: 26 }

export const row = (i: number) => Math.floor(i / 9)
export const col = (i: number) => i % 9
export const box = (i: number) => Math.floor(row(i) / 3) * 3 + Math.floor(col(i) / 3)

// Les 20 cases « voisines » (même ligne, colonne ou carré), calculées une fois.
export const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const out: number[] = []
  for (let j = 0; j < 81; j++) if (j !== i && (row(j) === row(i) || col(j) === col(i) || box(j) === box(i))) out.push(j)
  return out
})

const bit = (d: number) => 1 << d
const popcount = (m: number) => {
  let n = 0
  while (m) {
    m &= m - 1
    n++
  }
  return n
}

// Compte les solutions (s'arrête à « limit ») ; remplit « out » avec la première trouvée.
export function countSolutions(grid: Grid, limit = 2, random?: () => number, out?: Grid): number {
  const g = [...grid]
  const rows = new Array(9).fill(0)
  const cols = new Array(9).fill(0)
  const boxes = new Array(9).fill(0)
  for (let i = 0; i < 81; i++) {
    const d = g[i]
    if (!d) continue
    const m = bit(d)
    if (rows[row(i)] & m || cols[col(i)] & m || boxes[box(i)] & m) return 0 // grille déjà fausse
    rows[row(i)] |= m
    cols[col(i)] |= m
    boxes[box(i)] |= m
  }
  let count = 0
  const search = (): boolean => {
    // Case vide qui a le moins de possibilités.
    let best = -1
    let bestMask = 0
    let bestN = 10
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue
      const mask = ~(rows[row(i)] | cols[col(i)] | boxes[box(i)]) & 0x3fe
      const n = popcount(mask)
      if (n < bestN) {
        best = i
        bestMask = mask
        bestN = n
        if (n <= 1) break
      }
    }
    if (best < 0) {
      count++
      if (count === 1 && out) out.splice(0, 81, ...g)
      return count >= limit
    }
    if (!bestN) return false
    const digits: number[] = []
    for (let d = 1; d <= 9; d++) if (bestMask & bit(d)) digits.push(d)
    if (random) {
      for (let k = digits.length - 1; k > 0; k--) {
        const j = Math.floor(random() * (k + 1))
        ;[digits[k], digits[j]] = [digits[j], digits[k]]
      }
    }
    const r = row(best)
    const c = col(best)
    const b = box(best)
    for (const d of digits) {
      const m = bit(d)
      g[best] = d
      rows[r] |= m
      cols[c] |= m
      boxes[b] |= m
      if (search()) return true
      rows[r] &= ~m
      cols[c] &= ~m
      boxes[b] &= ~m
    }
    g[best] = 0
    return false
  }
  search()
  return count
}

export function solve(grid: Grid): Grid | null {
  const out: Grid = []
  return countSolutions(grid, 1, undefined, out) ? out : null
}

// Nouvelle grille : solution complète au hasard, puis on retire des chiffres (par paires
// symétriques, pour un joli motif) tant que la solution reste unique.
export function generate(level: Level, random: () => number = Math.random): { puzzle: Grid; solution: Grid } {
  const solution: Grid = []
  countSolutions(new Array(81).fill(0), 1, random, solution)
  const puzzle = [...solution]
  const order = Array.from({ length: 41 }, (_, i) => i)
  for (let k = order.length - 1; k > 0; k--) {
    const j = Math.floor(random() * (k + 1))
    ;[order[k], order[j]] = [order[j], order[k]]
  }
  let clues = 81
  for (const i of order) {
    if (clues <= CLUES[level]) break
    const twin = 80 - i
    const saved = [puzzle[i], puzzle[twin]]
    puzzle[i] = 0
    puzzle[twin] = 0
    const removed = i === twin ? 1 : 2
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[i] = saved[0]
      puzzle[twin] = saved[1]
    } else clues -= removed
  }
  // Si la symétrie bloque avant l'objectif, on continue case par case.
  if (clues > CLUES[level]) {
    const rest = Array.from({ length: 81 }, (_, i) => i).filter(i => puzzle[i])
    for (let k = rest.length - 1; k > 0; k--) {
      const j = Math.floor(random() * (k + 1))
      ;[rest[k], rest[j]] = [rest[j], rest[k]]
    }
    for (const i of rest) {
      if (clues <= CLUES[level]) break
      const saved = puzzle[i]
      puzzle[i] = 0
      if (countSolutions(puzzle, 2) !== 1) puzzle[i] = saved
      else clues--
    }
  }
  return { puzzle, solution }
}

// Cases en conflit (même chiffre deux fois dans une ligne, colonne ou carré).
export function conflicts(values: Grid): Set<number> {
  const out = new Set<number>()
  for (let i = 0; i < 81; i++) {
    if (!values[i]) continue
    for (const j of PEERS[i]) if (values[j] === values[i]) out.add(i)
  }
  return out
}
