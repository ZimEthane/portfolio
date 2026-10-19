import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { AlertTriangle, Eraser, Lightbulb, Pencil, ScanSearch, Timer, Trophy, Undo2 } from 'lucide-react'
import { playSound } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { loadJSON, loadSetting, saveJSON, saveSetting, useRecords, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { useHaptique } from './commun/useHaptique'
import { box, col, CLUES, generate, PEERS, row } from './sudoku-logic'
import type { Grid, Level } from './sudoku-logic'
import './sudoku.css'

const NIVEAUX: { id: Level; label: string }[] = [
  { id: 'facile', label: 'Facile' },
  { id: 'moyen', label: 'Moyen' },
  { id: 'difficile', label: 'Difficile' },
]
const PARTIE_KEY = 'ez-sudoku-partie'
const AIDE_KEY = 'ez-sudoku-aide'
const ERREURS_KEY = 'ez-sudoku-erreurs'
// Rangée du haut d'un clavier AZERTY, sans Maj.
const AZERTY: Record<string, number> = { '&': 1, 'é': 2, '"': 3, "'": 4, '(': 5, '-': 6, 'è': 7, '_': 8, 'ç': 9 }

interface Partie {
  level: Level
  puzzle: Grid
  solution: Grid
  values: Grid
  notes: number[] // un masque de bits par case (bit d = note d)
  elapsed: number // secondes de jeu
  hints: number
  mistakes: number
  done: boolean
}

function nouvelle(level: Level): Partie {
  const { puzzle, solution } = generate(level)
  return { level, puzzle, solution, values: [...puzzle], notes: new Array(81).fill(0), elapsed: 0, hints: 0, mistakes: 0, done: false }
}

const formatTemps = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const formatLong = (s: number) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`)

// Mini-grille 3×3 pour les illustrations du guide.
function MiniCarre({ cases, surligne }: { cases: string; surligne?: number[] }) {
  return (
    <div className="sd-mini" aria-hidden="true">
      {cases.split('').map((v, k) => <span key={k} className={surligne?.includes(k) ? 'is-on' : ''}>{v === '.' ? '' : v}</span>)}
    </div>
  )
}

export default function Sudoku() {
  const [partie, setPartie] = useState<Partie>(() => {
    const sauvee = loadJSON<Partie | null>(PARTIE_KEY, null)
    return sauvee && !sauvee.done && sauvee.values?.length === 81 ? sauvee : nouvelle('facile')
  })
  const [sel, setSel] = useState<number | null>(null)
  const [notesMode, setNotesMode] = useState(false)
  const [aide, setAide] = useState(() => loadSetting(AIDE_KEY))
  const [erreurs, setErreurs] = useState(() => loadSetting(ERREURS_KEY))
  const [historique, setHistorique] = useState<{ values: Grid; notes: number[] }[]>([])
  const [record, setRecord] = useState(false)

  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const haptique = useHaptique(vibe)
  const panelRef = useRef<HTMLDivElement>(null)
  const grilleRef = useRef<HTMLLabelElement>(null)
  const plein = useFullscreen(panelRef)
  const records = useRecords('ez-sudoku-temps', 'lower')
  const son = (s: Parameters<typeof playSound>[0]) => sound && playSound(s)

  // Sauvegarde automatique de la partie en cours.
  useEffect(() => saveJSON(PARTIE_KEY, partie), [partie])

  // Chrono : une seconde de plus tant que la partie dure et que la page est visible.
  useEffect(() => {
    if (partie.done) return
    const id = window.setInterval(() => {
      if (!document.hidden) setPartie(p => (p.done ? p : { ...p, elapsed: p.elapsed + 1 }))
    }, 1000)
    return () => window.clearInterval(id)
  }, [partie.done])

  const { puzzle, solution, values, notes, done } = partie
  const fausse = (i: number) => values[i] !== 0 && values[i] !== solution[i]

  const memoriser = () => setHistorique(h => [...h.slice(-99), { values, notes }])

  const terminer = (p: Partie) => {
    son('win')
    haptique.request('win')
    setRecord(p.hints === 0 && records.submit(p.level, p.elapsed))
    return { ...p, done: true }
  }

  const choisirNiveau = (level: Level) => {
    const enCours = !done && values.some((v, i) => v && !puzzle[i])
    if (enCours && !window.confirm('Commencer une nouvelle grille ? La partie en cours sera perdue.')) return
    setPartie(nouvelle(level))
    setHistorique([])
    setSel(null)
    setRecord(false)
  }

  const entrer = (d: number, cible: number | null = sel) => {
    if (cible === null || done || puzzle[cible]) return
    const i = cible
    if (notesMode) {
      if (values[i]) return
      memoriser()
      const n = [...notes]
      n[i] ^= 1 << d
      setPartie({ ...partie, notes: n })
      son('select')
      haptique.request('tap')
      return
    }
    if (values[i] === d) return
    memoriser()
    const v = [...values]
    v[i] = d
    const n = [...notes]
    n[i] = 0
    for (const j of PEERS[i]) n[j] &= ~(1 << d) // le chiffre posé n'est plus possible chez les voisines
    let p: Partie = { ...partie, values: v, notes: n }
    if (d !== solution[i]) {
      p = { ...p, mistakes: p.mistakes + 1 }
      if (erreurs) {
        son('error')
        haptique.request('error')
      } else {
        son('select')
        haptique.request('tap')
      }
    } else {
      // Petite note joyeuse quand une ligne, une colonne ou un carré est complet et juste.
      const complet = (f: (k: number) => number) => {
        const zone = Array.from({ length: 81 }, (_, k) => k).filter(k => f(k) === f(i))
        return zone.every(k => v[k] === solution[k])
      }
      son(complet(row) || complet(col) || complet(box) ? 'match' : 'select')
      haptique.request('tap')
    }
    if (v.every((x, k) => x === solution[k])) p = terminer(p)
    setPartie(p)
  }

  const effacer = (cible: number | null = sel) => {
    if (cible === null || done || puzzle[cible] || (!values[cible] && !notes[cible])) return
    memoriser()
    const v = [...values]
    const n = [...notes]
    v[cible] = 0
    n[cible] = 0
    setPartie({ ...partie, values: v, notes: n })
    son('slide')
  }

  const annuler = () => {
    const prev = historique[historique.length - 1]
    if (!prev || done) return
    setHistorique(h => h.slice(0, -1))
    setPartie({ ...partie, values: prev.values, notes: prev.notes })
    son('slide')
  }

  // Indice : remplit la case choisie (ou une case vide au hasard) avec le bon chiffre.
  const indice = () => {
    if (done) return
    let i = sel !== null && !puzzle[sel] && values[sel] !== solution[sel] ? sel : -1
    if (i < 0) {
      const vides = values.map((v, k) => (v !== solution[k] ? k : -1)).filter(k => k >= 0)
      if (!vides.length) return
      i = vides[Math.floor(Math.random() * vides.length)]
    }
    memoriser()
    const v = [...values]
    v[i] = solution[i]
    const n = [...notes]
    n[i] = 0
    for (const j of PEERS[i]) n[j] &= ~(1 << solution[i])
    let p: Partie = { ...partie, values: v, notes: n, hints: partie.hints + 1 }
    setSel(i)
    son('match')
    if (v.every((x, k) => x === solution[k])) p = terminer(p)
    setPartie(p)
  }

  const deplacer = (i: number) => {
    setSel(i)
    grilleRef.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.focus()
  }

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const moves: Record<string, number> = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }
    const chiffre = /^[1-9]$/.test(e.key) ? +e.key : AZERTY[e.key]
    if (e.key in moves) {
      e.preventDefault()
      const r = row(i) + (e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0)
      const c = col(i) + (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0)
      if (r >= 0 && r < 9 && c >= 0 && c < 9) deplacer(r * 9 + c)
    } else if (chiffre) {
      e.preventDefault()
      setSel(i)
      entrer(chiffre, i)
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      e.preventDefault()
      setSel(i)
      effacer(i)
    } else if (e.key.toLowerCase() === 'n') {
      setNotesMode(m => !m)
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      annuler()
    }
  }

  // Combien de fois chaque chiffre est déjà placé (pour griser ceux qui sont complets).
  const places = Array.from({ length: 10 }, (_, d) => values.filter(v => v === d).length)
  const choisi = sel !== null ? values[sel] : 0

  const classes = (i: number) => {
    const c = ['sd-cell']
    if (puzzle[i]) c.push('is-given')
    else if (values[i]) c.push('is-user')
    if (i === sel) c.push('is-sel')
    else if (aide && sel !== null && (row(i) === row(sel) || col(i) === col(sel) || box(i) === box(sel))) c.push('is-peer')
    if (aide && choisi && values[i] === choisi && i !== sel) c.push('is-same')
    if (erreurs && fausse(i)) c.push('is-error')
    return c.join(' ')
  }

  return (
    <section className="ms sd" aria-label="Sudoku">
      <Guide
        etapes={[
          { title: 'Une seule fois par ligne', text: 'Chaque ligne de la grille doit contenir tous les chiffres de 1 à 9, sans répétition. Pareil pour chaque colonne.', visual: <MiniCarre cases="51..8.7.." surligne={[0, 1, 2]} /> },
          { title: 'Et une fois par carré', text: 'La grille est découpée en 9 carrés de 3×3 : chacun doit aussi contenir les chiffres de 1 à 9.', visual: <MiniCarre cases="5134.8769" surligne={[0, 1, 2, 3, 4, 5, 6, 7, 8]} /> },
          { title: 'Remplis les cases vides', text: 'Touche une case, puis un chiffre en bas (ou au clavier). Le mode Notes sert à noter les chiffres possibles, en petit.', visual: <MiniCarre cases="51.4.876." surligne={[2]} /> },
        ]}
        astuces={[
          'Cherche d’abord un chiffre déjà très présent : il reste souvent peu de places possibles pour lui.',
          'Si une case n’a plus qu’une seule possibilité, c’est forcément elle : utilise les notes pour t’y retrouver.',
          'L’aide débutant surligne la ligne, la colonne et le carré de la case choisie, ainsi que les chiffres identiques.',
          'Bloqué ? Le bouton « Indice » remplit une case pour toi (mais la partie ne compte plus pour les records).',
        ]}
      />

      <div className="ms-levels sd-niveaux" role="radiogroup" aria-label="Difficulté">
        {NIVEAUX.map(n => (
          <button key={n.id} type="button" role="radio" aria-checked={partie.level === n.id} className={partie.level === n.id ? 'is-active' : ''} onClick={() => choisirNiveau(n.id)}>
            <strong>{n.label}</strong>
            <small>{CLUES[n.id]} chiffres donnés</small>
          </button>
        ))}
      </div>

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="sd-bar">
          <span className="ms-counter" title="Temps"><Timer size={15} /> {formatTemps(partie.elapsed)}</span>
          <span className="ms-counter sd-fautes" title="Erreurs"><AlertTriangle size={15} /> {partie.mistakes}</span>
          <span className="ms-counter" title="Indices utilisés"><Lightbulb size={15} /> {partie.hints}</span>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle}>
          <button type="button" role="switch" aria-checked={aide} className={aide ? 'ms-switch is-on' : 'ms-switch'} onClick={() => { setAide(!aide); saveSetting(AIDE_KEY, !aide) }} title="Surligne la ligne, la colonne, le carré et les chiffres identiques">
            <ScanSearch size={15} /> Aide <span className="ms-switch-track" aria-hidden="true" />
          </button>
          <button type="button" role="switch" aria-checked={erreurs} className={erreurs ? 'ms-switch is-on' : 'ms-switch'} onClick={() => { setErreurs(!erreurs); saveSetting(ERREURS_KEY, !erreurs) }} title="Affiche en rouge les chiffres faux">
            <AlertTriangle size={15} /> Erreurs <span className="ms-switch-track" aria-hidden="true" />
          </button>
        </Outils>

        {haptique.input}
        <div className="sd-wrap" role="group" aria-label="Grille de Sudoku">
          <label ref={grilleRef} {...haptique.labelProps} className={`sd-grille${done ? ' is-done' : ''}`}>
            {values.map((v, i) => (
              <div
                key={i}
                role="button"
                tabIndex={i === (sel ?? 0) ? 0 : -1}
                data-i={i}
                className={classes(i)}
                aria-label={`Ligne ${row(i) + 1}, colonne ${col(i) + 1} : ${v ? `${v}${puzzle[i] ? ' (donné)' : ''}` : 'vide'}${i === sel ? ', sélectionnée' : ''}`}
                onClick={() => setSel(i)}
                onFocus={() => setSel(i)}
                onKeyDown={e => onKeyDown(e, i)}
              >
                {v ? v : notes[i] ? (
                  <span className="sd-notes">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => <i key={d}>{notes[i] & (1 << d) ? d : ''}</i>)}</span>
                ) : null}
              </div>
            ))}
          </label>
        </div>

        <label {...haptique.labelProps} className="sd-pave" aria-label="Chiffres">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
            <div key={d} role="button" tabIndex={0} className={`sd-chiffre${places[d] >= 9 ? ' is-full' : ''}${notesMode ? ' is-notes' : ''}`} aria-label={`Chiffre ${d}`} onClick={() => entrer(d)} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), entrer(d))}>
              {d}
              <small>{Math.max(0, 9 - places[d])}</small>
            </div>
          ))}
        </label>

        <div className="sd-actions">
          <button type="button" className={notesMode ? 'sd-action is-on' : 'sd-action'} aria-pressed={notesMode} onClick={() => setNotesMode(!notesMode)}><Pencil size={16} /> Notes</button>
          <button type="button" className="sd-action" onClick={() => effacer()}><Eraser size={16} /> Effacer</button>
          <button type="button" className="sd-action" onClick={annuler} disabled={!historique.length}><Undo2 size={16} /> Annuler</button>
          <button type="button" className="sd-action" onClick={indice} disabled={done}><Lightbulb size={16} /> Indice</button>
        </div>

        <div className="ms-message" aria-live="polite">
          {done ? (
            <>
              <span className="ms-win"><Trophy size={16} /> Grille terminée en {formatLong(partie.elapsed)}{partie.hints ? ` avec ${partie.hints} indice${partie.hints > 1 ? 's' : ''}` : ''}{record && ' : nouveau record !'}</span>
              <button type="button" className="button button-primary" onClick={() => choisirNiveau(partie.level)}>Nouvelle grille</button>
            </>
          ) : (
            <span className="ms-hint">
              <span className="ms-hint-mouse">Clique une case, puis un chiffre (clavier : 1 à 9, flèches, N pour les notes, Ctrl+Z)</span>
              <span className="ms-hint-touch">Touche une case, puis un chiffre</span>
            </span>
          )}
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Meilleurs temps sans indice sur cet appareil</span>
        <ul>
          {NIVEAUX.map(n => <li key={n.id}><span>{n.label}</span><strong>{records.records[n.id] !== undefined ? formatLong(records.records[n.id]) : '—'}</strong></li>)}
        </ul>
      </div>
    </section>
  )
}
