import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from 'react'
import { Bomb, Flag, Frown, Laugh, Pickaxe, Smile, Timer, Trophy, X } from 'lucide-react'
import { chord, createGame, CUSTOM_LIMITS, elapsedSeconds, LEVELS, reveal, toggleFlag } from './demineur-logic'
import type { Game } from './demineur-logic'

const RECORDS_KEY = 'ez-demineur-records'
const LONG_PRESS_MS = 380

type Records = Record<string, number>
type Dims = { rows: number; cols: number; mines: number }

// Le stockage du navigateur peut être indisponible (navigation privée) : on ne plante jamais.
function loadRecords(): Records {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY) || '{}') as Records
  } catch {
    return {}
  }
}
function saveRecords(records: Records) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  } catch {
    /* rien à faire */
  }
}

const formatTime = (s: number) => `${s.toFixed(1).replace('.', ',')} s`
const counter = (n: number) => (n < 0 ? '-' + String(Math.min(99, -n)).padStart(2, '0') : String(Math.min(999, n)).padStart(3, '0'))

// Sur téléphone, une grille plus large que haute est tournée pour tenir à l'écran.
function fitToScreen({ rows, cols, mines }: Dims): Dims {
  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
  return narrow && cols > rows ? { rows: cols, cols: rows, mines } : { rows, cols, mines }
}

function clampCustom(rows: number, cols: number, mines: number): Dims {
  const { minSide, maxRows, maxCols, minMines } = CUSTOM_LIMITS
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v) || lo))
  const r = clamp(rows, minSide, maxRows)
  const c = clamp(cols, minSide, maxCols)
  return { rows: r, cols: c, mines: clamp(mines, minMines, r * c - 9) }
}

// Chrono : composant à part pour ne pas redessiner toute la grille à chaque seconde.
function Clock({ game }: { game: Game }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (game.status !== 'playing') return
    const id = window.setInterval(() => setTick(t => t + 1), 250)
    return () => window.clearInterval(id)
  }, [game.status])
  return <>{counter(Math.floor(elapsedSeconds(game)))}</>
}

// Apparence d'une case selon son état (et révélation des mines en fin de partie perdue).
function cellView(game: Game, i: number): { className: string; content: ReactNode; label: string } {
  const state = game.state[i]
  const lost = game.status === 'lost'
  if (state === 'open') {
    const n = game.adj[i]
    return n
      ? { className: `ms-cell is-open n${n}`, content: n, label: `${n} mine${n > 1 ? 's' : ''} autour` }
      : { className: 'ms-cell is-open', content: null, label: 'vide' }
  }
  if (state === 'flag') {
    return lost && !game.mine[i]
      ? { className: 'ms-cell is-wrong', content: <X />, label: 'drapeau mal placé' }
      : { className: 'ms-cell is-flag', content: <Flag />, label: 'drapeau' }
  }
  if (lost && game.mine[i]) {
    return { className: i === game.exploded ? 'ms-cell is-mine is-exploded' : 'ms-cell is-mine', content: <Bomb />, label: 'mine' }
  }
  return { className: 'ms-cell', content: null, label: 'cachée' }
}

export default function Demineur() {
  const [levelId, setLevelId] = useState(LEVELS[0].id)
  const [custom, setCustom] = useState({ rows: '12', cols: '20', mines: '35' })
  const [game, setGame] = useState(() => {
    const d = fitToScreen(LEVELS[0])
    return createGame(d.rows, d.cols, d.mines)
  })
  const [mode, setMode] = useState<'dig' | 'flag'>('dig')
  const [focus, setFocus] = useState(0)
  const [records, setRecords] = useState<Records>(loadRecords)
  const [newRecord, setNewRecord] = useState(false)

  const gameRef = useRef(game)
  gameRef.current = game
  const boardRef = useRef<HTMLDivElement>(null)
  const press = useRef<{ timer: number | null; fired: boolean; touch: boolean }>({ timer: null, fired: false, touch: false })

  const start = (dims: Dims) => {
    const d = fitToScreen(dims)
    const g = createGame(d.rows, d.cols, d.mines)
    gameRef.current = g
    setGame(g)
    setNewRecord(false)
    setFocus(f => Math.min(f, d.rows * d.cols - 1))
  }

  const currentDims = (): Dims => {
    const level = LEVELS.find(l => l.id === levelId)
    return level ?? clampCustom(+custom.rows, +custom.cols, +custom.mines)
  }

  const chooseLevel = (id: string) => {
    setLevelId(id)
    const level = LEVELS.find(l => l.id === id)
    if (level) start(level)
    else start(clampCustom(+custom.rows, +custom.cols, +custom.mines))
  }

  const submitCustom = (e: FormEvent) => {
    e.preventDefault()
    const d = clampCustom(+custom.rows, +custom.cols, +custom.mines)
    setCustom({ rows: String(d.rows), cols: String(d.cols), mines: String(d.mines) })
    start(d)
  }

  // Applique une action à la partie en cours et enregistre un éventuel record.
  const apply = (action: (g: Game) => Game) => {
    const prev = gameRef.current
    const next = action(prev)
    if (next === prev) return
    gameRef.current = next
    setGame(next)
    if (next.status === 'won' && prev.status !== 'won' && levelId !== 'perso') {
      const time = Math.round(elapsedSeconds(next) * 10) / 10
      const best = records[levelId]
      if (best === undefined || time < best) {
        const updated = { ...records, [levelId]: time }
        setRecords(updated)
        saveRecords(updated)
        setNewRecord(true)
      }
    }
  }

  const primary = (i: number) => {
    const g = gameRef.current
    if (g.state[i] === 'open') apply(x => chord(x, i))
    else if (mode === 'flag') apply(x => toggleFlag(x, i))
    else apply(x => reveal(x, i))
  }

  // Tactile : un appui long pose ou retire un drapeau.
  const cancelPress = () => {
    if (press.current.timer !== null) window.clearTimeout(press.current.timer)
    press.current.timer = null
  }
  const onPointerDown = (e: PointerEvent, i: number) => {
    cancelPress()
    press.current.fired = false
    press.current.touch = e.pointerType !== 'mouse'
    if (!press.current.touch) return
    press.current.timer = window.setTimeout(() => {
      press.current.timer = null
      press.current.fired = true
      if (gameRef.current.state[i] !== 'open') {
        navigator.vibrate?.(15)
        apply(x => toggleFlag(x, i))
      }
    }, LONG_PRESS_MS)
  }
  const onClick = (i: number) => {
    if (press.current.fired) {
      press.current.fired = false
      return
    }
    primary(i)
  }
  const onContextMenu = (e: MouseEvent, i: number) => {
    e.preventDefault()
    if (press.current.touch) return // déjà géré par l'appui long
    apply(x => toggleFlag(x, i))
  }

  // Clavier : flèches pour se déplacer, Entrée/Espace pour révéler, F pour le drapeau.
  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const { rows, cols } = gameRef.current
    const r = Math.floor(i / cols)
    const c = i % cols
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    if (moves[e.key]) {
      e.preventDefault()
      const nr = Math.max(0, Math.min(rows - 1, r + moves[e.key][0]))
      const nc = Math.max(0, Math.min(cols - 1, c + moves[e.key][1]))
      const n = nr * cols + nc
      setFocus(n)
      boardRef.current?.querySelector<HTMLButtonElement>(`[data-i="${n}"]`)?.focus()
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault()
      apply(x => toggleFlag(x, i))
    }
  }

  const over = game.status === 'won' || game.status === 'lost'
  const Face = game.status === 'won' ? Laugh : game.status === 'lost' ? Frown : Smile
  const boardStyle = { '--cols': game.cols, '--rows': game.rows } as CSSProperties
  const maxCustomMines = clampCustom(+custom.rows, +custom.cols, Infinity).mines

  return (
    <section className="ms" aria-label="Démineur">
      <div className="ms-levels" role="radiogroup" aria-label="Difficulté">
        {[...LEVELS, { id: 'perso', label: 'Personnalisé', rows: 0, cols: 0, mines: 0 }].map(l => (
          <button key={l.id} type="button" role="radio" aria-checked={levelId === l.id} className={levelId === l.id ? 'is-active' : ''} onClick={() => chooseLevel(l.id)}>
            <strong>{l.label}</strong>
            <small>{l.id === 'perso' ? 'À ta mesure' : `${l.cols}×${l.rows} · ${l.mines} mines`}</small>
          </button>
        ))}
      </div>

      {levelId === 'perso' && (
        <form className="ms-custom" onSubmit={submitCustom} noValidate>
          <label>Lignes<input type="number" inputMode="numeric" min={CUSTOM_LIMITS.minSide} max={CUSTOM_LIMITS.maxRows} value={custom.rows} onChange={e => setCustom({ ...custom, rows: e.target.value })} /></label>
          <label>Colonnes<input type="number" inputMode="numeric" min={CUSTOM_LIMITS.minSide} max={CUSTOM_LIMITS.maxCols} value={custom.cols} onChange={e => setCustom({ ...custom, cols: e.target.value })} /></label>
          <label>Mines<input type="number" inputMode="numeric" min={CUSTOM_LIMITS.minMines} max={maxCustomMines} value={custom.mines} onChange={e => setCustom({ ...custom, mines: e.target.value })} /></label>
          <button type="submit" className="button button-primary">Lancer</button>
          <p className="ms-custom-hint">{CUSTOM_LIMITS.minSide} à {CUSTOM_LIMITS.maxRows} lignes, {CUSTOM_LIMITS.minSide} à {CUSTOM_LIMITS.maxCols} colonnes, jusqu’à {maxCustomMines} mines.</p>
        </form>
      )}

      <div className="ms-panel">
        <div className="ms-bar">
          <span className="ms-counter" title="Mines restantes"><Bomb size={15} /> {counter(game.mines - game.flags)}</span>
          <button type="button" className={`ms-face is-${game.status}`} onClick={() => start(currentDims())} aria-label="Nouvelle partie" title="Nouvelle partie"><Face size={22} /></button>
          <span className="ms-counter" title="Temps"><Timer size={15} /> <Clock game={game} /></span>
        </div>

        <div className="ms-mode" role="radiogroup" aria-label="Action au toucher">
          <button type="button" role="radio" aria-checked={mode === 'dig'} className={mode === 'dig' ? 'is-active' : ''} onClick={() => setMode('dig')}><Pickaxe size={15} /> Creuser</button>
          <button type="button" role="radio" aria-checked={mode === 'flag'} className={mode === 'flag' ? 'is-active' : ''} onClick={() => setMode('flag')}><Flag size={15} /> Drapeau</button>
        </div>

        <div className="ms-scroll">
          <div
            ref={boardRef}
            className={`ms-board is-${game.status}`}
            style={boardStyle}
            role="group"
            aria-label={`Grille de ${game.rows} lignes sur ${game.cols} colonnes`}
            onContextMenu={e => e.preventDefault()}
          >
            {game.state.map((_, i) => {
              const { className, content, label } = cellView(game, i)
              return (
                <button
                  key={i}
                  type="button"
                  data-i={i}
                  className={className}
                  tabIndex={i === focus ? 0 : -1}
                  aria-label={`Ligne ${Math.floor(i / game.cols) + 1}, colonne ${(i % game.cols) + 1} : ${label}`}
                  onPointerDown={e => onPointerDown(e, i)}
                  onPointerUp={cancelPress}
                  onPointerLeave={cancelPress}
                  onPointerCancel={cancelPress}
                  onClick={() => onClick(i)}
                  onContextMenu={e => onContextMenu(e, i)}
                  onKeyDown={e => onKeyDown(e, i)}
                  onFocus={() => setFocus(i)}
                >
                  {content}
                </button>
              )
            })}
          </div>
        </div>

        <div className="ms-message" aria-live="polite">
          {game.status === 'won' && <>
            <span className="ms-win"><Trophy size={16} /> Grille déminée en {formatTime(elapsedSeconds(game))}{newRecord && ' : nouveau record !'}</span>
            <button type="button" className="button button-primary" onClick={() => start(currentDims())}>Rejouer</button>
          </>}
          {game.status === 'lost' && <>
            <span className="ms-lose"><Bomb size={16} /> Boum ! Une mine a explosé.</span>
            <button type="button" className="button button-ghost" onClick={() => start(currentDims())}>Réessayer</button>
          </>}
          {!over && <span className="ms-hint">
            <span className="ms-hint-mouse">Clic gauche : révéler · Clic droit : drapeau · Clic sur un chiffre : ouvrir autour</span>
            <span className="ms-hint-touch">Appui long : drapeau · Toucher un chiffre : ouvrir autour</span>
          </span>}
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Meilleurs temps sur cet appareil</span>
        <ul>
          {LEVELS.map(l => <li key={l.id}><span>{l.label}</span><strong>{records[l.id] !== undefined ? formatTime(records[l.id]) : '—'}</strong></li>)}
        </ul>
      </div>
    </section>
  )
}
