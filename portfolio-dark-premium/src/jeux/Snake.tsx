import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BrickWall, Pause, Play, RotateCcw, Trophy } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { useRecords, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { newSnake, OPPOSE, step } from './snake-logic'
import type { Dir, Snake as SnakeState } from './snake-logic'
import './snake.css'

const N = 17
const VITESSES = [
  { id: 'lent', label: 'Lent', ms: 170, info: 'pour s’entraîner' },
  { id: 'normal', label: 'Normal', ms: 115, info: 'le classique' },
  { id: 'rapide', label: 'Rapide', ms: 78, info: 'réflexes exigés' },
]
const KEYS: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', z: 'up', s: 'down', a: 'left', q: 'left', d: 'right',
}
type Statut = 'pret' | 'joue' | 'pause' | 'perdu'

// Mélange deux couleurs hexadécimales.
function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16))
  return `rgb(${pa.map((v, k) => Math.round(v + (pb[k] - v) * t)).join(',')})`
}

function dessiner(ctx: CanvasRenderingContext2D, taille: number, s: SnakeState, mort: boolean) {
  const c = taille / s.n
  ctx.clearRect(0, 0, taille, taille)
  ctx.fillStyle = '#0b0e12'
  ctx.fillRect(0, 0, taille, taille)
  // Points de la grille.
  ctx.fillStyle = '#ffffff0d'
  for (let y = 0; y < s.n; y++) for (let x = 0; x < s.n; x++) ctx.fillRect(x * c + c / 2 - 1, y * c + c / 2 - 1, 2, 2)

  // Pomme.
  const fx = s.food.x * c + c / 2
  const fy = s.food.y * c + c / 2
  ctx.shadowColor = '#ff6b6b88'
  ctx.shadowBlur = c * 0.5
  ctx.fillStyle = '#ff6b6b'
  ctx.beginPath()
  ctx.arc(fx, fy + c * 0.04, c * 0.34, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#6fd59a'
  ctx.beginPath()
  ctx.ellipse(fx + c * 0.12, fy - c * 0.3, c * 0.13, c * 0.07, -0.6, 0, Math.PI * 2)
  ctx.fill()

  // Pomme dorée (clignote avant de disparaître).
  if (s.bonus && (s.bonus.ttl > 8 || s.bonus.ttl % 2 === 0)) {
    const bx = s.bonus.x * c + c / 2
    const by = s.bonus.y * c + c / 2
    ctx.shadowColor = '#ffd36b'
    ctx.shadowBlur = c * 0.7
    ctx.fillStyle = '#ffd36b'
    ctx.beginPath()
    ctx.moveTo(bx, by - c * 0.42)
    ctx.lineTo(bx + c * 0.36, by)
    ctx.lineTo(bx, by + c * 0.42)
    ctx.lineTo(bx - c * 0.36, by)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0
  }

  // Serpent : de la queue (bleu foncé) à la tête (bleu clair), segments reliés.
  const len = s.body.length
  const pad = c * 0.1
  for (let i = len - 1; i >= 0; i--) {
    const p = s.body[i]
    const col = mort && i === 0 ? '#ff6b6b' : mix('#8bb9fa', '#24569a', len > 1 ? i / (len - 1) : 0)
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.roundRect(p.x * c + pad, p.y * c + pad, c - 2 * pad, c - 2 * pad, c * 0.3)
    ctx.fill()
    const prev = s.body[i - 1]
    if (prev && Math.abs(prev.x - p.x) + Math.abs(prev.y - p.y) === 1) {
      // Pont entre deux segments voisins (pas quand le serpent traverse un bord).
      const x = Math.min(prev.x, p.x) * c + pad
      const y = Math.min(prev.y, p.y) * c + pad
      const w = prev.x !== p.x ? 2 * c - 2 * pad : c - 2 * pad
      const h = prev.y !== p.y ? 2 * c - 2 * pad : c - 2 * pad
      ctx.fillRect(prev.x !== p.x ? x + c * 0.3 : x, prev.y !== p.y ? y + c * 0.3 : y, prev.x !== p.x ? w - c * 0.6 : w, prev.y !== p.y ? h - c * 0.6 : h)
    }
  }
  // Yeux, tournés dans le sens de la marche.
  const h = s.body[0]
  const cx = h.x * c + c / 2
  const cy = h.y * c + c / 2
  const fwd = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[s.dir]
  const side = [-fwd[1], fwd[0]]
  ctx.fillStyle = '#07111d'
  for (const k of [-1, 1]) {
    ctx.beginPath()
    ctx.arc(cx + fwd[0] * c * 0.14 + side[0] * k * c * 0.17, cy + fwd[1] * c * 0.14 + side[1] * k * c * 0.17, c * 0.075, 0, Math.PI * 2)
    ctx.fill()
  }
}

export default function Snake() {
  const [vitesse, setVitesse] = useState('normal')
  const [murs, setMurs] = useState(true)
  const [statut, setStatut] = useState<Statut>('pret')
  const [score, setScore] = useState(0)
  const [record, setRecord] = useState(false)

  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const panelRef = useRef<HTMLDivElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const plein = useFullscreen(panelRef)
  const records = useRecords('ez-snake', 'higher')
  const cle = `${vitesse}-${murs ? 'murs' : 'libre'}`

  const jeu = useRef<SnakeState>(newSnake(N, true))
  const file = useRef<Dir[]>([]) // virages demandés, appliqués un par pas
  const taille = useRef(0)
  const mortRef = useRef(false)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const reglages = useRef({ sound, vibe })
  reglages.current = { sound, vibe }
  const soumettre = useRef(records.submit)
  soumettre.current = records.submit

  const redessiner = useCallback(() => {
    const cv = canvasRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx || !taille.current) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    dessiner(ctx, taille.current, jeu.current, mortRef.current)
  }, [])

  // Le canvas suit la largeur disponible (et reste net sur les écrans haute densité).
  useEffect(() => {
    const zone = zoneRef.current
    const cv = canvasRef.current
    if (!zone || !cv) return
    const ro = new ResizeObserver(() => {
      const s = Math.floor(zone.clientWidth)
      const dpr = window.devicePixelRatio || 1
      taille.current = s
      cv.width = s * dpr
      cv.height = s * dpr
      cv.style.width = `${s}px`
      cv.style.height = `${s}px`
      redessiner()
    })
    ro.observe(zone)
    return () => ro.disconnect()
  }, [redessiner])

  const reset = (m = murs) => {
    jeu.current = newSnake(N, m)
    file.current = []
    mortRef.current = false
    setScore(0)
    setRecord(false)
    setStatut('pret')
    redessiner()
    zoneRef.current?.focus({ preventScroll: true })
  }

  // Boucle de jeu : un pas toutes les « ms » millisecondes.
  useEffect(() => {
    if (statut !== 'joue') return
    const ms = VITESSES.find(v => v.id === vitesse)!.ms
    const id = window.setInterval(() => {
      const dir = file.current.shift() ?? jeu.current.dir
      const { s, event } = step(jeu.current, dir)
      jeu.current = s
      const { sound: son, vibe: vib } = reglages.current
      if (event === 'food' || event === 'bonus') {
        setScore(s.score)
        if (son) playSound(event === 'bonus' ? 'match' : 'eat')
        if (vib && canVibrate()) vibrate('tap')
      }
      if (event === 'dead' || event === 'full') {
        mortRef.current = event === 'dead'
        setStatut('perdu')
        setScore(s.score)
        setRecord(soumettre.current(cle, s.score) && s.score > 0)
        if (son) playSound(event === 'full' ? 'win' : 'gameover')
        if (vib && canVibrate()) vibrate(event === 'full' ? 'win' : 'boom')
      }
      redessiner()
    }, ms)
    return () => window.clearInterval(id)
  }, [statut, vitesse, cle, redessiner])

  // Pause automatique si on quitte l'onglet.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setStatut(st => (st === 'joue' ? 'pause' : st))
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const tourner = (d: Dir) => {
    if (statut === 'perdu') return
    const derniere = file.current[file.current.length - 1] ?? jeu.current.dir
    if (d !== derniere && d !== OPPOSE[derniere] && file.current.length < 3) file.current.push(d)
    if (statut !== 'joue') setStatut('joue')
  }

  const basculerPause = () => {
    if (statut === 'joue') setStatut('pause')
    else if (statut === 'pause' || statut === 'pret') setStatut('joue')
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const d = KEYS[e.key] ?? KEYS[e.key.toLowerCase()]
    if (d) {
      e.preventDefault()
      tourner(d)
    } else if (e.key === ' ' || e.key.toLowerCase() === 'p') {
      e.preventDefault()
      if (statut === 'perdu') reset()
      else basculerPause()
    } else if (e.key === 'Enter' && statut === 'perdu') {
      e.preventDefault()
      reset()
    }
  }

  const onPointerDown = (e: PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY }
    zoneRef.current?.focus({ preventScroll: true })
  }
  const onPointerUp = (e: PointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
    tourner(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
  }

  const changerVitesse = (id: string) => {
    setVitesse(id)
    reset()
  }
  const changerMurs = () => {
    setMurs(!murs)
    reset(!murs)
  }

  return (
    <section className="ms snake" aria-label="Snake">
      <Guide
        etapes={[
          { title: 'Dirige le serpent', text: 'Flèches du clavier (ou Z Q S D) sur ordinateur ; sur téléphone, glisse le doigt sur la grille ou utilise la croix. Le serpent avance tout seul.', visual: <div className="snake-mini"><span className="t" /><span className="b" /><span className="b" /><span className="h" /><span /><span className="f" /></div> },
          { title: 'Mange les pommes', text: 'Chaque pomme rapporte 1 point et allonge le serpent. Une pomme dorée apparaît parfois : 5 points, mais elle disparaît vite !', visual: <div className="snake-mini"><span className="t" /><span className="b" /><span className="h" /><span className="f" /><span /><span className="g" /></div> },
          { title: 'Évite les obstacles', text: 'Si le serpent se mord la queue, c’est perdu. Avec l’option « Murs », toucher un bord fait aussi perdre ; sans, il ressort de l’autre côté.', visual: <div className="snake-mini is-dead"><span className="t" /><span className="b" /><span className="b" /><span className="b" /><span className="h" /><span className="mur" /></div> },
        ]}
        astuces={[
          'Longe les bords et fais de grandes boucles : tu garderas de la place au centre.',
          'Barre d’espace (ou P) pour faire une pause, et le jeu se met aussi en pause si tu changes d’onglet.',
          'Commence en vitesse « Lent » pour prendre le coup de main.',
        ]}
      />

      <div className="ms-levels snake-vitesses" role="radiogroup" aria-label="Vitesse">
        {VITESSES.map(v => (
          <button key={v.id} type="button" role="radio" aria-checked={vitesse === v.id} className={vitesse === v.id ? 'is-active' : ''} onClick={() => changerVitesse(v.id)}>
            <strong>{v.label}</strong>
            <small>{v.info}</small>
          </button>
        ))}
      </div>

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="t48-bar">
          <div className="t48-score"><span>Score</span><strong>{score}</strong></div>
          <div className="t48-score"><span>Record</span><strong>{Math.max(records.records[cle] ?? 0, score)}</strong></div>
          <button type="button" className="t48-btn" onClick={basculerPause} disabled={statut === 'perdu'}>
            {statut === 'joue' ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Jouer</>}
          </button>
          <button type="button" className="t48-btn" onClick={() => reset()}><RotateCcw size={16} /> Rejouer</button>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle}>
          <button type="button" role="switch" aria-checked={murs} className={murs ? 'ms-switch is-on' : 'ms-switch'} onClick={changerMurs} title="Toucher un bord fait perdre">
            <BrickWall size={15} /> Murs <span className="ms-switch-track" aria-hidden="true" />
          </button>
        </Outils>

        <div
          ref={zoneRef}
          className={`snake-zone${murs ? ' has-walls' : ''}${statut === 'perdu' ? ' is-dead' : ''}`}
          tabIndex={0}
          role="application"
          aria-label={`Snake, score ${score}. Flèches pour diriger, espace pour la pause.`}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipe.current = null)}
        >
          <canvas ref={canvasRef} aria-hidden="true" />
          {statut !== 'joue' && (
            <div className="snake-overlay">
              {statut === 'pret' && <><strong>Prêt ?</strong><span>Appuie sur une flèche ou glisse le doigt pour démarrer</span></>}
              {statut === 'pause' && <><strong>Pause</strong><span>Une flèche ou la barre d’espace pour reprendre</span></>}
              {statut === 'perdu' && (
                <>
                  <strong>{record ? <><Trophy size={20} /> Nouveau record !</> : 'Perdu !'}</strong>
                  <span>Score : {score}</span>
                  <button type="button" className="button button-primary" onClick={() => reset()}>Rejouer</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Croix directionnelle pour les écrans tactiles. */}
        <div className="snake-croix" aria-label="Diriger le serpent">
          <button type="button" className="haut" aria-label="Haut" onPointerDown={e => { e.preventDefault(); tourner('up') }}><ArrowUp size={22} /></button>
          <button type="button" className="gauche" aria-label="Gauche" onPointerDown={e => { e.preventDefault(); tourner('left') }}><ArrowLeft size={22} /></button>
          <button type="button" className="droite" aria-label="Droite" onPointerDown={e => { e.preventDefault(); tourner('right') }}><ArrowRight size={22} /></button>
          <button type="button" className="bas" aria-label="Bas" onPointerDown={e => { e.preventDefault(); tourner('down') }}><ArrowDown size={22} /></button>
        </div>

        <div className="ms-message">
          <span className="ms-hint">
            <span className="ms-hint-mouse">Clique sur la grille, puis flèches (ou Z Q S D) · Espace : pause</span>
            <span className="ms-hint-touch">Glisse le doigt sur la grille ou utilise la croix</span>
          </span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Records sur cet appareil</span>
        <ul>
          {VITESSES.map(v => (
            <li key={v.id}>
              <span>{v.label}</span>
              <strong>{records.records[`${v.id}-murs`] ?? '—'}</strong>
              <small>{records.records[`${v.id}-libre`] !== undefined ? `sans murs : ${records.records[`${v.id}-libre`]}` : 'avec murs'}</small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
