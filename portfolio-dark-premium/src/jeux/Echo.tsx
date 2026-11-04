import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent, PointerEvent, ReactNode } from 'react'
import { Heart, Play, RotateCcw, Trophy, XCircle } from 'lucide-react'
import { playNote, playSound } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { useRecords, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { useHaptique } from './commun/useHaptique'
import { angles, COULEURS, DISPOSITIONS, milieu, rythme, secteur, tirage } from './echo-logic'
import './echo.css'

interface Niveau {
  id: string
  label: string
  n: number // nombre de couleurs
  vies: number // essais par partie
  vitesses: readonly [number, number, number] // durée d'allumage (ms) : début, à 6 couleurs, à 14 couleurs
  info: string
}

const NIVEAUX: Niveau[] = [
  { id: 'facile', label: 'Facile', n: 4, vies: 3, vitesses: [620, 520, 440], info: '4 couleurs · 3 essais' },
  { id: 'normal', label: 'Normal', n: 4, vies: 1, vitesses: [460, 360, 270], info: '4 couleurs · le classique' },
  { id: 'expert', label: 'Expert', n: 6, vies: 1, vitesses: [400, 300, 220], info: '6 couleurs · rapide' },
]

type Phase = 'pret' | 'ecoute' | 'joue' | 'perdu'

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`

// Plateau rond : n touches de couleur autour d'un centre. Sert au jeu et aux illustrations du guide.
const CX = 100
const R_EXT = 96
const R_INT = 42

interface PlateauProps {
  n: number
  allume?: number | null // touche allumée (démonstration ou appui)
  presse?: number | null // touche enfoncée par le joueur
  attendu?: number | null // la bonne touche, qui clignote après une erreur
  actif?: boolean // c'est au joueur de jouer
  centre: ReactNode
  onCentre?: () => void
  onPresse?: (i: number) => void
  onRelache?: () => void
  mini?: boolean
}

function Plateau({ n, allume = null, presse = null, attendu = null, actif = false, centre, onCentre, onPresse, onRelache, mini = false }: PlateauProps) {
  const lueur = `echo-lueur-${useId().replace(/:/g, '')}`
  const touches = DISPOSITIONS[n].map((id, i) => {
    const [a0, a1] = angles(n, i)
    return { id, c: COULEURS[id], d: secteur(CX, CX, R_EXT, R_INT, a0, a1), m: milieu(CX, CX, (R_EXT + R_INT) / 2, a0, a1) }
  })

  const clavier = (e: ReactKeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }

  return (
    <svg viewBox="0 0 200 200" className={`echo-plateau${actif ? ' is-actif' : ''}${mini ? ' echo-mini' : ''}`} aria-hidden={mini || undefined}>
      <defs>
        <filter id={lueur} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <circle cx={CX} cy={CX} r="100" className="echo-corps" />
      {touches.map((t, i) => (
        <path
          key={t.id}
          d={t.d}
          className={`echo-pad${allume === i || presse === i ? ' is-allume' : ''}${presse === i ? ' is-presse' : ''}${attendu === i ? ' is-attendu' : ''}`}
          style={{ '--sombre': t.c.sombre, '--vif': t.c.vif } as CSSProperties}
          {...(mini
            ? {}
            : {
                role: 'button',
                tabIndex: actif ? 0 : -1,
                'aria-label': `${t.c.nom} (touche ${i + 1})`,
                'aria-disabled': !actif,
                onPointerDown: (e: PointerEvent) => {
                  if (e.button === 0) onPresse?.(i)
                },
                // Pas de focus au clic : l'anneau bleu reste réservé à la navigation au clavier (Tab).
                onMouseDown: (e: MouseEvent) => e.preventDefault(),
                onPointerUp: onRelache,
                onPointerLeave: onRelache,
                onPointerCancel: onRelache,
                onKeyDown: (e: ReactKeyboardEvent) =>
                  clavier(e, () => {
                    onPresse?.(i)
                    onRelache?.()
                  }),
              })}
        />
      ))}
      {allume !== null && <path d={touches[allume].d} fill={touches[allume].c.vif} filter={`url(#${lueur})`} opacity=".7" pointerEvents="none" />}
      {!mini && touches.map((t, i) => (
        <text key={t.id} x={t.m.x} y={t.m.y + 4} textAnchor="middle" className="echo-touche">{i + 1}</text>
      ))}
      <g
        className={onCentre ? 'echo-hub is-bouton' : 'echo-hub'}
        {...(onCentre ? { role: 'button', tabIndex: 0, 'aria-label': 'Jouer', onClick: onCentre, onKeyDown: (e: ReactKeyboardEvent) => clavier(e, onCentre) } : {})}
      >
        <circle cx={CX} cy={CX} r="34" className="echo-centre" />
        {centre}
      </g>
    </svg>
  )
}

function TexteCentre({ num, sous }: { num?: ReactNode; sous: string }) {
  return (
    <>
      {num !== undefined && <text x={CX} y="106" textAnchor="middle" className="echo-num">{num}</text>}
      <text x={CX} y={num !== undefined ? 123 : 104} textAnchor="middle" className="echo-sous">{sous}</text>
    </>
  )
}

const IconeJouer = ({ sous }: { sous: string }) => (
  <>
    <path d="M94 84L111 95L94 106Z" className="echo-play" />
    <text x={CX} y="123" textAnchor="middle" className="echo-sous">{sous}</text>
  </>
)

// Petite suite de pastilles pour le guide.
function MiniSuite() {
  return (
    <div className="echo-suite-mini" aria-hidden="true">
      {['vert', 'rouge', 'bleu', 'jaune'].map(c => <i key={c} style={{ '--c': COULEURS[c].vif } as CSSProperties} />)}
      <i className="is-nouvelle" style={{ '--c': COULEURS.vert.vif } as CSSProperties}>+</i>
    </div>
  )
}

export default function Echo() {
  const [niveauId, setNiveauId] = useState('normal')
  const niveau = NIVEAUX.find(x => x.id === niveauId)!
  const [phase, setPhase] = useState<Phase>('pret')
  const [longueur, setLongueur] = useState(0) // longueur de la suite en cours
  const [saisie, setSaisie] = useState(0) // couleurs déjà rejouées dans ce tour
  const [score, setScore] = useState(0) // plus longue suite réussie dans cette partie
  const [vies, setVies] = useState(niveau.vies)
  const [allume, setAllume] = useState<number | null>(null)
  const [presse, setPresse] = useState<number | null>(null)
  const [attendu, setAttendu] = useState<number | null>(null)
  const [secoue, setSecoue] = useState(false)
  const [rate, setRate] = useState(false)
  const [nouveauRecord, setNouveauRecord] = useState(false)

  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const haptique = useHaptique(vibe)
  const panelRef = useRef<HTMLDivElement>(null)
  const plein = useFullscreen(panelRef)
  const records = useRecords('ez-echo', 'higher')

  // L'état de la partie vit aussi dans des refs : les minuteurs et le clavier lisent toujours la dernière valeur.
  const phaseRef = useRef<Phase>('pret')
  const suite = useRef<number[]>([])
  const saisieRef = useRef(0)
  const viesRef = useRef(niveau.vies)
  const minuteurs = useRef<number[]>([])
  const relacheRef = useRef<number | null>(null)
  const debutAppui = useRef(0)
  const sonRef = useRef(sound)
  sonRef.current = sound

  const changerPhase = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }
  const plusTard = (fn: () => void, ms: number) => {
    minuteurs.current.push(window.setTimeout(fn, ms))
  }
  const toutArreter = () => {
    minuteurs.current.forEach(id => window.clearTimeout(id))
    minuteurs.current = []
    if (relacheRef.current !== null) window.clearTimeout(relacheRef.current)
    relacheRef.current = null
  }
  useEffect(() => () => toutArreter(), [])

  const note = (i: number, dur: number) => {
    if (sonRef.current) playNote(COULEURS[DISPOSITIONS[niveau.n][i]].note, dur)
  }

  // Montre la suite, couleur par couleur, puis rend la main au joueur.
  const montrer = (s: number[], delai: number) => {
    changerPhase('ecoute')
    saisieRef.current = 0
    setSaisie(0)
    setAttendu(null)
    setPresse(null)
    const { on, pause } = rythme(niveau.vitesses, s.length)
    s.forEach((c, k) => {
      const t = delai + k * (on + pause)
      plusTard(() => {
        setAllume(c)
        note(c, on / 1000)
      }, t)
      plusTard(() => setAllume(null), t + on)
    })
    plusTard(() => {
      setRate(false)
      changerPhase('joue')
    }, delai + s.length * (on + pause) - pause + 60)
  }

  const lancer = () => {
    toutArreter()
    suite.current = [tirage(niveau.n)]
    viesRef.current = niveau.vies
    setVies(niveau.vies)
    setScore(0)
    setLongueur(1)
    setNouveauRecord(false)
    setRate(false)
    setAllume(null)
    montrer(suite.current, 650)
  }

  const choisirNiveau = (id: string) => {
    toutArreter()
    const n = NIVEAUX.find(x => x.id === id)!
    setNiveauId(id)
    suite.current = []
    saisieRef.current = 0
    viesRef.current = n.vies
    setVies(n.vies)
    setScore(0)
    setLongueur(0)
    setSaisie(0)
    setAllume(null)
    setPresse(null)
    setAttendu(null)
    setRate(false)
    setNouveauRecord(false)
    changerPhase('pret')
  }

  // Le joueur appuie sur la touche i.
  const appui = (i: number) => {
    const bonne = suite.current[saisieRef.current]
    if (i === bonne) {
      note(i, 0.3)
      haptique.request('tap')
      saisieRef.current += 1
      setSaisie(saisieRef.current)
      if (saisieRef.current === suite.current.length) {
        // Tour réussi : une couleur de plus.
        setScore(suite.current.length)
        changerPhase('ecoute')
        plusTard(() => {
          suite.current = [...suite.current, tirage(niveau.n)]
          setLongueur(suite.current.length)
          montrer(suite.current, 0)
        }, 800)
      }
      return
    }

    // Erreur : la bonne touche clignote.
    if (sonRef.current) playSound('error')
    haptique.request('error')
    setAttendu(bonne)
    setSecoue(true)
    plusTard(() => setSecoue(false), 450)
    viesRef.current -= 1
    setVies(viesRef.current)
    if (viesRef.current > 0) {
      setRate(true)
      changerPhase('ecoute')
      plusTard(() => montrer(suite.current, 0), 1400)
      return
    }
    changerPhase('perdu')
    const final = suite.current.length - 1
    const record = final > 0 && records.submit(niveauId, final)
    setNouveauRecord(record)
    plusTard(() => {
      if (sonRef.current) playSound(record ? 'win' : 'gameover')
    }, 380)
  }

  // Appui (souris, doigt ou clavier) : la touche reste allumée au moins un court instant.
  const presser = (i: number) => {
    if (phaseRef.current !== 'joue') return
    if (relacheRef.current !== null) window.clearTimeout(relacheRef.current)
    relacheRef.current = null
    debutAppui.current = performance.now()
    setPresse(i)
    appui(i)
  }
  const relacher = () => {
    if (relacheRef.current !== null) window.clearTimeout(relacheRef.current)
    const reste = Math.max(0, 170 - (performance.now() - debutAppui.current))
    relacheRef.current = window.setTimeout(() => {
      relacheRef.current = null
      setPresse(null)
    }, reste)
  }

  // Clavier : touches 1 à 4 (ou 1 à 6), en haut du clavier ou sur le pavé numérique.
  // On lit la touche physique (e.code) : sur un clavier AZERTY, « 1 » donne « & » sans Maj.
  const clavier = useRef({ presser, relacher, lancer, n: niveau.n })
  clavier.current = { presser, relacher, lancer, n: niveau.n }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const cible = e.target as HTMLElement | null
      if (cible?.closest('textarea, [contenteditable="true"], input:not([type="checkbox"])')) return
      const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code)
      if (m) {
        const i = Number(m[1]) - 1
        if (i >= clavier.current.n) return
        e.preventDefault()
        clavier.current.presser(i)
        clavier.current.relacher()
        return
      }
      if ((e.code === 'Space' || e.code === 'Enter') && cible === document.body && (phaseRef.current === 'pret' || phaseRef.current === 'perdu')) {
        e.preventDefault()
        clavier.current.lancer()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const record = records.records[niveauId]
  const centre =
    phase === 'pret' ? <IconeJouer sous="Jouer" />
    : phase === 'perdu' ? <TexteCentre num={score} sous="Rejouer" />
    : <TexteCentre num={longueur} sous={rate ? 'Encore' : phase === 'joue' ? 'À toi' : 'Regarde'} />

  return (
    <section className="ms echo" aria-label="Écho">
      <Guide
        etapes={[
          { title: 'Regarde et écoute', text: 'Les couleurs s’allument une par une, chacune avec sa propre note. Au début, il n’y en a qu’une.', visual: <Plateau n={4} allume={0} centre={<TexteCentre num={1} sous="Regarde" />} mini /> },
          { title: 'Rejoue la suite', text: <>Touche les couleurs dans le même ordre. Au clavier : touches <kbd>1</kbd> à <kbd>4</kbd> (jusqu’à <kbd>6</kbd> en Expert).</>, visual: <Plateau n={4} allume={1} presse={1} centre={<TexteCentre num={2} sous="À toi" />} mini /> },
          { title: 'Une couleur de plus', text: 'À chaque tour réussi, la même suite revient avec une couleur en plus à la fin. Le rythme accélère à 6 puis à 14 couleurs.', visual: <MiniSuite /> },
          { title: 'Attention aux erreurs', text: 'Une erreur et la partie s’arrête (en Facile, tu as 3 essais). Ton score : la plus longue suite réussie.', visual: <Plateau n={4} attendu={2} centre={<TexteCentre num={7} sous="Rejouer" />} mini /> },
        ]}
        astuces={[
          'Chante la suite dans ta tête : chaque couleur a sa note, l’oreille aide autant que les yeux.',
          'Découpe la suite en petits paquets de 3 ou 4 couleurs (« vert, rouge, bleu… jaune, jaune »).',
          'Pas besoin de te presser : tant que tu ne te trompes pas, tu as tout ton temps pour rejouer.',
        ]}
      />

      <div className="ms-levels echo-niveaux" role="radiogroup" aria-label="Difficulté">
        {NIVEAUX.map(n => (
          <button key={n.id} type="button" role="radio" aria-checked={niveauId === n.id} className={niveauId === n.id ? 'is-active' : ''} onClick={() => choisirNiveau(n.id)}>
            <strong>{n.label}</strong>
            <small>{n.info}</small>
          </button>
        ))}
      </div>

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="t48-bar">
          <div className="t48-score"><span>Score</span><strong>{score}</strong></div>
          <div className="t48-score"><span>Record</span><strong>{record ?? 0}</strong></div>
          {niveau.vies > 1 && (
            <div className="t48-score echo-vies" aria-label={`${pluriel(vies, 'essai')} restant${vies > 1 ? 's' : ''}`}>
              <span>Essais</span>
              <strong>{Array.from({ length: niveau.vies }, (_, k) => <Heart key={k} size={15} className={k < vies ? 'is-plein' : ''} />)}</strong>
            </div>
          )}
          <button type="button" className="t48-btn" onClick={lancer} title="Nouvelle partie"><RotateCcw size={15} /> <span className="t48-btn-texte">Nouvelle partie</span></button>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        {haptique.input}
        <label {...haptique.labelProps} className={`echo-zone${secoue ? ' is-erreur' : ''}`} onContextMenu={e => e.preventDefault()}>
          <Plateau
            n={niveau.n}
            allume={allume}
            presse={presse}
            attendu={attendu}
            actif={phase === 'joue'}
            centre={centre}
            onCentre={phase === 'pret' || phase === 'perdu' ? lancer : undefined}
            onPresse={presser}
            onRelache={relacher}
          />
        </label>

        <div className="ms-message" aria-live="polite">
          {phase === 'pret' && (
            <>
              <span className="ms-hint">
                Regarde la suite de couleurs, puis rejoue-la dans le même ordre.
                <span className="ms-hint-mouse"> Clavier : touches 1 à {niveau.n}.</span>
              </span>
              <button type="button" className="button button-primary" onClick={lancer}><Play size={15} /> Jouer</button>
            </>
          )}
          {phase === 'ecoute' && (rate
            ? <span className="ms-lose"><XCircle size={16} /> Raté ! Plus que {pluriel(vies, 'essai')} : regarde encore.</span>
            : <span className="ms-hint">Regarde bien…</span>)}
          {phase === 'joue' && <span className="ms-hint">À toi : {saisie} / {longueur}</span>}
          {phase === 'perdu' && (
            <>
              {nouveauRecord
                ? <span className="ms-win"><Trophy size={16} /> Nouveau record : suite de {pluriel(score, 'couleur')} !</span>
                : <span className="ms-lose"><XCircle size={16} /> {score > 0 ? `Perdu ! Suite de ${pluriel(score, 'couleur')} réussie.` : 'Perdu dès la première couleur !'}</span>}
              <button type="button" className="button button-primary" onClick={lancer}>Rejouer</button>
            </>
          )}
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Meilleurs scores sur cet appareil</span>
        <ul>
          {NIVEAUX.map(n => (
            <li key={n.id}>
              <span>{n.label}</span>
              <strong>{records.records[n.id] !== undefined ? pluriel(records.records[n.id], 'couleur') : '—'}</strong>
              <small>{n.info}</small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
