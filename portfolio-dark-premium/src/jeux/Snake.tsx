import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BrickWall, Grid3x3, Move, Pause, Play, RotateCcw, Trophy } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { loadJSON, saveJSON, useRecords, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { newSnake, OPPOSE, step } from './snake-logic'
import type { Dir, Pt, Snake as SnakeState } from './snake-logic'
import './snake.css'

// Tailles de l'arène (nombre de cases par côté). « Moyenne » est la taille d'origine.
const ARENES = [
  { id: 'petite', label: 'Petite', n: 11 },
  { id: 'moyenne', label: 'Moyenne', n: 17 },
  { id: 'grande', label: 'Grande', n: 23 },
]
const ARENE_KEY = 'ez-snake-arene'
const tailleArene = (id: string) => ARENES.find(a => a.id === id)?.n ?? 17
// Clé des records : vitesse, murs, et taille de l'arène (rien pour « Moyenne », comme avant).
const cleRecord = (vitesse: string, murs: boolean, arene: string) => `${vitesse}-${murs ? 'murs' : 'libre'}${arene === 'moyenne' ? '' : `-${arene}`}`
const CROIX_KEY = 'ez-snake-croix' // flèches à l'écran : cachées par défaut
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

// Fond (couleur + points de la grille), préparé une fois par taille d'écran.
function preparerFond(taille: number, n: number, dpr: number): HTMLCanvasElement {
  const f = document.createElement('canvas')
  f.width = Math.round(taille * dpr)
  f.height = Math.round(taille * dpr)
  const ctx = f.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const c = taille / n
  ctx.fillStyle = '#0b0e12'
  ctx.fillRect(0, 0, taille, taille)
  ctx.fillStyle = '#ffffff0d'
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) ctx.fillRect(x * c + c / 2 - 1, y * c + c / 2 - 1, 2, 2)
  return f
}

// Ce qu'il faut pour dessiner entre deux pas : positions d'avant, avancement (0 → 1), pomme en train d'être mangée.
interface Rendu {
  avant: Pt[]
  t: number
  mange: { x: number; y: number; dore: boolean } | null
}

function pomme(ctx: CanvasRenderingContext2D, c: number, x: number, y: number, k = 1) {
  const fx = x * c + c / 2
  const fy = y * c + c / 2
  ctx.shadowColor = '#ff6b6b88'
  ctx.shadowBlur = c * 0.5 * k
  ctx.fillStyle = '#ff6b6b'
  ctx.beginPath()
  ctx.arc(fx, fy + c * 0.04, c * 0.34 * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#6fd59a'
  ctx.beginPath()
  ctx.ellipse(fx + c * 0.12 * k, fy - c * 0.3 * k, c * 0.13 * k, c * 0.07 * k, -0.6, 0, Math.PI * 2)
  ctx.fill()
}
function pommeDoree(ctx: CanvasRenderingContext2D, c: number, x: number, y: number, k = 1) {
  const bx = x * c + c / 2
  const by = y * c + c / 2
  ctx.shadowColor = '#ffd36b'
  ctx.shadowBlur = c * 0.7 * k
  ctx.fillStyle = '#ffd36b'
  ctx.beginPath()
  ctx.moveTo(bx, by - c * 0.42 * k)
  ctx.lineTo(bx + c * 0.36 * k, by)
  ctx.lineTo(bx, by + c * 0.42 * k)
  ctx.lineTo(bx - c * 0.36 * k, by)
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 0
}

function dessiner(ctx: CanvasRenderingContext2D, taille: number, s: SnakeState, mort: boolean, r: Rendu, fond: HTMLCanvasElement | null) {
  const c = taille / s.n
  if (fond) ctx.drawImage(fond, 0, 0, taille, taille)
  else {
    ctx.fillStyle = '#0b0e12'
    ctx.fillRect(0, 0, taille, taille)
  }

  pomme(ctx, c, s.food.x, s.food.y)
  // Pomme dorée (clignote avant de disparaître).
  if (s.bonus && (s.bonus.ttl > 8 || s.bonus.ttl % 2 === 0)) pommeDoree(ctx, c, s.bonus.x, s.bonus.y)
  // Pomme qu'on vient de manger : elle rétrécit pendant que la tête arrive dessus.
  if (r.mange && r.t < 1) (r.mange.dore ? pommeDoree : pomme)(ctx, c, r.mange.x, r.mange.y, 1 - r.t)

  // Serpent : un tube continu qui passe par le centre des cases.
  // La tête avance et la queue se rétracte en douceur entre deux pas.
  const L = s.body.length
  const entre = (i: number) => {
    const p = s.body[i]
    const a = r.avant[i] ?? r.avant[r.avant.length - 1] ?? p
    let dx = p.x - a.x
    let dy = p.y - a.y
    if (dx > 1) dx = -1 // passage par un bord (sans murs)
    else if (dx < -1) dx = 1
    if (dy > 1) dy = -1
    else if (dy < -1) dy = 1
    return { x: p.x - dx * (1 - r.t), y: p.y - dy * (1 - r.t) }
  }
  // Chemin : tête en mouvement, centres des cases du corps, bout de queue en mouvement.
  const pts = [entre(0), ...s.body.slice(1), entre(L - 1)]
  const largeur = c * 0.78
  const centre = (v: number) => v * c + c / 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = largeur
  const couleur = (i: number) => (mort && i === 0 ? '#ff6b6b' : mix('#8bb9fa', '#24569a', L > 1 ? Math.min(1, i / (L - 1)) : 0))
  const ligne = (p: Pt, q: Pt) => {
    ctx.beginPath()
    ctx.moveTo(centre(p.x), centre(p.y))
    ctx.lineTo(centre(q.x), centre(q.y))
    ctx.stroke()
  }
  for (let i = pts.length - 1; i >= 1; i--) {
    const p = pts[i]
    const q = pts[i - 1]
    // De part et d'autre d'un bord (sans murs) : on trace des deux côtés, le canvas coupe le reste.
    const ox = q.x - p.x > 1.5 ? -s.n : q.x - p.x < -1.5 ? s.n : 0
    const oy = q.y - p.y > 1.5 ? -s.n : q.y - p.y < -1.5 ? s.n : 0
    ctx.strokeStyle = couleur(i)
    ligne(p, { x: q.x + ox, y: q.y + oy })
    if (ox || oy) ligne({ x: p.x - ox, y: p.y - oy }, q)
  }
  // Tête (et son double de l'autre côté quand elle traverse un bord).
  const h = pts[0]
  const fwd = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[s.dir]
  const side = [-fwd[1], fwd[0]]
  const copies = [h]
  if (h.x < 0) copies.push({ x: h.x + s.n, y: h.y })
  if (h.x > s.n - 1) copies.push({ x: h.x - s.n, y: h.y })
  if (h.y < 0) copies.push({ x: h.x, y: h.y + s.n })
  if (h.y > s.n - 1) copies.push({ x: h.x, y: h.y - s.n })
  for (const t of copies) {
    const cx = centre(t.x)
    const cy = centre(t.y)
    ctx.fillStyle = couleur(0)
    ctx.beginPath()
    ctx.roundRect(cx - c * 0.42, cy - c * 0.42, c * 0.84, c * 0.84, c * 0.32)
    ctx.fill()
    ctx.fillStyle = '#07111d'
    for (const k of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(cx + fwd[0] * c * 0.14 + side[0] * k * c * 0.17, cy + fwd[1] * c * 0.14 + side[1] * k * c * 0.17, c * 0.075, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export default function Snake() {
  const [vitesse, setVitesse] = useState('normal')
  const [murs, setMurs] = useState(true)
  const [croix, setCroix] = useState(() => loadJSON<boolean>(CROIX_KEY, false))
  const [arene, setArene] = useState(() => {
    const a = loadJSON<string>(ARENE_KEY, 'moyenne')
    return ARENES.some(x => x.id === a) ? a : 'moyenne'
  })
  const n = tailleArene(arene)
  const [statut, setStatut] = useState<Statut>('pret')
  const [score, setScore] = useState(0)
  const [record, setRecord] = useState(false)

  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const panelRef = useRef<HTMLDivElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const plein = useFullscreen(panelRef)
  const records = useRecords('ez-snake', 'higher')
  const cle = cleRecord(vitesse, murs, arene)

  const jeu = useRef<SnakeState>(newSnake(n, true))
  const file = useRef<Dir[]>([]) // virages demandés, appliqués un par pas
  const taille = useRef(0)
  const fond = useRef<HTMLCanvasElement | null>(null)
  const mortRef = useRef(false)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const reglages = useRef({ sound, vibe })
  reglages.current = { sound, vibe }
  const soumettre = useRef(records.submit)
  soumettre.current = records.submit
  const statutRef = useRef<Statut>(statut)
  statutRef.current = statut
  const msRef = useRef(115)
  msRef.current = VITESSES.find(v => v.id === vitesse)!.ms
  const cleRef = useRef(cle)
  cleRef.current = cle
  // Animation : temps écoulé depuis le dernier pas, positions d'avant ce pas, pomme mangée.
  const anim = useRef<{ acc: number; avant: Pt[]; mange: Rendu['mange'] }>({ acc: 0, avant: jeu.current.body, mange: null })
  const sale = useRef(true) // il faut redessiner même si la partie est arrêtée

  const redessiner = useCallback(() => {
    sale.current = true
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
      // Taille d'affichage gérée en CSS (100 %) : le canvas ne force jamais la zone à rester grande.
      fond.current = s ? preparerFond(s, jeu.current.n, dpr) : null
      sale.current = true
    })
    ro.observe(zone)
    return () => ro.disconnect()
  }, [])

  const reset = (m = murs, taille2 = n) => {
    jeu.current = newSnake(taille2, m)
    // Nouvelle taille d'arène : le fond (points de la grille) change aussi.
    if (taille.current && (!fond.current || taille2 !== n)) fond.current = preparerFond(taille.current, taille2, window.devicePixelRatio || 1)
    file.current = []
    mortRef.current = false
    anim.current = { acc: 0, avant: jeu.current.body, mange: null }
    setScore(0)
    setRecord(false)
    setStatut('pret')
    statutRef.current = 'pret'
    redessiner()
    zoneRef.current?.focus({ preventScroll: true })
  }

  // Un pas du jeu (même rythme qu'avant : toutes les « ms » millisecondes).
  const pas = () => {
    const dir = file.current.shift() ?? jeu.current.dir
    const avant = jeu.current.body
    const { s, event } = step(jeu.current, dir)
    jeu.current = s
    const vivant = event !== 'dead' && event !== 'full'
    anim.current.avant = vivant ? avant : s.body
    anim.current.mange = event === 'food' || event === 'bonus' ? { x: s.body[0].x, y: s.body[0].y, dore: event === 'bonus' } : null
    const { sound: son, vibe: vib } = reglages.current
    if (event === 'food' || event === 'bonus') {
      setScore(s.score)
      if (son) playSound(event === 'bonus' ? 'match' : 'eat')
      if (vib && canVibrate()) vibrate('tap')
    }
    if (!vivant) {
      mortRef.current = event === 'dead'
      statutRef.current = 'perdu'
      anim.current.acc = 0
      setStatut('perdu')
      setScore(s.score)
      setRecord(soumettre.current(cleRef.current, s.score) && s.score > 0)
      if (son) playSound(event === 'full' ? 'win' : 'gameover')
      if (vib && canVibrate()) vibrate(event === 'full' ? 'win' : 'boom')
    }
  }
  const pasRef = useRef(pas)
  pasRef.current = pas

  // Boucle d'affichage : une image à chaque rafraîchissement de l'écran (60 ou 120 par seconde),
  // le serpent glisse en continu d'une case à l'autre.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(250, now - last)
      last = now
      const a = anim.current
      const ms = msRef.current
      if (statutRef.current === 'joue') {
        a.acc += dt
        while (a.acc >= ms && statutRef.current === 'joue') {
          a.acc -= ms
          pasRef.current()
        }
      }
      if (statutRef.current === 'joue' || sale.current) {
        sale.current = false
        const cv = canvasRef.current
        const ctx = cv?.getContext('2d')
        if (cv && ctx && taille.current) {
          const dpr = window.devicePixelRatio || 1
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          const t = statutRef.current === 'perdu' ? 1 : Math.min(1, a.acc / ms)
          dessiner(ctx, taille.current, jeu.current, mortRef.current, { avant: a.avant, t, mange: a.mange }, fond.current)
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

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
  // Le virage part dès que le doigt a assez glissé (sans attendre qu'il se lève),
  // et on peut enchaîner plusieurs virages sans lever le doigt.
  const glisser = (e: PointerEvent, fin: boolean) => {
    const s = swipe.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (fin) swipe.current = null
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return
    tourner(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
    if (!fin) swipe.current = { x: e.clientX, y: e.clientY }
  }

  const changerVitesse = (id: string) => {
    setVitesse(id)
    reset()
  }
  const changerMurs = () => {
    setMurs(!murs)
    reset(!murs)
  }
  const changerArene = (id: string) => {
    if (id === arene) return
    setArene(id)
    saveJSON(ARENE_KEY, id)
    reset(murs, tailleArene(id))
  }

  return (
    <section className={`ms snake${croix ? ' avec-croix' : ''}`} aria-label="Snake">
      <Guide
        etapes={[
          { title: 'Dirige le serpent', text: 'Flèches du clavier (ou Z Q S D) sur ordinateur ; sur téléphone, glisse le doigt sur la grille (le bouton « Flèches » affiche aussi une croix). Le serpent avance tout seul.', visual: <div className="snake-mini"><span className="t" /><span className="b" /><span className="b" /><span className="h" /><span /><span className="f" /></div> },
          { title: 'Mange les pommes', text: 'Chaque pomme rapporte 1 point et allonge le serpent. Une pomme dorée apparaît parfois : 5 points, mais elle disparaît vite !', visual: <div className="snake-mini"><span className="t" /><span className="b" /><span className="h" /><span className="f" /><span /><span className="g" /></div> },
          { title: 'Évite les obstacles', text: 'Si le serpent se mord la queue, c’est perdu. Avec l’option « Murs », toucher un bord fait aussi perdre ; sans, il ressort de l’autre côté.', visual: <div className="snake-mini is-dead"><span className="t" /><span className="b" /><span className="b" /><span className="b" /><span className="h" /><span className="mur" /></div> },
        ]}
        astuces={[
          'Longe les bords et fais de grandes boucles : tu garderas de la place au centre.',
          'Barre d’espace (ou P) pour faire une pause, et le jeu se met aussi en pause si tu changes d’onglet.',
          'Commence en vitesse « Lent » pour prendre le coup de main.',
          'L’option « Arène » change la taille de la grille : petite (11 × 11), moyenne (17 × 17) ou grande (23 × 23). Chaque taille a ses propres records.',
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
          <button type="button" className="t48-btn" onClick={basculerPause} disabled={statut === 'perdu'} aria-label={statut === 'joue' ? 'Pause' : 'Jouer'}>
            {statut === 'joue' ? <><Pause size={16} /> <span className="t48-btn-texte">Pause</span></> : <><Play size={16} /> <span className="t48-btn-texte">Jouer</span></>}
          </button>
          <button type="button" className="t48-btn" onClick={() => reset()} aria-label="Rejouer"><RotateCcw size={16} /> <span className="t48-btn-texte">Rejouer</span></button>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle}>
          <button type="button" role="switch" aria-checked={murs} className={murs ? 'ms-switch is-on' : 'ms-switch'} onClick={changerMurs} title="Toucher un bord fait perdre">
            <BrickWall size={15} /> Murs <span className="ms-switch-track" aria-hidden="true" />
          </button>
          <button type="button" role="switch" aria-checked={croix} className={`ms-switch snake-opt-croix${croix ? ' is-on' : ''}`} onClick={() => { setCroix(!croix); saveJSON(CROIX_KEY, !croix) }} title="Afficher des flèches sous la grille">
            <Move size={15} /> Flèches <span className="ms-switch-track" aria-hidden="true" />
          </button>
          <div className="snake-arene" role="radiogroup" aria-label="Taille de l’arène">
            <span><Grid3x3 size={15} /> Arène</span>
            {ARENES.map(a => (
              <button key={a.id} type="button" role="radio" aria-checked={arene === a.id} className={arene === a.id ? 'is-active' : ''} title={`${a.n} × ${a.n} cases`} onClick={() => changerArene(a.id)}>
                {a.label}
              </button>
            ))}
          </div>
        </Outils>

        <div
          ref={zoneRef}
          className={`snake-zone${murs ? ' has-walls' : ''}${statut === 'perdu' ? ' is-dead' : ''}`}
          tabIndex={0}
          role="application"
          aria-label={`Snake, score ${score}. Flèches pour diriger, espace pour la pause.`}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={e => glisser(e, false)}
          onPointerUp={e => glisser(e, true)}
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

        {/* Croix directionnelle pour les écrans tactiles (option « Flèches »). */}
        {croix && <div className="snake-croix" aria-label="Diriger le serpent">
          <button type="button" className="haut" aria-label="Haut" onPointerDown={e => { e.preventDefault(); tourner('up') }}><ArrowUp size={22} /></button>
          <button type="button" className="gauche" aria-label="Gauche" onPointerDown={e => { e.preventDefault(); tourner('left') }}><ArrowLeft size={22} /></button>
          <button type="button" className="droite" aria-label="Droite" onPointerDown={e => { e.preventDefault(); tourner('right') }}><ArrowRight size={22} /></button>
          <button type="button" className="bas" aria-label="Bas" onPointerDown={e => { e.preventDefault(); tourner('down') }}><ArrowDown size={22} /></button>
        </div>}

        <div className="ms-message">
          <span className="ms-hint">
            <span className="ms-hint-mouse">Clique sur la grille, puis flèches (ou Z Q S D) · Espace : pause</span>
            <span className="ms-hint-touch">{croix ? 'Glisse le doigt sur la grille ou utilise les flèches' : 'Glisse le doigt sur la grille pour diriger le serpent'}</span>
          </span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Records sur cet appareil · arène {ARENES.find(a => a.id === arene)!.label.toLowerCase()}</span>
        <ul>
          {VITESSES.map(v => (
            <li key={v.id}>
              <span>{v.label}</span>
              <strong>{records.records[cleRecord(v.id, true, arene)] ?? '—'}</strong>
              <small>{records.records[cleRecord(v.id, false, arene)] !== undefined ? `sans murs : ${records.records[cleRecord(v.id, false, arene)]}` : 'avec murs'}</small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
