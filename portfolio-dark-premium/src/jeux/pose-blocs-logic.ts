// Pose-blocs : une grille de 8 × 8, trois pièces à poser. Une ligne ou une colonne pleine disparaît.
// La partie s'arrête quand aucune des pièces restantes ne rentre.

export const N = 8
export type Grille = (string | null)[] // N × N cases : couleur du bloc, ou null si vide

export interface Forme {
  cases: [number, number][] // [x, y]
  w: number
  h: number
}

function forme(dessin: string[]): Forme {
  const cases: [number, number][] = []
  dessin.forEach((l, y) => l.split('').forEach((c, x) => c === '#' && cases.push([x, y])))
  return { cases, w: Math.max(...dessin.map(l => l.length)), h: dessin.length }
}

// Les pièces possibles, avec leur fréquence (les grosses pièces sont plus rares).
export const FORMES: { f: Forme; poids: number }[] = [
  [['#'], 3],
  [['##'], 4], [['#', '#'], 4],
  [['###'], 4], [['#', '#', '#'], 4],
  [['####'], 3], [['#', '#', '#', '#'], 3],
  [['#####'], 2], [['#', '#', '#', '#', '#'], 2],
  [['##', '##'], 5],
  [['###', '###', '###'], 2],
  [['###', '###'], 2], [['##', '##', '##'], 2],
  [['#.', '##'], 3], [['.#', '##'], 3], [['##', '#.'], 3], [['##', '.#'], 3],
  [['#..', '###'], 2], [['..#', '###'], 2], [['###', '#..'], 2], [['###', '..#'], 2],
  [['#.', '#.', '##'], 2], [['.#', '.#', '##'], 2], [['##', '#.', '#.'], 2], [['##', '.#', '.#'], 2],
  [['#..', '#..', '###'], 1], [['..#', '..#', '###'], 1], [['###', '#..', '#..'], 1], [['###', '..#', '..#'], 1],
  [['###', '.#.'], 2], [['.#.', '###'], 2], [['#.', '##', '#.'], 2], [['.#', '##', '.#'], 2],
  [['##.', '.##'], 2], [['.##', '##.'], 2], [['#.', '##', '.#'], 2], [['.#', '##', '#.'], 2],
  [['#.', '.#'], 2], [['.#', '#.'], 2],
  [['#..', '.#.', '..#'], 1], [['..#', '.#.', '#..'], 1],
].map(([d, p]) => ({ f: forme(d as string[]), poids: p as number }))

export const COULEURS = ['#ff5f8f', '#ffb547', '#ffe066', '#5fe08a', '#4fd8e8', '#5b8cff', '#a77bff', '#ff7a5c']

export interface Piece {
  id: number
  forme: number // indice dans FORMES
  couleur: string
}

export const vide = (): Grille => new Array(N * N).fill(null)

export function peutPoser(g: Grille, f: Forme, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x + f.w > N || y + f.h > N) return false
  return f.cases.every(([dx, dy]) => g[(y + dy) * N + x + dx] === null)
}

export function aDeLaPlace(g: Grille, f: Forme): boolean {
  for (let y = 0; y <= N - f.h; y++) for (let x = 0; x <= N - f.w; x++) if (peutPoser(g, f, x, y)) return true
  return false
}

// Lignes et colonnes qui seraient pleines si on posait la pièce ici (pour l'aperçu).
export function lignesPleines(g: Grille): { lignes: number[]; colonnes: number[] } {
  const lignes: number[] = []
  const colonnes: number[] = []
  for (let k = 0; k < N; k++) {
    let l = true
    let c = true
    for (let i = 0; i < N; i++) {
      if (g[k * N + i] === null) l = false
      if (g[i * N + k] === null) c = false
    }
    if (l) lignes.push(k)
    if (c) colonnes.push(k)
  }
  return { lignes, colonnes }
}

export function avecPiece(g: Grille, f: Forme, x: number, y: number, couleur: string): Grille {
  const r = g.slice()
  for (const [dx, dy] of f.cases) r[(y + dy) * N + x + dx] = couleur
  return r
}

export interface Resultat {
  g: Grille
  effacees: { i: number; couleur: string }[] // cases qui disparaissent (pour l'animation)
  nbLignes: number // lignes + colonnes effacées
  points: number
  combo: number
  sansLigne: number
}

// Pose une pièce, efface les lignes et colonnes pleines, compte les points.
// Combo : il continue tant qu'on efface au moins une ligne dans les 3 poses qui suivent.
export function poser(g: Grille, f: Forme, x: number, y: number, couleur: string, combo: number, sansLigne: number): Resultat {
  const pose = avecPiece(g, f, x, y, couleur)
  const { lignes, colonnes } = lignesPleines(pose)
  const aEffacer = new Set<number>()
  for (const l of lignes) for (let i = 0; i < N; i++) aEffacer.add(l * N + i)
  for (const c of colonnes) for (let i = 0; i < N; i++) aEffacer.add(i * N + c)
  const effacees = [...aEffacer].map(i => ({ i, couleur: pose[i]! }))
  const fin = pose.slice()
  for (const i of aEffacer) fin[i] = null
  const nbLignes = lignes.length + colonnes.length
  let points = f.cases.length
  let c = combo
  let s = sansLigne
  if (nbLignes > 0) {
    c = combo + 1
    s = 0
    points += 10 * ((nbLignes * (nbLignes + 1)) / 2) * c
    if (fin.every(v => v === null)) points += 300 // grille entièrement vidée
  } else {
    s = sansLigne + 1
    if (s >= 3) c = 0
  }
  return { g: fin, effacees, nbLignes, points, combo: c, sansLigne: s }
}

function tirerForme(random: () => number): number {
  const total = FORMES.reduce((a, b) => a + b.poids, 0)
  let r = random() * total
  for (let i = 0; i < FORMES.length; i++) {
    r -= FORMES[i].poids
    if (r < 0) return i
  }
  return 0
}

let compteur = 0
// Trois nouvelles pièces. On évite (sans le garantir à coup sûr) de proposer trois pièces qui ne rentrent pas.
export function tirerPieces(g: Grille, random: () => number = Math.random): Piece[] {
  let essai: Piece[] = []
  for (let t = 0; t < 40; t++) {
    essai = [0, 1, 2].map(() => ({ id: ++compteur, forme: tirerForme(random), couleur: COULEURS[Math.floor(random() * COULEURS.length)] }))
    if (essai.some(p => aDeLaPlace(g, FORMES[p.forme].f))) break
  }
  return essai
}

export const bloque = (g: Grille, pieces: (Piece | null)[]) => pieces.every(p => !p || !aDeLaPlace(g, FORMES[p.forme].f))
