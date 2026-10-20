import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { Bomb, Heart, Pause, Play, RotateCcw, Trophy } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { useRecords, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { ennemisProches, HAUTEUR, LARGEUR, LONGUEUR_ZONE, nbZones, nouvelEtat, pas, plafondEn, relief, solEn, zoneDe, ZONES } from './rase-mottes-logic'
import type { Commandes, Ennemi, Etat } from './rase-mottes-logic'
import './rase-mottes.css'

// ----- Dessin -----
// Deux couches d'étoiles placées une fois pour toutes, qui défilent moins vite que le sol.
const ETOILES = (() => {
  let s = 7
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: 70 }, () => ({ x: r() * 400, y: r() * 72, couche: r() < 0.6 ? 0 : 1 }))
})()
function etoiles(ctx: CanvasRenderingContext2D, camera: number) {
  for (const [couche, vitesse, taille, alpha] of [[0, 0.12, 0.5, 0.45], [1, 0.35, 0.8, 0.8]] as const) {
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    const decal = (camera * vitesse) % 400
    for (const e of ETOILES) {
      if (e.couche !== couche) continue
      let x = e.x - decal
      if (x < 0) x += 400
      if (x < LARGEUR) ctx.fillRect(x, e.y, taille, taille)
    }
  }
}

function dessinerEnnemi(ctx: CanvasRenderingContext2D, n: Ennemi, t: number) {
  ctx.save()
  ctx.translate(n.x, n.y)
  switch (n.type) {
    case 'fusee': {
      if (n.vol) {
        ctx.fillStyle = Math.floor(t * 20) % 2 ? '#ffd84d' : '#ff8a3d'
        ctx.beginPath()
        ctx.moveTo(-1.2, 0)
        ctx.lineTo(0, 3 + Math.random() * 2)
        ctx.lineTo(1.2, 0)
        ctx.fill()
      }
      ctx.fillStyle = '#e8edf5'
      ctx.beginPath()
      ctx.moveTo(-1.4, 0)
      ctx.lineTo(-1.4, -6)
      ctx.quadraticCurveTo(0, -9.5, 1.4, -6)
      ctx.lineTo(1.4, 0)
      ctx.fill()
      ctx.fillStyle = '#ff5a5a'
      ctx.beginPath()
      ctx.moveTo(-1.4, -2.5)
      ctx.lineTo(-3, 0)
      ctx.lineTo(-1.4, 0)
      ctx.moveTo(1.4, -2.5)
      ctx.lineTo(3, 0)
      ctx.lineTo(1.4, 0)
      ctx.fill()
      ctx.fillRect(-1.4, -6.3, 2.8, 1)
      break
    }
    case 'reservoir': {
      ctx.fillStyle = '#ffd84d'
      ctx.beginPath()
      ctx.roundRect(-4, -6, 8, 6, 1.5)
      ctx.fill()
      ctx.fillStyle = '#7a5a00'
      ctx.fillRect(-4, -4.6, 8, 1)
      // Une goutte : c'est du carburant.
      ctx.fillStyle = '#3a2a00'
      ctx.beginPath()
      ctx.moveTo(0, -3.2)
      ctx.quadraticCurveTo(1.4, -1.6, 1.1, -1)
      ctx.arc(0, -1, 1.1, 0, Math.PI)
      ctx.quadraticCurveTo(-1.4, -1.6, 0, -3.2)
      ctx.fill()
      break
    }
    case 'mystere': {
      ctx.fillStyle = '#c58cff'
      ctx.beginPath()
      ctx.roundRect(-3.5, -6, 7, 6, 1)
      ctx.fill()
      ctx.fillStyle = '#2a1145'
      ctx.font = 'bold 5px Manrope, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('?', 0, -1.3)
      break
    }
    case 'soucoupe': {
      ctx.fillStyle = '#9fe9ff80'
      ctx.beginPath()
      ctx.ellipse(0, -1.2, 2.6, 2, 0, Math.PI, 0)
      ctx.fill()
      ctx.fillStyle = '#5ad8ff'
      ctx.beginPath()
      ctx.ellipse(0, 0, 5.5, 1.8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = Math.floor(t * 6 + n.phase) % 2 ? '#ffffff' : '#ff6b6b'
      for (const dx of [-3, 0, 3]) ctx.fillRect(dx - 0.4, -0.3, 0.8, 0.8)
      break
    }
    case 'comete': {
      const g = ctx.createLinearGradient(0, 0, 14, 0)
      g.addColorStop(0, '#ff9a5a')
      g.addColorStop(1, '#ff9a5a00')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(0, -2.6)
      ctx.lineTo(14, -0.6)
      ctx.lineTo(14, 0.6)
      ctx.lineTo(0, 2.6)
      ctx.fill()
      ctx.fillStyle = '#ffe2a8'
      ctx.beginPath()
      ctx.arc(0, 0, 3, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'base': {
      ctx.fillStyle = '#5a5a72'
      ctx.fillRect(-12, -6, 24, 6)
      ctx.fillStyle = '#8a8aa8'
      ctx.beginPath()
      ctx.arc(0, -6, 7, Math.PI, 0)
      ctx.fill()
      ctx.strokeStyle = '#ffd84d'
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(0, -13)
      ctx.lineTo(0, -18)
      ctx.stroke()
      ctx.fillStyle = Math.floor(t * 3) % 2 ? '#ffd84d' : '#ff6b6b'
      ctx.beginPath()
      ctx.arc(0, -18.5, 1, 0, Math.PI * 2)
      ctx.fill()
      for (const dx of [-9, -5, 5, 9]) ctx.fillRect(dx - 0.6, -4, 1.2, 1.2)
      break
    }
  }
  ctx.restore()
}

function dessinerVaisseau(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  // Flamme du réacteur
  const f = 3 + Math.sin(t * 40) * 1 + Math.random() * 0.8
  ctx.fillStyle = '#ff8a3d'
  ctx.beginPath()
  ctx.moveTo(-5, -1)
  ctx.lineTo(-5 - f, 0)
  ctx.lineTo(-5, 1)
  ctx.fill()
  // Fuselage en flèche
  ctx.fillStyle = '#e8f4ff'
  ctx.beginPath()
  ctx.moveTo(6, 0)
  ctx.lineTo(-2, -2.2)
  ctx.lineTo(-5, -1.3)
  ctx.lineTo(-5, 1.3)
  ctx.lineTo(-2, 2.2)
  ctx.closePath()
  ctx.fill()
  // Ailes
  ctx.fillStyle = '#2dd4ff'
  ctx.beginPath()
  ctx.moveTo(0, 1)
  ctx.lineTo(-4, 4)
  ctx.lineTo(-2.4, 1)
  ctx.moveTo(0, -1)
  ctx.lineTo(-4, -3.4)
  ctx.lineTo(-2.4, -1)
  ctx.fill()
  // Cockpit
  ctx.fillStyle = '#0d3a5a'
  ctx.beginPath()
  ctx.ellipse(1.8, -0.4, 1.6, 0.8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function dessiner(ctx: CanvasRenderingContext2D, e: Etat) {
  const zoneCentre = zoneDe(e.camera + LARGEUR / 2)
  const z = ZONES[zoneCentre]
  const ciel = ctx.createLinearGradient(0, 0, 0, HAUTEUR)
  ciel.addColorStop(0, z.ciel[0])
  ciel.addColorStop(1, z.ciel[1])
  ctx.fillStyle = ciel
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR)
  etoiles(ctx, e.camera)

  ctx.save()
  ctx.translate(-e.camera, 0)
  // Le relief, morceau par morceau (une couleur par zone).
  const debut = e.camera - 2
  const fin = e.camera + LARGEUR + 2
  for (let a = debut; a < fin;) {
    const k = Math.floor(a / LONGUEUR_ZONE)
    const b = Math.min(fin, (k + 1) * LONGUEUR_ZONE)
    const zz = ZONES[((k % nbZones) + nbZones) % nbZones]
    const grad = ctx.createLinearGradient(0, 50, 0, HAUTEUR)
    grad.addColorStop(0, zz.sol[0])
    grad.addColorStop(1, zz.sol[1])
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(a, HAUTEUR)
    for (let x = a; x <= b + 0.01; x += 2) ctx.lineTo(x, solEn(e, Math.min(x, b - 0.01)))
    ctx.lineTo(b, HAUTEUR)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = zz.bord
    ctx.lineWidth = 0.7
    ctx.shadowColor = zz.bord
    ctx.shadowBlur = 3
    ctx.beginPath()
    for (let x = a; x <= b + 0.01; x += 2) ctx.lineTo(x, solEn(e, Math.min(x, b - 0.01)))
    ctx.stroke()
    ctx.shadowBlur = 0
    if (relief(e, k).plafond) {
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(a, 0)
      for (let x = a; x <= b + 0.01; x += 2) ctx.lineTo(x, plafondEn(e, Math.min(x, b - 0.01)))
      ctx.lineTo(b, 0)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = zz.bord
      ctx.beginPath()
      for (let x = a; x <= b + 0.01; x += 2) ctx.lineTo(x, plafondEn(e, Math.min(x, b - 0.01)))
      ctx.stroke()
    }
    a = b
  }
  for (const n of ennemisProches(e)) if (!n.mort && n.x > debut - 20 && n.x < fin + 20) dessinerEnnemi(ctx, n, e.t)
  // Tirs et bombes
  ctx.strokeStyle = '#fff7a8'
  ctx.lineWidth = 0.8
  ctx.beginPath()
  for (const t of e.tirs) {
    ctx.moveTo(t.x - 3, t.y)
    ctx.lineTo(t.x + 1, t.y)
  }
  ctx.stroke()
  for (const b of e.bombes) {
    ctx.fillStyle = '#1a1f2a'
    ctx.strokeStyle = '#ff6b6b'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.ellipse(b.x, b.y, 1.5, 1, Math.atan2(b.vy, b.vx), 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  for (const x of e.explosions) {
    const r = x.taille * (0.4 + x.t * 1.6)
    ctx.globalAlpha = Math.max(0, 1 - x.t / 0.6)
    ctx.fillStyle = x.couleur
    ctx.beginPath()
    ctx.arc(x.x, x.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x.x, x.y, r * 0.45, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  ctx.restore()

  const j = e.joueur
  if (e.statut !== 'mort' && e.statut !== 'fin' && !(j.invincible && Math.floor(e.t * 10) % 2)) dessinerVaisseau(ctx, j.x, j.y, e.t)

  // Jauge de carburant et progression des zones
  ctx.fillStyle = '#00000066'
  ctx.beginPath()
  ctx.roundRect(4, 4, 44, 6, 2)
  ctx.fill()
  ctx.fillStyle = e.carburant < 25 ? (Math.floor(e.t * 4) % 2 ? '#ff6b6b' : '#ff9a5a') : '#7bd66a'
  ctx.beginPath()
  ctx.roundRect(5, 5, Math.max(0, 42 * (e.carburant / 100)), 4, 1.5)
  ctx.fill()
  ctx.fillStyle = '#ffffffcc'
  ctx.font = 'bold 3px Manrope, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('CARBURANT', 5, 14)
  const zc = zoneDe(e.camera + j.x)
  for (let k = 0; k < nbZones; k++) {
    ctx.fillStyle = k < zc ? ZONES[k].bord : k === zc ? '#ffffff' : '#ffffff30'
    ctx.beginPath()
    ctx.roundRect(LARGEUR - 4 - (nbZones - k) * 7, 5, 6, 3, 1)
    ctx.fill()
  }
  if (e.message) {
    const a = Math.min(1, (2.2 - (e.t - e.message.t)) * 2)
    ctx.globalAlpha = Math.max(0, a)
    ctx.font = 'bold 6px Manrope, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = '#000'
    ctx.shadowBlur = 4
    ctx.fillText(e.message.texte, LARGEUR / 2, 26)
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }
}

const TOUCHES_HAUT = ['ArrowUp', 'z', 'w', 'Z', 'W']
const TOUCHES_BAS = ['ArrowDown', 's', 'S']
const TOUCHES_GAUCHE = ['ArrowLeft', 'q', 'a', 'Q', 'A']
const TOUCHES_DROITE = ['ArrowRight', 'd', 'D']

export default function RaseMottes() {
  const etat = useRef<Etat>(nouvelEtat(1))
  const [hud, setHud] = useState({ score: 0, vies: 3, statut: 'pret' as Etat['statut'] })
  const [pause, setPause] = useState(false)
  const [record, setRecord] = useState(false)
  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const records = useRecords('ez-rase-mottes', 'higher')
  const panelRef = useRef<HTMLDivElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const plein = useFullscreen(panelRef)
  const touches = useRef(new Set<string>())
  const bombe = useRef(false)
  const doigt = useRef<{ id: number; x: number; y: number } | null>(null)
  const pauseRef = useRef(pause)
  pauseRef.current = pause
  const reglages = useRef({ sound, vibe })
  reglages.current = { sound, vibe }
  const recordsRef = useRef(records)
  recordsRef.current = records

  const demarrer = () => {
    const e = nouvelEtat(1)
    e.statut = 'jeu'
    e.message = { texte: ZONES[0].nom, t: 0 }
    etat.current = e
    setRecord(false)
    setPause(false)
    setHud({ score: 0, vies: 3, statut: 'jeu' })
    zoneRef.current?.focus({ preventScroll: true })
  }

  // Boucle de jeu : physique à pas fixe, dessin à chaque image.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let reste = 0
    let largeurVue = 0
    const frame = (now: number) => {
      const cv = canvasRef.current
      const ctx = cv?.getContext('2d')
      if (cv && ctx) {
        const w = cv.clientWidth
        const dpr = window.devicePixelRatio || 1
        if (w !== largeurVue) {
          largeurVue = w
          cv.width = Math.round(w * dpr)
          cv.height = Math.round((w * HAUTEUR / LARGEUR) * dpr)
        }
        const e = etat.current
        reste += Math.min(0.1, (now - last) / 1000)
        if (pauseRef.current) reste = 0
        const k = touches.current
        const c: Commandes = {
          dx: (TOUCHES_DROITE.some(t => k.has(t)) ? 1 : 0) - (TOUCHES_GAUCHE.some(t => k.has(t)) ? 1 : 0),
          dy: (TOUCHES_BAS.some(t => k.has(t)) ? 1 : 0) - (TOUCHES_HAUT.some(t => k.has(t)) ? 1 : 0),
          tir: k.has(' ') || !!doigt.current,
          bombe: bombe.current || k.has('b') || k.has('B') || k.has('x') || k.has('X') || k.has('Shift'),
        }
        const h = 1 / 120
        while (reste >= h) {
          reste -= h
          for (const ev of pas(e, c, h)) {
            const { sound: son, vibe: vib } = reglages.current
            if (son) {
              if (ev.type === 'explosion') playSound(ev.force ? 'drop' : 'merge', 3)
              else if (ev.type === 'plein') playSound('match')
              else if (ev.type === 'mort') playSound('boom')
              else if (ev.type === 'base') playSound('win')
              else if (ev.type === 'zone') playSound('line', 1)
              else if (ev.type === 'fin') playSound('gameover')
              else if (ev.type === 'fuite') playSound('error')
              else if (ev.type === 'vie') playSound('win')
            }
            if (vib && canVibrate()) {
              if (ev.type === 'mort') vibrate('boom')
              else if (ev.type === 'fuite') vibrate('error')
              else if (ev.type === 'plein') vibrate('tap')
              else if (ev.type === 'base') vibrate('win')
            }
            if (ev.type === 'fin') setRecord(recordsRef.current.submit('score', e.score))
          }
          bombe.current = false
          c.bombe = false
        }
        last = now
        ctx.setTransform((cv.width / LARGEUR), 0, 0, (cv.height / HAUTEUR), 0, 0)
        dessiner(ctx, e)
        setHud(hd => (hd.score !== e.score || hd.vies !== e.vies || hd.statut !== e.statut ? { score: e.score, vies: e.vies, statut: e.statut } : hd))
      }
      last = now
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Clavier
  const onKeyDown = (ev: KeyboardEvent) => {
    const e = etat.current
    if (ev.key === 'Enter' && (e.statut === 'pret' || e.statut === 'fin')) {
      ev.preventDefault()
      return demarrer()
    }
    if (ev.key === 'p' || ev.key === 'P' || ev.key === 'Escape') {
      if (e.statut === 'jeu') setPause(p => !p)
      return
    }
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(ev.key)) ev.preventDefault()
    if (e.statut === 'pret' && [' ', ...TOUCHES_HAUT, ...TOUCHES_BAS, ...TOUCHES_DROITE].includes(ev.key)) demarrer()
    touches.current.add(ev.key)
  }
  const onKeyUp = (ev: KeyboardEvent) => {
    touches.current.delete(ev.key)
    // Majuscules et minuscules : on lâche les deux.
    touches.current.delete(ev.key.toLowerCase())
    touches.current.delete(ev.key.toUpperCase())
  }
  useEffect(() => {
    const vider = () => touches.current.clear()
    window.addEventListener('blur', vider)
    return () => window.removeEventListener('blur', vider)
  }, [])

  // Doigt ou souris : on fait glisser pour piloter, le vaisseau tire tout seul.
  const versMonde = (ev: PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: ((ev.clientX - r.left) / r.width) * LARGEUR, y: ((ev.clientY - r.top) / r.height) * HAUTEUR }
  }
  const onPointerDown = (ev: PointerEvent<HTMLDivElement>) => {
    zoneRef.current?.focus({ preventScroll: true })
    const e = etat.current
    if (e.statut === 'pret' || e.statut === 'fin') return
    if (pauseRef.current) return setPause(false)
    ev.currentTarget.setPointerCapture(ev.pointerId)
    const p = versMonde(ev)
    doigt.current = { id: ev.pointerId, ...p }
  }
  const onPointerMove = (ev: PointerEvent) => {
    const d = doigt.current
    if (!d || d.id !== ev.pointerId) return
    const p = versMonde(ev)
    const j = etat.current.joueur
    if (etat.current.statut === 'jeu') {
      j.x = Math.max(8, Math.min(LARGEUR * 0.62, j.x + (p.x - d.x) * 1.3))
      j.y = Math.max(4, Math.min(HAUTEUR - 4, j.y + (p.y - d.y) * 1.3))
    }
    doigt.current = { id: d.id, ...p }
  }
  const onPointerUp = (ev: PointerEvent) => {
    if (doigt.current?.id === ev.pointerId) doigt.current = null
  }

  const statut = hud.statut
  return (
    <section className="ms rase-mottes" aria-label="Rase-mottes">
      <Guide
        etapes={[
          { title: 'Vole au ras du sol', text: 'Le décor défile tout seul. Pilote avec les flèches (ou en glissant le doigt sur le jeu) sans toucher le sol, le plafond ni les ennemis.' },
          { title: 'Tire et bombarde', text: 'Espace pour tirer droit devant, B pour lâcher une bombe. Au doigt, le vaisseau tire tout seul ; le bouton Bombe est sous le jeu.' },
          { title: 'Ne laisse rien passer', text: 'Chaque fusée ou soucoupe qui sort de l’écran sans être détruite te coûte une vie. Tu gagnes une vie tous les 5 000 points (5 au plus).' },
          { title: 'Fais le plein', text: 'Le carburant baisse sans arrêt : détruis les réservoirs jaunes pour le remplir. Panne sèche = une vie perdue.' },
          { title: 'Six zones', text: 'Collines, soucoupes, grotte, comètes, cité, puis la base : détruis-la à la bombe pour repartir, encore plus vite.' },
        ]}
        astuces={[
          'Les fusées décollent quand tu approches : détruis-les au sol à la bombe, ou en vol avec ton tir.',
          'Les comètes ne se détruisent pas : il faut les éviter.',
          'P ou Échap pour mettre en pause.',
        ]}
      />

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="t48-bar">
          <div className="t48-score"><span>Score</span><strong>{hud.score}</strong></div>
          <div className="t48-score"><span>Record</span><strong>{Math.max(records.records.score ?? 0, hud.score)}</strong></div>
          <div className="t48-score rm-vies"><span>Vies</span><strong>{Array.from({ length: Math.max(0, hud.vies) }, (_, k) => <Heart key={k} size={13} />)}</strong></div>
          {statut === 'jeu' && (
            <button type="button" className="t48-btn" onClick={() => setPause(p => !p)}>{pause ? <><Play size={15} /> Reprendre</> : <><Pause size={15} /> Pause</>}</button>
          )}
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        <div
          ref={zoneRef}
          className="rm-zone"
          tabIndex={0}
          role="application"
          aria-label={`Rase-mottes, score ${hud.score}, ${hud.vies} vies. Flèches pour piloter, Espace pour tirer, B pour une bombe.`}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas ref={canvasRef} aria-hidden="true" />
          {statut === 'pret' && (
            <div className="rm-overlay">
              <strong>Rase-mottes</strong>
              <span>Six zones à traverser, du carburant à trouver, une base à détruire.</span>
              <button type="button" className="button button-primary" onClick={demarrer}><Play size={15} /> Décoller</button>
            </div>
          )}
          {pause && statut === 'jeu' && (
            <div className="rm-overlay">
              <strong>Pause</strong>
              <button type="button" className="button button-primary" onClick={() => setPause(false)}><Play size={15} /> Reprendre</button>
            </div>
          )}
          {statut === 'fin' && (
            <div className="rm-overlay">
              <strong>{record ? <><Trophy size={18} /> Nouveau record !</> : 'Partie terminée'}</strong>
              <span>{hud.score} points</span>
              <button type="button" className="button button-primary" onClick={demarrer}><RotateCcw size={15} /> Rejouer</button>
            </div>
          )}
        </div>

        <div className="rm-boutons">
          <button
            type="button"
            className="rm-btn"
            onPointerDown={ev => {
              ev.preventDefault()
              if (etat.current.statut === 'jeu') bombe.current = true
            }}
          >
            <Bomb size={18} /> Bombe
          </button>
        </div>

        <div className="ms-message">
          <span className="ms-hint">
            <span className="ms-hint-mouse">Flèches pour piloter · Espace pour tirer · B pour une bombe</span>
            <span className="ms-hint-touch">Glisse le doigt sur le jeu pour piloter : ton vaisseau tire tout seul</span>
          </span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Sur cet appareil</span>
        <ul>
          <li><span>Meilleur score</span><strong>{records.records.score ?? '—'}</strong></li>
        </ul>
      </div>
    </section>
  )
}
