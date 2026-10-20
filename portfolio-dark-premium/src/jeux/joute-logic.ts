// Joute de lettres : le jeu de lettres sur plateau 15 × 15, contre l'ordinateur.
// Règles et répartition des lettres de la version française du jeu.
import type { Lexique } from './lexique'

export const N = 15
export const CENTRE = 7 * N + 7
const A = 65

// Cases spéciales : T = mot compte triple, D = mot compte double, t = lettre compte triple, d = lettre compte double.
const PLAN = [
  'T..d...T...d..T',
  '.D...t...t...D.',
  '..D...d.d...D..',
  'd..D...d...D..d',
  '....D.....D....',
  '.t...t...t...t.',
  '..d...d.d...d..',
  'T..d...D...d..T',
  '..d...d.d...d..',
  '.t...t...t...t.',
  '....D.....D....',
  'd..D...d...D..d',
  '..D...d.d...D..',
  '.D...t...t...D.',
  'T..d...T...d..T',
].join('')
export type Prime = 'T' | 'D' | 't' | 'd' | null
export const prime = (i: number): Prime => (PLAN[i] === '.' ? null : (PLAN[i] as Prime))

// Lettre → [nombre dans le sac, valeur]. « ? » = joker (lettre blanche).
const REPARTITION: Record<string, [number, number]> = {
  A: [9, 1], B: [2, 3], C: [2, 3], D: [3, 2], E: [15, 1], F: [2, 4], G: [2, 2], H: [2, 4], I: [8, 1], J: [1, 8],
  K: [1, 10], L: [5, 1], M: [3, 2], N: [6, 1], O: [6, 1], P: [2, 3], Q: [1, 8], R: [6, 1], S: [6, 1], T: [6, 1],
  U: [6, 1], V: [2, 4], W: [1, 10], X: [1, 10], Y: [1, 10], Z: [1, 10], '?': [2, 0],
}
export const valeur = (l: string) => REPARTITION[l]?.[1] ?? 0
export const TAILLE_CHEVALET = 7

export interface Tuile { l: string; joker: boolean } // l : la lettre (A–Z) ; joker : posée avec la lettre blanche
export type Plateau = (Tuile | null)[]
export interface Pose { i: number; l: string; joker: boolean } // une lettre posée à la case i
export interface Mot { mot: string; points: number; cases: number[] }

export function nouveauSac(random: () => number = Math.random): string[] {
  const sac: string[] = []
  for (const [l, [n]] of Object.entries(REPARTITION)) for (let k = 0; k < n; k++) sac.push(l)
  for (let k = sac.length - 1; k > 0; k--) {
    const j = Math.floor(random() * (k + 1))
    ;[sac[k], sac[j]] = [sac[j], sac[k]]
  }
  return sac
}
export const plateauVide = (): Plateau => new Array(N * N).fill(null)

// ----- Mots formés et points -----
// Lit le mot qui passe par la case i dans une direction (pas = 1 : horizontal, pas = N : vertical).
function motPassant(lettreEn: (i: number) => string | null, i: number, pas: 1 | 15): number[] {
  const ligne = (k: number) => (pas === 1 ? Math.floor(k / N) : k % N)
  const dans = (k: number, ref: number) => k >= 0 && k < N * N && (pas === 1 ? ligne(k) === ligne(ref) : true)
  let debut = i
  while (dans(debut - pas, i) && lettreEn(debut - pas)) debut -= pas
  const cases: number[] = []
  for (let k = debut; dans(k, i) && lettreEn(k); k += pas) cases.push(k)
  return cases
}

export interface Verdict {
  ok: boolean
  erreur?: string
  mots: Mot[]
  total: number
  invalides: string[]
}

// Vérifie un coup (règles de placement, puis dictionnaire si on en donne un) et compte les points.
export function evaluer(plateau: Plateau, poses: Pose[], lexique?: Lexique | null): Verdict {
  const non = (erreur: string): Verdict => ({ ok: false, erreur, mots: [], total: 0, invalides: [] })
  if (!poses.length) return non('Pose au moins une lettre.')
  const nouvelles = new Map(poses.map(p => [p.i, p]))
  if (nouvelles.size !== poses.length || poses.some(p => plateau[p.i])) return non('Une case est déjà prise.')
  const lignes = new Set(poses.map(p => Math.floor(p.i / N)))
  const colonnes = new Set(poses.map(p => p.i % N))
  if (lignes.size > 1 && colonnes.size > 1) return non('Les lettres doivent être sur une même ligne ou une même colonne.')
  const lettreEn = (i: number) => nouvelles.get(i)?.l ?? plateau[i]?.l ?? null
  const vide = plateau.every(c => !c)

  // Le mot principal, dans le sens des lettres posées (ou celui qui fait au moins 2 lettres pour une seule lettre).
  let pas: 1 | 15 = lignes.size === 1 ? 1 : 15
  if (poses.length === 1) {
    const h = motPassant(lettreEn, poses[0].i, 1)
    pas = h.length >= 2 ? 1 : 15
  }
  const principal = motPassant(lettreEn, poses[0].i, pas)
  if (poses.some(p => !principal.includes(p.i))) return non('Les lettres doivent se suivre, sans trou entre elles.')
  if (vide) {
    if (!poses.some(p => p.i === CENTRE)) return non('Le premier mot doit passer par l’étoile au centre.')
    if (principal.length < 2) return non('Le premier mot doit faire au moins 2 lettres.')
  }

  const groupes: number[][] = []
  if (principal.length >= 2) groupes.push(principal)
  const autre = pas === 1 ? 15 : 1
  for (const p of poses) {
    const m = motPassant(lettreEn, p.i, autre)
    if (m.length >= 2) groupes.push(m)
  }
  if (!groupes.length) return non(vide ? 'Forme un mot d’au moins 2 lettres.' : 'Ton mot doit toucher une lettre déjà posée.')
  if (!vide && !groupes.some(g => g.some(i => plateau[i]))) return non('Ton mot doit toucher une lettre déjà posée.')

  const mots: Mot[] = groupes.map(cases => {
    let somme = 0
    let fois = 1
    for (const i of cases) {
      const p = nouvelles.get(i)
      const t = p ?? plateau[i]!
      let v = t.joker ? 0 : valeur(t.l)
      if (p) {
        const pr = prime(i)
        if (pr === 'd') v *= 2
        if (pr === 't') v *= 3
        if (pr === 'D') fois *= 2
        if (pr === 'T') fois *= 3
      }
      somme += v
    }
    return { mot: cases.map(lettreEn).join(''), points: somme * fois, cases }
  })
  const scrabble = poses.length === TAILLE_CHEVALET ? 50 : 0
  const total = mots.reduce((a, m) => a + m.points, 0) + scrabble
  const invalides = lexique ? mots.filter(m => !lexique.contient(m.mot)).map(m => m.mot) : []
  if (invalides.length) {
    const liste = invalides.map(m => `« ${m} »`).join(', ')
    return { ok: false, erreur: `${liste} ${invalides.length > 1 ? 'ne sont pas' : 'n’est pas'} dans le dictionnaire.`, mots, total, invalides }
  }
  return { ok: true, mots, total, invalides }
}

// ----- L'ordinateur : trouve tous les coups possibles (algorithme d'Appel et Jacobson) -----
export interface Coup { poses: Pose[]; total: number; mots: Mot[] }

export function coupsPossibles(plateau: Plateau, chevalet: string[], lx: Lexique, limite = 6000): Coup[] {
  const coups = new Map<string, Coup>()
  const vide = plateau.every(c => !c)
  const compte = new Array(27).fill(0) // 26 = joker
  for (const l of chevalet) compte[l === '?' ? 26 : l.charCodeAt(0) - A]++
  const TOUT = (1 << 26) - 1

  for (const sens of [1, 15] as const) {
    // Case k de la ligne r dans ce sens.
    const cell = (r: number, k: number) => (sens === 1 ? r * N + k : k * N + r)
    const perp = sens === 1 ? 15 : 1
    for (let r = 0; r < N; r++) {
      // Lettres possibles sur chaque case vide (à cause des mots croisés), et points de ces mots croisés.
      const masque = new Array(N).fill(TOUT)
      const ancre = new Array(N).fill(false)
      for (let k = 0; k < N; k++) {
        const i = cell(r, k)
        if (plateau[i]) continue
        const avant: string[] = []
        for (let j = i - perp; j >= 0 && sameLine(j, i, perp) && plateau[j]; j -= perp) avant.unshift(plateau[j]!.l)
        const apres: string[] = []
        for (let j = i + perp; j < N * N && sameLine(j, i, perp) && plateau[j]; j += perp) apres.push(plateau[j]!.l)
        const voisin = (sens === 1 ? [k > 0 ? i - 1 : -1, k < N - 1 ? i + 1 : -1] : [k > 0 ? i - N : -1, k < N - 1 ? i + N : -1]).some(j => j >= 0 && plateau[j])
        if (avant.length || apres.length || voisin) ancre[k] = true
        if (avant.length || apres.length) {
          let m = 0
          const n0 = lx.noeud(avant.join(''))
          if (n0 >= 0) {
            const s = lx.suites(n0)
            for (let l = 0; l < 26; l++) {
              if (!(s & (1 << l))) continue
              let n = lx.fils(n0, l)
              for (const c of apres) { if (n < 0) break; n = lx.fils(n, c.charCodeAt(0) - A) }
              if (n >= 0 && lx.estMot(n)) m |= 1 << l
            }
          }
          masque[k] = m
        }
      }
      if (vide) {
        // Premier coup : seule l'étoile du centre sert d'ancre (sur la ligne 7).
        for (let k = 0; k < N; k++) ancre[k] = r === 7 && k === 7
      }

      const poses: Pose[] = []
      const noter = () => {
        if (coups.size >= limite) return
        const cle = poses.map(p => `${p.i}${p.l}${p.joker ? '*' : ''}`).sort().join(',')
        if (coups.has(cle)) return
        const v = evaluer(plateau, poses)
        if (v.ok) coups.set(cle, { poses: poses.map(p => ({ ...p })), total: v.total, mots: v.mots })
      }
      // Prolonge vers la droite à partir de la case k, en suivant le nœud n de l'arbre des mots.
      const droite = (n: number, k: number, ancreK: number) => {
        if (k >= N || !plateau[cell(r, k)]) {
          if (k > ancreK && poses.length && lx.estMot(n)) noter()
        }
        if (k >= N) return
        const i = cell(r, k)
        const t = plateau[i]
        if (t) {
          const f = lx.fils(n, t.l.charCodeAt(0) - A)
          if (f >= 0) droite(f, k + 1, ancreK)
          return
        }
        const possibles = lx.suites(n) & masque[k]
        if (!possibles) return
        for (let l = 0; l < 26; l++) {
          if (!(possibles & (1 << l))) continue
          for (const joker of [false, true]) {
            const c = joker ? 26 : l
            if (!compte[c]) continue
            compte[c]--
            poses.push({ i, l: String.fromCharCode(A + l), joker })
            droite(lx.fils(n, l), k + 1, ancreK)
            poses.pop()
            compte[c]++
          }
        }
      }
      // Partie gauche : des lettres du chevalet posées avant l'ancre (au plus `place` cases libres).
      const gauche = (n: number, place: number, ancreK: number, longueur: number) => {
        droite(n, ancreK, ancreK)
        if (place <= 0) return
        const s = lx.suites(n)
        for (let l = 0; l < 26; l++) {
          if (!(s & (1 << l))) continue
          for (const joker of [false, true]) {
            const c = joker ? 26 : l
            if (!compte[c]) continue
            compte[c]--
            // Les lettres de gauche sont toutes décalées d'une case à chaque nouvelle lettre : on les recalcule.
            // (Ces cases ne touchent aucune lettre : toutes les lettres y sont permises.)
            poses.push({ i: -1, l: String.fromCharCode(A + l), joker })
            const nl = longueur + 1
            for (let q = 0; q < nl; q++) poses[poses.length - nl + q].i = cell(r, ancreK - nl + q)
            gauche(lx.fils(n, l), place - 1, ancreK, nl)
            poses.pop()
            compte[c]++
          }
        }
      }
      for (let k = 0; k < N; k++) {
        if (!ancre[k] || plateau[cell(r, k)]) continue
        if (k > 0 && plateau[cell(r, k - 1)]) {
          // Des lettres déjà posées juste avant l'ancre : elles forment le début du mot.
          let d = k - 1
          while (d > 0 && plateau[cell(r, d - 1)]) d--
          let n = 0
          for (let q = d; q < k && n >= 0; q++) n = lx.fils(n, plateau[cell(r, q)]!.l.charCodeAt(0) - A)
          if (n >= 0) droite(n, k, k)
        } else {
          let place = 0
          for (let q = k - 1; q >= 0 && !plateau[cell(r, q)] && !ancre[q]; q--) place++
          gauche(0, place, k, 0)
        }
      }
    }
  }
  return [...coups.values()]
}
// j et i sont-ils sur la même ligne (pas = 1) ou colonne (pas = 15) ?
const sameLine = (j: number, i: number, pas: number) => (pas === 1 ? Math.floor(j / N) === Math.floor(i / N) : true)

// Ce que valent les lettres qu'on garde pour la suite (pour l'ordinateur « fort »).
export function valeurReste(reste: string[]): number {
  let v = 0
  const voyelles = reste.filter(l => 'AEIOUY'.includes(l)).length
  const consonnes = reste.filter(l => l !== '?' && !'AEIOUY'.includes(l)).length
  v += reste.filter(l => l === '?').length * 9
  v += reste.filter(l => l === 'S').length * 3
  if (reste.includes('Q') && !reste.includes('U')) v -= 6
  const doublons = reste.length - new Set(reste).size
  v -= doublons * 2.5
  v -= Math.abs(voyelles - consonnes) * 1.5
  return v
}

export type Niveau = 'facile' | 'moyen' | 'fort'

// L'ordinateur choisit son coup selon son niveau.
export function choisirCoup(coups: Coup[], chevalet: string[], niveau: Niveau, random: () => number = Math.random): Coup | null {
  if (!coups.length) return null
  const reste = (c: Coup) => {
    const r = [...chevalet]
    for (const p of c.poses) r.splice(r.indexOf(p.joker ? '?' : p.l), 1)
    return r
  }
  if (niveau === 'fort') {
    let meilleur = coups[0]
    let note = -Infinity
    for (const c of coups) {
      const n = c.total + valeurReste(reste(c))
      if (n > note) { note = n; meilleur = c }
    }
    return meilleur
  }
  const tries = [...coups].sort((a, b) => a.total - b.total)
  // Facile : un coup moyen, sans joker si possible ; moyen : parmi les bons coups, pas toujours le meilleur.
  const [de, a] = niveau === 'facile' ? [0.3, 0.6] : [0.75, 0.97]
  let choix = tries.slice(Math.floor(tries.length * de), Math.max(Math.floor(tries.length * de) + 1, Math.ceil(tries.length * a)))
  if (niveau === 'facile') {
    const sansJoker = choix.filter(c => !c.poses.some(p => p.joker) && c.poses.length <= 4)
    if (sansJoker.length) choix = sansJoker
  }
  return choix[Math.floor(random() * choix.length)]
}

// Lettres que l'ordinateur échange quand il ne peut rien jouer : il garde les jokers, un S et un E.
export function aEchanger(chevalet: string[]): string[] {
  const garder = new Set<number>()
  chevalet.forEach((l, k) => {
    if (l === '?') garder.add(k)
  })
  const s = chevalet.indexOf('S')
  if (s >= 0) garder.add(s)
  const e = chevalet.indexOf('E')
  if (e >= 0) garder.add(e)
  return chevalet.filter((_, k) => !garder.has(k))
}

export const sommeChevalet = (c: string[]) => c.reduce((a, l) => a + valeur(l), 0)
