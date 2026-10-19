import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Trophy, Undo2 } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { useRecords, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { addRandom, canMove, maxTile, move, start } from './jeu2048-logic'
import type { Dir, Tile } from './jeu2048-logic'
import './jeu2048.css'

const TAILLES = [
  { n: 3, label: 'Mini', info: '3×3 · rapide' },
  { n: 4, label: 'Classique', info: '4×4 · l’original' },
  { n: 5, label: 'Géant', info: '5×5 · plus long' },
]
const BUT = 2048
const KEYS: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', z: 'up', s: 'down', a: 'left', q: 'left', d: 'right',
}

const pos = (t: Tile) => ({ '--r': t.r, '--c': t.c } as CSSProperties)

// Tuile statique pour les illustrations du guide.
function MiniGrille({ valeurs }: { valeurs: number[] }) {
  return (
    <div className="t48-mini" aria-hidden="true">
      {valeurs.map((v, k) => <span key={k} className={v ? `t48-mini-tuile v${Math.min(v, 4096)}` : ''}>{v || ''}</span>)}
    </div>
  )
}

export default function Jeu2048() {
  const [n, setN] = useState(4)
  const [tiles, setTiles] = useState<Tile[]>(() => start(4))
  const [ghosts, setGhosts] = useState<Tile[]>([])
  const [score, setScore] = useState(0)
  const [prev, setPrev] = useState<{ tiles: Tile[]; score: number } | null>(null)
  const [gagne, setGagne] = useState(false) // 2048 atteint
  const [continuer, setContinuer] = useState(false)
  const [fini, setFini] = useState(false)
  const [plus, setPlus] = useState<{ v: number; key: number } | null>(null)
  const [nouveauRecord, setNouveauRecord] = useState(false)

  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const panelRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const plein = useFullscreen(panelRef)
  const records = useRecords('ez-2048-score', 'higher')
  const tuiles = useRecords('ez-2048-tuile', 'higher')
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const ghostTimer = useRef<number | null>(null)

  const focusBoard = () => boardRef.current?.focus({ preventScroll: true })
  useEffect(() => () => {
    if (ghostTimer.current !== null) window.clearTimeout(ghostTimer.current)
  }, [])

  const nouvellePartie = (taille = n) => {
    setN(taille)
    setTiles(start(taille))
    setGhosts([])
    setScore(0)
    setPrev(null)
    setGagne(false)
    setContinuer(false)
    setFini(false)
    setPlus(null)
    setNouveauRecord(false)
    focusBoard()
  }

  const jouer = (dir: Dir) => {
    if (fini || (gagne && !continuer)) return
    const r = move(tiles, n, dir)
    if (!r.moved) return
    const suivantes = addRandom(r.tiles, n)
    const total = score + r.gained
    setPrev({ tiles, score })
    setTiles(suivantes)
    setGhosts(r.ghosts)
    if (ghostTimer.current !== null) window.clearTimeout(ghostTimer.current)
    ghostTimer.current = window.setTimeout(() => setGhosts([]), 130)
    setScore(total)
    if (r.gained) {
      setPlus({ v: r.gained, key: Date.now() })
      if (sound) playSound('merge', r.best)
      if (vibe && canVibrate()) vibrate('tap')
    } else if (sound) playSound('slide')

    const record = records.submit(String(n), total)
    if (record && total > 0) setNouveauRecord(true)
    tuiles.submit(String(n), maxTile(suivantes))

    if (!gagne && maxTile(suivantes) >= BUT) {
      setGagne(true)
      if (sound) playSound('win')
      if (vibe && canVibrate()) vibrate('win')
    } else if (!canMove(suivantes, n)) {
      setFini(true)
      if (sound) playSound('gameover')
      if (vibe && canVibrate()) vibrate('boom')
    }
  }

  const annuler = () => {
    if (!prev) return
    setTiles(prev.tiles.map(t => ({ ...t, merged: false, fresh: false })))
    setGhosts([])
    setScore(prev.score)
    setPrev(null)
    setFini(false)
    focusBoard()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const dir = KEYS[e.key] ?? KEYS[e.key.toLowerCase()]
    if (dir) {
      e.preventDefault()
      jouer(dir)
    }
  }

  // Glisser du doigt (ou de la souris) sur la grille.
  const onPointerDown = (e: PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY }
    focusBoard()
  }
  const onPointerUp = (e: PointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    jouer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
  }

  const meilleur = Math.max(records.records[String(n)] ?? 0, score)
  const bloque = fini || (gagne && !continuer)

  return (
    <section className="ms t48" aria-label="2048">
      <Guide
        etapes={[
          { title: 'Fais glisser', text: 'Utilise les flèches du clavier ou glisse le doigt sur la grille : toutes les tuiles partent dans cette direction, aussi loin que possible.', visual: <MiniGrille valeurs={[0, 2, 0, 2, 0, 0, 4, 0, 0]} /> },
          { title: 'Fusionne', text: 'Deux tuiles de même valeur qui se rencontrent n’en font plus qu’une : 2 + 2 = 4, 4 + 4 = 8… Le total s’ajoute à ton score.', visual: <MiniGrille valeurs={[4, 0, 0, 4, 0, 0, 8, 2, 0]} /> },
          { title: 'Vise 2048', text: 'Après chaque coup, une nouvelle tuile (2 ou 4) apparaît. Atteins la tuile 2048 avant que la grille ne soit pleine !', visual: <MiniGrille valeurs={[2048, 128, 8, 64, 32, 4, 16, 8, 2]} /> },
        ]}
        astuces={[
          'Garde ta plus grosse tuile dans un coin et évite de la faire bouger.',
          'Utilise surtout deux ou trois directions : ça garde la grille bien rangée.',
          'Une erreur ? Le bouton « Annuler » revient sur ton dernier coup.',
        ]}
      />

      <div className="ms-levels t48-tailles" role="radiogroup" aria-label="Taille de la grille">
        {TAILLES.map(t => (
          <button key={t.n} type="button" role="radio" aria-checked={n === t.n} className={n === t.n ? 'is-active' : ''} onClick={() => nouvellePartie(t.n)}>
            <strong>{t.label}</strong>
            <small>{t.info}</small>
          </button>
        ))}
      </div>

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="t48-bar">
          <div className="t48-score"><span>Score</span><strong>{score}</strong>{plus && <em key={plus.key} className="t48-plus">+{plus.v}</em>}</div>
          <div className="t48-score"><span>Meilleur</span><strong>{meilleur}</strong></div>
          <button type="button" className="t48-btn" onClick={annuler} disabled={!prev} title="Annuler le dernier coup"><Undo2 size={16} /> Annuler</button>
          <button type="button" className="t48-btn" onClick={() => nouvellePartie()} title="Nouvelle partie"><RotateCcw size={16} /> Nouvelle</button>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        <div className="t48-wrap">
          <div
            ref={boardRef}
            className="t48-board"
            style={{ '--n': n } as CSSProperties}
            tabIndex={0}
            role="application"
            aria-label={`Grille de 2048, ${n} cases sur ${n}. Utilise les flèches du clavier pour jouer. Score ${score}.`}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (swipe.current = null)}
          >
            {Array.from({ length: n * n }, (_, k) => <div key={k} className="t48-cell" />)}
            {ghosts.map(t => (
              <div key={`g${t.id}`} className={`t48-tile is-ghost v${Math.min(t.value, 4096)}`} style={pos(t)}><span>{t.value}</span></div>
            ))}
            {tiles.map(t => (
              <div key={t.id} className={`t48-tile v${Math.min(t.value, 4096)} d${String(t.value).length}${t.merged ? ' is-merged' : ''}${t.fresh ? ' is-fresh' : ''}`} style={pos(t)}>
                <span key={t.value}>{t.value}</span>
              </div>
            ))}
            {bloque && (
              <div className={fini ? 't48-overlay is-over' : 't48-overlay is-win'}>
                {fini ? (
                  <>
                    <strong>Plus aucun coup possible</strong>
                    <span>Score : {score}{nouveauRecord && ' · nouveau record !'}</span>
                    <div>
                      <button type="button" className="button button-primary" onClick={() => nouvellePartie()}>Rejouer</button>
                      {prev && <button type="button" className="button button-ghost" onClick={annuler}><Undo2 size={15} /> Annuler</button>}
                    </div>
                  </>
                ) : (
                  <>
                    <strong><Trophy size={20} /> 2048 atteint !</strong>
                    <span>Bravo ! Tu peux continuer pour viser encore plus haut.</span>
                    <div>
                      <button type="button" className="button button-primary" onClick={() => { setContinuer(true); focusBoard() }}>Continuer</button>
                      <button type="button" className="button button-ghost" onClick={() => nouvellePartie()}>Rejouer</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Flèches à l'écran : pratique à la souris, et alternative au glissement. */}
        <div className="t48-fleches" aria-label="Déplacer les tuiles">
          <button type="button" aria-label="Gauche" onClick={() => jouer('left')}><ArrowLeft size={18} /></button>
          <button type="button" aria-label="Haut" onClick={() => jouer('up')}><ArrowUp size={18} /></button>
          <button type="button" aria-label="Bas" onClick={() => jouer('down')}><ArrowDown size={18} /></button>
          <button type="button" aria-label="Droite" onClick={() => jouer('right')}><ArrowRight size={18} /></button>
        </div>

        <div className="ms-message">
          <span className="ms-hint">
            <span className="ms-hint-mouse">Flèches du clavier (ou Z Q S D) après avoir cliqué sur la grille</span>
            <span className="ms-hint-touch">Glisse le doigt sur la grille</span>
          </span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Meilleurs scores sur cet appareil</span>
        <ul>
          {TAILLES.map(t => (
            <li key={t.n}>
              <span>{t.label}</span>
              <strong>{records.records[String(t.n)] ?? '—'}</strong>
              <small>{tuiles.records[String(t.n)] ? `tuile ${tuiles.records[String(t.n)]}` : ''}</small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
