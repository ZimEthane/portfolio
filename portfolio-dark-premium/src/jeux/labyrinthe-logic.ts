// Labyrinthe : le héros glisse tout droit jusqu'au prochain mur. Il faut atteindre la sortie
// sans toucher les pics, en le moins de coups possible.
//
// Un niveau s'écrit ligne par ligne :
//   # mur   . sol vide   ^ pic   S départ   E sortie

export type Dir = 'haut' | 'bas' | 'gauche' | 'droite'
export const DELTA: Record<Dir, [number, number]> = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] }
export const DIRS: Dir[] = ['haut', 'bas', 'gauche', 'droite']

export interface Niveau {
  w: number
  h: number
  cases: string // w × h caractères
  min: number // nombre de coups minimum pour sortir
}

export function lireNiveau(code: string): Niveau {
  const [lignes, min] = code.split(':')
  const rangs = lignes.split('/')
  return { w: rangs[0].length, h: rangs.length, cases: rangs.join(''), min: Number(min) }
}

export const depart = (n: Niveau) => {
  const i = n.cases.indexOf('S')
  return { x: i % n.w, y: Math.floor(i / n.w) }
}

export const estMur = (n: Niveau, x: number, y: number) => x < 0 || y < 0 || x >= n.w || y >= n.h || n.cases[y * n.w + x] === '#'

export interface Glissade {
  x: number // case d'arrivée
  y: number
  chemin: number[] // cases traversées (indices), départ exclu
  issue: 'arret' | 'sortie' | 'mort'
}

// Glisse dans une direction jusqu'au mur. La sortie et les pics arrêtent la glissade.
export function glisser(n: Niveau, x: number, y: number, dir: Dir): Glissade {
  const [dx, dy] = DELTA[dir]
  const chemin: number[] = []
  let cx = x
  let cy = y
  while (!estMur(n, cx + dx, cy + dy)) {
    cx += dx
    cy += dy
    const i = cy * n.w + cx
    chemin.push(i)
    const c = n.cases[i]
    if (c === '^') return { x: cx, y: cy, chemin, issue: 'mort' }
    if (c === 'E') return { x: cx, y: cy, chemin, issue: 'sortie' }
  }
  return { x: cx, y: cy, chemin, issue: 'arret' }
}

// Nombre de coups minimum pour atteindre la sortie (null si impossible).
export function resoudre(n: Niveau, x0?: number, y0?: number): number | null {
  const s = x0 === undefined ? depart(n) : { x: x0, y: y0! }
  const vu = new Set([s.y * n.w + s.x])
  let file = [s]
  for (let d = 1; file.length; d++) {
    const suiv: { x: number; y: number }[] = []
    for (const p of file) {
      for (const dir of DIRS) {
        const g = glisser(n, p.x, p.y, dir)
        if (!g.chemin.length || g.issue === 'mort') continue
        if (g.issue === 'sortie') return d
        const k = g.y * n.w + g.x
        if (!vu.has(k)) {
          vu.add(k)
          suiv.push({ x: g.x, y: g.y })
        }
      }
    }
    file = suiv
  }
  return null
}

// Premier coup d'un plus court chemin vers la sortie (pour l'indice).
export function coupConseille(n: Niveau, x: number, y: number): Dir | null {
  let mieux: Dir | null = null
  let best = Infinity
  for (const dir of DIRS) {
    const g = glisser(n, x, y, dir)
    if (!g.chemin.length || g.issue === 'mort') continue
    if (g.issue === 'sortie') return dir
    const r = resoudre(n, g.x, g.y)
    if (r !== null && r < best) {
      best = r
      mieux = dir
    }
  }
  return mieux
}
