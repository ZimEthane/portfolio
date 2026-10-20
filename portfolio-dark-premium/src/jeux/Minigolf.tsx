import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { ChevronRight, RotateCcw, Trophy } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { useRecords, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { avancer, pales, RAYON, RAYON_TROU, TROUS, VITESSE_MAX } from './minigolf-logic'
import type { Balle, Trou } from './minigolf-logic'
import './minigolf.css'

const LW = 100
const LH = 160
type Statut = 'vise' | 'roule' | 'trou' | 'fin'

function dessinerTrou(ctx: CanvasRenderingContext2D, t: Trou, temps: number) {
  // Autour du parcours : de l'herbe sombre, comme un jardin la nuit.
  ctx.fillStyle = '#122119'
  ctx.fillRect(0, 0, LW, LH)
  // Gazon à bandes, limité au parcours.
  ctx.save()
  ctx.beginPath()
  t.bord.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
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
  t.bord.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  ctx.closePath()
  ctx.stroke()
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
  const [trou, setTrou] = useState(0)
  const [coups, setCoups] = useState<number[]>(() => TROUS.map(() => 0))
  const [statut, setStatut] = useState<Statut>('vise')
  const [message, setMessage] = useState<string | null>(null)
  const [visee, setVisee] = useState({ angle: -Math.PI / 2, force: 0.5 })
  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const records = useRecords('ez-minigolf', 'lower')
  const panelRef = useRef<HTMLDivElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const plein = useFullscreen(panelRef)
  const balle = useRef<Balle>({ ...TROUS[0].depart, vx: 0, vy: 0 })
  const avantTir = useRef({ ...TROUS[0].depart })
  const temps = useRef(0)
  const k = useRef(3)
  const statutRef = useRef(statut)
  statutRef.current = statut
  const trouRef = useRef(trou)
  trouRef.current = trou
  const viseeRef = useRef(visee)
  viseeRef.current = visee
  const tir = useRef<{ x: number; y: number; force: number; angle: number; actif: boolean } | null>(null)
  const reglages = useRef({ sound, vibe })
  reglages.current = { sound, vibe }
  const [record, setRecord] = useState(false)

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

  const placer = (i: number) => {
    const t = TROUS[i]
    balle.current = { ...t.depart, vx: 0, vy: 0 }
    avantTir.current = { ...t.depart }
    setTrou(i)
    setStatut('vise')
    setMessage(null)
  }
  const recommencerParcours = () => {
    setCoups(TROUS.map(() => 0))
    setRecord(false)
    placer(0)
  }

  const tirer = (angle: number, force: number) => {
    if (statutRef.current !== 'vise' || force < 0.04) return
    avantTir.current = { x: balle.current.x, y: balle.current.y }
    balle.current = { ...balle.current, vx: Math.cos(angle) * force * VITESSE_MAX, vy: Math.sin(angle) * force * VITESSE_MAX }
    setCoups(c => c.map((v, i) => (i === trouRef.current ? v + 1 : v)))
    setStatut('roule')
    setMessage(null)
    if (reglages.current.sound) playSound('flip', 1)
  }

  // Boucle : physique et dessin.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let dernierChoc = 0
    const frame = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000)
      last = now
      temps.current += dt
      const t = TROUS[trouRef.current]
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
            setStatut('trou')
            if (son) playSound('win')
            if (vib && canVibrate()) vibrate('win')
          } else if (r.issue === 'eau') {
            // Plouf : la balle revient où elle était, avec un coup de pénalité.
            balle.current = { ...avantTir.current, vx: 0, vy: 0 }
            setCoups(c => c.map((v, i) => (i === trouRef.current ? v + 1 : v)))
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
      const s = k.current
      ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0)
      const t = TROUS[trouRef.current]
      dessinerTrou(ctx, t, temps.current)
      const b = balle.current
      if (statutRef.current !== 'trou' && statutRef.current !== 'fin') {
        // Visée : ligne pointillée dans la direction du tir, plus longue si le tir est fort.
        const tr = tir.current
        const v = tr?.actif ? tr : statutRef.current === 'vise' && document.activeElement === zoneRef.current ? { ...viseeRef.current, actif: true } : null
        if (v && statutRef.current === 'vise' && v.force > 0.04) {
          const L = 8 + v.force * 42
          ctx.strokeStyle = `hsl(${120 - v.force * 120} 90% 60%)`
          ctx.lineWidth = 0.9
          ctx.setLineDash([2, 2])
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

  // Après un trou : le suivant, ou la carte de score.
  useEffect(() => {
    if (statut !== 'trou') return
    const tm = window.setTimeout(() => {
      if (trou < TROUS.length - 1) placer(trou + 1)
      else {
        setStatut('fin')
        const total = coups.reduce((a, b) => a + b, 0)
        setRecord(records.submit('total', total))
      }
    }, 1400)
    return () => window.clearTimeout(tm)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statut])

  // ----- Tirer : on tire vers l'arrière (lance-pierre) -----
  const versMonde = (ev: PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: ((ev.clientX - r.left) / r.width) * LW, y: ((ev.clientY - r.top) / r.height) * LH }
  }
  const onPointerDown = (ev: PointerEvent) => {
    zoneRef.current?.focus({ preventScroll: true })
    if (statutRef.current !== 'vise') return
    ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
    const p = versMonde(ev)
    tir.current = { x: p.x, y: p.y, force: 0, angle: 0, actif: true }
  }
  const onPointerMove = (ev: PointerEvent) => {
    const t = tir.current
    if (!t) return
    const p = versMonde(ev)
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
    if (statut === 'fin') return
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

  const t = TROUS[trou]
  const total = coups.reduce((a, b) => a + b, 0)
  const parJoue = TROUS.slice(0, statut === 'fin' ? TROUS.length : trou).reduce((a, x) => a + x.par, 0)
  const ecart = coups.slice(0, statut === 'fin' ? TROUS.length : trou).reduce((a, b) => a + b, 0) - parJoue
  const nomScore = (c: number, par: number) => (c === 1 ? 'Trou en un !' : c - par <= -2 ? 'Eagle !' : c - par === -1 ? 'Birdie !' : c === par ? 'Par' : c - par === 1 ? 'Bogey' : `+${c - par}`)
  const parcoursPar = TROUS.reduce((a, x) => a + x.par, 0)

  return (
    <section className="ms minigolf" aria-label="Mini-golf">
      <Guide
        etapes={[
          { title: 'Vise en tirant en arrière', text: 'Pose le doigt (ou clique) n’importe où, tire vers l’arrière comme un lance-pierre, puis lâche. Plus tu tires loin, plus le coup est fort.' },
          { title: 'Mets la balle dans le trou', text: 'Elle tombe si elle passe sur le trou assez doucement : trop vite, elle saute par-dessus.' },
          { title: 'Les pièges', text: 'Le sable freine beaucoup, l’eau coûte un coup de pénalité, les champignons rouges renvoient fort, la pente pousse sur le côté et le moulin tourne.' },
          { title: '9 trous', text: `Le parcours se joue en ${parcoursPar} coups (le « par »). Fais moins pour battre le parcours !` },
        ]}
        astuces={[
          'Les bordures renvoient bien la balle : utilise-les pour les angles.',
          'Au clavier : flèches gauche et droite pour viser, haut et bas pour la force, Espace pour tirer.',
        ]}
      />

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="t48-bar">
          <div className="t48-score"><span>Trou</span><strong>{Math.min(trou + 1, TROUS.length)}<small>/{TROUS.length}</small></strong></div>
          <div className="t48-score"><span>Par</span><strong>{t.par}</strong></div>
          <div className="t48-score"><span>Coups</span><strong>{coups[trou]}</strong></div>
          <div className="t48-score"><span>Total</span><strong>{ecart === 0 ? '±0' : ecart > 0 ? `+${ecart}` : ecart}</strong></div>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        <p className="mg-nom">Trou {Math.min(trou + 1, TROUS.length)} : {t.nom}</p>

        <div
          ref={zoneRef}
          className="mg-zone"
          tabIndex={0}
          role="application"
          aria-label={`Mini-golf, trou ${trou + 1} « ${t.nom} », par ${t.par}, ${coups[trou]} coups. Flèches pour viser, Espace pour tirer.`}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (tir.current = null)}
        >
          <canvas ref={canvasRef} aria-hidden="true" />
          {message && <span className="mg-message" key={message + coups[trou]}>{message}</span>}
          {statut === 'trou' && <div className="mg-bravo" key={trou}><strong>{nomScore(coups[trou], t.par)}</strong><span>{coups[trou]} coup{coups[trou] > 1 ? 's' : ''}</span></div>}
          {statut === 'fin' && (
            <div className="mg-carte">
              <strong>{record ? <><Trophy size={18} /> Nouveau record !</> : 'Parcours terminé'}</strong>
              <table>
                <thead><tr><th>Trou</th>{TROUS.map((_, i) => <th key={i}>{i + 1}</th>)}<th>Total</th></tr></thead>
                <tbody>
                  <tr><td>Par</td>{TROUS.map((x, i) => <td key={i}>{x.par}</td>)}<td>{parcoursPar}</td></tr>
                  <tr className="mg-toi"><td>Toi</td>{coups.map((c, i) => <td key={i} className={c < TROUS[i].par ? 'is-moins' : c > TROUS[i].par ? 'is-plus' : ''}>{c}</td>)}<td>{total}</td></tr>
                </tbody>
              </table>
              <button type="button" className="button button-primary" onPointerDown={ev => ev.stopPropagation()} onClick={recommencerParcours}><RotateCcw size={15} /> Rejouer</button>
            </div>
          )}
        </div>

        <div className="sd-actions">
          <button type="button" className="sd-action" onClick={() => placer(trou)} disabled={statut !== 'vise'}><RotateCcw size={16} /> Recommencer le trou</button>
          <button type="button" className="sd-action" onClick={() => trou < TROUS.length - 1 && placer(trou + 1)} disabled={statut === 'fin' || trou >= TROUS.length - 1}><ChevronRight size={16} /> Passer</button>
        </div>

        <div className="ms-message">
          <span className="ms-hint">
            <span className="ms-hint-mouse">Clique, tire vers l’arrière et lâche pour tirer · flèches + Espace au clavier</span>
            <span className="ms-hint-touch">Pose le doigt, tire vers l’arrière et lâche</span>
          </span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Sur cet appareil</span>
        <ul>
          <li><span>Meilleur parcours</span><strong>{records.records.total ?? '—'}</strong><small>par {parcoursPar}</small></li>
        </ul>
      </div>
    </section>
  )
}
