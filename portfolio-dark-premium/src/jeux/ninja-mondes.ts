// Les mondes du jeu du ninja : ciel, décor qui défile, sol, et apparence des obstacles.
// Inspirés de l'idée de « dimensions » et de biomes, avec des décors originaux.
import { BAISSE, MONDE_L, NINJA_X, SOL } from './ninja-logic'
import type { Etat, Obstacle } from './ninja-logic'

type Ctx = CanvasRenderingContext2D
type Forme = 'rocher' | 'souche' | 'cactus' | 'pics' | 'plante' | 'bambou' | 'lanterne' | 'flamme' | 'cristal'
type Vol = 'oiseau' | 'chouette' | 'perroquet' | 'shuriken' | 'boule' | 'orbe'

export interface Monde {
  nom: string
  ciel: [string, string]
  sol: string
  terre: string
  petit: Forme
  grand: Forme
  vol: Vol
  couleur: string // couleur des obstacles au sol
  decor: (ctx: Ctx, d: number, t: number) => void
}

const H = 150
// Position qui boucle, pour un décor qui défile à une vitesse « f » (parallaxe).
const boucle = (x: number, d: number, f: number, largeur = MONDE_L + 120) => ((((x - d * f) % largeur) + largeur) % largeur) - 60

function collines(ctx: Ctx, d: number, f: number, couleur: string, haut: number, amp: number) {
  ctx.fillStyle = couleur
  ctx.beginPath()
  ctx.moveTo(0, SOL)
  for (let x = 0; x <= MONDE_L; x += 10) ctx.lineTo(x, haut - Math.sin((x + d * f) / 70) * amp - Math.sin((x + d * f) / 23) * amp * 0.3)
  ctx.lineTo(MONDE_L, SOL)
  ctx.fill()
}
function nuages(ctx: Ctx, d: number, couleur = '#ffffff12') {
  ctx.fillStyle = couleur
  for (const [x0, y, w] of [[80, 26, 46], [330, 16, 60], [520, 40, 38]]) {
    const x = boucle(x0, d, 0.12)
    ctx.beginPath(); ctx.roundRect(x, y, w, 11, 6); ctx.fill()
  }
}
function etoiles(ctx: Ctx, d: number, t: number) {
  for (let i = 0; i < 40; i++) {
    const x = boucle((i * 97) % MONDE_L, d, 0.04)
    const y = (i * 37) % 95
    ctx.fillStyle = `rgba(230, 220, 255, ${0.25 + 0.35 * Math.abs(Math.sin(t * 1.5 + i))})`
    ctx.fillRect(x, y, 1.6, 1.6)
  }
}

export const MONDES: Monde[] = [
  {
    nom: 'Plaine', ciel: ['#10233a', '#24476a'], sol: '#5fbf6a', terre: '#1b2a1e', petit: 'rocher', grand: 'rocher', vol: 'oiseau', couleur: '#8d95a6',
    decor: (ctx, d) => { nuages(ctx, d); collines(ctx, d, 0.15, '#1e3b2c', 104, 10); collines(ctx, d, 0.3, '#24503a', 118, 6) },
  },
  {
    nom: 'Forêt', ciel: ['#0b1a14', '#18352a'], sol: '#3f8a52', terre: '#132018', petit: 'souche', grand: 'souche', vol: 'oiseau', couleur: '#a0724a',
    decor: (ctx, d) => {
      for (const [f, c, hmax] of [[0.15, '#143024', 60], [0.32, '#1b4230', 44]] as const) {
        ctx.fillStyle = c
        for (let i = 0; i < 16; i++) {
          const x = boucle(i * 45, d, f)
          const h = hmax - (i % 3) * 9
          ctx.beginPath(); ctx.moveTo(x, SOL); ctx.lineTo(x + 14, SOL - h); ctx.lineTo(x + 28, SOL); ctx.fill()
        }
      }
    },
  },
  {
    nom: 'Désert', ciel: ['#2a160c', '#6a3f1e'], sol: '#e8be70', terre: '#3b2a16', petit: 'cactus', grand: 'cactus', vol: 'oiseau', couleur: '#6fd59a',
    decor: (ctx, d) => {
      ctx.fillStyle = '#ffcf7a55'; ctx.beginPath(); ctx.arc(470, 40, 18, 0, Math.PI * 2); ctx.fill()
      const px = boucle(250, d, 0.1, MONDE_L + 300)
      ctx.fillStyle = '#5a3a1e'; ctx.beginPath(); ctx.moveTo(px, SOL - 14); ctx.lineTo(px + 40, SOL - 58); ctx.lineTo(px + 80, SOL - 14); ctx.fill()
      collines(ctx, d, 0.2, '#7a5228', 116, 8)
    },
  },
  {
    nom: 'Banquise', ciel: ['#0e2233', '#2b5674'], sol: '#e6f6ff', terre: '#8fbcd6', petit: 'pics', grand: 'pics', vol: 'chouette', couleur: '#bfe8ff',
    decor: (ctx, d, t) => {
      ctx.fillStyle = '#4f7f9e'
      for (let i = 0; i < 6; i++) {
        const x = boucle(i * 120, d, 0.18)
        ctx.beginPath(); ctx.moveTo(x, SOL); ctx.lineTo(x + 18, SOL - 30 - (i % 2) * 12); ctx.lineTo(x + 38, SOL - 22); ctx.lineTo(x + 52, SOL); ctx.fill()
      }
      ctx.fillStyle = '#ffffffb0'
      for (let i = 0; i < 30; i++) ctx.fillRect(boucle(i * 41, d, 0.5) + Math.sin(t + i) * 4, (i * 29 + t * 30) % SOL, 2, 2)
    },
  },
  {
    nom: 'Jungle', ciel: ['#08190f', '#14402a'], sol: '#4caf50', terre: '#16301e', petit: 'plante', grand: 'plante', vol: 'perroquet', couleur: '#7be08a',
    decor: (ctx, d) => {
      for (let i = 0; i < 9; i++) {
        const x = boucle(i * 75, d, 0.22)
        ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, SOL); ctx.quadraticCurveTo(x + 6, SOL - 40, x + 2, SOL - 70); ctx.stroke()
        ctx.fillStyle = '#1f6b3a'
        for (const a of [-2.4, -1.6, -0.8, -0.2]) {
          ctx.beginPath(); ctx.ellipse(x + 2 + Math.cos(a) * 16, SOL - 70 + Math.sin(a) * 10, 18, 5, a, 0, Math.PI * 2); ctx.fill()
        }
      }
    },
  },
  {
    nom: 'Japon', ciel: ['#24122e', '#6a2c4f'], sol: '#e7a3b8', terre: '#2a1824', petit: 'bambou', grand: 'lanterne', vol: 'shuriken', couleur: '#79c27a',
    decor: (ctx, d, t) => {
      ctx.fillStyle = '#ff6b6b55'; ctx.beginPath(); ctx.arc(150, 46, 20, 0, Math.PI * 2); ctx.fill()
      const fx = boucle(380, d, 0.06, MONDE_L + 400)
      ctx.fillStyle = '#3a2440'; ctx.beginPath(); ctx.moveTo(fx - 90, SOL); ctx.lineTo(fx - 18, SOL - 72); ctx.lineTo(fx + 18, SOL - 72); ctx.lineTo(fx + 90, SOL); ctx.fill()
      ctx.fillStyle = '#f2e6ee'; ctx.beginPath(); ctx.moveTo(fx - 18, SOL - 72); ctx.lineTo(fx + 18, SOL - 72); ctx.lineTo(fx + 28, SOL - 60); ctx.lineTo(fx + 10, SOL - 64); ctx.lineTo(fx - 4, SOL - 58); ctx.lineTo(fx - 28, SOL - 60); ctx.fill()
      const tx = boucle(120, d, 0.25, MONDE_L + 260)
      ctx.fillStyle = '#c0392b'
      ctx.fillRect(tx, SOL - 46, 5, 46); ctx.fillRect(tx + 36, SOL - 46, 5, 46)
      ctx.fillRect(tx - 8, SOL - 48, 57, 5); ctx.fillRect(tx - 2, SOL - 38, 45, 4)
      ctx.fillStyle = '#ffc1d6'
      for (let i = 0; i < 18; i++) ctx.fillRect(boucle(i * 63, d, 0.45) + Math.sin(t * 2 + i) * 6, (i * 23 + t * 22) % SOL, 3, 2)
    },
  },
  {
    nom: 'Monde de lave', ciel: ['#140303', '#4a0f08'], sol: '#ff7a2a', terre: '#2a0905', petit: 'flamme', grand: 'flamme', vol: 'boule', couleur: '#ff8a3c',
    decor: (ctx, d, t) => {
      ctx.fillStyle = '#2a0b07'
      for (let i = 0; i < 10; i++) {
        const x = boucle(i * 66, d, 0.2)
        ctx.beginPath(); ctx.moveTo(x, SOL); ctx.lineTo(x + 10, SOL - 50 - (i % 3) * 12); ctx.lineTo(x + 22, SOL - 30); ctx.lineTo(x + 34, SOL - 60 + (i % 2) * 10); ctx.lineTo(x + 48, SOL); ctx.fill()
      }
      for (let i = 0; i < 22; i++) {
        ctx.fillStyle = `rgba(255, ${140 + (i % 4) * 25}, 60, ${0.5 + 0.4 * Math.sin(t * 3 + i)})`
        ctx.fillRect(boucle(i * 31, d, 0.4) + Math.sin(t + i) * 5, SOL - ((t * 40 + i * 17) % SOL), 2, 2)
      }
    },
  },
  {
    nom: 'Monde du vide', ciel: ['#04020b', '#170c2b'], sol: '#cdb8ff', terre: '#120a22', petit: 'cristal', grand: 'cristal', vol: 'orbe', couleur: '#b79bff',
    decor: (ctx, d, t) => {
      etoiles(ctx, d, t)
      for (let i = 0; i < 4; i++) {
        const x = boucle(i * 170 + 40, d, 0.1)
        const y = 34 + (i % 2) * 26 + Math.sin(t + i) * 3
        ctx.fillStyle = '#3b2a5e'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 50, y); ctx.lineTo(x + 34, y + 16); ctx.lineTo(x + 16, y + 16); ctx.fill()
        ctx.fillStyle = '#cdb8ff'; ctx.fillRect(x, y - 2, 50, 3)
      }
    },
  },
]

// Ciel, décor et sol d'un monde (alpha < 1 pendant le fondu vers le monde suivant).
export function dessinerMonde(ctx: Ctx, m: Monde, d: number, t: number, alpha = 1) {
  ctx.globalAlpha = alpha
  const g = ctx.createLinearGradient(0, 0, 0, SOL)
  g.addColorStop(0, m.ciel[0])
  g.addColorStop(1, m.ciel[1])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, MONDE_L, H)
  m.decor(ctx, d, t)
  ctx.fillStyle = m.terre
  ctx.fillRect(0, SOL, MONDE_L, H - SOL)
  ctx.fillStyle = m.sol
  ctx.fillRect(0, SOL, MONDE_L, 2.5)
  ctx.fillStyle = '#ffffff18'
  for (let i = 0; i < 24; i++) ctx.fillRect(((i * 53 - d) % MONDE_L + MONDE_L) % MONDE_L, SOL + 6 + (i % 3) * 3, 3 + (i % 4), 1.5)
  ctx.globalAlpha = 1
}

function forme(ctx: Ctx, f: Forme, x: number, y: number, w: number, h: number, c: string, t: number) {
  ctx.fillStyle = c
  switch (f) {
    case 'rocher':
      ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w * 0.1, y + h * 0.35); ctx.lineTo(x + w * 0.45, y); ctx.lineTo(x + w * 0.85, y + h * 0.2); ctx.lineTo(x + w, y + h); ctx.fill()
      ctx.fillStyle = '#ffffff22'; ctx.beginPath(); ctx.moveTo(x + w * 0.45, y + 3); ctx.lineTo(x + w * 0.7, y + h * 0.25); ctx.lineTo(x + w * 0.45, y + h * 0.4); ctx.fill()
      return
    case 'souche':
      ctx.beginPath(); ctx.roundRect(x + 1, y + 4, w - 2, h - 4, 3); ctx.fill()
      ctx.fillStyle = '#d9b38a'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + 5, w / 2 - 1, 4, 0, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#a0724a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + w / 2, y + 5, w / 4, 2, 0, 0, Math.PI * 2); ctx.stroke()
      return
    case 'cactus': {
      const tronc = w * 0.42
      ctx.beginPath(); ctx.roundRect(x + (w - tronc) / 2, y, tronc, h, tronc / 2); ctx.fill()
      ctx.beginPath(); ctx.roundRect(x, y + h * 0.3, tronc * 0.8, h * 0.32, 3); ctx.fill()
      ctx.beginPath(); ctx.roundRect(x + w - tronc * 0.8, y + h * 0.18, tronc * 0.8, h * 0.3, 3); ctx.fill()
      return
    }
    case 'pics':
      ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w * 0.3, y); ctx.lineTo(x + w * 0.5, y + h * 0.5); ctx.lineTo(x + w * 0.72, y + h * 0.15); ctx.lineTo(x + w, y + h); ctx.fill()
      ctx.fillStyle = '#ffffff70'; ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + 2); ctx.lineTo(x + w * 0.38, y + h * 0.6); ctx.lineTo(x + w * 0.26, y + h * 0.6); ctx.fill()
      return
    case 'plante':
      ctx.fillRect(x + w / 2 - 1.5, y + h * 0.3, 3, h * 0.7)
      for (const [dy, s] of [[0.3, -1], [0.5, 1], [0.7, -1], [0.15, 1]] as const) {
        ctx.beginPath(); ctx.ellipse(x + w / 2 + s * w * 0.28, y + h * dy, w * 0.32, 4, s * 0.5, 0, Math.PI * 2); ctx.fill()
      }
      return
    case 'bambou':
      for (const [dx, hh] of [[0.12, 1], [0.45, 0.8], [0.75, 0.92]] as const) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x + w * dx, y + h * (1 - hh), w * 0.2, h * hh, 2); ctx.fill()
        ctx.fillStyle = '#2f6b3f'; for (let k = 1; k < 3; k++) ctx.fillRect(x + w * dx, y + h * (1 - hh) + h * hh * k / 3, w * 0.2, 1.5)
      }
      return
    case 'lanterne':
      ctx.fillStyle = '#b9b2a8'
      ctx.fillRect(x + w * 0.15, y + h - 6, w * 0.7, 6) // socle
      ctx.fillRect(x + w * 0.38, y + h * 0.45, w * 0.24, h * 0.45) // pied
      ctx.fillStyle = '#ffd36b'; ctx.fillRect(x + w * 0.22, y + h * 0.22, w * 0.56, h * 0.24) // lumière
      ctx.fillStyle = '#8f877c'; ctx.beginPath(); ctx.moveTo(x - 1, y + h * 0.24); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w + 1, y + h * 0.24); ctx.fill() // toit
      return
    case 'flamme': {
      const v = Math.sin(t * 12 + x) * 2
      ctx.beginPath(); ctx.moveTo(x + w / 2 + v, y); ctx.quadraticCurveTo(x + w + 2, y + h * 0.55, x + w * 0.8, y + h); ctx.lineTo(x + w * 0.2, y + h); ctx.quadraticCurveTo(x - 2, y + h * 0.55, x + w / 2 + v, y); ctx.fill()
      ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(x + w / 2 - v / 2, y + h * 0.4); ctx.quadraticCurveTo(x + w * 0.8, y + h * 0.75, x + w * 0.65, y + h); ctx.lineTo(x + w * 0.35, y + h); ctx.quadraticCurveTo(x + w * 0.2, y + h * 0.75, x + w / 2 - v / 2, y + h * 0.4); ctx.fill()
      return
    }
    case 'cristal':
      ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + h); ctx.lineTo(x + w * 0.1, y + h * 0.35); ctx.lineTo(x + w * 0.45, y); ctx.lineTo(x + w * 0.8, y + h * 0.3); ctx.lineTo(x + w * 0.85, y + h); ctx.fill()
      ctx.fillStyle = '#ffffff55'; ctx.beginPath(); ctx.moveTo(x + w * 0.45, y + 2); ctx.lineTo(x + w * 0.55, y + h * 0.6); ctx.lineTo(x + w * 0.4, y + h * 0.6); ctx.fill()
      return
  }
}

function volant(ctx: Ctx, v: Vol, o: Obstacle, t: number) {
  const { x, y } = o
  const aile = Math.floor(t * 6) % 2
  const oiseau = (corps: string, ailes: string) => {
    ctx.fillStyle = corps
    ctx.beginPath(); ctx.roundRect(x + 8, y + 12, 30, 10, 5); ctx.fill()
    ctx.beginPath(); ctx.moveTo(x + 8, y + 14); ctx.lineTo(x - 2, y + 18); ctx.lineTo(x + 8, y + 20); ctx.fill()
    ctx.fillStyle = ailes
    ctx.beginPath()
    if (aile) { ctx.moveTo(x + 16, y + 13); ctx.lineTo(x + 30, y); ctx.lineTo(x + 34, y + 13) } else { ctx.moveTo(x + 16, y + 21); ctx.lineTo(x + 30, y + 30); ctx.lineTo(x + 34, y + 21) }
    ctx.fill()
    ctx.fillStyle = '#1a1208'; ctx.beginPath(); ctx.arc(x + 12, y + 15, 1.6, 0, Math.PI * 2); ctx.fill()
  }
  switch (v) {
    case 'oiseau': return oiseau('#ffb36b', '#e8964e')
    case 'perroquet': return oiseau('#ff5a5a', '#4d8cff')
    case 'chouette':
      ctx.fillStyle = '#f4f8ff'; ctx.beginPath(); ctx.ellipse(x + 23, y + 16, 12, 11, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#dbe7f5'; ctx.beginPath(); ctx.ellipse(x + 23, y + (aile ? 8 : 24), 22, 4, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#1a2230'; ctx.beginPath(); ctx.arc(x + 18, y + 14, 2, 0, Math.PI * 2); ctx.arc(x + 27, y + 14, 2, 0, Math.PI * 2); ctx.fill()
      return
    case 'shuriken': {
      ctx.save(); ctx.translate(x + 23, y + 15); ctx.rotate(t * 10)
      ctx.fillStyle = '#d6dde8'
      ctx.beginPath()
      for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.moveTo(0, -3); ctx.lineTo(13, 0); ctx.lineTo(0, 3) }
      ctx.fill()
      ctx.fillStyle = '#24122e'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      return
    }
    case 'boule':
      ctx.fillStyle = '#ff7a2a55'; ctx.beginPath(); ctx.ellipse(x + 34, y + 15, 14, 7, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#ff8a3c'; ctx.beginPath(); ctx.arc(x + 18, y + 15, 11, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(x + 15, y + 14, 5 + Math.sin(t * 15), 0, Math.PI * 2); ctx.fill()
      return
    case 'orbe':
      ctx.shadowColor = '#c9b0ff'; ctx.shadowBlur = 12
      ctx.fillStyle = '#b79bff'; ctx.beginPath(); ctx.arc(x + 23, y + 15, 11, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#efe6ff'; ctx.beginPath(); ctx.arc(x + 23, y + 15, 4 + Math.sin(t * 6), 0, Math.PI * 2); ctx.fill()
      return
  }
}

export function dessinerObstacle(ctx: Ctx, o: Obstacle, t: number) {
  const m = MONDES[o.m]
  if (o.sorte === 'vol') return volant(ctx, m.vol, o, t)
  const grand = o.sorte === 'grand'
  const w = grand ? 25 : 17
  for (let k = 0; k < o.n; k++) forme(ctx, grand ? m.grand : m.petit, o.x + k * (w + 3), o.y, w, o.h, m.couleur, t)
}

// Petit ninja original : tenue sombre, bandeau rouge qui flotte, katana dans le dos.
export function dessinerNinja(ctx: CanvasRenderingContext2D, e: Etat, mort: boolean) {
  const x = NINJA_X
  const baisse = e.baisse && e.auSol && !mort
  const course = Math.floor(e.t * 10) % 2
  const vent = Math.sin(e.t * 18) * 2
  const tenue = '#1c2740'
  ctx.shadowColor = '#ffffff70' // halo clair : le ninja reste visible dans tous les mondes
  ctx.shadowBlur = 4
  if (baisse) {
    const y = SOL - BAISSE.h
    ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.moveTo(x + 40, y + 6); ctx.quadraticCurveTo(x + 20, y + 2 + vent, x + 4, y + 4 - vent); ctx.stroke()
    ctx.fillStyle = tenue
    ctx.beginPath(); ctx.roundRect(x + 4, y + 9, 36, 13, 6); ctx.fill() // corps en glissade
    ctx.fillRect(x - 4, y + 18, 14, 5) // jambe tendue
    ctx.beginPath(); ctx.arc(x + 45, y + 11, 9, 0, Math.PI * 2); ctx.fill() // tête
    ctx.shadowBlur = 0
    ctx.fillStyle = '#f2d3b3'; ctx.fillRect(x + 40, y + 8, 13, 5)
    ctx.fillStyle = '#ff4d4d'; ctx.fillRect(x + 37, y + 3, 15, 3)
    ctx.fillStyle = '#0b0e12'; ctx.fillRect(x + 46, y + 9, 2, 3); ctx.fillRect(x + 50, y + 9, 2, 3)
    return
  }
  const y = e.y
  const enLair = !e.auSol
  // Bandeau qui flotte derrière la tête.
  ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(x + 15, y + 6); ctx.quadraticCurveTo(x + 4, y + 2 + vent, x - 6, y + 6 - vent); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 15, y + 8); ctx.quadraticCurveTo(x + 6, y + 10 - vent, x - 3, y + 13 + vent); ctx.stroke()
  // Katana dans le dos.
  ctx.strokeStyle = '#c9a27a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + 13, y + 30); ctx.lineTo(x + 6, y + 14); ctx.stroke()
  ctx.fillStyle = tenue
  ctx.beginPath(); ctx.roundRect(x + 12, y + 18, 22, 18, 7); ctx.fill() // corps
  ctx.beginPath(); ctx.arc(x + 24, y + 11, 10.5, 0, Math.PI * 2); ctx.fill() // tête
  // Bras et jambes (repliés en l'air).
  ctx.fillRect(x + 28, y + 22, 9, 4)
  if (enLair) {
    ctx.fillRect(x + 13, y + 34, 7, 6); ctx.fillRect(x + 24, y + 34, 7, 6)
  } else {
    ctx.fillRect(x + (course ? 12 : 15), y + 34, 6, 10); ctx.fillRect(x + (course ? 25 : 22), y + 34, 6, 10)
  }
  ctx.shadowBlur = 0
  ctx.fillStyle = '#ff4d4d'; ctx.fillRect(x + 12, y + 27, 22, 3) // ceinture
  ctx.fillStyle = '#f2d3b3'; ctx.beginPath(); ctx.roundRect(x + 17, y + 8, 17, 6, 3); ctx.fill() // visage
  ctx.fillStyle = '#ff4d4d'; ctx.fillRect(x + 14, y + 2, 20, 4) // bandeau
  ctx.fillStyle = '#0b0e12'
  if (mort) {
    ctx.strokeStyle = '#0b0e12'; ctx.lineWidth = 1.4
    for (const ox of [25, 30]) { ctx.beginPath(); ctx.moveTo(x + ox - 1.5, y + 9); ctx.lineTo(x + ox + 1.5, y + 13); ctx.moveTo(x + ox + 1.5, y + 9); ctx.lineTo(x + ox - 1.5, y + 13); ctx.stroke() }
  } else {
    ctx.fillRect(x + 25, y + 9.5, 2.2, 3); ctx.fillRect(x + 30, y + 9.5, 2.2, 3)
  }
}
