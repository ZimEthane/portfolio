// Rase-mottes : on vole en rase-mottes au-dessus d'un relief qui défile, on tire devant soi,
// on lâche des bombes, et on fait le plein en détruisant les réservoirs.
// Écran : 160 unités de large × 100 de haut (y vers le bas). Le monde défile vers la gauche.

export const LARGEUR = 160
export const HAUTEUR = 100
export const LONGUEUR_ZONE = 1100 // unités par zone
const PAS = 2 // le relief est décrit tous les 2 unités

export interface Zone { nom: string; ciel: [string, string]; sol: [string, string]; bord: string }
export const ZONES: Zone[] = [
  { nom: 'Les collines', ciel: ['#0b1030', '#1d2a5e'], sol: ['#2f6b3a', '#173a20'], bord: '#7bd66a' },
  { nom: 'Les soucoupes', ciel: ['#140b2e', '#3a1f5c'], sol: ['#5a3a7a', '#2a1a3c'], bord: '#c58cff' },
  { nom: 'La grotte', ciel: ['#05070c', '#141a24'], sol: ['#6b4a2f', '#33220f'], bord: '#e8a35a' },
  { nom: 'Les comètes', ciel: ['#200a0a', '#4a1a12'], sol: ['#7a3a1f', '#3a1a0c'], bord: '#ff9a5a' },
  { nom: 'La cité', ciel: ['#061a24', '#0f3a4a'], sol: ['#2a4a5a', '#122630'], bord: '#5ad8ff' },
  { nom: 'La base', ciel: ['#0a0a12', '#22223a'], sol: ['#4a4a5a', '#22222c'], bord: '#ffd84d' },
]

export type TypeEnnemi = 'fusee' | 'reservoir' | 'mystere' | 'soucoupe' | 'comete' | 'base'
export interface Ennemi {
  type: TypeEnnemi
  x: number // position dans le monde
  y: number
  vy: number
  vol: boolean // fusée partie
  phase: number
  depart: number // distance au joueur à laquelle la fusée décolle
  mort: boolean
}
export interface Relief { sol: Float32Array; plafond: Float32Array | null; ennemis: Ennemi[] }

export interface Etat {
  t: number
  camera: number // abscisse du bord gauche de l'écran dans le monde
  vitesse: number
  boucle: number // nombre de fois que la base a été détruite (le jeu accélère)
  joueur: { x: number; y: number; invincible: number }
  tirs: { x: number; y: number }[]
  bombes: { x: number; y: number; vx: number; vy: number }[]
  explosions: { x: number; y: number; t: number; taille: number; couleur: string }[]
  carburant: number
  score: number
  vies: number
  statut: 'pret' | 'jeu' | 'mort' | 'fin'
  mortDepuis: number
  reliefs: Map<number, Relief>
  cadence: number // délai avant le prochain tir
  message: { texte: string; t: number } | null
  graine: number
  prochaineVie: number // score à atteindre pour gagner une vie
  bonus: Bonus

}

export const nbZones = ZONES.length
export const zoneDe = (x: number) => ((Math.floor(x / LONGUEUR_ZONE) % nbZones) + nbZones) % nbZones

// Générateur pseudo-aléatoire (même relief à chaque partie pour une même zone et une même boucle).
function aleatoire(graine: number) {
  let s = graine | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ennemi = (type: TypeEnnemi, x: number, y: number, rnd: () => number): Ennemi => ({ type, x, y, vy: 0, vol: false, phase: rnd() * Math.PI * 2, depart: 30 + rnd() * 50, mort: false })

// Construit le relief et les ennemis de la zone numéro k (k compte toutes les zones depuis le début).
export function genererZone(k: number, graine: number): Relief {
  const z = ((k % nbZones) + nbZones) % nbZones
  const difficulte = Math.floor(k / nbZones)
  const rnd = aleatoire(graine * 7919 + k * 104729)
  const n = LONGUEUR_ZONE / PAS + 1
  const sol = new Float32Array(n)
  const plafond = z === 2 ? new Float32Array(n) : null
  const x0 = k * LONGUEUR_ZONE
  const bord = 86 // hauteur du sol au début et à la fin de chaque zone (raccord)
  const ennemis: Ennemi[] = []

  // Courbe douce : somme de sinus aux fréquences tirées au hasard.
  const ondes = (amp: number, nb: number) => {
    const o = Array.from({ length: nb }, () => ({ f: 0.004 + rnd() * 0.02, p: rnd() * 6.28, a: amp * (0.4 + rnd() * 0.6) }))
    return (x: number) => o.reduce((s, w) => s + Math.sin(x * w.f + w.p) * w.a, 0)
  }
  const raccord = (j: number) => Math.min(1, j / 40, (n - 1 - j) / 40) // 0 aux extrémités

  if (z === 4) {
    // La cité : des immeubles en créneaux.
    let j = 0
    while (j < n) {
      const largeur = 6 + Math.floor(rnd() * 10)
      const hauteur = 52 + rnd() * 38
      for (let q = 0; q < largeur && j < n; q++, j++) sol[j] = bord + (Math.min(hauteur, 92) - bord) * raccord(j)
      const rue = 3 + Math.floor(rnd() * 5)
      for (let q = 0; q < rue && j < n; q++, j++) sol[j] = bord + (95 - bord) * raccord(j)
    }
  } else {
    const f = ondes(z === 1 ? 4 : z === 5 ? 3 : 15, 3)
    const base = z === 1 ? 88 : z === 5 ? 90 : 78
    for (let j = 0; j < n; j++) sol[j] = bord + (Math.max(55, Math.min(95, base + f(j * PAS))) - bord) * raccord(j)
  }
  if (plafond) {
    // La grotte : un plafond qui suit le sol, en laissant toujours un passage assez large.
    const f = ondes(10, 3)
    for (let j = 0; j < n; j++) {
      const voulu = 14 + f(j * PAS) + 10
      const passage = 38 - Math.min(8, difficulte * 3)
      plafond[j] = Math.max(0, Math.min(voulu, sol[j] - passage)) * raccord(j)
    }
  }

  // Les objets posés au sol, sur des endroits assez plats.
  const hauteurEn = (x: number) => sol[Math.max(0, Math.min(n - 1, Math.round(x / PAS)))]
  const plat = (x: number) => Math.abs(hauteurEn(x - 3) - hauteurEn(x + 3)) < 3 && hauteurEn(x - 3) > 40
  const poser = (type: TypeEnnemi, x: number) => {
    if (!plat(x)) return
    const y = Math.max(hauteurEn(x - 2), hauteurEn(x), hauteurEn(x + 2))
    ennemis.push(ennemi(type, x0 + x, y, rnd))
  }
  // Un réservoir tous les 130 unités environ (sur le premier endroit plat), pour ne jamais tomber en panne.
  for (let x = 120; x < LONGUEUR_ZONE - 100; x += 130) {
    for (let d = 0; d < 60; d += 2) {
      if (plat(x + d)) {
        poser('reservoir', x + d)
        break
      }
    }
  }
  const occupe = (x: number) => ennemis.some(m => Math.abs(m.x - x0 - x) < 10)
  for (let x = 180; x < LONGUEUR_ZONE - 120; x += 26 + rnd() * 34) {
    const r = rnd()
    if (z === 5 && x > LONGUEUR_ZONE - 260) break
    if (occupe(x)) continue
    if (r < 0.1) poser('reservoir', x)
    else if (r < 0.18) poser('mystere', x)
    else if (z !== 1 && z !== 3 && !(z === 0 && rnd() < 0.35)) poser('fusee', x) // un peu moins de fusées pour commencer
  }
  if (z === 1) for (let x = 200; x < LONGUEUR_ZONE - 100; x += 40 + rnd() * 30) ennemis.push(ennemi('soucoupe', x0 + x, 25 + rnd() * 35, rnd))
  if (z === 3) for (let x = 220; x < LONGUEUR_ZONE - 60; x += 45 + rnd() * 35) ennemis.push(ennemi('comete', x0 + x + 160, 12 + rnd() * 50, rnd))
  if (z === 5) {
    // La base, à détruire à la bombe, au bout de la dernière zone.
    const x = LONGUEUR_ZONE - 180
    for (let j = Math.round((x - 14) / PAS); j <= Math.round((x + 14) / PAS); j++) sol[j] = 88
    ennemis.push(ennemi('base', x0 + x, 88, rnd))
  }
  return { sol, plafond, ennemis }
}

export function nouvelEtat(graine = 1): Etat {
  return {
    t: 0, camera: 0, vitesse: 26, boucle: 0, joueur: { x: 28, y: 40, invincible: 0 }, tirs: [], bombes: [], explosions: [],
    carburant: 100, score: 0, vies: 3, statut: 'pret', mortDepuis: 0, reliefs: new Map(), cadence: 0, message: null, graine, prochaineVie: VIE_TOUS_LES, bonus: sansBonus(),
  }
}

export function relief(e: Etat, k: number): Relief {
  let r = e.reliefs.get(k)
  if (!r) {
    r = genererZone(k, e.graine)
    e.reliefs.set(k, r)
    // On oublie les zones loin derrière.
    for (const cle of e.reliefs.keys()) if (cle < k - 1) e.reliefs.delete(cle)
  }
  return r
}

// Hauteur du sol et du plafond à l'abscisse x du monde.
export function solEn(e: Etat, x: number): number {
  const k = Math.floor(x / LONGUEUR_ZONE)
  const r = relief(e, k)
  const u = (x - k * LONGUEUR_ZONE) / PAS
  const j = Math.floor(u)
  const a = r.sol[Math.min(j, r.sol.length - 1)]
  const b = r.sol[Math.min(j + 1, r.sol.length - 1)]
  return a + (b - a) * (u - j)
}
export function plafondEn(e: Etat, x: number): number {
  const k = Math.floor(x / LONGUEUR_ZONE)
  const r = relief(e, k)
  if (!r.plafond) return 0
  const u = (x - k * LONGUEUR_ZONE) / PAS
  const j = Math.floor(u)
  const a = r.plafond[Math.min(j, r.plafond.length - 1)]
  const b = r.plafond[Math.min(j + 1, r.plafond.length - 1)]
  return a + (b - a) * (u - j)
}

// Les ennemis visibles (et un peu au-delà).
export function ennemisProches(e: Etat): Ennemi[] {
  const k = Math.floor(e.camera / LONGUEUR_ZONE)
  return [...relief(e, k).ennemis, ...relief(e, k + 1).ennemis]
}

export interface Commandes { dx: number; dy: number; tir: boolean; bombe: boolean } // dx, dy : de -1 à 1
export interface Evenement { type: 'tir' | 'bombe' | 'explosion' | 'plein' | 'mort' | 'base' | 'zone' | 'fin' | 'fuite' | 'vie' | 'bonus' | 'bouclier'; force?: number }

// Bonus des caisses « ? » : tir double et tir rapide (quelques secondes), bouclier (protège d'un choc).
export interface Bonus { double: number; rapide: number; bouclier: boolean }
export const DUREE_BONUS = 12
const sansBonus = (): Bonus => ({ double: 0, rapide: 0, bouclier: false })
export const VIE_TOUS_LES = 5000 // une vie en plus tous les 5 000 points
export const VIES_MAX = 5

const POINTS: Record<TypeEnnemi, number> = { fusee: 50, reservoir: 150, mystere: 100, soucoupe: 100, comete: 0, base: 1000 }
const COULEUR: Record<TypeEnnemi, string> = { fusee: '#ff6b6b', reservoir: '#ffd84d', mystere: '#c58cff', soucoupe: '#5ad8ff', comete: '#ff9a5a', base: '#ffd84d' }

// Avance le jeu de dt secondes. Renvoie ce qui s'est passé (pour les sons).
export function pas(e: Etat, c: Commandes, dt: number): Evenement[] {
  const ev: Evenement[] = []
  e.t += dt
  for (const x of e.explosions) x.t += dt
  e.explosions = e.explosions.filter(x => x.t < 0.6)
  if (e.message && e.t - e.message.t > 2.2) e.message = null
  if (e.statut === 'mort') {
    e.mortDepuis += dt
    if (e.mortDepuis > 1.6) {
      if (e.vies <= 0) {
        e.statut = 'fin'
        ev.push({ type: 'fin' })
      } else {
        // On repart du début de la zone.
        const k = Math.floor((e.camera + e.joueur.x) / LONGUEUR_ZONE)
        e.camera = k * LONGUEUR_ZONE
        e.reliefs.delete(k) // la zone est reconstruite : tous ses ennemis reviennent
        e.joueur = { x: 28, y: 40, invincible: 2 }
        e.carburant = 100
        e.tirs = []
        e.bombes = []
        e.bonus = sansBonus()
        e.statut = 'jeu'
      }
    }
    return ev
  }
  if (e.statut !== 'jeu') return ev

  const avant = zoneDe(e.camera + e.joueur.x)
  e.camera += e.vitesse * dt
  const j = e.joueur
  j.invincible = Math.max(0, j.invincible - dt)
  e.bonus.double = Math.max(0, e.bonus.double - dt)
  e.bonus.rapide = Math.max(0, e.bonus.rapide - dt)
  j.x = Math.max(8, Math.min(LARGEUR * 0.62, j.x + c.dx * 62 * dt))
  j.y = Math.max(4, Math.min(HAUTEUR - 4, j.y + c.dy * 62 * dt))
  const zone = zoneDe(e.camera + j.x)
  if (zone !== avant) {
    e.message = { texte: ZONES[zone].nom, t: e.t }
    ev.push({ type: 'zone' })
  }

  // Carburant
  e.carburant = Math.max(0, e.carburant - dt * (3.6 + e.boucle * 0.4))

  // Tirs et bombes
  e.cadence -= dt
  if (c.tir && e.cadence <= 0 && e.tirs.length < (e.bonus.double || e.bonus.rapide ? 10 : 4)) {
    if (e.bonus.double) e.tirs.push({ x: e.camera + j.x + 4, y: j.y - 1.8 }, { x: e.camera + j.x + 4, y: j.y + 1.8 })
    else e.tirs.push({ x: e.camera + j.x + 6, y: j.y })
    e.cadence = e.bonus.rapide ? 0.085 : 0.17
    ev.push({ type: 'tir' })
  }
  if (c.bombe && e.bombes.length < 2 && !e.bombes.some(b => b.vy < 18)) {
    e.bombes.push({ x: e.camera + j.x, y: j.y + 2, vx: e.vitesse + 18, vy: 4 })
    ev.push({ type: 'bombe' })
  }
  const exploser = (x: number, y: number, taille: number, couleur: string) => e.explosions.push({ x, y, t: 0, taille, couleur })
  const proches = ennemisProches(e)
  const detruire = (n: Ennemi) => {
    n.mort = true
    exploser(n.x, n.y - 2, n.type === 'base' ? 14 : 6, COULEUR[n.type])
    let pts = POINTS[n.type]
    if (n.type === 'fusee' && n.vol) pts = 80
    if (n.type === 'mystere') {
      pts = 100
      // Une caisse « ? » donne un bonus au hasard.
      const r = Math.random()
      const b = r < 0.3 ? 'double' : r < 0.55 ? 'rapide' : r < 0.8 ? 'bouclier' : r < 0.92 || e.vies >= VIES_MAX ? 'plein' : 'vie'
      if (b === 'double') e.bonus.double = DUREE_BONUS
      else if (b === 'rapide') e.bonus.rapide = DUREE_BONUS
      else if (b === 'bouclier') e.bonus.bouclier = true
      else if (b === 'plein') e.carburant = 100
      else e.vies++
      const nom = { double: 'tir double', rapide: 'tir rapide', bouclier: 'bouclier', plein: 'plein de carburant', vie: 'une vie en plus' }[b]
      e.message = { texte: `Bonus : ${nom} !`, t: e.t }
      ev.push({ type: 'bonus' })
    }
    e.score += pts
    if (e.score >= e.prochaineVie) {
      e.prochaineVie += VIE_TOUS_LES
      if (e.vies < VIES_MAX) {
        e.vies++
        e.message = { texte: 'Une vie en plus !', t: e.t }
        ev.push({ type: 'vie' })
      }
    }
    if (n.type === 'reservoir') {
      e.carburant = Math.min(100, e.carburant + 28)
      ev.push({ type: 'plein' })
    } else if (n.type === 'base') {
      e.boucle++
      e.vitesse += 4
      e.message = { texte: 'Base détruite ! On repart, plus vite.', t: e.t }
      ev.push({ type: 'base' })
    } else ev.push({ type: 'explosion' })
  }
  // Boîtes de collision : demi-largeur et demi-hauteur, centrées un peu au-dessus de (x, y) pour les objets au sol.
  const boite = (n: Ennemi): [number, number, number, number] => {
    switch (n.type) {
      case 'fusee': return [n.x, n.y - 4, 2, 4]
      case 'reservoir': return [n.x, n.y - 3, 4, 3]
      case 'mystere': return [n.x, n.y - 3, 3.5, 3]
      case 'soucoupe': return [n.x, n.y, 5, 2.4]
      case 'comete': return [n.x, n.y, 3.5, 3]
      case 'base': return [n.x, n.y - 5, 12, 5]
    }
  }
  const touche = (n: Ennemi, x: number, y: number, marge = 0) => {
    const [bx, by, w, h] = boite(n)
    return Math.abs(x - bx) <= w + marge && Math.abs(y - by) <= h + marge
  }

  for (const t of e.tirs) t.x += 150 * dt
  e.tirs = e.tirs.filter(t => {
    if (t.x > e.camera + LARGEUR + 4) return false
    if (t.y >= solEn(e, t.x) || t.y <= plafondEn(e, t.x)) return false
    for (const n of proches) {
      if (n.mort || !touche(n, t.x, t.y, 1)) continue
      if (n.type === 'comete') return false // le tir ne peut rien contre une comète
      if (n.type === 'base') return false // la base ne se détruit qu'à la bombe
      detruire(n)
      return false
    }
    return true
  })
  for (const b of e.bombes) {
    b.vy += 70 * dt
    b.vx = Math.max(e.vitesse * 0.5, b.vx - 12 * dt)
    b.x += b.vx * dt
    b.y += b.vy * dt
  }
  e.bombes = e.bombes.filter(b => {
    const cible = proches.find(n => !n.mort && touche(n, b.x, b.y, 1.5))
    if (cible && cible.type !== 'comete') {
      detruire(cible)
      return false
    }
    if (b.y >= solEn(e, b.x) || b.y > HAUTEUR + 4 || b.y <= plafondEn(e, b.x)) {
      exploser(b.x, Math.min(b.y, solEn(e, b.x)), 4, '#ffb347')
      ev.push({ type: 'explosion', force: 0.5 })
      // Le souffle détruit ce qui est tout près.
      for (const n of proches) if (!n.mort && n.type !== 'comete' && touche(n, b.x, b.y - 2, 4)) detruire(n)
      return false
    }
    return true
  })

  // Les ennemis bougent.
  const xj = e.camera + j.x
  for (const n of proches) {
    if (n.mort) continue
    if (n.type === 'fusee') {
      if (!n.vol && n.x - xj < n.depart && n.x > xj - 10) n.vol = true
      if (n.vol) {
        n.vy = Math.max(-42, n.vy - 30 * dt)
        n.y += n.vy * dt
      }
    } else if (n.type === 'soucoupe') {
      n.phase += dt * 2.4
      n.x -= 10 * dt
      n.y += Math.cos(n.phase) * 22 * dt
    } else if (n.type === 'comete') {
      if (n.x - e.camera < LARGEUR + 30) n.x -= (55 + e.boucle * 8) * dt
    }
    // Une fusée ou une soucoupe qui sort de l'écran sans être détruite : elle t'a échappé.
    if ((n.type === 'fusee' || n.type === 'soucoupe') && (n.x < e.camera - 8 || n.y < -10)) {
      n.mort = true
      if (e.statut !== 'jeu') continue
      e.vies--
      e.message = { texte: n.type === 'fusee' ? 'Une fusée t’a échappé ! −1 vie' : 'Une soucoupe t’a échappé ! −1 vie', t: e.t }
      ev.push({ type: 'fuite' })
      if (e.vies <= 0) {
        e.statut = 'fin'
        ev.push({ type: 'fin' })
        return ev
      }
    }
  }

  // Le vaisseau touche-t-il quelque chose ?
  const mourir = () => {
    // Le bouclier encaisse le choc à ta place.
    if (e.bonus.bouclier && e.carburant > 0) {
      e.bonus.bouclier = false
      j.invincible = 1.6
      exploser(xj, j.y, 8, '#5ad8ff')
      e.message = { texte: 'Le bouclier t’a sauvé !', t: e.t }
      ev.push({ type: 'bouclier' })
      return
    }
    e.statut = 'mort'
    e.mortDepuis = 0
    e.vies--
    exploser(xj, j.y, 10, '#ffffff')
    ev.push({ type: 'mort' })
  }
  if (!j.invincible) {
    const coins: [number, number][] = [[-5, -1.5], [5, 0], [-5, 2], [0, 2.2], [3, -1]]
    if (coins.some(([dx, dy]) => j.y + dy >= solEn(e, xj + dx) || j.y + dy <= plafondEn(e, xj + dx))) mourir()
    else {
      const choc = proches.find(n => !n.mort && touche(n, xj, j.y, n.type === 'reservoir' || n.type === 'mystere' || n.type === 'base' ? 2 : 2.5))
      if (choc) {
        // Avec un bouclier, ce qu'on percute est détruit (sauf les comètes et la base).
        if (e.bonus.bouclier && choc.type !== 'comete' && choc.type !== 'base') detruire(choc)
        mourir()
      } else if (e.carburant <= 0) {
        e.message = { texte: 'Plus de carburant !', t: e.t }
        mourir()
      }
    }
  } else if (e.carburant <= 0) e.carburant = 1
  return ev
}
