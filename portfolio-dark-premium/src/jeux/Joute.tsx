import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { ArrowLeftRight, Bot, Check, History, RotateCcw, Shuffle, SkipForward, Trophy, Undo2, X } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { loadJSON, saveJSON, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { chargerLexique } from './lexique'
import type { Lexique } from './lexique'
import { aEchanger, CENTRE, choisirCoup, coupsPossibles, evaluer, N, nouveauSac, plateauVide, prime, sommeChevalet, TAILLE_CHEVALET, valeur } from './joute-logic'
import type { Niveau, Plateau, Pose } from './joute-logic'
import './joute.css'

const PARTIE_KEY = 'ez-joute-partie'
const STATS_KEY = 'ez-joute'
const NIVEAUX: { id: Niveau; nom: string; info: string }[] = [
  { id: 'facile', nom: 'Facile', info: 'petits mots' },
  { id: 'moyen', nom: 'Moyen', info: 'joue bien' },
  { id: 'fort', nom: 'Fort', info: 'vise le meilleur coup' },
]
const LIBELLE: Record<string, string> = { T: 'MT', D: 'MD', t: 'LT', d: 'LD' }
const NOM_PRIME: Record<string, string> = { T: 'mot compte triple', D: 'mot compte double', t: 'lettre compte triple', d: 'lettre compte double' }

interface Ligne { qui: 0 | 1; texte: string; points: number }
interface Partie {
  plateau: Plateau
  sac: string[]
  chevalets: [string[], string[]] // 0 : toi, 1 : l'ordinateur
  scores: [number, number]
  tour: 0 | 1
  passes: number // tours de suite sans points (6 : fin de partie)
  fini: boolean
  journal: Ligne[]
  dernier: number[] // cases du dernier coup de l'ordinateur
  niveau: Niveau
}
interface Stats { parties: number; victoires: number; meilleurScore: number; meilleurCoup: { mot: string; points: number } | null }
type Temp = Pose & { k: number } // lettre posée pendant ton tour (k : sa place sur le chevalet)

function nouvellePartie(niveau: Niveau): Partie {
  const sac = nouveauSac()
  const toi = sac.splice(0, TAILLE_CHEVALET)
  const ordi = sac.splice(0, TAILLE_CHEVALET)
  return { plateau: plateauVide(), sac, chevalets: [toi, ordi], scores: [0, 0], tour: 0, passes: 0, fini: false, journal: [], dernier: [], niveau }
}

// Fin de partie : celui qui a vidé son chevalet gagne les points des lettres de l'autre.
function terminer(p: Partie, videur: 0 | 1 | null): Partie {
  const scores: [number, number] = [...p.scores]
  const reste = [sommeChevalet(p.chevalets[0]), sommeChevalet(p.chevalets[1])]
  if (videur !== null) {
    const autre = (1 - videur) as 0 | 1
    scores[videur] += reste[autre]
    scores[autre] -= reste[autre]
  } else {
    scores[0] -= reste[0]
    scores[1] -= reste[1]
  }
  return { ...p, scores, fini: true }
}

const motPrincipal = (mots: { mot: string; points: number }[]) => [...mots].sort((a, b) => b.mot.length - a.mot.length || b.points - a.points)[0]

export default function Joute() {
  const [partie, setPartie] = useState<Partie>(() => {
    const p = loadJSON<Partie | null>(PARTIE_KEY, null)
    return p && Array.isArray(p.plateau) && p.plateau.length === N * N ? p : nouvellePartie('moyen')
  })
  const [stats, setStats] = useState<Stats>(() => loadJSON<Stats>(STATS_KEY, { parties: 0, victoires: 0, meilleurScore: 0, meilleurCoup: null }))
  const [temp, setTemp] = useState<Temp[]>([])
  const [choisi, setChoisi] = useState<number | null>(null) // lettre du chevalet choisie
  const [echange, setEchange] = useState<number[] | null>(null) // mode échange : lettres choisies
  const [joker, setJoker] = useState<{ i: number; k: number } | null>(null) // choix de la lettre d'un joker
  const [message, setMessage] = useState<{ texte: string; ton: 'non' | 'info' | 'ordi' } | null>(null)
  const [voirJournal, setVoirJournal] = useState(false)
  const [confirmer, setConfirmer] = useState<Niveau | null>(null)
  const [curseur, setCurseur] = useState<{ i: number; sens: 1 | 15 }>({ i: CENTRE, sens: 1 })
  const [glisse, setGlisse] = useState<{ l: string; x: number; y: number } | null>(null)
  const [lexique, setLexique] = useState<Lexique | null>(null)
  const [erreur, setErreur] = useState(false)
  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const panelRef = useRef<HTMLDivElement>(null)
  const plein = useFullscreen(panelRef)
  const drag = useRef<{ de: { t: 'chevalet'; k: number } | { t: 'plateau'; i: number }; x0: number; y0: number; bouge: boolean } | null>(null)
  const reglages = useRef({ sound, vibe })
  reglages.current = { sound, vibe }

  useEffect(() => saveJSON(PARTIE_KEY, partie), [partie])
  useEffect(() => saveJSON(STATS_KEY, stats), [stats])
  const chargerDico = () => {
    setErreur(false)
    chargerLexique().then(setLexique).catch(() => setErreur(true))
  }
  useEffect(chargerDico, [])

  const { plateau, chevalets, scores, fini } = partie
  const monTour = partie.tour === 0 && !fini
  const verdict = useMemo(() => (temp.length ? evaluer(plateau, temp, lexique) : null), [plateau, temp, lexique])
  const surPlateau = useMemo(() => new Map(temp.map(t => [t.i, t])), [temp])
  const utilises = new Set(temp.map(t => t.k))

  const son = (s: Parameters<typeof playSound>[0]) => reglages.current.sound && playSound(s)
  const dire = (texte: string, ton: 'non' | 'info' | 'ordi' = 'info') => setMessage({ texte, ton })

  // ----- Fin de partie : statistiques -----
  const compte = useRef(false)
  useEffect(() => {
    if (!fini) {
      compte.current = false
      return
    }
    if (compte.current) return
    compte.current = true
    const gagne = scores[0] > scores[1]
    setStats(s => ({ ...s, parties: s.parties + 1, victoires: s.victoires + (gagne ? 1 : 0), meilleurScore: Math.max(s.meilleurScore, scores[0]) }))
    son(gagne ? 'win' : 'gameover')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fini])

  // ----- Le tour de l'ordinateur -----
  useEffect(() => {
    if (partie.tour !== 1 || partie.fini || !lexique) return
    const t = window.setTimeout(() => {
      setPartie(p => {
        if (p.tour !== 1 || p.fini) return p
        const chev = [...p.chevalets[1]]
        const coup = choisirCoup(coupsPossibles(p.plateau, chev, lexique), chev, p.niveau)
        if (!coup) {
          // Rien à jouer : il échange ses lettres (s'il reste assez de lettres dans le sac), sinon il passe.
          if (p.sac.length >= TAILLE_CHEVALET) {
            const sortir = aEchanger(chev)
            for (const l of sortir) chev.splice(chev.indexOf(l), 1)
            const sac = [...p.sac]
            const pioche = sac.splice(0, sortir.length)
            sac.push(...sortir)
            sac.sort(() => Math.random() - 0.5)
            dire(`L’ordinateur échange ${sortir.length} lettre${sortir.length > 1 ? 's' : ''}.`, 'ordi')
            const n: Partie = { ...p, sac, chevalets: [p.chevalets[0], [...chev, ...pioche]], tour: 0, passes: p.passes + 1, dernier: [], journal: [...p.journal, { qui: 1, texte: 'échange', points: 0 }] }
            return n.passes >= 6 ? terminer(n, null) : n
          }
          dire('L’ordinateur passe son tour.', 'ordi')
          const n: Partie = { ...p, tour: 0, passes: p.passes + 1, dernier: [], journal: [...p.journal, { qui: 1, texte: 'passe', points: 0 }] }
          return n.passes >= 6 ? terminer(n, null) : n
        }
        const plateau = [...p.plateau]
        for (const q of coup.poses) {
          plateau[q.i] = { l: q.l, joker: q.joker }
          chev.splice(chev.indexOf(q.joker ? '?' : q.l), 1)
        }
        const sac = [...p.sac]
        chev.push(...sac.splice(0, TAILLE_CHEVALET - chev.length))
        const m = motPrincipal(coup.mots)
        const scrabble = coup.poses.length === TAILLE_CHEVALET
        dire(`L’ordinateur joue ${m.mot}${coup.mots.length > 1 ? ` (+${coup.mots.length - 1} mot${coup.mots.length > 2 ? 's' : ''})` : ''} : ${coup.total} points${scrabble ? ', avec ses 7 lettres !' : '.'}`, 'ordi')
        const n: Partie = {
          ...p, plateau, sac, chevalets: [p.chevalets[0], chev], scores: [p.scores[0], p.scores[1] + coup.total], tour: 0, passes: 0,
          dernier: coup.poses.map(q => q.i), journal: [...p.journal, { qui: 1, texte: coup.mots.map(x => x.mot).join(', '), points: coup.total }],
        }
        return !chev.length && !sac.length ? terminer(n, 1) : n
      })
      son('drop')
    }, 700)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partie.tour, partie.fini, lexique])

  // ----- Tes actions -----
  const poser = (i: number, k: number, lettre?: string) => {
    if (!monTour || plateau[i] || surPlateau.has(i) || utilises.has(k)) return
    const l = chevalets[0][k]
    if (l === '?' && !lettre) {
      setJoker({ i, k })
      return
    }
    setTemp(t => [...t, { i, k, l: l === '?' ? lettre! : l, joker: l === '?' }])
    setChoisi(null)
    setMessage(null)
    son('flip')
    if (reglages.current.vibe && canVibrate()) vibrate('tap')
  }
  const reprendre = (i?: number) => {
    setTemp(t => (i === undefined ? [] : t.filter(x => x.i !== i)))
    setChoisi(null)
  }
  const melanger = () => {
    if (temp.length) reprendre()
    setPartie(p => ({ ...p, chevalets: [[...p.chevalets[0]].sort(() => Math.random() - 0.5), p.chevalets[1]] }))
    son('slide')
  }

  const jouer = () => {
    if (!monTour || !temp.length) return
    if (!lexique) return dire('Le dictionnaire se charge encore…', 'info')
    const v = evaluer(plateau, temp, lexique)
    if (!v.ok) {
      dire(v.erreur ?? 'Coup impossible.', 'non')
      son('nomatch')
      if (reglages.current.vibe && canVibrate()) vibrate('error')
      return
    }
    const ks = new Set(temp.map(t => t.k))
    const chev = chevalets[0].filter((_, k) => !ks.has(k))
    const nouveau = [...plateau]
    for (const t of temp) nouveau[t.i] = { l: t.l, joker: t.joker }
    const sac = [...partie.sac]
    chev.push(...sac.splice(0, TAILLE_CHEVALET - chev.length))
    const m = motPrincipal(v.mots)
    const scrabble = temp.length === TAILLE_CHEVALET
    dire(scrabble ? `Bravo, tes 7 lettres ! ${m.mot} : ${v.total} points (dont 50 de bonus).` : `${m.mot} : ${v.total} points.`, 'info')
    if (!stats.meilleurCoup || v.total > stats.meilleurCoup.points) setStats(s => ({ ...s, meilleurCoup: { mot: m.mot, points: v.total } }))
    const n: Partie = {
      ...partie, plateau: nouveau, sac, chevalets: [chev, chevalets[1]], scores: [scores[0] + v.total, scores[1]], tour: 1, passes: 0, dernier: [],
      journal: [...partie.journal, { qui: 0, texte: v.mots.map(x => x.mot).join(', '), points: v.total }],
    }
    setPartie(!chev.length && !sac.length ? terminer(n, 0) : n)
    setTemp([])
    setChoisi(null)
    son('match')
    if (reglages.current.vibe && canVibrate()) vibrate('success')
  }

  const passer = () => {
    if (!monTour) return
    reprendre()
    const n: Partie = { ...partie, tour: 1, passes: partie.passes + 1, dernier: [], journal: [...partie.journal, { qui: 0, texte: 'passe', points: 0 }] }
    setPartie(n.passes >= 6 ? terminer(n, null) : n)
    dire('Tu passes ton tour.', 'info')
  }
  const echanger = () => {
    if (!monTour) return
    if (partie.sac.length < TAILLE_CHEVALET) return dire('Il faut au moins 7 lettres dans le sac pour échanger.', 'non')
    reprendre()
    setEchange([])
  }
  const validerEchange = () => {
    if (!echange || !echange.length) return setEchange(null)
    const sortir = echange.map(k => chevalets[0][k])
    const garde = chevalets[0].filter((_, k) => !echange.includes(k))
    const sac = [...partie.sac]
    const pioche = sac.splice(0, sortir.length)
    sac.push(...sortir)
    sac.sort(() => Math.random() - 0.5)
    const n: Partie = { ...partie, sac, chevalets: [[...garde, ...pioche], chevalets[1]], tour: 1, passes: partie.passes + 1, dernier: [], journal: [...partie.journal, { qui: 0, texte: 'échange', points: 0 }] }
    setPartie(n.passes >= 6 ? terminer(n, null) : n)
    setEchange(null)
    dire(`Tu échanges ${sortir.length} lettre${sortir.length > 1 ? 's' : ''}.`, 'info')
    son('slide')
  }
  const recommencer = (niveau: Niveau = partie.niveau) => {
    setPartie(nouvellePartie(niveau))
    setTemp([])
    setChoisi(null)
    setEchange(null)
    setConfirmer(null)
    setMessage(null)
  }
  const changerNiveau = (niveau: Niveau) => {
    if (niveau === partie.niveau) return
    if (!partie.journal.length || fini) recommencer(niveau)
    else setConfirmer(niveau)
  }

  // ----- Toucher et glisser -----
  const toucherChevalet = (k: number) => {
    if (echange) {
      setEchange(e => (e!.includes(k) ? e!.filter(x => x !== k) : [...e!, k]))
      return
    }
    if (utilises.has(k)) return
    setChoisi(c => (c === k ? null : k))
    son('select')
  }
  const toucherCase = (i: number) => {
    setCurseur(c => ({ ...c, i }))
    if (surPlateau.has(i)) return reprendre(i)
    if (choisi !== null) poser(i, choisi)
  }
  const caseSous = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest('[data-case]') as HTMLElement | null
    return el ? Number(el.dataset.case) : null
  }
  const debutGlisse = (ev: PointerEvent, de: { t: 'chevalet'; k: number } | { t: 'plateau'; i: number }) => {
    if (!monTour || (ev.pointerType === 'mouse' && ev.button !== 0)) return
    ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
    drag.current = { de, x0: ev.clientX, y0: ev.clientY, bouge: false }
  }
  const pendantGlisse = (ev: PointerEvent) => {
    const d = drag.current
    if (!d || echange) return
    if (!d.bouge && Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < 8) return
    d.bouge = true
    const l = d.de.t === 'chevalet' ? chevalets[0][d.de.k] : surPlateau.get(d.de.i)!.l
    setGlisse({ l, x: ev.clientX, y: ev.clientY })
  }
  const finGlisse = (ev: PointerEvent) => {
    const d = drag.current
    drag.current = null
    setGlisse(null)
    if (!d) return
    if (!d.bouge) {
      if (d.de.t === 'chevalet') toucherChevalet(d.de.k)
      else toucherCase(d.de.i)
      return
    }
    const cible = caseSous(ev.clientX, ev.clientY)
    if (d.de.t === 'chevalet') {
      if (cible !== null) poser(cible, d.de.k)
      return
    }
    // Une lettre déjà posée ce tour-ci : on la déplace, ou on la remet sur le chevalet.
    const t = surPlateau.get(d.de.i)
    if (!t) return
    if (cible === null || plateau[cible] || surPlateau.has(cible)) {
      if (cible === null) reprendre(d.de.i)
      return
    }
    setTemp(xs => xs.map(x => (x.i === t.i ? { ...x, i: cible } : x)))
    son('flip')
  }

  // ----- Clavier : flèches pour se déplacer, lettres pour poser, Espace pour changer de sens -----
  const onKeyDown = (ev: KeyboardEvent) => {
    if (!monTour || joker || echange) return
    const { i, sens } = curseur
    const bouger = (di: number) => {
      const r = Math.floor(i / N)
      const c = i % N
      const nr = Math.max(0, Math.min(N - 1, r + (di === N ? 1 : di === -N ? -1 : 0)))
      const nc = Math.max(0, Math.min(N - 1, c + (di === 1 ? 1 : di === -1 ? -1 : 0)))
      setCurseur({ i: nr * N + nc, sens })
    }
    if (ev.key === 'ArrowRight') bouger(1)
    else if (ev.key === 'ArrowLeft') bouger(-1)
    else if (ev.key === 'ArrowDown') bouger(N)
    else if (ev.key === 'ArrowUp') bouger(-N)
    else if (ev.key === ' ') setCurseur({ i, sens: sens === 1 ? 15 : 1 })
    else if (ev.key === 'Enter') jouer()
    else if (ev.key === 'Escape') reprendre()
    else if (ev.key === 'Backspace') {
      const dernier = temp[temp.length - 1]
      if (dernier) {
        reprendre(dernier.i)
        setCurseur({ i: dernier.i, sens })
      }
    } else if (/^[a-zA-Z]$/.test(ev.key)) {
      const l = ev.key.toUpperCase()
      if (plateau[i] || surPlateau.has(i)) return
      let k = chevalets[0].findIndex((x, j) => x === l && !utilises.has(j))
      const viaJoker = k < 0
      if (viaJoker) k = chevalets[0].findIndex((x, j) => x === '?' && !utilises.has(j))
      if (k < 0) return dire(`Tu n’as pas de ${l}.`, 'non')
      poser(i, k, viaJoker ? l : undefined)
      // Avance à la prochaine case libre dans le sens choisi.
      let j = i
      do j += sens
      while (j < N * N && (sens === 1 ? j % N !== 0 : true) && (plateau[j] || surPlateau.has(j)))
      if (j < N * N && (sens === 15 || j % N !== 0)) setCurseur({ i: j, sens })
    } else return
    ev.preventDefault()
  }

  const gagnant = fini ? (scores[0] > scores[1] ? 0 : scores[0] < scores[1] ? 1 : null) : null
  const points = verdict?.ok ? verdict.total : null

  return (
    <section className="ms joute" aria-label="Joute de lettres">
      <Guide
        etapes={[
          { title: 'Pose un mot', text: 'Glisse les lettres de ton chevalet sur le plateau (ou touche une lettre, puis une case). Toutes les lettres d’un coup vont sur une même ligne ou colonne, sans trou.' },
          { title: 'Accroche-toi aux autres mots', text: 'Le premier mot passe par l’étoile au centre. Ensuite, chaque mot doit toucher une lettre déjà posée, et tous les mots formés doivent exister.' },
          { title: 'Les cases de couleur', text: 'LD et LT doublent ou triplent la lettre posée dessus, MD et MT doublent ou triplent tout le mot. Les 7 lettres d’un coup : 50 points de bonus !' },
          { title: 'Contre l’ordinateur', text: 'Il joue à son tour avec ses 7 lettres. Le joker (lettre blanche) remplace n’importe quelle lettre mais vaut 0. La partie finit quand le sac et un chevalet sont vides.' },
        ]}
        astuces={[
          'Les petits mots qui touchent plusieurs lettres (en parallèle d’un autre mot) rapportent souvent beaucoup.',
          'Garde un S ou un joker pour placer un jour tes 7 lettres d’un coup.',
          'Au clavier : flèches pour choisir la case, tape les lettres, Espace pour changer de sens, Entrée pour jouer.',
        ]}
      />

      <div className="ms-levels jt-niveaux" role="radiogroup" aria-label="Niveau de l’ordinateur">
        {NIVEAUX.map(n => (
          <button key={n.id} type="button" role="radio" aria-checked={partie.niveau === n.id} className={partie.niveau === n.id ? 'is-active' : ''} onClick={() => changerNiveau(n.id)}>
            <strong>{n.nom}</strong><small>{n.info}</small>
          </button>
        ))}
      </div>
      {confirmer && (
        <div className="jt-confirmer" role="alertdialog" aria-label="Nouvelle partie">
          <span>Commencer une nouvelle partie en niveau {NIVEAUX.find(n => n.id === confirmer)!.nom.toLowerCase()} ?</span>
          <button type="button" className="sd-action" onClick={() => recommencer(confirmer)}><Check size={15} /> Oui</button>
          <button type="button" className="sd-action" onClick={() => setConfirmer(null)}><X size={15} /> Non</button>
        </div>
      )}

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="t48-bar jt-scores">
          <div className={`t48-score${partie.tour === 0 && !fini ? ' is-tour' : ''}`}><span>Toi</span><strong>{scores[0]}</strong></div>
          <div className={`t48-score${partie.tour === 1 && !fini ? ' is-tour' : ''}`}><span>Ordinateur</span><strong>{scores[1]}</strong></div>
          <div className="t48-score"><span>Sac</span><strong>{partie.sac.length}</strong></div>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        <div className="jt-jeu">
          <div className="jt-plateau" role="application" tabIndex={0} aria-label="Plateau. Flèches pour choisir une case, lettres pour poser, Entrée pour jouer." onKeyDown={onKeyDown}>
            {plateau.map((c, i) => {
              const t = surPlateau.get(i)
              const pr = prime(i)
              const tuile = c ?? t
              const classes = ['jt-case']
              if (pr && !tuile) classes.push(`is-${pr === 'T' ? 'mt' : pr === 'D' ? 'md' : pr === 't' ? 'lt' : 'ld'}`)
              if (i === CENTRE && !tuile) classes.push('is-centre')
              if (curseur.i === i) classes.push('is-curseur')
              return (
                <div
                  key={i}
                  data-case={i}
                  className={classes.join(' ')}
                  aria-label={tuile ? `${tuile.l}${tuile.joker ? ' (joker)' : ''}` : pr ? NOM_PRIME[pr] : undefined}
                  onClick={() => !t && toucherCase(i)}
                >
                  {tuile ? (
                    <span
                      className={`jt-tuile${t ? ' is-temp' : ''}${partie.dernier.includes(i) ? ' is-dernier' : ''}${tuile.joker ? ' is-joker' : ''}`}
                      onPointerDown={t ? ev => debutGlisse(ev, { t: 'plateau', i }) : undefined}
                      onPointerMove={t ? pendantGlisse : undefined}
                      onPointerUp={t ? finGlisse : undefined}
                      onPointerCancel={() => { drag.current = null; setGlisse(null) }}
                    >
                      {tuile.l}
                      {!tuile.joker && <small>{valeur(tuile.l)}</small>}
                    </span>
                  ) : i === CENTRE ? '★' : pr ? LIBELLE[pr] : null}
                </div>
              )
            })}
            {points !== null && temp.length > 0 && (() => {
              // Petite bulle de points à côté de la dernière lettre posée.
              const der = temp.reduce((a, b) => (b.i > a.i ? b : a))
              return <span className="jt-bulle" style={{ '--x': der.i % N, '--y': Math.floor(der.i / N) } as CSSProperties}>{points}</span>
            })()}
          </div>

          {!lexique && (
            <div className="jt-chargement">
              {erreur
                ? <><span>Le dictionnaire n’a pas pu être chargé.</span><button type="button" className="button button-primary" onClick={chargerDico}>Réessayer</button></>
                : <span>Chargement du dictionnaire…</span>}
            </div>
          )}

          {fini && (
            <div className="jt-fin">
              <strong>{gagnant === 0 ? <><Trophy size={20} /> Tu as gagné !</> : gagnant === 1 ? 'L’ordinateur gagne' : 'Égalité !'}</strong>
              <span>{scores[0]} à {scores[1]}</span>
              <button type="button" className="button button-primary" onClick={() => recommencer()}><RotateCcw size={15} /> Nouvelle partie</button>
            </div>
          )}
        </div>

        <div className={`jt-chevalet${echange ? ' is-echange' : ''}`} aria-label="Ton chevalet">
          {chevalets[0].map((l, k) => (
            <button
              key={`${k}-${l}`}
              type="button"
              className={`jt-tuile jt-lettre${utilises.has(k) ? ' is-posee' : ''}${choisi === k ? ' is-choisie' : ''}${echange?.includes(k) ? ' is-choisie' : ''}${l === '?' ? ' is-joker' : ''}`}
              aria-label={l === '?' ? 'Joker' : `${l}, ${valeur(l)} point${valeur(l) > 1 ? 's' : ''}`}
              aria-pressed={choisi === k || !!echange?.includes(k)}
              disabled={!monTour || (utilises.has(k) && !echange)}
              onPointerDown={ev => debutGlisse(ev, { t: 'chevalet', k })}
              onPointerMove={pendantGlisse}
              onPointerUp={finGlisse}
              onPointerCancel={() => { drag.current = null; setGlisse(null) }}
              onClick={ev => {
                // Clavier (Entrée, Espace) : le pointeur passe déjà par finGlisse.
                if (ev.detail === 0) toucherChevalet(k)
              }}
            >
              {l === '?' ? <i className="jt-etoile" aria-hidden="true">★</i> : l}
              {l !== '?' && <small>{valeur(l)}</small>}
            </button>
          ))}
        </div>

        {echange ? (
          <div className="sd-actions">
            <span className="jt-aide">Choisis les lettres à rendre au sac</span>
            <button type="button" className="sd-action jt-jouer" onClick={validerEchange} disabled={!echange.length}><ArrowLeftRight size={16} /> Échanger {echange.length || ''}</button>
            <button type="button" className="sd-action" onClick={() => setEchange(null)}><X size={16} /> Annuler</button>
          </div>
        ) : (
          <div className="sd-actions">
            <button type="button" className="sd-action jt-jouer" onClick={jouer} disabled={!monTour || !temp.length}>
              <Check size={16} /> Jouer{points !== null ? ` · ${points} pts` : ''}
            </button>
            {temp.length > 0
              ? <button type="button" className="sd-action" onClick={() => reprendre()}><Undo2 size={16} /> Reprendre</button>
              : <button type="button" className="sd-action" onClick={melanger} disabled={fini}><Shuffle size={16} /> Mélanger</button>}
            <button type="button" className="sd-action" onClick={echanger} disabled={!monTour || partie.sac.length < TAILLE_CHEVALET}><ArrowLeftRight size={16} /> Échanger</button>
            <button type="button" className="sd-action" onClick={passer} disabled={!monTour}><SkipForward size={16} /> Passer</button>
          </div>
        )}

        <div className="ms-message" aria-live="polite">
          <span className={`ms-hint jt-message${message ? ` is-${message.ton}` : ''}`}>
            {partie.tour === 1 && !fini && lexique ? <><Bot size={15} /> L’ordinateur réfléchit…</> : message ? message.texte : (
              <>
                <span className="ms-hint-mouse">Glisse tes lettres sur le plateau, ou clique une lettre puis une case</span>
                <span className="ms-hint-touch">Touche une lettre puis une case, ou glisse-la</span>
              </>
            )}
          </span>
        </div>

        <button type="button" className="jt-journal-bouton" onClick={() => setVoirJournal(v => !v)} aria-expanded={voirJournal}>
          <History size={14} /> Historique ({partie.journal.length})
        </button>
        {voirJournal && (
          <ol className="jt-journal">
            {partie.journal.length === 0 && <li>Aucun coup pour l’instant.</li>}
            {[...partie.journal].reverse().map((l, k) => (
              <li key={partie.journal.length - k} className={l.qui === 1 ? 'is-ordi' : ''}>
                <span>{l.qui === 0 ? 'Toi' : 'Ordinateur'}</span>
                <b>{l.texte}</b>
                <em>{l.points ? `+${l.points}` : '—'}</em>
              </li>
            ))}
          </ol>
        )}
      </div>

      {joker && (
        <div className="jt-modale" role="dialog" aria-label="Choisis la lettre du joker" onClick={() => setJoker(null)}>
          <div className="jt-modale-boite" onClick={ev => ev.stopPropagation()}>
            <strong>Quelle lettre pour le joker ?</strong>
            <div className="jt-alphabet">
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
                <button key={l} type="button" onClick={() => { poser(joker.i, joker.k, l); setJoker(null) }}>{l}</button>
              ))}
            </div>
            <button type="button" className="sd-action" onClick={() => setJoker(null)}><X size={15} /> Annuler</button>
          </div>
        </div>
      )}

      {glisse && <span className="jt-tuile jt-fantome" style={{ transform: `translate(${glisse.x}px, ${glisse.y}px)` }} aria-hidden="true">{glisse.l === '?' ? '' : glisse.l}</span>}

      <div className="ms-records">
        <span className="mini-label">Sur cet appareil</span>
        <ul>
          <li><span>Victoires</span><strong>{stats.victoires} / {stats.parties}</strong></li>
          <li><span>Meilleur score</span><strong>{stats.meilleurScore || '—'}</strong></li>
          <li><span>Meilleur coup</span><strong>{stats.meilleurCoup ? stats.meilleurCoup.points : '—'}</strong>{stats.meilleurCoup && <small>{stats.meilleurCoup.mot}</small>}</li>
        </ul>
      </div>
    </section>
  )
}
