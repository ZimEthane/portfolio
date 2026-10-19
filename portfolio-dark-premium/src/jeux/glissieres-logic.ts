// Glissières (le principe de « l'Âne rouge ») : un plateau de 4 × 5 cases, des blocs qui glissent,
// et le gros bloc rouge à faire sortir par l'ouverture en bas au milieu.
//
// Un niveau s'écrit en 20 caractères, ligne par ligne :
//   R = gros bloc rouge (2 × 2)   ^ v = bloc vertical (haut, bas)   < > = bloc horizontal (gauche, droite)
//   S = petit bloc (1 × 1)        . = case vide
// Un « coup » = déplacer une pièce, quelle que soit la distance parcourue (comme sur le jeu en vrai).

export const W = 4
export const H = 5
export type Type = 'R' | 'V' | 'H' | 'S'
export interface Piece {
  id: number
  type: Type
  x: number
  y: number
}
export const TAILLE: Record<Type, { w: number; h: number }> = {
  R: { w: 2, h: 2 },
  V: { w: 1, h: 2 },
  H: { w: 2, h: 1 },
  S: { w: 1, h: 1 },
}
export const BUT = { x: 1, y: 3 } // le gros bloc rouge doit arriver ici, devant l'ouverture

export function lire(code: string): Piece[] {
  const pieces: Piece[] = []
  let rouge = false
  for (let i = 0; i < W * H; i++) {
    const c = code[i]
    const x = i % W
    const y = Math.floor(i / W)
    let type: Type | null = null
    if (c === 'R' && !rouge) {
      type = 'R'
      rouge = true
    } else if (c === '^') type = 'V'
    else if (c === '<') type = 'H'
    else if (c === 'S') type = 'S'
    if (type) pieces.push({ id: pieces.length, type, x, y })
  }
  return pieces
}

const CAR: Record<Type, string[]> = { R: ['R', 'R', 'R', 'R'], V: ['^', 'v'], H: ['<', '>'], S: ['S'] }

export function encoder(pieces: Piece[]): string {
  const c = new Array<string>(W * H).fill('.')
  for (const p of pieces) {
    const { w, h } = TAILLE[p.type]
    let k = 0
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) c[(p.y + dy) * W + p.x + dx] = CAR[p.type][k++]
  }
  return c.join('')
}

// Case → numéro de la pièce qui l'occupe (-1 si vide).
export function occupation(pieces: Piece[]): Int8Array {
  const g = new Int8Array(W * H).fill(-1)
  pieces.forEach((p, n) => {
    const { w, h } = TAILLE[p.type]
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) g[(p.y + dy) * W + p.x + dx] = n
  })
  return g
}

// La pièce n tient-elle en (x, y) ? (les cases qu'elle occupe déjà comptent comme libres)
function tient(g: Int8Array, type: Type, n: number, x: number, y: number) {
  const { w, h } = TAILLE[type]
  if (x < 0 || y < 0 || x + w > W || y + h > H) return false
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    const v = g[(y + dy) * W + x + dx]
    if (v !== -1 && v !== n) return false
  }
  return true
}

export function peutAller(pieces: Piece[], n: number, dx: number, dy: number, g = occupation(pieces)) {
  const p = pieces[n]
  return tient(g, p.type, n, p.x + dx, p.y + dy)
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const

// Toutes les places où la pièce n peut aller en un coup (en glissant case par case, sans bouger les autres).
export function places(pieces: Piece[], n: number, g = occupation(pieces)): { x: number; y: number }[] {
  const p = pieces[n]
  const vu = new Set([p.y * W + p.x])
  const file = [[p.x, p.y]]
  const res: { x: number; y: number }[] = []
  while (file.length) {
    const [x, y] = file.shift()!
    for (const [dx, dy] of DIRS) {
      const nx = x + dx
      const ny = y + dy
      const k = ny * W + nx
      if (vu.has(k) || !tient(g, p.type, n, nx, ny)) continue
      vu.add(k)
      file.push([nx, ny])
      res.push({ x: nx, y: ny })
    }
  }
  return res
}

export const gagne = (pieces: Piece[]) => pieces.some(p => p.type === 'R' && p.x === BUT.x && p.y === BUT.y)
// Une seule pièce rouge : si elle couvre ces deux coins opposés, elle est exactement sur le but.
export const gagneCode = (code: string) => code[BUT.y * W + BUT.x] === 'R' && code[(BUT.y + 1) * W + BUT.x + 1] === 'R'

export interface Coup {
  piece: number
  x: number
  y: number
}

// Tous les états atteignables en un coup, avec le coup joué (numéro de la pièce dans le tableau donné).
export function voisinsPieces(pieces: Piece[]): { code: string; coup: Coup }[] {
  const g = occupation(pieces)
  const res: { code: string; coup: Coup }[] = []
  pieces.forEach((p, n) => {
    for (const pl of places(pieces, n, g)) {
      const autre = pieces.map((q, m) => (m === n ? { ...q, x: pl.x, y: pl.y } : q))
      res.push({ code: encoder(autre), coup: { piece: n, x: pl.x, y: pl.y } })
    }
  })
  return res
}
export const voisins = (code: string) => voisinsPieces(lire(code))

// Version rapide pour le solveur : travaille directement sur les 20 caractères.
const TYPE_DE: Record<string, Type> = { '^': 'V', '<': 'H', S: 'S' }
function voisinsCodes(code: string, sortie: string[]) {
  const c = code.split('')
  let rouge = false
  const vu = new Uint8Array(W * H)
  const pile: number[] = []
  for (let i = 0; i < W * H; i++) {
    const ch = c[i]
    let type: Type
    if (ch === 'R') {
      if (rouge) continue
      rouge = true
      type = 'R'
    } else if (TYPE_DE[ch]) type = TYPE_DE[ch]
    else continue
    const { w, h } = TAILLE[type]
    const car = CAR[type]
    const base = c.slice()
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) base[i + dy * W + dx] = '.'
    vu.fill(0)
    vu[i] = 1
    pile.push(i)
    while (pile.length) {
      const k = pile.pop()!
      const x = k % W
      const y = (k - x) / W
      for (const [ddx, ddy] of DIRS) {
        const nx = x + ddx
        const ny = y + ddy
        if (nx < 0 || ny < 0 || nx + w > W || ny + h > H) continue
        const nk = ny * W + nx
        if (vu[nk]) continue
        let libre = true
        for (let dy = 0; dy < h && libre; dy++) for (let dx = 0; dx < w; dx++) if (base[nk + dy * W + dx] !== '.') { libre = false; break }
        if (!libre) continue
        vu[nk] = 1
        pile.push(nk)
        const autre = base.slice()
        let m = 0
        for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) autre[nk + dy * W + dx] = car[m++]
        sortie.push(autre.join(''))
      }
    }
  }
}

// Plus court chemin vers la sortie : nombre de coups, premier coup à jouer (numéro de pièce
// dans le tableau donné) et la suite des états jusqu'à la victoire.
export function resoudre(pieces: Piece[], max = 400000): { coups: number; premier: Coup | null; chemin: string[] } | null {
  const depart = encoder(pieces)
  if (gagneCode(depart)) return { coups: 0, premier: null, chemin: [depart] }
  const parent = new Map<string, string>([[depart, '']])
  let file = [depart]
  let but = ''
  const tampon: string[] = []
  while (file.length && !but && parent.size < max) {
    const suivante: string[] = []
    for (const c of file) {
      tampon.length = 0
      voisinsCodes(c, tampon)
      for (const v of tampon) {
        if (parent.has(v)) continue
        parent.set(v, c)
        if (gagneCode(v)) {
          but = v
          break
        }
        suivante.push(v)
      }
      if (but) break
    }
    file = suivante
  }
  if (!but) return null
  const chemin: string[] = []
  for (let c = but; c; c = parent.get(c)!) chemin.push(c)
  chemin.reverse()
  return { coups: chemin.length - 1, premier: coupVers(pieces, chemin[1]), chemin }
}

// Le coup qui transforme ces pièces en l'état donné (null s'il n'existe pas).
export function coupVers(pieces: Piece[], code: string): Coup | null {
  return voisinsPieces(pieces).find(v => v.code === code)?.coup ?? null
}

// Image miroir (gauche ↔ droite), pour éviter deux niveaux identiques.
export function miroir(code: string): string {
  let s = ''
  for (let y = 0; y < H; y++) {
    const ligne = code.slice(y * W, y * W + W).split('').reverse()
    s += ligne.map(c => (c === '<' ? '>' : c === '>' ? '<' : c)).join('')
  }
  return s
}
