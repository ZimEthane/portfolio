// Logique pure du jeu du dinosaure : un monde de 600 × 150 unités, y vers le bas, sol à y = SOL.

export const MONDE_L = 600
export const SOL = 135
export const DINO_X = 40
export const DEBOUT = { w: 40, h: 44 }
export const BAISSE = { w: 56, h: 26 }
const GRAVITE = 2600
const SAUT = 690 // vitesse de départ du saut (unités/s)
const VITESSE_MIN = 360
const VITESSE_MAX = 820

export type Sorte = 'cactus' | 'grand-cactus' | 'oiseau'
export interface Obstacle { sorte: Sorte; x: number; y: number; w: number; h: number; n: number }
export interface Etat {
  t: number
  vitesse: number
  distance: number
  y: number // haut du dino
  vy: number
  baisse: boolean
  auSol: boolean
  obstacles: Obstacle[]
  prochain: number // distance avant le prochain obstacle
  mort: boolean
}

export const score = (e: Etat) => Math.floor(e.distance / 10)

export function nouvelEtat(): Etat {
  return { t: 0, vitesse: VITESSE_MIN, distance: 0, y: SOL - DEBOUT.h, vy: 0, baisse: false, auSol: true, obstacles: [], prochain: 400, mort: false }
}

function obstacle(e: Etat, random: () => number): Obstacle {
  // Les oiseaux arrivent après 250 points : bas (sauter), milieu (se baisser ou sauter), haut (passer dessous).
  if (score(e) > 250 && random() < 0.25) {
    const hauteur = [SOL - 32, SOL - 62, SOL - 92][Math.floor(random() * 3)]
    return { sorte: 'oiseau', x: MONDE_L + 20, y: hauteur, w: 46, h: 30, n: 1 }
  }
  if (random() < 0.35) {
    const n = e.vitesse > 450 && random() < 0.4 ? 2 : 1
    return { sorte: 'grand-cactus', x: MONDE_L + 20, y: SOL - 50, w: 25 * n + 3 * (n - 1), h: 50, n }
  }
  const n = 1 + Math.floor(random() * (e.vitesse > 420 ? 3 : 2))
  return { sorte: 'cactus', x: MONDE_L + 20, y: SOL - 35, w: 17 * n + 3 * (n - 1), h: 35, n }
}

const touche = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

export function boiteDino(e: Etat) {
  const taille = e.baisse && e.auSol ? BAISSE : DEBOUT
  const y = e.baisse && e.auSol ? SOL - BAISSE.h : e.y
  return { x: DINO_X + 5, y: y + 4, w: taille.w - 10, h: taille.h - 8 }
}

// Avance de dt secondes. saut : touche de saut appuyée à l'instant ; bas : touche « se baisser » maintenue.
export function avancer(e: Etat, dt: number, saut: boolean, bas: boolean, random: () => number = Math.random): { e: Etat; sauté: boolean; palier: boolean } {
  if (e.mort) return { e, sauté: false, palier: false }
  const s = { ...e, obstacles: e.obstacles.map(o => ({ ...o })) }
  let sauté = false
  s.t += dt
  s.vitesse = Math.min(VITESSE_MAX, VITESSE_MIN + s.t * 9)
  const avant = score(s)
  s.distance += s.vitesse * dt

  if (saut && s.auSol) {
    s.vy = -SAUT
    s.auSol = false
    sauté = true
  }
  s.baisse = bas
  if (!s.auSol) {
    s.vy += GRAVITE * (bas ? 2.6 : 1) * dt // appuyer sur « bas » en l'air fait redescendre vite
    s.y += s.vy * dt
    if (s.y >= SOL - DEBOUT.h) {
      s.y = SOL - DEBOUT.h
      s.vy = 0
      s.auSol = true
    }
  }

  for (const o of s.obstacles) o.x -= s.vitesse * dt
  s.obstacles = s.obstacles.filter(o => o.x + o.w > -20)
  s.prochain -= s.vitesse * dt
  if (s.prochain <= 0) {
    const o = obstacle(s, random)
    s.obstacles.push(o)
    // Écart suivant : proportionnel à la vitesse, toujours assez grand pour retomber et ressauter.
    s.prochain = o.w + s.vitesse * (0.78 + random() * 0.6)
  }

  const dino = boiteDino(s)
  if (s.obstacles.some(o => touche(dino, { x: o.x + 3, y: o.y + 3, w: o.w - 6, h: o.h - 6 }))) s.mort = true
  return { e: s, sauté, palier: Math.floor(score(s) / 100) > Math.floor(avant / 100) }
}
