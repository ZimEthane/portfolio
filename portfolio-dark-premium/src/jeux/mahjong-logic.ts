// Mahjong solitaire : retirer les tuiles par paires identiques. Une tuile est libre si rien n'est posé
// dessus et si son côté gauche ou son côté droit est dégagé.
// Les positions sont en demi-tuiles : une tuile occupe 2 × 2 unités (x, y) à l'étage z.

export interface Pos {
  x: number
  y: number
  z: number
}

function rect(x0: number, y0: number, cols: number, rows: number, z: number): Pos[] {
  const r: Pos[] = []
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) r.push({ x: (x0 + i) * 2, y: (y0 + j) * 2, z })
  return r
}

function tortue(): Pos[] {
  const p: Pos[] = []
  const rangee = (y: number, x0: number, n: number) => { for (let i = 0; i < n; i++) p.push({ x: (x0 + i) * 2, y: y * 2, z: 0 }) }
  rangee(0, 1, 12); rangee(1, 3, 8); rangee(2, 2, 10); rangee(3, 1, 12); rangee(4, 1, 12); rangee(5, 2, 10); rangee(6, 3, 8); rangee(7, 1, 12)
  p.push({ x: 0, y: 7, z: 0 }, { x: 26, y: 7, z: 0 }, { x: 28, y: 7, z: 0 })
  p.push(...rect(4, 1, 6, 6, 1), ...rect(5, 2, 4, 4, 2), ...rect(6, 3, 2, 2, 3))
  p.push({ x: 13, y: 7, z: 4 })
  return p
}

function tour(): Pos[] {
  // Haute et étroite : faite pour un téléphone tenu droit.
  return [...rect(0, 0, 6, 8, 0), ...rect(1, 1, 4, 6, 1), ...rect(2, 2, 2, 4, 2), ...rect(2, 3, 2, 2, 3)]
}

function pyramide(): Pos[] {
  return [...rect(0, 0, 6, 6, 0), ...rect(1, 1, 4, 4, 1), ...rect(2, 2, 2, 2, 2)]
}

export const DISPOSITIONS = [
  { id: 'tortue', nom: 'Tortue', info: '144 tuiles, le classique', pos: tortue() },
  { id: 'tour', nom: 'Tour', info: '84 tuiles, idéale sur téléphone', pos: tour() },
  { id: 'pyramide', nom: 'Pyramide', info: '56 tuiles, partie rapide', pos: pyramide() },
]

// Les familles de tuiles. Fleurs et saisons : deux fleurs (ou deux saisons) différentes vont ensemble.
export const SORTES: string[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `r${n}`), // ronds
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `b${n}`), // bambous
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `c${n}`), // caractères
  'vE', 'vS', 'vO', 'vN', // vents
  'dR', 'dV', 'dB', // dragons
]
export const famille = (t: string) => (t[0] === 'f' ? 'f' : t[0] === 's' ? 's' : t)
export const vont = (a: string, b: string) => famille(a) === famille(b)

export interface Tuile extends Pos {
  id: number
  t: string // sorte
}

const recouvre = (a: Pos, b: Pos) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2

export function libre(tuiles: Tuile[] | Pos[], i: number, presentes: boolean[]): boolean {
  const a = tuiles[i]
  let gauche = false
  let droite = false
  for (let k = 0; k < tuiles.length; k++) {
    if (k === i || !presentes[k]) continue
    const b = tuiles[k]
    if (b.z === a.z + 1 && recouvre(a, b)) return false // une tuile dessus
    if (b.z === a.z && Math.abs(b.y - a.y) < 2) {
      if (b.x === a.x - 2) gauche = true
      if (b.x === a.x + 2) droite = true
    }
  }
  return !(gauche && droite)
}

// Ordre de retrait au hasard (deux tuiles libres à la fois) : il garantit qu'une solution existe.
function ordreRetrait(pos: Pos[], random: () => number): [number, number][] | null {
  const presentes = pos.map(() => true)
  const ordre: [number, number][] = []
  for (let n = pos.length; n > 0; n -= 2) {
    const libres = pos.map((_, i) => i).filter(i => presentes[i] && libre(pos, i, presentes))
    if (libres.length < 2) return null
    // On préfère les tuiles hautes, pour ne pas bloquer le centre.
    libres.sort((a, b) => pos[b].z - pos[a].z + (random() - 0.5) * 1.5)
    const a = libres[0]
    const reste = libres.slice(1)
    const b = reste[Math.floor(random() * reste.length)]
    presentes[a] = false
    presentes[b] = false
    ordre.push([a, b])
  }
  return ordre
}

// Les sortes à distribuer : par paires, en piochant dans toutes les familles.
function paires(nbPaires: number, random: () => number): [string, string][] {
  const toutes: [string, string][] = []
  for (const s of SORTES) toutes.push([s, s], [s, s])
  toutes.push(['f1', 'f2'], ['f3', 'f4'], ['s1', 's2'], ['s3', 's4'])
  for (let i = toutes.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[toutes[i], toutes[j]] = [toutes[j], toutes[i]]
  }
  if (nbPaires <= toutes.length) return toutes.slice(0, nbPaires)
  return Array.from({ length: nbPaires }, (_, k) => toutes[k % toutes.length])
}

export function distribuer(pos: Pos[], random: () => number = Math.random, sortes?: [string, string][]): Tuile[] {
  for (let essai = 0; essai < 200; essai++) {
    const ordre = ordreRetrait(pos, random)
    if (!ordre) continue
    const ps = sortes ?? paires(ordre.length, random)
    const tuiles: Tuile[] = pos.map((p, id) => ({ ...p, id, t: '' }))
    ordre.forEach(([a, b], k) => {
      tuiles[a].t = ps[k][0]
      tuiles[b].t = ps[k][1]
    })
    return tuiles
  }
  throw new Error('distribution impossible')
}

// Mélange les tuiles restantes sur leurs places, en gardant une solution.
export function melanger(tuiles: Tuile[], presentes: boolean[], random: () => number = Math.random): Tuile[] {
  const idx = tuiles.map((_, i) => i).filter(i => presentes[i])
  const pos = idx.map(i => tuiles[i])
  // Reconstitue les paires à partir des sortes restantes.
  const restantes = idx.map(i => tuiles[i].t)
  const parFamille = new Map<string, string[]>()
  for (const t of restantes) {
    const f = famille(t)
    parFamille.set(f, [...(parFamille.get(f) ?? []), t])
  }
  const ps: [string, string][] = []
  for (const l of parFamille.values()) for (let k = 0; k + 1 < l.length; k += 2) ps.push([l[k], l[k + 1]])
  for (let i = ps.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[ps[i], ps[j]] = [ps[j], ps[i]]
  }
  const nouvelles = distribuer(pos, random, ps)
  const r = tuiles.slice()
  idx.forEach((i, k) => (r[i] = { ...tuiles[i], t: nouvelles[k].t }))
  return r
}

// Une paire jouable (pour l'indice, et pour savoir si l'on est bloqué).
export function pairePossible(tuiles: Tuile[], presentes: boolean[]): [number, number] | null {
  const libres = tuiles.map((_, i) => i).filter(i => presentes[i] && libre(tuiles, i, presentes))
  for (let a = 0; a < libres.length; a++) for (let b = a + 1; b < libres.length; b++) if (vont(tuiles[libres[a]].t, tuiles[libres[b]].t)) return [libres[a], libres[b]]
  return null
}
