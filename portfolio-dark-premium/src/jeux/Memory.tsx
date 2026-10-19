import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { Shuffle, Timer, Trophy, MousePointerClick } from 'lucide-react'
import { playSound } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { useRecords, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { useHaptique } from './commun/useHaptique'
import './memory.css'

// Les logos du portfolio (dossier public/img).
const LOGOS = [
  { nom: 'HTML', src: '/img/competence/html.webp' },
  { nom: 'CSS', src: '/img/competence/css.webp' },
  { nom: 'JavaScript', src: '/img/competence/js.webp' },
  { nom: 'PHP', src: '/img/competence/php.webp' },
  { nom: 'Python', src: '/img/competence/python.webp' },
  { nom: 'Java', src: '/img/competence/java.webp' },
  { nom: 'C#', src: '/img/competence/csharp.webp' },
  { nom: 'SQL Server', src: '/img/competence/sql-server.webp' },
  { nom: 'CodeIgniter', src: '/img/competence/codeigniter.webp' },
  { nom: 'VS Code', src: '/img/logiciel/Visual_Studio_Code.webp' },
  { nom: 'Proxmox', src: '/img/logiciel/proxmox.webp' },
  { nom: 'VirtualBox', src: '/img/logiciel/Virtualbox.webp' },
  { nom: 'phpMyAdmin', src: '/img/logiciel/PhpMyAdmin.webp' },
  { nom: 'FileZilla', src: '/img/logiciel/FileZilla.webp' },
  { nom: 'PuTTY', src: '/img/logiciel/PuTTY_Icon.svg.webp' },
  { nom: 'NetBeans', src: '/img/logiciel/Apache_NetBeans.webp' },
  { nom: 'Azure', src: '/img/logiciel/Azur.webp' },
  { nom: 'Debian', src: '/img/os/debian.webp' },
  { nom: 'Kali Linux', src: '/img/os/Kali_linux.webp' },
  { nom: 'WordPress', src: '/img/cms/WordPress.webp' },
]

// cols/rows : disposition sur ordinateur ; colsM/rowsM : sur téléphone.
const NIVEAUX = [
  { id: 'facile', label: 'Facile', paires: 6, cols: 4, rows: 3, colsM: 3, rowsM: 4 },
  { id: 'moyen', label: 'Moyen', paires: 10, cols: 5, rows: 4, colsM: 4, rowsM: 5 },
  { id: 'difficile', label: 'Difficile', paires: 15, cols: 6, rows: 5, colsM: 5, rowsM: 6 },
]

type Etat = 'cachee' | 'visible' | 'trouvee'
interface Carte { logo: number; etat: Etat }

function melanger<T>(t: T[]): T[] {
  const a = [...t]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function nouvellesCartes(paires: number): Carte[] {
  const logos = melanger(LOGOS.map((_, k) => k)).slice(0, paires)
  return melanger([...logos, ...logos]).map(logo => ({ logo, etat: 'cachee' as Etat }))
}

const formatTemps = (s: number) => (s < 60 ? `${s.toFixed(1).replace('.', ',')} s` : `${Math.floor(s / 60)} min ${String(Math.floor(s % 60)).padStart(2, '0')} s`)

function Chrono({ debut, fin }: { debut: number | null; fin: number | null }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (debut === null || fin !== null) return
    const id = window.setInterval(() => setTick(t => t + 1), 250)
    return () => window.clearInterval(id)
  }, [debut, fin])
  const s = debut === null ? 0 : ((fin ?? Date.now()) - debut) / 1000
  return <>{String(Math.min(999, Math.floor(s))).padStart(3, '0')}</>
}

// Petite carte pour les illustrations du guide.
function MiniCarte({ logo, etat }: { logo?: number; etat: Etat }) {
  return (
    <div className={`mem-carte mem-mini is-${etat}`} aria-hidden="true">
      <div className="mem-inner">
        <div className="mem-face mem-dos"><span>EZ</span></div>
        <div className="mem-face mem-recto">{logo !== undefined && <img src={LOGOS[logo].src} alt="" />}</div>
      </div>
    </div>
  )
}

export default function Memory() {
  const [niveauId, setNiveauId] = useState(NIVEAUX[0].id)
  const niveau = NIVEAUX.find(n => n.id === niveauId)!
  const [cartes, setCartes] = useState(() => nouvellesCartes(NIVEAUX[0].paires))
  const [choix, setChoix] = useState<number[]>([]) // cartes retournées, pas encore appariées
  const [coups, setCoups] = useState(0)
  const [debut, setDebut] = useState<number | null>(null)
  const [fin, setFin] = useState<number | null>(null)
  const [rate, setRate] = useState<number[]>([]) // paire ratée, affichée un instant
  const [nouveau, setNouveau] = useState({ temps: false, coups: false })

  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const haptique = useHaptique(vibe)
  const panelRef = useRef<HTMLDivElement>(null)
  const plein = useFullscreen(panelRef)
  const recordsTemps = useRecords('ez-memory-temps', 'lower')
  const recordsCoups = useRecords('ez-memory-coups', 'lower')
  const timer = useRef<number | null>(null)

  // Précharge les logos pour que les cartes se retournent sans attendre l'image.
  useEffect(() => {
    LOGOS.forEach(l => {
      const img = new Image()
      img.src = l.src
    })
  }, [])
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
  }, [])

  const son = (s: Parameters<typeof playSound>[0]) => {
    if (sound) playSound(s)
  }

  const nouvellePartie = (id = niveauId) => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    const n = NIVEAUX.find(x => x.id === id)!
    setNiveauId(id)
    setCartes(nouvellesCartes(n.paires))
    setChoix([])
    setRate([])
    setCoups(0)
    setDebut(null)
    setFin(null)
    setNouveau({ temps: false, coups: false })
  }

  // Cache la paire ratée (après un délai, ou tout de suite si on joue vite).
  const cacherRatees = (base: Carte[], ratees: number[]) => base.map((c, k) => (ratees.includes(k) ? { ...c, etat: 'cachee' as Etat } : c))

  const retourner = (i: number) => {
    if (fin !== null) return
    let base = cartes
    let enCours = choix
    // Une paire ratée est encore visible : on la recache tout de suite pour enchaîner.
    if (rate.length) {
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = null
      base = cacherRatees(base, rate)
      enCours = []
      setRate([])
    }
    if (base[i].etat !== 'cachee') {
      if (base !== cartes) setCartes(base)
      return
    }
    const maintenant = Date.now()
    if (debut === null) setDebut(maintenant)
    let suivantes = base.map((c, k) => (k === i ? { ...c, etat: 'visible' as Etat } : c))
    const selection = [...enCours, i]
    haptique.request('tap')

    if (selection.length < 2) {
      son('flip')
      setCartes(suivantes)
      setChoix(selection)
      return
    }

    const [a, b] = selection
    const nbCoups = coups + 1
    setCoups(nbCoups)
    setChoix([])
    if (suivantes[a].logo === suivantes[b].logo) {
      suivantes = suivantes.map((c, k) => (k === a || k === b ? { ...c, etat: 'trouvee' as Etat } : c))
      setCartes(suivantes)
      haptique.request('success')
      if (suivantes.every(c => c.etat === 'trouvee')) {
        setFin(maintenant)
        son('win')
        const temps = Math.round(((maintenant - (debut ?? maintenant)) / 1000) * 10) / 10
        setNouveau({ temps: recordsTemps.submit(niveauId, temps), coups: recordsCoups.submit(niveauId, nbCoups) })
      } else {
        son('match')
      }
    } else {
      son('flip')
      setCartes(suivantes)
      setRate([a, b])
      window.setTimeout(() => son('nomatch'), 180)
      timer.current = window.setTimeout(() => {
        timer.current = null
        setCartes(prev => cacherRatees(prev, [a, b]))
        setRate([])
      }, 950)
    }
  }

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      retourner(i)
    }
  }

  const trouvees = cartes.filter(c => c.etat === 'trouvee').length / 2
  const tempsFinal = debut !== null && fin !== null ? (fin - debut) / 1000 : 0
  const style = { '--cols': niveau.cols, '--rows': niveau.rows, '--cols-m': niveau.colsM, '--rows-m': niveau.rowsM } as CSSProperties

  return (
    <section className="ms mem" aria-label="Memory">
      <Guide
        etapes={[
          { title: 'Retourne deux cartes', text: 'Clique ou touche une carte pour la retourner, puis une deuxième. Chaque logo existe en deux exemplaires.', visual: <div className="mem-mini-rang"><MiniCarte logo={4} etat="visible" /><MiniCarte etat="cachee" /><MiniCarte logo={9} etat="visible" /></div> },
          { title: 'Trouve les paires', text: 'Si les deux logos sont identiques, la paire reste visible. Sinon, les cartes se retournent : mémorise bien leur place !', visual: <div className="mem-mini-rang"><MiniCarte logo={4} etat="trouvee" /><MiniCarte logo={4} etat="trouvee" /></div> },
          { title: 'Gagne en un minimum de coups', text: 'La partie est gagnée quand toutes les paires sont trouvées. Chaque essai compte pour un coup : moins tu en fais, mieux c’est.', visual: <div className="mem-mini-rang"><MiniCarte logo={10} etat="trouvee" /><MiniCarte logo={17} etat="trouvee" /><MiniCarte logo={0} etat="trouvee" /></div> },
        ]}
        astuces={[
          'Commence par retourner des cartes que tu n’as jamais vues : chaque nouvelle carte est une information.',
          'Retiens les cartes par zone (« Python en haut à gauche »), c’est plus facile que de tout mémoriser.',
          'Pas besoin d’attendre que les cartes ratées se retournent : touche directement la suivante.',
        ]}
      />

      <div className="ms-levels mem-levels" role="radiogroup" aria-label="Difficulté">
        {NIVEAUX.map(n => (
          <button key={n.id} type="button" role="radio" aria-checked={niveauId === n.id} className={niveauId === n.id ? 'is-active' : ''} onClick={() => nouvellePartie(n.id)}>
            <strong>{n.label}</strong>
            <small>{n.paires} paires · {n.paires * 2} cartes</small>
          </button>
        ))}
      </div>

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="ms-bar">
          <span className="ms-counter" title="Coups joués"><MousePointerClick size={15} /> {String(Math.min(999, coups)).padStart(3, '0')}</span>
          <button type="button" className="ms-face mem-reset" onClick={() => nouvellePartie()} aria-label="Nouvelle partie" title="Mélanger et recommencer"><Shuffle size={20} /></button>
          <span className="ms-counter" title="Temps"><Timer size={15} /> <Chrono debut={debut} fin={fin} /></span>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        {haptique.input}
        <label {...haptique.labelProps} className={`mem-grille${fin !== null ? ' is-won' : ''}`} style={style}>
          {cartes.map((c, i) => {
            const logo = LOGOS[c.logo]
            const ratee = rate.includes(i)
            return (
              <div
                key={i}
                role="button"
                tabIndex={0}
                className={`mem-carte is-${c.etat}${ratee ? ' is-rate' : ''}`}
                aria-label={c.etat === 'cachee' ? `Carte ${i + 1}, cachée` : `Carte ${i + 1} : ${logo.nom}${c.etat === 'trouvee' ? ', paire trouvée' : ''}`}
                onClick={() => retourner(i)}
                onKeyDown={e => onKeyDown(e, i)}
              >
                <div className="mem-inner">
                  <div className="mem-face mem-dos"><span>EZ</span></div>
                  <div className="mem-face mem-recto">
                    <img src={logo.src} alt="" draggable={false} />
                    <span className="mem-nom">{logo.nom}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </label>

        <div className="ms-message" aria-live="polite">
          {fin !== null ? (
            <>
              <span className="ms-win"><Trophy size={16} /> {niveau.paires} paires en {coups} coups et {formatTemps(tempsFinal)}{(nouveau.temps || nouveau.coups) && ' : nouveau record !'}</span>
              <button type="button" className="button button-primary" onClick={() => nouvellePartie()}>Rejouer</button>
            </>
          ) : (
            <span className="ms-hint" aria-live="off">{trouvees} / {niveau.paires} paires trouvées</span>
          )}
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Meilleurs scores sur cet appareil</span>
        <ul>
          {NIVEAUX.map(n => (
            <li key={n.id}>
              <span>{n.label}</span>
              <strong>{recordsTemps.records[n.id] !== undefined ? formatTemps(recordsTemps.records[n.id]) : '—'}</strong>
              <small>{recordsCoups.records[n.id] !== undefined ? `${recordsCoups.records[n.id]} coups` : ''}</small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
