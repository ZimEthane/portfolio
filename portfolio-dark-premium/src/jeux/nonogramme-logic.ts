// Nonogramme : chaque nombre indique un groupe de cases noires consécutives sur la ligne ou la colonne,
// dans l'ordre. Les groupes sont séparés par au moins une case vide.

export interface Grille {
  w: number
  h: number
  cases: boolean[] // true : case noire
}

export function lire(dessin: string): Grille {
  const l = dessin.split('/')
  return { w: l[0].length, h: l.length, cases: l.join('').split('').map(c => c === '#') }
}

export function indices(ligne: boolean[]): number[] {
  const r: number[] = []
  let n = 0
  for (const c of ligne) {
    if (c) n++
    else if (n) {
      r.push(n)
      n = 0
    }
  }
  if (n) r.push(n)
  return r
}

export const ligne = (g: Grille, y: number) => g.cases.slice(y * g.w, y * g.w + g.w)
export const colonne = (g: Grille, x: number) => Array.from({ length: g.h }, (_, y) => g.cases[y * g.w + x])
export const indicesLignes = (g: Grille) => Array.from({ length: g.h }, (_, y) => indices(ligne(g, y)))
export const indicesColonnes = (g: Grille) => Array.from({ length: g.w }, (_, x) => indices(colonne(g, x)))

// Résolution d'une ligne : pour chaque case, peut-elle être noire ? vide ? (selon les cases déjà connues)
// connu : 1 noire, 0 vide, -1 inconnue. Renvoie null si la ligne est impossible.
function resoudreLigne(clue: number[], connu: number[]): number[] | null {
  const L = connu.length
  const peutNoir = new Array(L).fill(false)
  const peutVide = new Array(L).fill(false)
  // memo[i][pos] : peut-on placer les groupes i… à partir de pos ?
  const memo = new Map<number, boolean>()
  const libre = (a: number, b: number) => {
    for (let k = a; k < b; k++) if (connu[k] === 1) return false
    return true
  }
  const ok = (i: number, pos: number): boolean => {
    const key = i * (L + 2) + pos
    const m = memo.get(key)
    if (m !== undefined) return m
    let r = false
    if (i === clue.length) r = libre(pos, L)
    else {
      for (let s = pos; s + clue[i] <= L; s++) {
        if (!libre(pos, s)) break
        let tient = true
        for (let k = s; k < s + clue[i]; k++) if (connu[k] === 0) { tient = false; break }
        if (!tient) continue
        const fin = s + clue[i]
        if (fin < L && connu[fin] === 1) continue
        if (ok(i + 1, Math.min(L, fin + 1))) { r = true; break }
      }
    }
    memo.set(key, r)
    return r
  }
  // Marque les possibilités en parcourant toutes les positions valides.
  const marquer = (i: number, pos: number): void => {
    if (i === clue.length) {
      for (let k = pos; k < L; k++) peutVide[k] = true
      return
    }
    for (let s = pos; s + clue[i] <= L; s++) {
      if (!libre(pos, s)) break
      let tient = true
      for (let k = s; k < s + clue[i]; k++) if (connu[k] === 0) { tient = false; break }
      if (!tient) continue
      const fin = s + clue[i]
      if (fin < L && connu[fin] === 1) continue
      if (!ok(i + 1, Math.min(L, fin + 1))) continue
      for (let k = pos; k < s; k++) peutVide[k] = true
      for (let k = s; k < fin; k++) peutNoir[k] = true
      if (fin < L) peutVide[fin] = true
      marquerUneFois(i + 1, Math.min(L, fin + 1))
    }
  }
  const fait = new Set<number>()
  const marquerUneFois = (i: number, pos: number) => {
    const key = i * (L + 2) + pos
    if (fait.has(key)) return
    fait.add(key)
    marquer(i, pos)
  }
  if (!ok(0, 0)) return null
  marquerUneFois(0, 0)
  return connu.map((v, k) => (v !== -1 ? v : peutNoir[k] && !peutVide[k] ? 1 : peutVide[k] && !peutNoir[k] ? 0 : -1))
}

// Résout toute la grille par logique (sans deviner). true si tout est déterminé : solution unique.
export function resolubleSansDeviner(lignes: number[][], colonnes: number[][]): boolean {
  return passes(lignes, colonnes) !== null
}

// Nombre de tours (toutes les lignes puis toutes les colonnes) pour tout résoudre par logique, ou null.
// Plus il en faut, plus la grille est difficile.
export function passes(lignes: number[][], colonnes: number[][]): number | null {
  const h = lignes.length
  const w = colonnes.length
  const g = new Array(w * h).fill(-1)
  let change = true
  let tours = 0
  while (change) {
    tours++
    change = false
    for (let y = 0; y < h; y++) {
      const r = resoudreLigne(lignes[y], g.slice(y * w, y * w + w))
      if (!r) return null
      r.forEach((v, x) => {
        if (v !== g[y * w + x]) { g[y * w + x] = v; change = true }
      })
    }
    for (let x = 0; x < w; x++) {
      const r = resoudreLigne(colonnes[x], Array.from({ length: h }, (_, y) => g[y * w + x]))
      if (!r) return null
      r.forEach((v, y) => {
        if (v !== g[y * w + x]) { g[y * w + x] = v; change = true }
      })
    }
  }
  return g.every(v => v !== -1) ? tours : null
}

// Grille aléatoire qui se résout par logique.
export function aleatoire(taille: number, random: () => number = Math.random): Grille {
  for (let essai = 0; essai < 500; essai++) {
    const densite = 0.56 + random() * 0.1
    const g: Grille = { w: taille, h: taille, cases: Array.from({ length: taille * taille }, () => random() < densite) }
    if (indicesLignes(g).some(l => !l.length) || indicesColonnes(g).some(c => !c.length)) continue
    if (resolubleSansDeviner(indicesLignes(g), indicesColonnes(g))) return g
  }
  return { w: taille, h: taille, cases: new Array(taille * taille).fill(true) }
}
