import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from 'react'
import { Bomb, Flag, Frame, Frown, Laugh, Maximize2, Minimize2, Pickaxe, ScanSearch, Smile, Timer, Trophy, Vibrate, VibrateOff, Volume2, VolumeX, X } from 'lucide-react'
import { chord, createGame, CUSTOM_LIMITS, elapsedSeconds, LEVELS, neighbors, reveal, toggleFlag } from './demineur-logic'
import type { Game } from './demineur-logic'
import DemineurGuide from './DemineurGuide'
import { canVibrate, gameFeedback, playSound, vibrate } from './feedback'
import { Zone, zoneAround } from './zone'

const RECORDS_KEY = 'ez-demineur-records'
// Attribut « switch » (interrupteur natif de Safari, qui porte le retour haptique sur iPhone).
const SWITCH_ATTR = { switch: '' } as Record<string, string>
const AIDE_KEY = 'ez-demineur-aide'
const SOUND_KEY = 'ez-demineur-son'
const VIBE_KEY = 'ez-demineur-vibrations'
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

// Réglages (aide, son, vibrations) : activés par défaut, le choix du visiteur est retenu.
function loadSetting(key: string): boolean {
  try {
    return localStorage.getItem(key) !== 'off'
  } catch {
    return true
  }
}
function saveSetting(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? 'on' : 'off')
  } catch {
    /* rien à faire */
  }
}

// Plein écran : vrai plein écran du navigateur quand il est disponible (Android),
// sinon le jeu occupe tout l'écran visible (iPhone, qui ne l'autorise pas pour une page web).
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }
type FsDocument = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void }
const fsDoc = () => document as FsDocument
const fsElement = () => fsDoc().fullscreenElement ?? fsDoc().webkitFullscreenElement ?? null

const isNumber = (g: Game, i: number) => g.state[i] === 'open' && g.adj[i] > 0

// Texte de l'aide débutant pour le chiffre encadré : uniquement à partir de ce qui est visible.
function zoneHint(g: Game, i: number): string {
  const n = g.adj[i]
  const around = neighbors(i, g.rows, g.cols)
  const flags = around.filter(k => g.state[k] === 'flag').length
  const hidden = around.filter(k => g.state[k] === 'hidden').length
  const left = n - flags
  if (left < 0) return `Trop de drapeaux autour de ce ${n} : au moins un est mal placé.`
  if (hidden === 0) return `Toutes les cases autour de ce ${n} sont déjà ouvertes ou marquées.`
  if (left === 0) {
    const intro = n === 1 ? 'Ce 1 a déjà son drapeau : s’il est juste,' : `Ce ${n} a déjà ses ${n} drapeaux : s’ils sont justes,`
    const rest = hidden === 1 ? 'la case cachée restante est sûre' : `les ${hidden} cases cachées restantes sont sûres`
    return `${intro} ${rest}. Clique sur le ${n} pour ${hidden === 1 ? 'l’ouvrir' : 'les ouvrir'}.`
  }
  if (left === hidden) {
    return hidden === 1
      ? `Il reste 1 mine et 1 seule case cachée autour de ce ${n} : c’est forcément elle.`
      : `Il reste ${left} mines et ${hidden} cases cachées autour de ce ${n} : ce sont toutes des mines.`
  }
  return `Il reste ${left} mine${left > 1 ? 's' : ''} à trouver parmi les ${hidden} cases cachées du cadre.`
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
  const [aide, setAide] = useState(() => loadSetting(AIDE_KEY))
  const [sound, setSound] = useState(() => loadSetting(SOUND_KEY))
  const [vibe, setVibe] = useState(() => loadSetting(VIBE_KEY))
  const [selected, setSelected] = useState<number | null>(null) // chiffre cliqué ou touché
  const [hovered, setHovered] = useState<number | null>(null) // chiffre survolé à la souris
  const [full, setFull] = useState(false)

  const gameRef = useRef(game)
  gameRef.current = game
  const boardRef = useRef<HTMLLabelElement>(null)
  const hapticId = useId()
  const haptic = useRef(false) // le toucher en cours doit-il faire vibrer l'iPhone ?
  const panelRef = useRef<HTMLDivElement>(null)
  const nativeFull = useRef(false)
  const press = useRef<{ timer: number | null; fired: boolean; touch: boolean }>({ timer: null, fired: false, touch: false })

  const enterFull = async () => {
    setFull(true)
    const el = panelRef.current as FsElement | null
    const d = fsDoc()
    if (!el || !(d.fullscreenEnabled || d.webkitFullscreenEnabled)) return
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' })
      else await el.webkitRequestFullscreen?.()
      nativeFull.current = true
    } catch {
      /* refusé : le jeu reste en mode écran complet sans le navigateur */
    }
  }
  const exitFull = () => {
    setFull(false)
    nativeFull.current = false
    const d = fsDoc()
    if (fsElement()) void Promise.resolve(d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.()).catch(() => {})
  }

  // Sortie par le geste retour ou la touche Échap du navigateur.
  useEffect(() => {
    const onChange = () => {
      if (!fsElement() && nativeFull.current) {
        nativeFull.current = false
        setFull(false)
      }
    }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  // Pendant le plein écran : la page derrière ne défile plus, Échap permet de sortir.
  useEffect(() => {
    if (!full) return
    const root = document.documentElement
    root.classList.add('ms-lock')
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') exitFull()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      root.classList.remove('ms-lock')
      window.removeEventListener('keydown', onKey)
    }
  }, [full])

  const start = (dims: Dims) => {
    const d = fitToScreen(dims)
    const g = createGame(d.rows, d.cols, d.mines)
    gameRef.current = g
    setGame(g)
    setNewRecord(false)
    setSelected(null)
    setHovered(null)
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
    const buzz = gameFeedback(prev, next, { sound, vibe })
    if (buzz && vibe && !canVibrate()) haptic.current = true
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
    if (g.state[i] === 'open') setSelected(isNumber(g, i) ? i : null)
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
    haptic.current = false
    press.current.fired = false
    press.current.touch = e.pointerType !== 'mouse'
    if (!press.current.touch) return
    press.current.timer = window.setTimeout(() => {
      press.current.timer = null
      press.current.fired = true
      if (gameRef.current.state[i] !== 'open') apply(x => toggleFlag(x, i))
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
      if (isNumber(gameRef.current, n)) setSelected(n)
      boardRef.current?.querySelector<HTMLElement>(`[data-i="${n}"]`)?.focus()
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault()
      apply(x => toggleFlag(x, i))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      primary(i)
    }
  }

  const over = game.status === 'won' || game.status === 'lost'
  const Face = game.status === 'won' ? Laugh : game.status === 'lost' ? Frown : Smile
  const boardStyle = { '--cols': game.cols, '--rows': game.rows } as CSSProperties
  const maxCustomMines = clampCustom(+custom.rows, +custom.cols, Infinity).mines

  // Aide débutant : chiffre survolé en priorité, sinon le dernier chiffre cliqué.
  const candidate = hovered ?? selected
  const active = aide && !over && candidate !== null && candidate < game.state.length && isNumber(game, candidate) ? candidate : null
  const inZone = new Set(active === null ? [] : neighbors(active, game.rows, game.cols))
  const toggleAide = () => {
    setAide(!aide)
    saveSetting(AIDE_KEY, !aide)
  }
  // En réactivant le son ou les vibrations, on joue un petit retour pour vérifier que ça marche.
  const toggleSound = () => {
    setSound(!sound)
    saveSetting(SOUND_KEY, !sound)
    if (!sound) playSound('toggle')
  }
  // Sur iPhone, c'est l'interrupteur natif touché qui vibre ; sur Android, on vibre nous-mêmes.
  const toggleVibe = () => {
    setVibe(!vibe)
    saveSetting(VIBE_KEY, !vibe)
    if (!vibe) vibrate('flag')
  }
  // Clic sur la grille : sans vibration voulue, on empêche le label de basculer l'interrupteur caché.
  const onBoardClick = (e: MouseEvent) => {
    if (!haptic.current) e.preventDefault()
    haptic.current = false
  }
  const onPointerEnter = (e: PointerEvent, i: number) => {
    if (e.pointerType !== 'mouse') return
    const next = isNumber(gameRef.current, i) ? i : null
    if (next !== hovered) setHovered(next)
  }

  return (
    <section className="ms" aria-label="Démineur">
      <DemineurGuide />

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

      <div ref={panelRef} className={full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="ms-bar">
          <span className="ms-counter" title="Mines restantes"><Bomb size={15} /> {counter(game.mines - game.flags)}</span>
          <button type="button" className={`ms-face is-${game.status}`} onClick={() => start(currentDims())} aria-label="Nouvelle partie" title="Nouvelle partie"><Face size={22} /></button>
          <span className="ms-counter" title="Temps"><Timer size={15} /> <Clock game={game} /></span>
        </div>

        <div className="ms-tools">
          <div className="ms-mode" role="radiogroup" aria-label="Action au toucher">
            <button type="button" role="radio" aria-checked={mode === 'dig'} className={mode === 'dig' ? 'is-active' : ''} onClick={() => setMode('dig')}><Pickaxe size={15} /> Creuser</button>
            <button type="button" role="radio" aria-checked={mode === 'flag'} className={mode === 'flag' ? 'is-active' : ''} onClick={() => setMode('flag')}><Flag size={15} /> Drapeau</button>
          </div>
          <div className="ms-toggles">
            <button type="button" className={sound ? 'ms-icon-toggle is-on' : 'ms-icon-toggle'} aria-pressed={sound} aria-label="Son" title={sound ? 'Couper le son' : 'Activer le son'} onClick={toggleSound}>
              {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <span className={vibe ? 'ms-icon-toggle ms-vibe is-on' : 'ms-icon-toggle ms-vibe'} title={vibe ? 'Couper les vibrations' : 'Activer les vibrations'}>
              {vibe ? <Vibrate size={17} /> : <VibrateOff size={17} />}
              <input type="checkbox" {...SWITCH_ATTR} className="ms-native-switch" checked={vibe} onChange={toggleVibe} aria-label="Vibrations" />
            </span>
          </div>
          <button type="button" role="switch" aria-checked={aide} className={aide ? 'ms-switch is-on' : 'ms-switch'} onClick={toggleAide} title="Encadre les 9 cases autour d’un chiffre">
            <ScanSearch size={15} /> Aide débutant <span className="ms-switch-track" aria-hidden="true" />
          </button>
          <button type="button" className="ms-full" aria-pressed={full} onClick={full ? exitFull : enterFull}>
            {full ? <Minimize2 size={15} /> : <Maximize2 size={15} />} {full ? 'Réduire' : 'Plein écran'}
          </button>
        </div>

        {/* Interrupteur invisible : la grille est son label, un vrai toucher le fait basculer (et vibrer sur iPhone). */}
        <input type="checkbox" {...SWITCH_ATTR} id={hapticId} className="ms-haptic" tabIndex={-1} aria-hidden="true" defaultChecked={false} />

        <div className="ms-scroll" role="group" aria-label={`Grille de ${game.rows} lignes sur ${game.cols} colonnes`}>
          <label
            ref={boardRef}
            htmlFor={hapticId}
            className={`ms-board is-${game.status}`}
            style={boardStyle}
            onClick={onBoardClick}
            onContextMenu={e => e.preventDefault()}
            onPointerLeave={() => setHovered(null)}
          >
            {game.state.map((_, i) => {
              const view = cellView(game, i)
              const { content, label } = view
              const className = view.className + (inZone.has(i) && game.state[i] === 'hidden' ? ' is-zone' : '') + (i === active ? ' is-center' : '')
              return (
                <div
                  key={i}
                  role="button"
                  data-i={i}
                  className={className}
                  tabIndex={i === focus ? 0 : -1}
                  aria-label={`Ligne ${Math.floor(i / game.cols) + 1}, colonne ${(i % game.cols) + 1} : ${label}`}
                  onPointerDown={e => onPointerDown(e, i)}
                  onPointerEnter={e => onPointerEnter(e, i)}
                  onPointerUp={cancelPress}
                  onPointerLeave={cancelPress}
                  onPointerCancel={cancelPress}
                  onClick={() => onClick(i)}
                  onContextMenu={e => onContextMenu(e, i)}
                  onKeyDown={e => onKeyDown(e, i)}
                  onFocus={() => setFocus(i)}
                >
                  {content}
                </div>
              )
            })}
            {active !== null && <Zone box={zoneAround(active, game.rows, game.cols)} />}
          </label>
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
          {!over && active !== null && <span className="ms-zone-hint" aria-live="off"><Frame size={15} /> {zoneHint(game, active)}</span>}
          {!over && active === null && <span className="ms-hint" aria-live="off">
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
