// Glouton : un jeu de poursuite dans un labyrinthe (personnages et labyrinthe originaux).
// Le glouton mange les graines ; quatre monstres le poursuivent, chacun à sa façon.
// Une super-graine rend les monstres peureux : on peut alors les manger.

import { PLANS } from './glouton-plans'

// Le labyrinthe change à chaque niveau (10 plans, puis on recommence au premier).
export let PLAN = PLANS[0]
export const W = PLAN[0].length
export const H = PLAN.length
export const planDuNiveau = (niveau: number) => (niveau - 1) % PLANS.length
export function choisirPlan(niveau: number) {
  PLAN = PLANS[planDuNiveau(niveau)]
}

export type Dir = 'haut' | 'bas' | 'gauche' | 'droite'
export const DELTA: Record<Dir, [number, number]> = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] }
export const OPPOSE: Record<Dir, Dir> = { haut: 'bas', bas: 'haut', gauche: 'droite', droite: 'gauche' }
const DIRS: Dir[] = ['haut', 'gauche', 'bas', 'droite'] // ordre de préférence en cas d'égalité

export const estMur = (x: number, y: number, monstre = false) => {
  if (y < 0 || y >= H) return true
  const xx = ((x % W) + W) % W // tunnel : on ressort de l'autre côté
  const c = PLAN[y][xx]
  if (c === '#') return true
  if (c === '-') return !monstre // la porte de la maison des monstres
  return false
}

export interface Perso {
  x: number // position en cases (peut être fractionnaire entre deux cases)
  y: number
  dir: Dir
  voulu: Dir | null // direction demandée (le glouton tourne dès qu'il peut)
}
export type Humeur = 'chasse' | 'disperse' | 'peur' | 'yeux' | 'maison'
export interface Monstre extends Perso {
  nom: 'Rouge' | 'Rose' | 'Bleu' | 'Ambre'
  humeur: Humeur
  attente: number // secondes avant de sortir de la maison
}

export interface Etat {
  joueur: Perso
  monstres: Monstre[]
  graines: Set<number> // indices des cases avec une graine
  super: Set<number>
  score: number
  vies: number
  niveau: number
  peur: number // secondes de peur restantes
  combo: number // monstres mangés pendant la peur actuelle
  temps: number // temps de jeu du niveau (pour l'alternance disperse / chasse)
  fruit: { x: number; y: number; t: number } | null
  fruitsVus: number
  statut: 'pret' | 'joue' | 'mort' | 'niveau' | 'fini'
  pause: number // petite pause (après une mort, un niveau…)
}

const trouver = (c: string) => {
  const r: { x: number; y: number }[] = []
  PLAN.forEach((l, y) => l.split('').forEach((ch, x) => ch === c && r.push({ x, y })))
  return r
}
const DEPART = trouver('P')[0]
const MAISON = trouver('M')
const PORTE = trouver('-')[0]
const SORTIE = { x: PORTE.x, y: PORTE.y - 1 }
// Coins visés par chaque monstre en mode « disperse ».
const COINS: Record<Monstre['nom'], { x: number; y: number }> = { Rouge: { x: W - 2, y: 0 }, Rose: { x: 1, y: 0 }, Bleu: { x: W - 1, y: H - 1 }, Ambre: { x: 0, y: H - 1 } }

export function grainesInitiales() {
  const g = new Set<number>()
  const s = new Set<number>()
  PLAN.forEach((l, y) => l.split('').forEach((c, x) => {
    if (c === '.') g.add(y * W + x)
    if (c === 'o') s.add(y * W + x)
  }))
  return { g, s }
}

function placer(etat: Etat): Etat {
  const noms: Monstre['nom'][] = ['Rouge', 'Rose', 'Bleu', 'Ambre']
  const lieux = [SORTIE, MAISON[1], MAISON[2], MAISON[3]]
  return {
    ...etat,
    joueur: { x: DEPART.x, y: DEPART.y, dir: 'gauche', voulu: null },
    monstres: noms.map((nom, k) => ({ nom, x: lieux[k].x, y: lieux[k].y, dir: 'gauche', voulu: null, humeur: k === 0 ? 'disperse' : 'maison', attente: [0, 2, 5, 8][k] })),
    peur: 0,
    combo: 0,
    temps: 0,
    pause: 1.6,
  }
}

export function nouvellePartie(): Etat {
  choisirPlan(1)
  const { g, s } = grainesInitiales()
  return placer({ joueur: { x: 0, y: 0, dir: 'gauche', voulu: null }, monstres: [], graines: g, super: s, score: 0, vies: 3, niveau: 1, peur: 0, combo: 0, temps: 0, fruit: null, fruitsVus: 0, statut: 'pret', pause: 0 })
}
export function niveauSuivant(e: Etat): Etat {
  choisirPlan(e.niveau + 1)
  const { g, s } = grainesInitiales()
  return placer({ ...e, graines: g, super: s, niveau: e.niveau + 1, fruit: null, fruitsVus: 0, statut: 'joue' })
}

// Vitesses (cases par seconde), un peu plus rapides à chaque niveau.
const vitesseJoueur = (n: number) => Math.min(8.4, 6.2 + n * 0.25)
const vitesseMonstre = (n: number) => Math.min(8.2, 5.6 + n * 0.3)
const dureePeur = (n: number) => Math.max(2.5, 7 - n * 0.6)
// Alternance : quelques secondes de dispersion, puis la chasse.
const humeurDuMoment = (t: number): 'chasse' | 'disperse' => {
  const cycle = [7, 20, 7, 20, 5, 1e9]
  let s = 0
  for (let k = 0; k < cycle.length; k++) {
    s += cycle[k]
    if (t < s) return k % 2 === 0 ? 'disperse' : 'chasse'
  }
  return 'chasse'
}

const auCentre = (p: Perso) => Math.abs(p.x - Math.round(p.x)) < 1e-6 && Math.abs(p.y - Math.round(p.y)) < 1e-6
const peutAller = (x: number, y: number, d: Dir, monstre = false) => !estMur(x + DELTA[d][0], y + DELTA[d][1], monstre)

// Avance un personnage de « pas » cases, en tournant aux carrefours (choix donné par « decider »).
function avancer(p: Perso, pas: number, decider: (x: number, y: number) => Dir, monstre: boolean, surCase?: (x: number, y: number) => void): Perso {
  let { x, y, dir } = p
  let reste = pas
  let garde = 0
  while (reste > 1e-9 && garde++ < 20) {
    if (Math.abs(x - Math.round(x)) < 1e-6 && Math.abs(y - Math.round(y)) < 1e-6) {
      x = Math.round(x)
      y = Math.round(y)
      // Tunnel : on réapparaît de l'autre côté.
      if (x < 0) x += W
      if (x >= W) x -= W
      surCase?.(x, y)
      dir = decider(x, y)
      if (!peutAller(x, y, dir, monstre)) return { ...p, x, y, dir }
    }
    const [dx, dy] = DELTA[dir]
    // Distance jusqu'au prochain centre de case.
    const frac = dx ? (dx > 0 ? Math.ceil(x + 1e-9) - x : x - Math.floor(x - 1e-9)) : dy > 0 ? Math.ceil(y + 1e-9) - y : y - Math.floor(y - 1e-9)
    const d = Math.min(reste, frac)
    x += dx * d
    y += dy * d
    reste -= d
  }
  return { ...p, x, y, dir }
}

const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2

// La case visée par chaque monstre en chasse.
function cible(m: Monstre, e: Etat): { x: number; y: number } {
  const j = e.joueur
  const [dx, dy] = DELTA[j.dir]
  switch (m.nom) {
    case 'Rouge': return { x: j.x, y: j.y } // fonce droit sur le glouton
    case 'Rose': return { x: j.x + dx * 4, y: j.y + dy * 4 } // vise devant lui
    case 'Bleu': {
      // Se place à l'opposé du Rouge par rapport à un point devant le glouton.
      const r = e.monstres.find(k => k.nom === 'Rouge')!
      const px = j.x + dx * 2
      const py = j.y + dy * 2
      return { x: px * 2 - r.x, y: py * 2 - r.y }
    }
    default: return dist2(m, j) > 64 ? { x: j.x, y: j.y } : COINS.Ambre // timide : fuit quand il est proche
  }
}

export interface Evenement {
  graine?: boolean
  superGraine?: boolean
  monstreMange?: number // points gagnés
  fruit?: number
  mort?: boolean
  niveauFini?: boolean
}

export function pas(e0: Etat, dt: number, random: () => number = Math.random): { e: Etat; ev: Evenement } {
  const ev: Evenement = {}
  if (e0.statut !== 'joue') return { e: e0, ev }
  let e: Etat = { ...e0 }
  if (e.pause > 0) {
    e.pause = Math.max(0, e.pause - dt)
    return { e, ev }
  }
  e.temps += dt
  if (e.peur > 0) e.peur = Math.max(0, e.peur - dt)

  // --- Le glouton ---
  const graines = new Set(e.graines)
  const sup = new Set(e.super)
  e.joueur = avancer(e.joueur, vitesseJoueur(e.niveau) * dt, (x, y) => {
    const v = e.joueur.voulu
    if (v && peutAller(x, y, v)) return v
    return e.joueur.dir
  }, false, (x, y) => {
    const i = y * W + x
    if (graines.delete(i)) { e.score += 10; ev.graine = true }
    if (sup.delete(i)) {
      e.score += 50
      ev.superGraine = true
      e.peur = dureePeur(e.niveau)
      e.combo = 0
      e.monstres = e.monstres.map(m => (m.humeur === 'chasse' || m.humeur === 'disperse' ? { ...m, humeur: 'peur', dir: OPPOSE[m.dir] } : m))
    }
  })
  // La direction voulue est gardée tant qu'on ne peut pas tourner ; un demi-tour se fait tout de suite.
  if (e.joueur.voulu === OPPOSE[e.joueur.dir]) e.joueur = { ...e.joueur, dir: e.joueur.voulu }
  e.graines = graines
  e.super = sup

  // Fruit bonus : deux fois par niveau, au centre.
  const mangees = grainesInitiales().g.size + 4 - graines.size - sup.size
  if (!e.fruit && ((e.fruitsVus === 0 && mangees >= 70) || (e.fruitsVus === 1 && mangees >= 150))) e.fruit = { x: DEPART.x, y: DEPART.y - 2, t: 9 }
  if (e.fruit) {
    e.fruit = { ...e.fruit, t: e.fruit.t - dt }
    if (dist2(e.joueur, e.fruit) < 0.5) {
      const pts = 100 * Math.min(8, e.niveau + 1)
      e.score += pts
      ev.fruit = pts
      e.fruit = null
      e.fruitsVus++
    } else if (e.fruit.t <= 0) {
      e.fruit = null
      e.fruitsVus++
    }
  }

  // --- Les monstres ---
  const humeur = humeurDuMoment(e.temps)
  e.monstres = e.monstres.map(m0 => {
    let m = { ...m0 }
    if (m.humeur === 'peur' && e.peur <= 0) m.humeur = humeur
    if (m.humeur === 'chasse' || m.humeur === 'disperse') {
      if (m.humeur !== humeur) {
        m.humeur = humeur
        m.dir = OPPOSE[m.dir] // changement de mode : demi-tour
      }
    }
    if (m.humeur === 'maison') {
      m.attente -= dt
      if (m.attente > 0) {
        // Petit va-et-vient dans la maison.
        m.y = MAISON[1].y + Math.sin(e.temps * 6 + m.x) * 0.25
        return m
      }
      // Sortie par la porte.
      m.x = SORTIE.x
      m.y = SORTIE.y
      m.dir = 'gauche'
      m.humeur = humeur
      return m
    }
    const v = m.humeur === 'peur' ? vitesseMonstre(e.niveau) * 0.55 : m.humeur === 'yeux' ? 12 : vitesseMonstre(e.niveau)
    const dansTunnel = PLAN[Math.round(m.y)]?.[Math.round(m.x)] === ' ' && (Math.round(m.x) <= 2 || Math.round(m.x) >= W - 3)
    const vit = dansTunnel && m.humeur !== 'yeux' ? v * 0.6 : v
    m = {
      ...m,
      ...avancer(m, vit * dt, (x, y) => {
        // Aux carrefours : jamais de demi-tour ; on choisit la case la plus proche de la cible.
        const options = DIRS.filter(d => d !== OPPOSE[m.dir] && peutAller(x, y, d, m.humeur === 'yeux'))
        if (!options.length) return OPPOSE[m.dir]
        if (m.humeur === 'peur') return options[Math.floor(random() * options.length)]
        const c = m.humeur === 'yeux' ? SORTIE : m.humeur === 'disperse' ? COINS[m.nom] : cible(m, e)
        let best = options[0]
        let bd = Infinity
        for (const d of options) {
          const dd = dist2({ x: x + DELTA[d][0], y: y + DELTA[d][1] }, c)
          if (dd < bd - 1e-9) { bd = dd; best = d }
        }
        return best
      }, m.humeur === 'yeux'),
    }
    // Les yeux rentrés à la maison redeviennent un monstre.
    if (m.humeur === 'yeux' && dist2(m, SORTIE) < 0.05) {
      m.humeur = humeur
      m.dir = 'gauche'
    }
    return m
  })

  // --- Rencontres ---
  for (let k = 0; k < e.monstres.length; k++) {
    const m = e.monstres[k]
    if (m.humeur === 'maison' || m.humeur === 'yeux') continue
    if (dist2(m, e.joueur) < 0.42) {
      if (m.humeur === 'peur') {
        e.combo++
        const pts = 200 * 2 ** (e.combo - 1)
        e.score += pts
        ev.monstreMange = pts
        e.monstres = e.monstres.map((q, j) => (j === k ? { ...q, humeur: 'yeux' } : q))
        e.pause = 0.35
      } else {
        ev.mort = true
        e.vies--
        e.statut = e.vies > 0 ? 'mort' : 'fini'
        e.pause = 1.4
        return { e, ev }
      }
    }
  }

  if (!e.graines.size && !e.super.size) {
    ev.niveauFini = true
    e.statut = 'niveau'
    e.pause = 1.8
  }
  return { e, ev }
}

// Après une mort : on replace tout le monde (les graines restent mangées).
export const reprendre = (e: Etat): Etat => placer({ ...e, statut: 'joue', fruit: null })
export { auCentre }
