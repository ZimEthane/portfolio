import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { ArrowDown, ArrowUp, Pause, Play, RotateCcw, Trophy } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { useRecords, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { useHaptique } from './commun/useHaptique'
import { avancer, BAISSE, DINO_X, MONDE_L, nouvelEtat, score, SOL } from './dino-logic'
import type { Etat, Obstacle } from './dino-logic'
import './dino.css'

const MONDE_H = 150
type Statut = 'pret' | 'joue' | 'pause' | 'perdu'

// Dino original (dessiné ici, pas une copie) : vu de profil, tourné vers la droite.
function dessinerDino(ctx: CanvasRenderingContext2D, e: Etat, mort: boolean) {
  const baisse = e.baisse && e.auSol && !mort
  const x = DINO_X
  const course = Math.floor(e.t * 10) % 2 // jambes qui alternent
  ctx.fillStyle = mort ? '#ff8585' : '#8bb9fa'
  if (baisse) {
    const y = SOL - BAISSE.h
    ctx.beginPath(); ctx.roundRect(x, y + 4, 42, 16, 8); ctx.fill() // corps allongé
    ctx.beginPath(); ctx.roundRect(x + 34, y, 22, 14, 6); ctx.fill() // tête en avant
    ctx.beginPath(); ctx.moveTo(x + 2, y + 8); ctx.lineTo(x - 10, y + 4); ctx.lineTo(x + 2, y + 16); ctx.fill() // queue
    ctx.fillRect(x + (course ? 8 : 14), y + 18, 6, 8); ctx.fillRect(x + (course ? 26 : 20), y + 18, 6, 8)
    ctx.fillStyle = '#07111d'; ctx.beginPath(); ctx.arc(x + 48, y + 5, 2.2, 0, Math.PI * 2); ctx.fill()
    return
  }
  const y = e.y
  ctx.beginPath(); ctx.roundRect(x + 4, y + 14, 26, 22, 9); ctx.fill() // corps
  ctx.beginPath(); ctx.roundRect(x + 18, y, 22, 17, 7); ctx.fill() // tête
  ctx.beginPath(); ctx.moveTo(x + 6, y + 18); ctx.lineTo(x - 8, y + 26); ctx.lineTo(x + 6, y + 30); ctx.fill() // queue
  ctx.fillRect(x + 28, y + 22, 7, 4) // petit bras
  const enLair = !e.auSol
  ctx.fillRect(x + 9, y + 34, 6, enLair || course ? 10 : 6)
  ctx.fillRect(x + 20, y + 34, 6, enLair || !course ? 10 : 6)
  ctx.fillStyle = '#07111d'
  if (mort) {
    ctx.strokeStyle = '#07111d'; ctx.lineWidth = 1.8
    ctx.beginPath(); ctx.moveTo(x + 29, y + 4); ctx.lineTo(x + 34, y + 9); ctx.moveTo(x + 34, y + 4); ctx.lineTo(x + 29, y + 9); ctx.stroke()
  } else {
    ctx.beginPath(); ctx.arc(x + 32, y + 6, 2.4, 0, Math.PI * 2); ctx.fill()
  }
  ctx.fillRect(x + 30, y + 12, 9, 1.6) // sourire
}

function dessinerObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, t: number) {
  if (o.sorte === 'oiseau') {
    const aile = Math.floor(t * 6) % 2
    ctx.fillStyle = '#ffb36b'
    ctx.beginPath(); ctx.roundRect(o.x + 8, o.y + 12, 30, 10, 5); ctx.fill() // corps
    ctx.beginPath(); ctx.moveTo(o.x + 8, o.y + 14); ctx.lineTo(o.x - 2, o.y + 18); ctx.lineTo(o.x + 8, o.y + 20); ctx.fill() // bec
    ctx.beginPath() // ailes vers le haut ou vers le bas
    if (aile) { ctx.moveTo(o.x + 16, o.y + 13); ctx.lineTo(o.x + 30, o.y); ctx.lineTo(o.x + 34, o.y + 13) } else { ctx.moveTo(o.x + 16, o.y + 21); ctx.lineTo(o.x + 30, o.y + 30); ctx.lineTo(o.x + 34, o.y + 21) }
    ctx.fill()
    ctx.fillStyle = '#2a1a0a'; ctx.beginPath(); ctx.arc(o.x + 12, o.y + 15, 1.6, 0, Math.PI * 2); ctx.fill()
    return
  }
  const grand = o.sorte === 'grand-cactus'
  const w = grand ? 25 : 17
  ctx.fillStyle = '#6fd59a'
  for (let k = 0; k < o.n; k++) {
    const x = o.x + k * (w + 3)
    const tronc = w * 0.42
    ctx.beginPath(); ctx.roundRect(x + (w - tronc) / 2, o.y, tronc, o.h, tronc / 2); ctx.fill()
    ctx.beginPath(); ctx.roundRect(x, o.y + o.h * 0.3, tronc * 0.8, o.h * 0.32, 3); ctx.fill() // bras gauche
    ctx.beginPath(); ctx.roundRect(x + w - tronc * 0.8, o.y + o.h * 0.18, tronc * 0.8, o.h * 0.3, 3); ctx.fill() // bras droit
  }
}

export default function Dino() {
  const [statut, setStatut] = useState<Statut>('pret')
  const [points, setPoints] = useState(0)
  const [record, setRecord] = useState(false)
  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const haptique = useHaptique(vibe)
  const panelRef = useRef<HTMLDivElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const plein = useFullscreen(panelRef)
  const records = useRecords('ez-dino', 'higher')

  const e = useRef<Etat>(nouvelEtat())
  const statutRef = useRef<Statut>('pret')
  statutRef.current = statut
  const entree = useRef({ saut: false, bas: false })
  const echelle = useRef(1)
  const opts = useRef({ sound, vibe, records })
  opts.current = { sound, vibe, records }

  const dessiner = useCallback(() => {
    const cv = canvasRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const k = echelle.current
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(k * dpr, 0, 0, k * dpr, 0, 0)
    ctx.clearRect(0, 0, MONDE_L, MONDE_H)
    const s = e.current
    // Nuages et sol qui défilent (décalage selon la distance parcourue).
    ctx.fillStyle = '#ffffff10'
    for (const [x0, y, w] of [[80, 30, 46], [330, 18, 60], [520, 44, 38]]) {
      const x = (((x0 - s.distance * 0.15) % (MONDE_L + 80)) + MONDE_L + 80) % (MONDE_L + 80) - 40
      ctx.beginPath(); ctx.roundRect(x, y, w, 12, 6); ctx.fill()
    }
    ctx.fillStyle = '#3a4452'
    ctx.fillRect(0, SOL, MONDE_L, 1.5)
    ctx.fillStyle = '#ffffff1c'
    for (let i = 0; i < 24; i++) {
      const x = ((i * 53 - s.distance) % MONDE_L + MONDE_L) % MONDE_L
      ctx.fillRect(x, SOL + 5 + (i % 3) * 3, 3 + (i % 4), 1.5)
    }
    for (const o of s.obstacles) dessinerObstacle(ctx, o, s.t)
    dessinerDino(ctx, s, s.mort)
  }, [])

  // Le canvas prend toute la largeur ; la hauteur suit les proportions du monde.
  useEffect(() => {
    const zone = zoneRef.current
    const cv = canvasRef.current
    if (!zone || !cv) return
    const ro = new ResizeObserver(() => {
      const w = zone.clientWidth
      const dpr = window.devicePixelRatio || 1
      echelle.current = w / MONDE_L
      cv.width = Math.round(w * dpr)
      cv.height = Math.round((w / MONDE_L) * MONDE_H * dpr)
      cv.style.width = `${w}px`
      cv.style.height = `${(w / MONDE_L) * MONDE_H}px`
      dessiner()
    })
    ro.observe(zone)
    return () => ro.disconnect()
  }, [dessiner])

  // Boucle de jeu.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (statutRef.current === 'joue') {
        const res = avancer(e.current, dt, entree.current.saut, entree.current.bas)
        entree.current.saut = false
        e.current = res.e
        const { sound: son, vibe: vib } = opts.current
        if (res.sauté && son) playSound('select')
        if (res.palier && son) playSound('eat')
        if (res.e.mort) {
          setStatut('perdu')
          statutRef.current = 'perdu'
          const sc = score(res.e)
          setRecord(opts.current.records.submit('score', sc) && sc > 0)
          if (son) playSound('gameover')
          if (vib && canVibrate()) vibrate('boom')
        }
        setPoints(score(res.e))
      }
      dessiner()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [dessiner])

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && statutRef.current === 'joue') setStatut('pause')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const demarrer = () => {
    e.current = nouvelEtat()
    entree.current = { saut: false, bas: false }
    setRecord(false)
    setPoints(0)
    setStatut('joue')
    statutRef.current = 'joue'
    zoneRef.current?.focus({ preventScroll: true })
  }
  // Sauter démarre aussi la partie (et la reprend après une pause).
  const sauter = () => {
    if (statutRef.current === 'pret' || statutRef.current === 'perdu') return demarrer()
    if (statutRef.current === 'pause') return setStatut('joue')
    entree.current.saut = true
  }
  const baisser = (on: boolean) => {
    entree.current.bas = on
  }
  const basculerPause = () => {
    if (statut === 'joue') setStatut('pause')
    else if (statut === 'pause') setStatut('joue')
    else demarrer()
  }

  const onKeyDown = (ev: KeyboardEvent) => {
    const k = ev.key
    if ([' ', 'ArrowUp', 'ArrowDown'].includes(k)) ev.preventDefault()
    if (ev.repeat && k !== 'ArrowDown' && k !== 's' && k !== 'S') return
    if (k === ' ' || k === 'ArrowUp' || k === 'z' || k === 'Z' || k === 'w' || k === 'W') sauter()
    else if (k === 'ArrowDown' || k === 's' || k === 'S') baisser(true)
    else if (k === 'p' || k === 'P' || k === 'Escape') basculerPause()
  }
  const onKeyUp = (ev: KeyboardEvent) => {
    if (ev.key === 'ArrowDown' || ev.key === 's' || ev.key === 'S') baisser(false)
  }
  // Toucher la zone de jeu = sauter.
  // (preventDefault : sinon le navigateur, en retirant l'écran « Prêt ? », renverrait le focus à la page)
  const onPointerDown = (ev: PointerEvent) => {
    ev.preventDefault()
    if (ev.pointerType !== 'mouse' || ev.button === 0) sauter()
    zoneRef.current?.focus({ preventScroll: true })
  }

  const meilleur = Math.max(records.records.score ?? 0, points)

  return (
    <section className="ms dino" aria-label="Dino">
      <Guide
        etapes={[
          { title: 'Saute', text: 'Espace ou flèche du haut sur ordinateur, toucher l’écran ou le bouton « Sauter » sur téléphone. Saute par-dessus les cactus et les oiseaux qui volent bas.' },
          { title: 'Baisse-toi', text: 'Flèche du bas (ou bouton « Se baisser », à maintenir) pour passer sous les oiseaux qui volent à mi-hauteur. En l’air, ça te fait redescendre plus vite.' },
          { title: 'Va le plus loin possible', text: 'Le dino accélère petit à petit : chaque obstacle touché met fin à la course. Ton score, c’est la distance parcourue.' },
        ]}
        astuces={[
          'Ne saute pas trop tôt : attends que l’obstacle soit proche, surtout quand tout va vite.',
          'Les oiseaux tout en haut passent au-dessus de ta tête : reste au sol.',
          'P ou Échap pour faire une pause.',
        ]}
      />

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="t48-bar">
          <div className="t48-score"><span>Score</span><strong>{String(points).padStart(5, '0')}</strong></div>
          <div className="t48-score"><span>Record</span><strong>{String(meilleur).padStart(5, '0')}</strong></div>
          <button type="button" className="t48-btn" onClick={basculerPause}>
            {statut === 'joue' ? <><Pause size={16} /> Pause</> : <><Play size={16} /> {statut === 'pause' ? 'Reprendre' : 'Jouer'}</>}
          </button>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        <div
          ref={zoneRef}
          className="dino-zone"
          tabIndex={0}
          role="application"
          aria-label={`Dino : score ${points}. Espace pour sauter, flèche du bas pour se baisser.`}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={() => baisser(false)}
          onPointerDown={onPointerDown}
        >
          <canvas ref={canvasRef} aria-hidden="true" />
          {statut !== 'joue' && (
            <div className="dino-overlay">
              {statut === 'pret' && <><strong>Prêt ?</strong><span>Espace, flèche du haut ou touche l’écran pour partir</span></>}
              {statut === 'pause' && <><strong>Pause</strong><span>Saute pour reprendre</span></>}
              {statut === 'perdu' && (
                <>
                  <strong>{record ? <><Trophy size={18} /> Nouveau record !</> : 'Aïe !'}</strong>
                  <span>Score : {points}</span>
                  <button type="button" className="button button-primary" onPointerDown={ev => ev.stopPropagation()} onClick={demarrer}><RotateCcw size={15} /> Rejouer</button>
                </>
              )}
            </div>
          )}
        </div>

        {haptique.input}
        <label {...haptique.labelProps} className="dino-boutons" aria-label="Commandes">
          <div role="button" className="dino-btn" onPointerDown={ev => { ev.preventDefault(); baisser(true) }} onPointerUp={() => baisser(false)} onPointerCancel={() => baisser(false)} onPointerLeave={() => baisser(false)} onClick={() => haptique.request('tap')}><ArrowDown size={22} /> Se baisser</div>
          <div role="button" className="dino-btn is-saut" onPointerDown={ev => { ev.preventDefault(); sauter() }} onClick={() => haptique.request('tap')}><ArrowUp size={22} /> Sauter</div>
        </label>

        <div className="ms-message">
          <span className="ms-hint">
            <span className="ms-hint-mouse">Espace ou ↑ : sauter · ↓ : se baisser · P : pause</span>
            <span className="ms-hint-touch">Touche l’écran pour sauter, maintiens « Se baisser » pour te baisser</span>
          </span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Record sur cet appareil</span>
        <ul><li><span>Meilleur score</span><strong>{records.records.score ?? '—'}</strong></li></ul>
      </div>
    </section>
  )
}

