import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { ChevronRight, RotateCcw, Star } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { ChoixNiveaux, PALIERS, ProgressionPaliers } from './commun/Niveaux'
import type { EtatNiveau } from './commun/Niveaux'
import { loadJSON, saveJSON, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { avancer, pales, RAYON, RAYON_TROU, trouDuNiveau, VITESSE_MAX } from './minigolf-logic'
import { NIVEAUX } from './minigolf-niveaux'
import type { Balle, Trou } from './minigolf-logic'
import './minigolf.css'

const LW = 100
const LH = 160
type Statut = 'vise' | 'roule' | 'trou'
const PROGRES_KEY = 'ez-minigolf-500' // { niveau: meilleur nombre de coups }
const NIVEAU_KEY = 'ez-minigolf-500-niveau'
type Progres = Record<number, number>

// Le par de chaque palier, pour le choix des niveaux (« Par 2 à 3 »).
const PARS = PALIERS.map(p => {
  let a = 9
  let b = 0
  for (let n = p.de; n <= p.a; n++) {
    const par = trouDuNiveau(NIVEAUX, n).par
    a = Math.min(a, par)
    b = Math.max(b, par)
  }
  return a === b ? `Par ${a}` : `Par ${a} à ${b}`
})

// Cadrage : un trou généré court est agrandi et centré (le parcours fait 100 × 160).
function cadrage(t: Trou) {
  if (!t.gazon?.length) return { z: 1, ox: 0, oy: 0 }
  const x0 = Math.min(...t.gazon.map(c => c.x)) - 5
  const y0 = Math.min(...t.gazon.map(c => c.y)) - 5
  const x1 = Math.max(...t.gazon.map(c => c.x + c.w)) + 5
  const y1 = Math.max(...t.gazon.map(c => c.y + c.h)) + 5
  // Agrandi jusqu'à 1,6 fois, ou un peu réduit pour qu'un grand parcours garde sa marge.
  const z = Math.min(1.6, LW / (x1 - x0), LH / (y1 - y0))
  const ox = (x0 + x1) / 2 - LW / z / 2
  const oy = (y0 + y1) / 2 - LH / z / 2
  return { z, ox, oy }
}

function dessinerTrou(ctx: CanvasRenderingContext2D, t: Trou, temps: number) {
  // Autour du parcours : de l'herbe sombre, comme un jardin la nuit.
  ctx.fillStyle = '#122119'
  ctx.fillRect(-LW, -LH, LW * 3, LH * 3)
  // Gazon à bandes, limité au parcours.
  ctx.save()
  ctx.beginPath()
  if (t.gazon) for (const c of t.gazon) ctx.rect(c.x, c.y, c.w, c.h)
  else t.bord.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  ctx.closePath()
  ctx.clip()
  // Fond uni puis une bande sur deux : pas de fines lignes entre les bandes.
  ctx.fillStyle = '#339552'
  ctx.fillRect(0, 0, LW, LH)
  ctx.fillStyle = '#2f8a4c'
  for (let y = 8; y < LH; y += 16) ctx.fillRect(0, y, LW, 8)
  for (const z of t.sable) {
    ctx.fillStyle = '#e3cd92'
    ctx.beginPath()
    ctx.roundRect(z.x, z.y, z.w, z.h, 6)
    ctx.fill()
    ctx.fillStyle = '#cdb579'
    for (let k = 0; k < (z.w * z.h) / 18; k++) ctx.fillRect(z.x + ((k * 37) % z.w), z.y + ((k * 53) % z.h), 0.6, 0.6)
  }
  for (const z of t.eau) {
    ctx.fillStyle = '#2a73cf'
    ctx.fillRect(z.x, z.y, z.w, z.h)
    ctx.strokeStyle = '#7fb8ff'
    ctx.lineWidth = 0.5
    for (let y = z.y + 4; y < z.y + z.h; y += 6) {
      ctx.beginPath()
      for (let x = z.x; x <= z.x + z.w; x += 2) ctx.lineTo(x, y + Math.sin(x * 0.5 + temps * 3) * 0.8)
      ctx.stroke()
    }
  }
  for (const p of t.pentes) {
    // Pente : des flèches dans le sens où elle pousse la balle.
    ctx.fillStyle = '#ffffff14'
    ctx.fillRect(p.x, p.y, p.w, p.h)
    ctx.fillStyle = '#ffffff40'
    const a = Math.atan2(p.fy, p.fx)
    for (let y = p.y + 8; y < p.y + p.h; y += 14) for (let x = p.x + 8; x < p.x + p.w; x += 14) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(a)
      ctx.beginPath()
      ctx.moveTo(3, 0)
      ctx.lineTo(-2, -2.5)
      ctx.lineTo(-2, 2.5)
      ctx.fill()
      ctx.restore()
    }
  }
  ctx.restore()

  // Bordures en bois.
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#c9a66b'
  ctx.lineWidth = 2.6
  ctx.beginPath()
  if (t.murs) {
    ctx.lineCap = 'round'
    for (const [a, b] of t.murs) {
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
    }
  } else {
    t.bord.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.closePath()
  }
  ctx.stroke()
  ctx.lineCap = 'butt'
  for (const o of t.obstacles) {
    ctx.fillStyle = '#8a6a3e'
    ctx.strokeStyle = '#c9a66b'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    o.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  for (const b of t.bumpers) {
    ctx.fillStyle = '#e8394a'
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r * 0.6, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (t.moulin) {
    ctx.strokeStyle = '#7a4e2a'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    for (const [a, c] of pales(t, temps)) {
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(c.x, c.y)
      ctx.stroke()
    }
    ctx.fillStyle = '#c9a66b'
    ctx.beginPath()
    ctx.arc(t.moulin.x, t.moulin.y, 2.2, 0, Math.PI * 2)
    ctx.fill()
  }
  // Le trou et son drapeau.
  ctx.fillStyle = '#0a1a10'
  ctx.beginPath()
  ctx.arc(t.trou.x, t.trou.y, RAYON_TROU, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#e8edf5'
  ctx.lineWidth = 0.7
  ctx.beginPath()
  ctx.moveTo(t.trou.x, t.trou.y)
  ctx.lineTo(t.trou.x, t.trou.y - 14)
  ctx.stroke()
  ctx.fillStyle = '#ff4d4d'
  const v = Math.sin(temps * 4) * 1.2
  ctx.beginPath()
  ctx.moveTo(t.trou.x, t.trou.y - 14)
  ctx.quadraticCurveTo(t.trou.x + 4, t.trou.y - 13 + v, t.trou.x + 8, t.trou.y - 11.5)
  ctx.lineTo(t.trou.x, t.trou.y - 9)
  ctx.fill()
}

export default function Minigolf() {
  const [num, setNum] = useState(() => {
    const n = loadJSON<number>(NIVEAU_KEY, 1)
    return n >= 1 && n <= NIVEAUX.length ? n : 1
  })
  const [progres, setProgres] = useState<Progres>(() => loadJSON<Progres>(PROGRES_KEY, {}))
  const [coups, setCoups] = useState(0)
  const [statut, setStatut] = useState<Statut>('vise')
  const [message, setMessage] = useState<string | null>(null)
  const [visee, setVisee] = useState({ angle: -Math.PI / 2, force: 0.5 })
  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const panelRef = useRef<HTMLDivElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const plein = useFullscreen(panelRef)
  const t = useMemo(() => trouDuNiveau(NIVEAUX, num), [num])
  const trouRef = useRef(t)
  trouRef.current = t
  const vue = useMemo(() => cadrage(t), [t])
  const vueRef = useRef(vue)
  vueRef.current = vue
  const balle = useRef<Balle>({ ...t.depart, vx: 0, vy: 0 })
  const avantTir = useRef({ ...t.depart })
  const temps = useRef(0)
  const k = useRef(3)
  const statutRef = useRef(statut)
  statutRef.current = statut
  const viseeRef = useRef(visee)
  viseeRef.current = visee
  const tir = useRef<{ x: number; y: number; force: number; angle: number; actif: boolean } | null>(null)
  const reglages = useRef({ sound, vibe })
  reglages.current = { sound, vibe }
  const coupsRef = useRef(0)
  coupsRef.current = coups

  useEffect(() => saveJSON(NIVEAU_KEY, num), [num])

  // Taille : le parcours (100 × 160) remplit la largeur de la zone (limitée en CSS).
  useEffect(() => {
    const zone = zoneRef.current
    const cv = canvasRef.current
    if (!zone || !cv) return
    const calc = () => {
      const s = Math.max(1.6, zone.clientWidth / LW)
      const dpr = window.devicePixelRatio || 1
      k.current = s
      cv.width = Math.round(LW * s * dpr)
      cv.height = Math.round(LH * s * dpr)
      cv.style.width = `${LW * s}px`
      cv.style.height = `${LH * s}px`
    }
    const ro = new ResizeObserver(calc)
    ro.observe(zone)
    calc()
    return () => ro.disconnect()
  }, [plein.full])

  const charger = (n: number) => {
    const nt = trouDuNiveau(NIVEAUX, n)
    balle.current = { ...nt.depart, vx: 0, vy: 0 }
    avantTir.current = { ...nt.depart }
    tir.current = null
    setNum(n)
    setCoups(0)
    setStatut('vise')
    setMessage(null)
    setVisee({ angle: -Math.PI / 2, force: 0.5 })
  }
  const recommencer = () => charger(num)

  const tirer = (angle: number, force: number) => {
    if (statutRef.current !== 'vise' || force < 0.04) return
    avantTir.current = { x: balle.current.x, y: balle.current.y }
    balle.current = { ...balle.current, vx: Math.cos(angle) * force * VITESSE_MAX, vy: Math.sin(angle) * force * VITESSE_MAX }
    setCoups(c => c + 1)
    setStatut('roule')
    setMessage(null)
    if (reglages.current.sound) playSound('flip', 1)
  }

  // Trou réussi : on garde le meilleur nombre de coups du niveau.
  const reussir = () => {
    const c = coupsRef.current
    setProgres(p => {
      if (p[num] !== undefined && p[num] <= c) return p
      const nouveau = { ...p, [num]: c }
      saveJSON(PROGRES_KEY, nouveau)
      return nouveau
    })
  }
  const reussirRef = useRef(reussir)
  reussirRef.current = reussir

  // Boucle : physique et dessin.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let dernierChoc = 0
    const frame = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000)
      last = now
      temps.current += dt
      const t = trouRef.current
      const st = statutRef.current
      if (st === 'roule' || (st === 'vise' && t.moulin)) {
        const r = avancer(t, balle.current, dt, temps.current)
        balle.current = r.balle
        const { sound: son, vibe: vib } = reglages.current
        if (r.choc > 25 && now - dernierChoc > 90) {
          dernierChoc = now
          if (son) playSound('rotate', 1)
          if (vib && canVibrate() && r.choc > 70) vibrate('tap')
        }
        if (st === 'vise' && Math.hypot(r.balle.vx, r.balle.vy) > 1.2) setStatut('roule')
        if (st === 'roule') {
          if (r.issue === 'dans le trou') {
            statutRef.current = 'trou'
            setStatut('trou')
            reussirRef.current()
            if (son) playSound('win')
            if (vib && canVibrate()) vibrate('win')
          } else if (r.issue === 'eau') {
            // Plouf : la balle revient où elle était, avec un coup de pénalité.
            balle.current = { ...avantTir.current, vx: 0, vy: 0 }
            setCoups(c => c + 1)
            setMessage('Plouf ! Un coup de pénalité.')
            setStatut('vise')
            if (son) playSound('boom')
          } else if (r.issue === 'arret') setStatut('vise')
        }
      }
      dessiner()
      raf = requestAnimationFrame(frame)
    }
    const dessiner = () => {
      const cv = canvasRef.current
      const ctx = cv?.getContext('2d')
      if (!cv || !ctx) return
      const dpr = window.devicePixelRatio || 1
      const { z, ox, oy } = vueRef.current
      const s = k.current * z * dpr
      ctx.setTransform(s, 0, 0, s, -ox * s, -oy * s)
      const t = trouRef.current
      dessinerTrou(ctx, t, temps.current)
      const b = balle.current
      if (statutRef.current !== 'trou') {
        // Visée : ligne pointillée dans la direction du tir, plus longue si le tir est fort.
        const tr = tir.current
        const v = tr?.actif ? tr : statutRef.current === 'vise' && document.activeElement === zoneRef.current ? { ...viseeRef.current, actif: true } : null
        if (v && statutRef.current === 'vise' && v.force > 0.04) {
          const L = (8 + v.force * 42) / z
          ctx.strokeStyle = `hsl(${120 - v.force * 120} 90% 60%)`
          ctx.lineWidth = 0.9 / z
          ctx.setLineDash([2 / z, 2 / z])
          ctx.beginPath()
          ctx.moveTo(b.x, b.y)
          ctx.lineTo(b.x + Math.cos(v.angle) * L, b.y + Math.sin(v.angle) * L)
          ctx.stroke()
          ctx.setLineDash([])
        }
        ctx.fillStyle = '#00000055'
        ctx.beginPath()
        ctx.arc(b.x + 0.6, b.y + 0.8, RAYON, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(b.x, b.y, RAYON, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ----- Tirer : on tire vers l'arrière (lance-pierre) -----
  // Mesuré à l'écran (sans le zoom) : la même force pour le même geste, quel que soit le trou.
  const versEcran = (ev: PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: ((ev.clientX - r.left) / r.width) * LW, y: ((ev.clientY - r.top) / r.height) * LH }
  }
  const onPointerDown = (ev: PointerEvent) => {
    zoneRef.current?.focus({ preventScroll: true })
    if (statutRef.current !== 'vise') return
    ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
    const p = versEcran(ev)
    tir.current = { x: p.x, y: p.y, force: 0, angle: 0, actif: true }
  }
  const onPointerMove = (ev: PointerEvent) => {
    const t = tir.current
    if (!t) return
    const p = versEcran(ev)
    const dx = t.x - p.x
    const dy = t.y - p.y
    t.force = Math.min(1, Math.hypot(dx, dy) / 40)
    t.angle = Math.atan2(dy, dx)
  }
  const onPointerUp = () => {
    const t = tir.current
    tir.current = null
    if (t) tirer(t.angle, t.force)
  }
  const onKeyDown = (ev: KeyboardEvent) => {
    if (statut === 'trou') {
      if (ev.key === 'Enter' && num < NIVEAUX.length) {
        ev.preventDefault()
        charger(num + 1)
      }
      return
    }
    const v = visee
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      ev.preventDefault()
      setVisee({ ...v, angle: v.angle + (ev.key === 'ArrowLeft' ? -1 : 1) * (ev.shiftKey ? 0.02 : 0.08) })
    } else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
      ev.preventDefault()
      setVisee({ ...v, force: Math.max(0.05, Math.min(1, v.force + (ev.key === 'ArrowUp' ? 0.05 : -0.05))) })
    } else if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault()
      tirer(v.angle, v.force)
    }
  }

  const etatNiveau = (n: number): EtatNiveau => {
    const m = progres[n]
    if (m === undefined) return ''
    return m <= trouDuNiveau(NIVEAUX, n).par ? 'parfait' : 'fait'
  }
  const meilleur = progres[num]
  const auPar = Object.keys(progres).filter(n => etatNiveau(Number(n)) === 'parfait').length
  const nomScore = (c: number, par: number) => (c === 1 ? 'Trou en un !' : c - par <= -2 ? 'Eagle !' : c - par === -1 ? 'Birdie !' : c === par ? 'Par !' : c - par === 1 ? 'Bogey' : `+${c - par}`)
  const reussi = statut === 'trou'

  return (
    <section className="ms minigolf" aria-label="Mini-golf">
      <Guide
        etapes={[
          { title: 'Vise en tirant en arrière', text: 'Pose le doigt (ou clique) n’importe où, tire vers l’arrière comme un lance-pierre, puis lâche. Plus tu tires loin, plus le coup est fort.' },
          { title: 'Mets la balle dans le trou', text: 'Elle tombe si elle passe sur le trou assez doucement : trop vite, elle saute par-dessus.' },
          { title: 'Les pièges', text: 'Le sable freine beaucoup, l’eau coûte un coup de pénalité, les champignons rouges renvoient fort, la pente pousse la balle et le moulin tourne.' },
          { title: '500 trous', text: 'Cinq paliers de 100 trous, du Débutant à l’Expert. Fais le trou en autant de coups que le « par », ou moins, pour gagner l’étoile.' },
        ]}
        astuces={[
          'Les bordures renvoient bien la balle : utilise-les pour les angles.',
          'Au clavier : flèches gauche et droite pour viser, haut et bas pour la force, Espace pour tirer.',
        ]}
      />

      <ChoixNiveaux courant={num} etat={etatNiveau} onChoisir={charger} details={PARS} parfait="au par" />

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="t48-bar">
          <div className="t48-score"><span>Trou</span><strong>{num}</strong></div>
          <div className="t48-score"><span>Par</span><strong>{t.par}</strong></div>
          <div className="t48-score"><span>Coups</span><strong>{coups}</strong></div>
          <div className="t48-score" title="Ton meilleur score sur ce trou"><span>Meilleur</span><strong className="mg-meilleur">{meilleur ?? '—'}{meilleur !== undefined && meilleur <= t.par && <Star size={13} className="mg-etoile" aria-label="au par" />}</strong></div>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        <p className="mg-nom">Trou {num} : {t.nom}</p>

        <div
          ref={zoneRef}
          className="mg-zone"
          tabIndex={0}
          role="application"
          aria-label={`Mini-golf, trou ${num} « ${t.nom} », par ${t.par}, ${coups} coups. Flèches pour viser, Espace pour tirer.`}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (tir.current = null)}
        >
          <canvas ref={canvasRef} aria-hidden="true" />
          {message && <span className="mg-message" key={message + coups}>{message}</span>}
          {reussi && (
            <div className="mg-fin" key={num}>
              {coups <= t.par && <Star size={34} className="mg-grande-etoile" aria-hidden="true" />}
              <strong>{nomScore(coups, t.par)}</strong>
              <span>
                Trou {num} réussi en {coups} coup{coups > 1 ? 's' : ''} (par {t.par}).
                {coups > t.par ? ' Fais le par pour gagner l’étoile !' : ''}
              </span>
              <div>
                <button type="button" className="button" onPointerDown={e => e.stopPropagation()} onClick={recommencer}><RotateCcw size={15} /> Rejouer</button>
                {num < NIVEAUX.length && <button type="button" className="button button-primary" onPointerDown={e => e.stopPropagation()} onClick={() => charger(num + 1)}>Trou suivant <ChevronRight size={15} /></button>}
              </div>
            </div>
          )}
        </div>

        <div className="sd-actions">
          <button type="button" className="sd-action" onClick={recommencer} disabled={statut === 'roule'}><RotateCcw size={16} /> Recommencer le trou</button>
          <button type="button" className="sd-action" onClick={() => charger(num + 1)} disabled={num >= NIVEAUX.length}><ChevronRight size={16} /> Passer</button>
        </div>

        <div className="ms-message">
          <span className="ms-hint">
            <span className="ms-hint-mouse">Clique, tire vers l’arrière et lâche pour tirer · flèches + Espace au clavier</span>
            <span className="ms-hint-touch">Pose le doigt, tire vers l’arrière et lâche</span>
          </span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Ta progression sur cet appareil</span>
        <ul>
          <li><span>Trous réussis</span><strong>{Object.keys(progres).length} / {NIVEAUX.length}</strong></li>
          <li><span>Au par ou mieux</span><strong>{auPar}</strong></li>
        </ul>
        <ProgressionPaliers etat={etatNiveau} />
      </div>
    </section>
  )
}
