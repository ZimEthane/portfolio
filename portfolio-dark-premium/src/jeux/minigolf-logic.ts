// Mini-golf : 9 trous vus de dessus. On tire la balle en tirant vers l'arrière (comme un lance-pierre).
// Monde en unités : 100 de large × 160 de haut.

export interface P { x: number; y: number }
export interface Trou {
  nom: string
  par: number
  bord: P[] // contour du parcours (polygone fermé)
  obstacles: P[][] // blocs (polygones fermés)
  bumpers: { x: number; y: number; r: number }[]
  sable: { x: number; y: number; w: number; h: number }[]
  eau: { x: number; y: number; w: number; h: number }[]
  pentes: { x: number; y: number; w: number; h: number; fx: number; fy: number }[]
  moulin?: { x: number; y: number; long: number; vitesse: number } // pale qui tourne autour de (x, y)
  depart: P
  trou: P
}

const rect = (x: number, y: number, w: number, h: number): P[] => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]
const base = { obstacles: [], bumpers: [], sable: [], eau: [], pentes: [] }

export const TROUS: Trou[] = [
  { ...base, nom: 'Tout droit', par: 2, bord: rect(28, 12, 44, 138), depart: { x: 50, y: 132 }, trou: { x: 50, y: 32 } },
  { ...base, nom: 'Le virage', par: 3, bord: [{ x: 12, y: 150 }, { x: 12, y: 60 }, { x: 52, y: 14 }, { x: 90, y: 14 }, { x: 90, y: 52 }, { x: 48, y: 52 }, { x: 44, y: 70 }, { x: 44, y: 150 }], depart: { x: 28, y: 136 }, trou: { x: 76, y: 32 } },
  { ...base, nom: 'Le bloc', par: 2, bord: rect(18, 12, 64, 140), obstacles: [rect(36, 68, 28, 18)], depart: { x: 50, y: 136 }, trou: { x: 50, y: 34 } },
  { ...base, nom: 'Le flipper', par: 3, bord: rect(12, 12, 76, 140), bumpers: [{ x: 32, y: 60, r: 6 }, { x: 68, y: 60, r: 6 }, { x: 50, y: 82, r: 7 }, { x: 30, y: 104, r: 5 }, { x: 70, y: 104, r: 5 }], depart: { x: 50, y: 136 }, trou: { x: 50, y: 30 } },
  { ...base, nom: 'Le bunker', par: 3, bord: [{ x: 14, y: 150 }, { x: 14, y: 14 }, { x: 86, y: 14 }, { x: 86, y: 150 }], sable: [{ x: 14, y: 48, w: 72, h: 24 }], obstacles: [rect(14, 90, 44, 8)], depart: { x: 72, y: 136 }, trou: { x: 34, y: 28 } },
  { ...base, nom: 'L’étang', par: 3, bord: rect(12, 12, 76, 140), eau: [{ x: 12, y: 62, w: 48, h: 30 }, { x: 76, y: 62, w: 12, h: 30 }], depart: { x: 30, y: 134 }, trou: { x: 34, y: 30 } },
  { ...base, nom: 'La pente', par: 3, bord: rect(16, 12, 68, 140), pentes: [{ x: 16, y: 52, w: 68, h: 46, fx: 20, fy: 0 }], obstacles: [rect(62, 22, 22, 6)], depart: { x: 50, y: 134 }, trou: { x: 28, y: 30 } },
  { ...base, nom: 'Le moulin', par: 3, bord: rect(20, 12, 60, 140), obstacles: [rect(20, 58, 22, 10), rect(58, 58, 22, 10)], moulin: { x: 50, y: 63, long: 13, vitesse: 1.6 }, depart: { x: 50, y: 136 }, trou: { x: 50, y: 30 } },
  { ...base, nom: 'Le serpent', par: 4, bord: rect(10, 12, 80, 140), obstacles: [rect(10, 104, 58, 8), rect(32, 70, 58, 8), rect(10, 36, 58, 8)], bumpers: [{ x: 80, y: 52, r: 4 }], depart: { x: 24, y: 136 }, trou: { x: 24, y: 22 } },
]

export const RAYON = 2.1
export const RAYON_TROU = 3.4
const RESTITUTION = 0.72
export const VITESSE_MAX = 150 // unités par seconde (tir le plus fort)

export interface Balle { x: number; y: number; vx: number; vy: number }
export type Issue = 'roule' | 'arret' | 'dans le trou' | 'eau'

const dedans = (p: P, z: { x: number; y: number; w: number; h: number }) => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h

function segments(t: Trou, temps: number): [P, P][] {
  const s: [P, P][] = []
  const poly = (pts: P[]) => pts.forEach((a, k) => s.push([a, pts[(k + 1) % pts.length]]))
  poly(t.bord)
  t.obstacles.forEach(poly)
  if (t.moulin) {
    const a = temps * t.moulin.vitesse
    for (const k of [0, Math.PI / 2]) {
      const dx = Math.cos(a + k) * t.moulin.long
      const dy = Math.sin(a + k) * t.moulin.long
      s.push([{ x: t.moulin.x - dx, y: t.moulin.y - dy }, { x: t.moulin.x + dx, y: t.moulin.y + dy }])
    }
  }
  return s
}
export const pales = (t: Trou, temps: number) => (t.moulin ? segments({ ...t, bord: [], obstacles: [] }, temps) : [])

// Rebond sur un segment : on repousse la balle hors du mur et on renvoie la vitesse.
function rebondSegment(b: Balle, a: P, c: P): boolean {
  const ex = c.x - a.x
  const ey = c.y - a.y
  const l2 = ex * ex + ey * ey
  const t = Math.max(0, Math.min(1, ((b.x - a.x) * ex + (b.y - a.y) * ey) / l2))
  const px = a.x + ex * t
  const py = a.y + ey * t
  const dx = b.x - px
  const dy = b.y - py
  const d = Math.hypot(dx, dy)
  if (d >= RAYON || d === 0) return false
  const nx = dx / d
  const ny = dy / d
  b.x = px + nx * RAYON
  b.y = py + ny * RAYON
  const vn = b.vx * nx + b.vy * ny
  if (vn < 0) {
    b.vx -= (1 + RESTITUTION) * vn * nx
    b.vy -= (1 + RESTITUTION) * vn * ny
  }
  return true
}

export interface Pas { balle: Balle; issue: Issue; choc: number } // choc : force du plus gros rebond (pour le son)

export function avancer(t: Trou, b0: Balle, dt: number, temps: number): Pas {
  const b = { ...b0 }
  let choc = 0
  const v0 = Math.hypot(b.vx, b.vy)
  const n = Math.max(1, Math.ceil((v0 * dt) / (RAYON * 0.5)))
  const h = dt / n
  for (let k = 0; k < n; k++) {
    // Pentes : une force constante.
    for (const p of t.pentes) if (dedans(b, p)) { b.vx += p.fx * h; b.vy += p.fy * h }
    // Frottement : herbe, ou sable (beaucoup plus).
    const sable = t.sable.some(z => dedans(b, z))
    const v = Math.hypot(b.vx, b.vy)
    if (v > 0) {
      const decel = (sable ? 150 : 24) * h + v * (sable ? 3 : 0.55) * h
      const nv = Math.max(0, v - decel)
      b.vx *= nv / v
      b.vy *= nv / v
    }
    b.x += b.vx * h
    b.y += b.vy * h
    for (const [a, c] of segments(t, temps + k * h)) {
      const avant = Math.hypot(b.vx, b.vy)
      if (rebondSegment(b, a, c)) choc = Math.max(choc, avant)
    }
    for (const bp of t.bumpers) {
      const dx = b.x - bp.x
      const dy = b.y - bp.y
      const d = Math.hypot(dx, dy)
      if (d < bp.r + RAYON && d > 0) {
        const nx = dx / d
        const ny = dy / d
        b.x = bp.x + nx * (bp.r + RAYON)
        b.y = bp.y + ny * (bp.r + RAYON)
        const vn = b.vx * nx + b.vy * ny
        if (vn < 0) {
          // Les champignons renvoient la balle plus fort.
          b.vx -= 2.15 * vn * nx
          b.vy -= 2.15 * vn * ny
          choc = Math.max(choc, -vn * 1.4)
        }
      }
    }
    // Le trou : la balle tombe si elle passe dessus assez doucement.
    const dt2 = Math.hypot(b.x - t.trou.x, b.y - t.trou.y)
    const vit = Math.hypot(b.vx, b.vy)
    if (dt2 < RAYON_TROU - 0.6 && vit < 62) return { balle: { ...b, x: t.trou.x, y: t.trou.y, vx: 0, vy: 0 }, issue: 'dans le trou', choc }
    if (dt2 < RAYON_TROU && vit < 62) {
      // Attirée vers le centre quand elle frôle le trou.
      b.vx += (t.trou.x - b.x) * 40 * h
      b.vy += (t.trou.y - b.y) * 40 * h
    }
    if (t.eau.some(z => dedans(b, z))) return { balle: b, issue: 'eau', choc }
  }
  if (Math.hypot(b.vx, b.vy) < 1.2) return { balle: { ...b, vx: 0, vy: 0 }, issue: 'arret', choc }
  return { balle: b, issue: 'roule', choc }
}

// Pour vérifier les trous : un tir donné finit-il dans le trou ? (utilisé par les tests)
export function simuler(t: Trou, depart: P, angle: number, force: number, max = 20): { issue: Issue; fin: P } {
  let b: Balle = { x: depart.x, y: depart.y, vx: Math.cos(angle) * force * VITESSE_MAX, vy: Math.sin(angle) * force * VITESSE_MAX }
  let temps = 0
  for (let k = 0; k < max * 120; k++) {
    const r = avancer(t, b, 1 / 120, temps)
    temps += 1 / 120
    b = r.balle
    if (r.issue !== 'roule') return { issue: r.issue, fin: b }
  }
  return { issue: 'arret', fin: b }
}
