import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { Bot, RotateCcw, Users } from 'lucide-react'
import { playSound } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { loadJSON, saveJSON, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { useHaptique } from './commun/useHaptique'
import { bestMove, COLS, emptyBoard, idx, isFull, play, ROWS, winAt } from './puissance4-logic'
import type { Board, Level } from './puissance4-logic'
import './puissance4.css'

type Mode = Level | 'deux'
const MODES: { id: Mode; label: string; info: string }[] = [
  { id: 'facile', label: 'Facile', info: 'contre l’ordi' },
  { id: 'moyen', label: 'Moyen', info: 'contre l’ordi' },
  { id: 'difficile', label: 'Difficile', info: 'contre l’ordi' },
  { id: 'deux', label: 'À deux', info: 'sur le même écran' },
]
const VICTOIRES_KEY = 'ez-p4-victoires'

// Petit plateau 4×4 pour les illustrations du guide (1 = rouge, 2 = jaune, 3 = jeton gagnant rouge).
function MiniPlateau({ cases, fleche }: { cases: string[]; fleche?: number }) {
  return (
    <div className="p4-mini" aria-hidden="true">
      <div className="p4-mini-fleches">{[0, 1, 2, 3].map(c => <span key={c}>{c === fleche ? '▼' : ''}</span>)}</div>
      <div className="p4-mini-grille">
        {cases.join('').split('').map((v, k) => <span key={k} className={v === '1' ? 'p1' : v === '2' ? 'p2' : v === '3' ? 'p1 is-win' : ''} />)}
      </div>
    </div>
  )
}

export default function Puissance4() {
  const [mode, setMode] = useState<Mode>('moyen')
  const [board, setBoard] = useState<Board>(emptyBoard)
  const [turn, setTurn] = useState<1 | 2>(1)
  const [starter, setStarter] = useState<1 | 2>(1)
  const [winner, setWinner] = useState<0 | 1 | 2 | 'nul'>(0)
  const [ligne, setLigne] = useState<number[]>([])
  const [dernier, setDernier] = useState<number | null>(null)
  const [pense, setPense] = useState(false)
  const [survol, setSurvol] = useState<number | null>(null)
  const [scores, setScores] = useState({ 1: 0, 2: 0, nul: 0 })
  const [victoires, setVictoires] = useState<Record<string, number>>(() => loadJSON(VICTOIRES_KEY, {}))

  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const haptique = useHaptique(vibe)
  const panelRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLLabelElement>(null)
  const plein = useFullscreen(panelRef)
  const timer = useRef<number | null>(null)
  const partie = useRef(0) // identifiant de partie, pour ignorer un coup de l'IA d'une partie abandonnée

  const contreIA = mode !== 'deux'
  const nom = (p: 1 | 2) => (contreIA ? (p === 1 ? 'Toi' : 'L’ordi') : p === 1 ? 'Rouge' : 'Jaune')
  const son = (s: Parameters<typeof playSound>[0]) => sound && playSound(s)

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
  }, [])

  // Pose un jeton et gère la fin de partie ; renvoie l'état suivant.
  const poser = (b: Board, c: number, p: 1 | 2) => {
    const res = play(b, c, p)
    if (!res) return null
    const gagnante = winAt(res.board, res.row, c)
    setBoard(res.board)
    setDernier(idx(res.row, c))
    son('drop')
    if (gagnante) {
      setWinner(p)
      setLigne(gagnante)
      setScores(s => ({ ...s, [p]: s[p] + 1 }))
      if (!contreIA || p === 1) {
        son('win')
        if (contreIA) {
          const v = { ...victoires, [mode]: (victoires[mode] ?? 0) + 1 }
          setVictoires(v)
          saveJSON(VICTOIRES_KEY, v)
        }
      } else son('gameover')
      return { board: res.board, fini: true }
    }
    if (isFull(res.board)) {
      setWinner('nul')
      setScores(s => ({ ...s, nul: s.nul + 1 }))
      son('nomatch')
      return { board: res.board, fini: true }
    }
    setTurn(p === 1 ? 2 : 1)
    return { board: res.board, fini: false }
  }

  // Coup de l'ordinateur, après une petite pause « il réfléchit ».
  const coupIA = (b: Board) => {
    setPense(true)
    const id = partie.current
    timer.current = window.setTimeout(() => {
      timer.current = null
      if (id !== partie.current) return
      const c = bestMove(b, 2, mode as Level)
      setPense(false)
      poser(b, c, 2)
    }, 450)
  }

  const jouer = (c: number) => {
    if (winner || pense || (contreIA && turn !== 1)) return
    const res = poser(board, c, turn)
    if (!res) {
      son('error')
      return
    }
    haptique.request('tap')
    if (!res.fini && contreIA) coupIA(res.board)
  }

  const nouvellePartie = (m: Mode = mode, garderScores = true) => {
    partie.current++
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    const premier: 1 | 2 = garderScores ? (starter === 1 ? 2 : 1) : 1 // on alterne qui commence
    setMode(m)
    setBoard(emptyBoard())
    setWinner(0)
    setLigne([])
    setDernier(null)
    setPense(false)
    setStarter(premier)
    setTurn(premier)
    if (!garderScores) setScores({ 1: 0, 2: 0, nul: 0 })
    if (premier === 2 && m !== 'deux') {
      setPense(true)
      const id = partie.current
      timer.current = window.setTimeout(() => {
        timer.current = null
        if (id !== partie.current) return
        const b = emptyBoard()
        const c = bestMove(b, 2, m as Level)
        setPense(false)
        const res = play(b, c, 2)!
        setBoard(res.board)
        setDernier(idx(res.row, c))
        setTurn(1)
        if (sound) playSound('drop')
      }, 450)
    }
  }

  // Clavier : flèches gauche/droite entre les colonnes, Entrée/Espace ou 1 à 7 pour jouer.
  const onKeyDown = (e: KeyboardEvent, c: number) => {
    const focusCol = (k: number) => boardRef.current?.querySelector<HTMLElement>(`[data-col="${k}"]`)?.focus()
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      focusCol((c + (e.key === 'ArrowLeft' ? COLS - 1 : 1)) % COLS)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      jouer(c)
    } else if (/^[1-7]$/.test(e.key)) {
      e.preventDefault()
      jouer(+e.key - 1)
      focusCol(+e.key - 1)
    }
  }

  const message = winner === 'nul'
    ? 'Match nul : la grille est pleine.'
    : winner
      ? contreIA ? (winner === 1 ? 'Bravo, tu as gagné !' : 'L’ordi a gagné… Revanche ?') : `${nom(winner)} a gagné !`
      : pense ? 'L’ordi réfléchit…' : contreIA ? 'À toi de jouer : choisis une colonne.' : `Au tour de ${nom(turn)}.`

  return (
    <section className="ms p4" aria-label="Puissance 4">
      <Guide
        etapes={[
          { title: 'Lâche un jeton', text: 'Choisis une colonne : ton jeton tombe tout en bas, sur la première case libre. Les joueurs jouent chacun leur tour.', visual: <MiniPlateau fleche={1} cases={['0000', '0000', '0000', '0120']} /> },
          { title: 'Aligne 4 jetons', text: 'Le premier qui aligne 4 jetons de sa couleur gagne : à l’horizontale, à la verticale ou en diagonale.', visual: <MiniPlateau cases={['0003', '0032', '0322', '3221']} /> },
          { title: 'Bloque l’adversaire', text: 'Surveille les alignements de 3 de l’autre joueur et pose ton jeton juste au bon endroit pour les bloquer.', visual: <MiniPlateau fleche={3} cases={['0000', '0000', '1100', '2220']} /> },
        ]}
        astuces={[
          'La colonne du milieu est la plus précieuse : elle fait partie du plus grand nombre d’alignements possibles.',
          'Essaie de préparer deux menaces en même temps : l’adversaire ne pourra en bloquer qu’une.',
          'Attention aux cases juste au-dessus d’une menace : y jouer peut offrir la victoire à l’autre.',
        ]}
      />

      <div className="ms-levels p4-modes" role="radiogroup" aria-label="Mode de jeu">
        {MODES.map(m => (
          <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} className={mode === m.id ? 'is-active' : ''} onClick={() => nouvellePartie(m.id, false)}>
            <strong>{m.id === 'deux' ? <Users size={14} /> : <Bot size={14} />} {m.label}</strong>
            <small>{m.info}</small>
          </button>
        ))}
      </div>

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="p4-scores">
          <span className={`p4-joueur p1${!winner && turn === 1 ? ' is-turn' : ''}`}><i /> {nom(1)} <strong>{scores[1]}</strong></span>
          <span className="p4-nuls">Nuls <strong>{scores.nul}</strong></span>
          <span className={`p4-joueur p2${!winner && turn === 2 ? ' is-turn' : ''}`}><i /> {nom(2)} <strong>{scores[2]}</strong></span>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        <div className="p4-zone">
          {/* Jeton en attente au-dessus de la colonne survolée. */}
          <div className="p4-attente" aria-hidden="true">
            {Array.from({ length: COLS }, (_, c) => (
              <span key={c} className={survol === c && !winner && !pense && (!contreIA || turn === 1) ? `p4-piece p${turn}` : ''} />
            ))}
          </div>
          {haptique.input}
          <label
            ref={boardRef}
            {...haptique.labelProps}
            className={`p4-board${winner ? ' is-over' : ''}${pense ? ' is-thinking' : ''}`}
            onPointerLeave={() => setSurvol(null)}
          >
            {Array.from({ length: COLS }, (_, c) => (
              <div
                key={c}
                role="button"
                tabIndex={0}
                data-col={c}
                className="p4-col"
                aria-label={`Colonne ${c + 1}`}
                onClick={() => jouer(c)}
                onPointerEnter={e => e.pointerType === 'mouse' && setSurvol(c)}
                onFocus={() => setSurvol(c)}
                onKeyDown={e => onKeyDown(e, c)}
              >
                {Array.from({ length: ROWS }, (_, r) => {
                  const i = idx(r, c)
                  const v = board[i]
                  return (
                    <div key={r} className="p4-cell">
                      {v !== 0 && (
                        <span
                          className={`p4-piece p${v}${i === dernier ? ' is-drop' : ''}${ligne.includes(i) ? ' is-win' : ''}`}
                          style={{ '--fall': r + 1 } as CSSProperties}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </label>
        </div>

        <div className="ms-message" aria-live="polite">
          <span className={winner && winner !== 'nul' && (!contreIA || winner === 1) ? 'ms-win' : winner && contreIA && winner === 2 ? 'ms-lose' : 'ms-hint'}>{message}</span>
          {winner !== 0 && <button type="button" className="button button-primary" onClick={() => nouvellePartie()}><RotateCcw size={15} /> Rejouer</button>}
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Victoires contre l’ordi sur cet appareil</span>
        <ul>
          {MODES.filter(m => m.id !== 'deux').map(m => <li key={m.id}><span>{m.label}</span><strong>{victoires[m.id] ?? 0}</strong></li>)}
        </ul>
      </div>
    </section>
  )
}
