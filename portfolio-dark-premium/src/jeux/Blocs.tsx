import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as RPointerEvent } from 'react'
import { ArrowDown, ArrowDownToLine, ArrowLeft, ArrowRight, Pause, Play, RotateCcw, RotateCw, Trophy } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { useRecords, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { useHaptique } from './commun/useHaptique'
import { clearRows, dropDistance, emptyBoard, fits, gravityMs, H, LINE_POINTS, lock, newBag, SHAPES, spawn, tryMove, tryRotate, W } from './blocs-logic'
import type { Board, Kind, Piece } from './blocs-logic'
import './blocs.css'

export const COULEURS: Record<Kind, string> = { I: '#5fd6d6', O: '#ffd36b', T: '#b79bff', S: '#6fd59a', Z: '#ff7b7b', J: '#6fa0f0', L: '#ffb36b' }
const DEPARTS = [
  { niveau: 1, label: 'Débutant', info: 'niveau 1 · tranquille' },
  { niveau: 5, label: 'Confirmé', info: 'niveau 5 · ça accélère' },
  { niveau: 10, label: 'Expert', info: 'niveau 10 · très rapide' },
]
const DAS = 170 // délai avant répétition quand on maintient gauche/droite (ms)
const ARR = 50 // intervalle de répétition (ms)
const LOCK_DELAY = 500
const CLEAR_MS = 200
type Statut = 'pret' | 'joue' | 'pause' | 'fini'

interface Etat {
  board: Board
  piece: Piece | null
  file: Kind[]
  reserve: Kind | null
  peutReserver: boolean
  score: number
  lignes: number
  niveau: number
  depart: number
  clearing: { rows: number[]; t: number } | null
  lockT: number
  lockResets: number
  lowest: number
  gravAcc: number
  soft: boolean
  dir: { d: -1 | 1; t: number; arr: number } | null // gauche/droite maintenu
}

function etatInitial(depart: number): Etat {
  return {
    board: emptyBoard(), piece: null, file: [...newBag(), ...newBag()], reserve: null, peutReserver: true,
    score: 0, lignes: 0, niveau: depart, depart, clearing: null, lockT: 0, lockResets: 0, lowest: -99, gravAcc: 0, soft: false, dir: null,
  }
}

// Bloc avec relief (dessus éclairé, dessous ombré).
function bloc(ctx: CanvasRenderingContext2D, x: number, y: number, c: number, couleur: string, alpha = 1) {
  ctx.globalAlpha = alpha
  const p = Math.max(1, c * 0.06)
  ctx.fillStyle = couleur
  ctx.beginPath()
  ctx.roundRect(x + p, y + p, c - 2 * p, c - 2 * p, c * 0.18)
  ctx.fill()
  ctx.fillStyle = '#ffffff40'
  ctx.fillRect(x + p * 2.5, y + p * 2, c - p * 5, Math.max(1, c * 0.1))
  ctx.fillStyle = '#00000030'
  ctx.fillRect(x + p * 2.5, y + c - p * 2 - Math.max(1, c * 0.1), c - p * 5, Math.max(1, c * 0.1))
  ctx.globalAlpha = 1
}

// Petite pièce pour la réserve, les suivantes et le guide.
export function MiniPiece({ kind, dim = false }: { kind: Kind | null; dim?: boolean }) {
  if (!kind) return <div className="bl-mini" />
  const cells = SHAPES[kind][0]
  const minX = Math.min(...cells.map(c => c[0]))
  const maxX = Math.max(...cells.map(c => c[0]))
  const minY = Math.min(...cells.map(c => c[1]))
  const maxY = Math.max(...cells.map(c => c[1]))
  return (
    <div className={`bl-mini${dim ? ' is-dim' : ''}`} style={{ gridTemplateColumns: `repeat(${maxX - minX + 1}, var(--m))`, gridTemplateRows: `repeat(${maxY - minY + 1}, var(--m))` }}>
      {cells.map(([x, y]) => <span key={`${x}-${y}`} style={{ gridColumn: x - minX + 1, gridRow: y - minY + 1, background: COULEURS[kind] }} />)}
    </div>
  )
}

export default function Blocs() {
  const [depart, setDepart] = useState(1)
  const [statut, setStatut] = useState<Statut>('pret')
  const [ui, setUi] = useState({ score: 0, lignes: 0, niveau: 1, reserve: null as Kind | null, suivantes: [] as Kind[], peutReserver: true })
  const [record, setRecord] = useState(false)

  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const haptique = useHaptique(vibe)
  const panelRef = useRef<HTMLDivElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const plein = useFullscreen(panelRef)
  const records = useRecords('ez-blocs', 'higher')
  const lignesRecord = useRecords('ez-blocs-lignes', 'higher')

  const e = useRef<Etat>(etatInitial(1))
  const statutRef = useRef<Statut>('pret')
  statutRef.current = statut
  const cell = useRef(0)
  const opts = useRef({ sound, vibe })
  opts.current = { sound, vibe }
  const soumettre = useRef({ records, lignesRecord })
  soumettre.current = { records, lignesRecord }

  const son = (s: Parameters<typeof playSound>[0], level?: number) => opts.current.sound && playSound(s, level)
  const vibre = (k: Parameters<typeof vibrate>[0]) => opts.current.vibe && canVibrate() && vibrate(k)

  const synchro = useCallback(() => {
    const s = e.current
    setUi({ score: s.score, lignes: s.lignes, niveau: s.niveau, reserve: s.reserve, suivantes: s.file.slice(0, 3), peutReserver: s.peutReserver })
  }, [])

  // ----- Dessin -----
  const dessiner = useCallback(() => {
    const cv = canvasRef.current
    const ctx = cv?.getContext('2d')
    const c = cell.current
    if (!cv || !ctx || !c) return
    const s = e.current
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#0b0e12'
    ctx.fillRect(0, 0, W * c, H * c)
    ctx.strokeStyle = '#ffffff08'
    ctx.lineWidth = 1
    for (let x = 1; x < W; x++) { ctx.beginPath(); ctx.moveTo(x * c + 0.5, 0); ctx.lineTo(x * c + 0.5, H * c); ctx.stroke() }
    for (let y = 1; y < H; y++) { ctx.beginPath(); ctx.moveTo(0, y * c + 0.5); ctx.lineTo(W * c, y * c + 0.5); ctx.stroke() }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = s.board[y * W + x]
        if (k) bloc(ctx, x * c, y * c, c, COULEURS[k])
      }
    }
    if (s.clearing) {
      const t = Math.min(1, (performance.now() - s.clearing.t) / CLEAR_MS)
      ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - t)})`
      for (const y of s.clearing.rows) ctx.fillRect(0, y * c, W * c, c)
    }
    if (s.piece && statutRef.current !== 'fini') {
      const p = s.piece
      const ghost = { ...p, y: p.y + dropDistance(s.board, p) }
      for (const [x, y] of SHAPES[p.kind][p.rot]) {
        const gy = ghost.y + y
        if (gy >= 0) {
          ctx.strokeStyle = COULEURS[p.kind] + '90'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.roundRect((ghost.x + x) * c + 3, gy * c + 3, c - 6, c - 6, c * 0.16)
          ctx.stroke()
        }
      }
      for (const [x, y] of SHAPES[p.kind][p.rot]) if (p.y + y >= 0) bloc(ctx, (p.x + x) * c, (p.y + y) * c, c, COULEURS[p.kind])
    }
  }, [])

  // Le canvas suit la place disponible (largeur et hauteur), net sur écran haute densité.
  useEffect(() => {
    const zone = zoneRef.current
    const cv = canvasRef.current
    if (!zone || !cv) return
    const ro = new ResizeObserver(() => {
      const c = Math.max(8, Math.floor(Math.min(zone.clientWidth / W, zone.clientHeight / H)))
      const dpr = window.devicePixelRatio || 1
      cell.current = c
      cv.width = W * c * dpr
      cv.height = H * c * dpr
      cv.style.width = `${W * c}px`
      cv.style.height = `${H * c}px`
      dessiner()
    })
    ro.observe(zone)
    return () => ro.disconnect()
  }, [dessiner])

  // ----- Règles en action -----
  const finPartie = () => {
    setStatut('fini')
    statutRef.current = 'fini'
    const s = e.current
    const r = soumettre.current.records.submit('score', s.score)
    soumettre.current.lignesRecord.submit('lignes', s.lignes)
    setRecord(r && s.score > 0)
    son('gameover')
    vibre('boom')
  }

  const suivante = () => {
    const s = e.current
    const kind = s.file.shift()!
    if (s.file.length < 7) s.file.push(...newBag())
    s.piece = spawn(kind)
    s.lockT = 0
    s.lockResets = 0
    s.lowest = s.piece.y
    s.gravAcc = 0
    if (!fits(s.board, s.piece)) finPartie()
    synchro()
  }

  const poser = () => {
    const s = e.current
    if (!s.piece) return
    const res = lock(s.board, s.piece)
    s.board = res.board
    s.piece = null
    s.peutReserver = true
    if (res.above) return finPartie()
    if (res.full.length) {
      const n = res.full.length
      s.lignes += n
      s.score += LINE_POINTS[n] * s.niveau
      const niveau = Math.max(s.depart, s.depart + Math.floor(s.lignes / 10))
      if (niveau > s.niveau) son('win')
      s.niveau = niveau
      s.clearing = { rows: res.full, t: performance.now() }
      son('line', n)
      vibre(n >= 4 ? 'win' : 'success')
      synchro()
    } else {
      son('lock')
      suivante()
    }
  }

  // Après un déplacement ou une rotation au sol, la pièce reste un peu mobile (15 fois max).
  const repousserVerrou = () => {
    const s = e.current
    if (s.piece && !tryMove(s.board, s.piece, 0, 1) && s.lockResets < 15) {
      s.lockT = 0
      s.lockResets++
    }
  }

  const deplacer = (dx: number) => {
    const s = e.current
    if (statutRef.current !== 'joue' || !s.piece || s.clearing) return false
    const q = tryMove(s.board, s.piece, dx, 0)
    if (!q) return false
    s.piece = q
    repousserVerrou()
    dessiner()
    return true
  }

  const tourner = (dir: 1 | -1) => {
    const s = e.current
    if (statutRef.current !== 'joue' || !s.piece || s.clearing) return
    const q = tryRotate(s.board, s.piece, dir)
    if (!q) return
    s.piece = q
    repousserVerrou()
    son('rotate')
    dessiner()
  }

  const chuteDirecte = () => {
    const s = e.current
    if (statutRef.current !== 'joue' || !s.piece || s.clearing) return
    const d = dropDistance(s.board, s.piece)
    s.piece = { ...s.piece, y: s.piece.y + d }
    s.score += 2 * d
    son('drop')
    poser()
    dessiner()
  }

  const reserver = () => {
    const s = e.current
    if (statutRef.current !== 'joue' || !s.piece || !s.peutReserver || s.clearing) return
    const actuelle = s.piece.kind
    if (s.reserve) {
      s.piece = spawn(s.reserve)
      s.lockT = 0
      s.lockResets = 0
      s.lowest = s.piece.y
    } else {
      s.piece = null
      suivante()
    }
    s.reserve = actuelle
    s.peutReserver = false
    son('flip')
    synchro()
    dessiner()
  }

  // ----- Boucle de jeu -----
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(100, now - last)
      last = now
      const s = e.current
      if (statutRef.current === 'joue') {
        if (s.clearing) {
          if (now - s.clearing.t >= CLEAR_MS) {
            s.board = clearRows(s.board, s.clearing.rows)
            s.clearing = null
            suivante()
          }
        } else if (s.piece) {
          // Gauche/droite maintenu : répétition automatique.
          if (s.dir) {
            s.dir.t += dt
            if (s.dir.t >= DAS) {
              s.dir.arr += dt
              while (s.dir.arr >= ARR) {
                s.dir.arr -= ARR
                if (!deplacer(s.dir.d)) break
              }
            }
          }
          // Gravité (beaucoup plus rapide en chute douce).
          const intervalle = s.soft ? Math.min(gravityMs(s.niveau), 45) : gravityMs(s.niveau)
          s.gravAcc += dt
          while (s.gravAcc >= intervalle && s.piece) {
            s.gravAcc -= intervalle
            const q = tryMove(s.board, s.piece, 0, 1)
            if (!q) {
              s.gravAcc = 0
              break
            }
            s.piece = q
            if (s.soft) s.score += 1
            if (q.y > s.lowest) {
              s.lowest = q.y
              s.lockT = 0
              s.lockResets = 0
            }
          }
          // Posée au sol : on verrouille après un court délai.
          if (s.piece && !tryMove(s.board, s.piece, 0, 1)) {
            s.lockT += dt
            if (s.lockT >= LOCK_DELAY) poser()
          } else s.lockT = 0
          if (s.soft) synchro()
        }
      }
      dessiner()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dessiner])

  // Pause automatique si on quitte l'onglet.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && statutRef.current === 'joue') setStatut('pause')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const demarrer = (niveau = depart) => {
    e.current = etatInitial(niveau)
    setRecord(false)
    setStatut('joue')
    statutRef.current = 'joue'
    suivante()
    zoneRef.current?.focus({ preventScroll: true })
  }
  const basculerPause = () => {
    if (statut === 'joue') setStatut('pause')
    else if (statut === 'pause') setStatut('joue')
    else if (statut === 'pret' || statut === 'fini') demarrer()
    zoneRef.current?.focus({ preventScroll: true })
  }

  // ----- Clavier -----
  const onKeyDown = (ev: KeyboardEvent) => {
    const k = ev.key
    const s = e.current
    const jeu = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(k)
    if (jeu) ev.preventDefault()
    if (k === 'p' || k === 'P' || k === 'Escape') return basculerPause()
    if (statut !== 'joue') {
      if (k === 'Enter' || k === ' ') demarrer()
      return
    }
    if (ev.repeat && k !== 'ArrowDown') return // la répétition est gérée par le jeu
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      const d = k === 'ArrowLeft' ? -1 : 1
      deplacer(d)
      s.dir = { d, t: 0, arr: 0 }
    } else if (k === 'ArrowDown') s.soft = true
    else if (k === 'ArrowUp' || k === 'x' || k === 'X') tourner(1)
    else if (k === 'z' || k === 'Z' || k === 'w' || k === 'W' || k === 'Control') tourner(-1)
    else if (k === ' ') chuteDirecte()
    else if (k === 'c' || k === 'C' || k === 'Shift') reserver()
  }
  const onKeyUp = (ev: KeyboardEvent) => {
    const s = e.current
    if ((ev.key === 'ArrowLeft' && s.dir?.d === -1) || (ev.key === 'ArrowRight' && s.dir?.d === 1)) s.dir = null
    if (ev.key === 'ArrowDown') {
      s.soft = false
      synchro()
    }
  }
  const relacher = () => {
    e.current.dir = null
    e.current.soft = false
  }

  // ----- Gestes sur la grille : toucher = tourner, glisser = déplacer, coup vers le bas = chute -----
  const geste = useRef<{ x: number; y: number; t: number; pas: number; chute: boolean } | null>(null)
  const onPointerDown = (ev: RPointerEvent) => {
    zoneRef.current?.focus({ preventScroll: true })
    if (ev.pointerType === 'mouse') return
    geste.current = { x: ev.clientX, y: ev.clientY, t: performance.now(), pas: 0, chute: false }
  }
  const onPointerMove = (ev: RPointerEvent) => {
    const g = geste.current
    const c = cell.current
    if (!g || !c || statut !== 'joue') return
    const pas = Math.trunc((ev.clientX - g.x) / c)
    while (g.pas < pas) { if (!deplacer(1)) break; g.pas++ }
    while (g.pas > pas) { if (!deplacer(-1)) break; g.pas-- }
    const dy = ev.clientY - g.y
    if (!g.chute && dy > c * 3 && performance.now() - g.t < 260) {
      g.chute = true
      chuteDirecte()
    }
    e.current.soft = !g.chute && dy > c * 1.5
  }
  const onPointerUp = (ev: RPointerEvent) => {
    const g = geste.current
    geste.current = null
    e.current.soft = false
    if (!g) return
    if (statut !== 'joue') return
    const bouge = Math.hypot(ev.clientX - g.x, ev.clientY - g.y)
    if (bouge < 12 && performance.now() - g.t < 300) tourner(1)
  }

  // ----- Boutons tactiles (maintien = répétition pour gauche, droite, bas) -----
  const appui = (action: 'g' | 'd' | 'b' | 'rg' | 'rd' | 'chute') => (ev: RPointerEvent) => {
    ev.preventDefault()
    ;(ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId)
    const s = e.current
    if (action === 'g' || action === 'd') {
      const d = action === 'g' ? -1 : 1
      deplacer(d)
      s.dir = { d, t: 0, arr: 0 }
    } else if (action === 'b') s.soft = true
    else if (action === 'rg') tourner(-1)
    else if (action === 'rd') tourner(1)
    else chuteDirecte()
  }

  return (
    <section className="ms bl" aria-label="Blocs">
      <Guide
        etapes={[
          { title: 'Les pièces tombent', text: 'Sept formes différentes tombent une à une. Déplace-les et fais-les tourner avant qu’elles ne se posent.', visual: <div className="bl-mini-rang"><MiniPiece kind="T" /><MiniPiece kind="L" /><MiniPiece kind="S" /><MiniPiece kind="I" /></div> },
          { title: 'Complète des lignes', text: 'Une ligne entièrement remplie disparaît et rapporte des points. Effacer 4 lignes d’un coup rapporte le plus !', visual: <div className="bl-mini-lignes">{[0, 1, 2].map(r => <div key={r} className={r === 2 ? 'is-full' : ''}>{Array.from({ length: 8 }, (_, k) => <span key={k} className={r === 2 || (r === 1 && k % 3 !== 0) ? 'on' : ''} />)}</div>)}</div> },
          { title: 'Ne touche pas le haut', text: 'Toutes les 10 lignes, le niveau monte et les pièces tombent plus vite. La partie s’arrête quand les pièces débordent en haut.', visual: <div className="bl-mini-rang"><MiniPiece kind="O" /><MiniPiece kind="J" /><MiniPiece kind="Z" /></div> },
        ]}
        astuces={[
          'Clavier : ← → déplacer, ↑ ou X tourner, Z tourner dans l’autre sens, ↓ descendre, Espace tomber d’un coup, C mettre en réserve, P pause.',
          'Au doigt : touche la grille pour tourner, glisse pour déplacer, donne un coup vers le bas pour faire tomber la pièce.',
          'La pièce « fantôme » (contour) montre où la pièce va se poser.',
          'La réserve garde une pièce pour plus tard : idéale pour garder la longue barre pour un « 4 lignes ».',
        ]}
      />

      <div className="ms-levels bl-departs" role="radiogroup" aria-label="Niveau de départ">
        {DEPARTS.map(d => (
          <button key={d.niveau} type="button" role="radio" aria-checked={depart === d.niveau} className={depart === d.niveau ? 'is-active' : ''} onClick={() => { setDepart(d.niveau); e.current = etatInitial(d.niveau); setStatut('pret'); synchro(); dessiner() }}>
            <strong>{d.label}</strong>
            <small>{d.info}</small>
          </button>
        ))}
      </div>

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="t48-bar">
          <div className="t48-score"><span>Score</span><strong>{ui.score}</strong></div>
          <div className="t48-score"><span>Lignes</span><strong>{ui.lignes}</strong></div>
          <div className="t48-score"><span>Niveau</span><strong>{ui.niveau}</strong></div>
          <button type="button" className="t48-btn" onClick={basculerPause}>
            {statut === 'joue' ? <><Pause size={16} /> Pause</> : <><Play size={16} /> {statut === 'pause' ? 'Reprendre' : 'Jouer'}</>}
          </button>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        <div className="bl-jeu">
          <div className="bl-cote">
            <button type="button" className={`bl-boite bl-reserve${ui.peutReserver ? '' : ' is-used'}`} onClick={reserver} aria-label="Mettre la pièce en réserve" title="Réserve (C)">
              <span className="mini-label">Réserve</span>
              <MiniPiece kind={ui.reserve} dim={!ui.peutReserver} />
            </button>
            <div className="bl-touches">
              <span><kbd>← →</kbd> déplacer</span>
              <span><kbd>↑</kbd> tourner</span>
              <span><kbd>↓</kbd> descendre</span>
              <span><kbd>Espace</kbd> tomber</span>
              <span><kbd>C</kbd> réserve</span>
            </div>
          </div>

          <div
            ref={zoneRef}
            className="bl-zone"
            tabIndex={0}
            role="application"
            aria-label={`Blocs : score ${ui.score}, ${ui.lignes} lignes, niveau ${ui.niveau}.`}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onBlur={relacher}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => { geste.current = null; relacher() }}
          >
            <canvas ref={canvasRef} aria-hidden="true" />
            {statut !== 'joue' && (
              <div className="snake-overlay bl-overlay">
                {statut === 'pret' && <><strong>Prêt ?</strong><span>Les pièces tombent dès que tu lances la partie.</span><button type="button" className="button button-primary" onClick={() => demarrer()}><Play size={15} /> Jouer</button></>}
                {statut === 'pause' && <><strong>Pause</strong><button type="button" className="button button-primary" onClick={basculerPause}><Play size={15} /> Reprendre</button></>}
                {statut === 'fini' && (
                  <>
                    <strong>{record ? <><Trophy size={20} /> Nouveau record !</> : 'Partie terminée'}</strong>
                    <span>{ui.score} points · {ui.lignes} lignes · niveau {ui.niveau}</span>
                    <button type="button" className="button button-primary" onClick={() => demarrer()}><RotateCcw size={15} /> Rejouer</button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bl-cote">
            <div className="bl-boite">
              <span className="mini-label">Suivantes</span>
              {ui.suivantes.map((k, i) => <MiniPiece key={i} kind={k} />)}
            </div>
          </div>
        </div>

        {haptique.input}
        <label {...haptique.labelProps} className="bl-boutons" aria-label="Commandes">
          {([
            ['rg', <RotateCcw size={22} />, 'Tourner à gauche'],
            ['chute', <ArrowDownToLine size={22} />, 'Faire tomber'],
            ['rd', <RotateCw size={22} />, 'Tourner à droite'],
            ['g', <ArrowLeft size={22} />, 'Gauche'],
            ['b', <ArrowDown size={22} />, 'Descendre'],
            ['d', <ArrowRight size={22} />, 'Droite'],
          ] as const).map(([a, icone, nom]) => (
            <div
              key={a}
              role="button"
              aria-label={nom}
              className={`bl-btn bl-${a}`}
              onPointerDown={appui(a)}
              onPointerUp={relacher}
              onPointerCancel={relacher}
              onClick={() => haptique.request('tap')}
            >
              {icone}
            </div>
          ))}
        </label>

        <div className="ms-message">
          <span className="ms-hint">
            <span className="ms-hint-mouse">Clique sur la grille pour jouer au clavier · P : pause</span>
            <span className="ms-hint-touch">Touche la grille pour tourner, glisse pour déplacer, ou utilise les boutons</span>
          </span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Records sur cet appareil</span>
        <ul>
          <li><span>Meilleur score</span><strong>{records.records.score ?? '—'}</strong></li>
          <li><span>Plus de lignes</span><strong>{lignesRecord.records.lignes ?? '—'}</strong></li>
        </ul>
      </div>
    </section>
  )
}
