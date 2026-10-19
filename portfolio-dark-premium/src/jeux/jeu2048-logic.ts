// Logique pure du 2048 : chaque action renvoie un nouvel état.

export type Dir = 'up' | 'down' | 'left' | 'right'

export interface Tile {
  id: number
  value: number
  r: number
  c: number
  merged?: boolean // vient de fusionner (petite animation)
  fresh?: boolean // vient d'apparaître
}

export interface MoveResult {
  tiles: Tile[]
  ghosts: Tile[] // tuiles absorbées, gardées le temps de l'animation
  moved: boolean
  gained: number
  best: number // plus grosse tuile créée par fusion pendant ce coup
}

let nextId = 1
export const newId = () => nextId++

export function emptyCells(tiles: Tile[], n: number): [number, number][] {
  const taken = new Set(tiles.map(t => t.r * n + t.c))
  const out: [number, number][] = []
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!taken.has(r * n + c)) out.push([r, c])
  return out
}

export function addRandom(tiles: Tile[], n: number, random: () => number = Math.random): Tile[] {
  const free = emptyCells(tiles, n)
  if (!free.length) return tiles
  const [r, c] = free[Math.floor(random() * free.length)]
  return [...tiles, { id: newId(), value: random() < 0.9 ? 2 : 4, r, c, fresh: true }]
}

export function start(n: number, random: () => number = Math.random): Tile[] {
  return addRandom(addRandom([], n, random), n, random)
}

// Déplace toutes les tuiles dans une direction ; chaque tuile ne fusionne qu'une fois par coup.
export function move(tiles: Tile[], n: number, dir: Dir): MoveResult {
  const vertical = dir === 'up' || dir === 'down'
  const forward = dir === 'down' || dir === 'right' // vers les grands indices
  const result: Tile[] = []
  const ghosts: Tile[] = []
  let moved = false
  let gained = 0
  let best = 0

  for (let line = 0; line < n; line++) {
    // Les tuiles de la ligne (ou colonne), de la plus proche du bord d'arrivée à la plus lointaine.
    const lineTiles = tiles
      .filter(t => (vertical ? t.c : t.r) === line)
      .sort((a, b) => {
        const pa = vertical ? a.r : a.c
        const pb = vertical ? b.r : b.c
        return forward ? pb - pa : pa - pb
      })
    let slot = 0
    let last: Tile | null = null // dernière tuile posée, encore fusionnable
    for (const t of lineTiles) {
      if (last && last.value === t.value && !last.merged) {
        last.value *= 2
        last.merged = true
        gained += last.value
        best = Math.max(best, last.value)
        const pos = forward ? n - slot : slot - 1
        ghosts.push({ ...t, r: vertical ? pos : t.r, c: vertical ? t.c : pos, merged: false, fresh: false })
        moved = true
        last = null
        continue
      }
      const pos = forward ? n - 1 - slot : slot
      const placed: Tile = { id: t.id, value: t.value, r: vertical ? pos : t.r, c: vertical ? t.c : pos }
      if (placed.r !== t.r || placed.c !== t.c) moved = true
      result.push(placed)
      last = placed
      slot++
    }
  }
  return { tiles: result, ghosts, moved, gained, best }
}

export function canMove(tiles: Tile[], n: number): boolean {
  if (tiles.length < n * n) return true
  const grid = new Map(tiles.map(t => [t.r * n + t.c, t.value]))
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid.get(r * n + c)
      if (c + 1 < n && grid.get(r * n + c + 1) === v) return true
      if (r + 1 < n && grid.get((r + 1) * n + c) === v) return true
    }
  }
  return false
}

export const maxTile = (tiles: Tile[]) => tiles.reduce((m, t) => Math.max(m, t.value), 0)
