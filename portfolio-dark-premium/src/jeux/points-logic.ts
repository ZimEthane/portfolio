// Relier les points : relier chaque paire de points de même couleur par un chemin,
// sans croiser les autres, en remplissant toute la grille.
//
// Un niveau s'écrit ligne par ligne : une lettre par point (A, B, C…), « . » pour une case vide.

export interface Niveau {
  n: number
  points: Record<string, [number, number]> // couleur → indices des deux points
  cases: string // n × n caractères
}

export function lireNiveau(code: string): Niveau {
  const lignes = code.split('/')
  const n = lignes.length
  const cases = lignes.join('')
  const points: Record<string, [number, number]> = {}
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i]
    if (c === '.') continue
    if (points[c]) points[c][1] = i
    else points[c] = [i, -1]
  }
  return { n, points, cases }
}

export const voisins = (n: number, a: number, b: number) => {
  const ax = a % n
  const ay = Math.floor(a / n)
  const bx = b % n
  const by = Math.floor(b / n)
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1
}

export type Chemins = Record<string, number[]> // couleur → cases du chemin, en partant d'un des deux points

// Un chemin est complet s'il va d'un point à l'autre de sa couleur.
export function complet(nv: Niveau, c: string, chemin: number[] | undefined): boolean {
  if (!chemin || chemin.length < 2) return false
  const [a, b] = nv.points[c]
  const d = chemin[0]
  const f = chemin[chemin.length - 1]
  return (d === a && f === b) || (d === b && f === a)
}

export function bilan(nv: Niveau, ch: Chemins) {
  const couleurs = Object.keys(nv.points)
  const relies = couleurs.filter(c => complet(nv, c, ch[c])).length
  const occupe = new Set<number>()
  for (const c of couleurs) for (const i of ch[c] ?? []) occupe.add(i)
  for (const c of couleurs) for (const i of nv.points[c]) occupe.add(i)
  const rempli = occupe.size / (nv.n * nv.n)
  return { relies, total: couleurs.length, rempli, gagne: relies === couleurs.length && occupe.size === nv.n * nv.n }
}

// ----- Génération (utilisée par le script qui fabrique les niveaux) -----

// Chemin qui passe par toutes les cases, mélangé par des « morsures » (backbite).
export function cheminHamiltonien(n: number, random: () => number): number[] {
  let p: number[] = []
  for (let y = 0; y < n; y++) for (let k = 0; k < n; k++) p.push(y * n + (y % 2 ? n - 1 - k : k))
  const pos = new Int32Array(n * n)
  const majPos = () => p.forEach((c, i) => (pos[c] = i))
  majPos()
  for (let t = 0; t < n * n * 40; t++) {
    if (random() < 0.5) {
      p.reverse()
      majPos()
    }
    const tete = p[0]
    const x = tete % n
    const y = Math.floor(tete / n)
    const vs = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n).map(([a, b]) => b * n + a)
    const q = vs[Math.floor(random() * vs.length)]
    const j = pos[q]
    if (j <= 1) continue
    p = [...p.slice(0, j).reverse(), ...p.slice(j)]
    majPos()
  }
  return p
}

export function decouper(n: number, chemin: number[], k: number, random: () => number): number[][] | null {
  // Longueurs ≥ 3, réparties au hasard.
  const L = chemin.length
  const longueurs = new Array(k).fill(3)
  for (let r = L - 3 * k; r > 0; r--) longueurs[Math.floor(random() * k)]++
  const morceaux: number[][] = []
  let i = 0
  for (const l of longueurs) {
    morceaux.push(chemin.slice(i, i + l))
    i += l
  }
  // Refus : deux bouts d'un même chemin côte à côte (trop facile).
  if (morceaux.some(m => voisins(n, m[0], m[m.length - 1]))) return null
  return morceaux
}

// ----- Solveur (pour l'indice) : trouve la solution qui relie tout en remplissant la grille -----
export function resoudre(nv: Niveau, limite = 400000): Chemins | null {
  const n = nv.n
  const couleurs = Object.keys(nv.points)
  const K = couleurs.length
  const paires = couleurs.map(c => nv.points[c])
  const g = new Int8Array(n * n).fill(-1)
  paires.forEach(([a, b], c) => { g[a] = c; g[b] = c })
  const tete = paires.map(p => p[0])
  const fini = new Array(K).fill(false)
  const chemins = paires.map(p => [p[0]])
  const V: number[][] = []
  for (let i = 0; i < n * n; i++) {
    const x = i % n
    const y = (i - x) / n
    V.push([[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n).map(([a, b]) => b * n + a))
  }
  let noeuds = 0
  let solution: Chemins | null = null
  const ok = (): boolean => {
    const comp = new Int32Array(n * n).fill(-1)
    let nc = 0
    for (let i = 0; i < n * n; i++) {
      if (g[i] !== -1 || comp[i] !== -1) continue
      const pile = [i]
      comp[i] = nc
      while (pile.length) {
        const u = pile.pop()!
        for (const v of V[u]) if (g[v] === -1 && comp[v] === -1) { comp[v] = nc; pile.push(v) }
      }
      nc++
    }
    const touche = (cell: number) => {
      const s = new Set<number>()
      for (const v of V[cell]) if (comp[v] >= 0) s.add(comp[v])
      return s
    }
    const servie = new Array(nc).fill(false)
    for (let c = 0; c < K; c++) {
      if (fini[c]) continue
      const h = tete[c]
      const b = paires[c][1]
      const th = touche(h)
      const tb = touche(b)
      let commun = V[h].includes(b)
      for (const r of th) if (tb.has(r)) { servie[r] = true; commun = true }
      if (!commun) return false
    }
    return servie.every(s => s)
  }
  const rec = (): void => {
    if (solution || ++noeuds > limite) return
    let meilleur = -1
    let mc: number[] = []
    for (let c = 0; c < K; c++) {
      if (fini[c]) continue
      const m = V[tete[c]].filter(v => g[v] === -1 || (v === paires[c][1] && g[v] === c))
      if (!m.length) return
      if (meilleur < 0 || m.length < mc.length) { meilleur = c; mc = m }
    }
    if (meilleur < 0) {
      if (g.every(v => v !== -1)) solution = Object.fromEntries(couleurs.map((c, k) => [c, [...chemins[k], paires[k][1]]]))
      return
    }
    const c = meilleur
    for (const v of mc) {
      if (v === paires[c][1]) {
        fini[c] = true
        if (ok()) rec()
        fini[c] = false
        continue
      }
      const h = tete[c]
      g[v] = c
      tete[c] = v
      chemins[c].push(v)
      if (ok()) rec()
      g[v] = -1
      tete[c] = h
      chemins[c].pop()
      if (solution) return
    }
  }
  if (ok()) rec()
  return solution
}
