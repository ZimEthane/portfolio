import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { ChevronLeft, ChevronRight, Lightbulb, RotateCcw, Star, Undo2 } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { loadJSON, saveJSON, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { ChoixNiveaux, ProgressionPaliers } from './commun/Niveaux'
import { bilan, complet, lireNiveau, resoudre, voisins } from './points-logic'
import type { Chemins, Niveau } from './points-logic'
import { NIVEAUX } from './points-niveaux'
import './points.css'

const COULEURS: Record<string, string> = {
  A: '#ff4d4d', B: '#3d7bff', C: '#4fd06a', D: '#ffd84d', E: '#ff9a3d', F: '#4dd8e8',
  G: '#ff5fd1', H: '#a77bff', I: '#c98a5a', J: '#e8edf5', K: '#9be04d', L: '#2fbfa0',
}
const PROGRES_KEY = 'ez-points-500' // { "12": 7 } : moins de coups pour réussir le niveau
const NIVEAU_KEY = 'ez-points-500-niveau'
const TAILLES = ['5 × 5', '6 × 6', '7 × 7', '8 × 8', '8 × 8 et 9 × 9']
// Nombre de couleurs de chaque niveau (un niveau est parfait en autant de coups).
const NB_COULEURS = NIVEAUX.map(c => Object.keys(lireNiveau(c).points).length)

interface Partie {
  chemins: Chemins
  coups: number
  derniere: string | null // dernière couleur tracée (la retoucher tout de suite ne compte pas un coup de plus)
  historique: { chemins: Chemins; coups: number; derniere: string | null }[]
  indices: number
}
const vide = (): Partie => ({ chemins: {}, coups: 0, derniere: null, historique: [], indices: 0 })

export default function Points() {
  const [progres, setProgres] = useState<Record<string, number>>(() => loadJSON(PROGRES_KEY, {}))
  const [num, setNum] = useState(() => {
    const s = loadJSON<number>(NIVEAU_KEY, 0)
    if (s >= 1 && s <= NIVEAUX.length) return s
    let k = 1
    const p = loadJSON<Record<string, number>>(PROGRES_KEY, {})
    while (k < NIVEAUX.length && p[String(k)] !== undefined) k++
    return k
  })
  const nv: Niveau = useMemo(() => lireNiveau(NIVEAUX[num - 1]), [num])
  const couleurs = useMemo(() => Object.keys(nv.points), [nv])
  const [partie, setPartie] = useState<Partie>(vide)
  const [actif, setActif] = useState<{ c: string; cell: number } | null>(null)
  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const panelRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const plein = useFullscreen(panelRef)
  const trace = useRef<{ c: string; avant: Chemins; touche: boolean } | null>(null)
  const solution = useRef<Chemins | null>(null)
  const [curseur, setCurseur] = useState<number | null>(null)

  useEffect(() => saveJSON(NIVEAU_KEY, num), [num])
  const b = bilan(nv, partie.chemins)
  const gagne = b.gagne
  const n = nv.n

  const charger = (k: number) => {
    setNum(Math.max(1, Math.min(NIVEAUX.length, k)))
    setPartie(vide())
    setActif(null)
    solution.current = null
  }

  // Couleur des points et des chemins à chaque case.
  const occupant = useMemo(() => {
    const o = new Array<string | null>(n * n).fill(null)
    for (const c of couleurs) for (const i of partie.chemins[c] ?? []) o[i] = c
    return o
  }, [partie.chemins, couleurs, n])
  const pointDe = (i: number) => {
    const ch = nv.cases[i]
    return ch === '.' ? null : ch
  }

  // Ajoute (ou retire) une case au chemin en cours de tracé.
  const etendre = (chemins: Chemins, c: string, j: number): Chemins | null => {
    const ch = chemins[c] ?? []
    const dernier = ch[ch.length - 1]
    if (dernier === undefined || dernier === j || !voisins(n, dernier, j)) return null
    const k = ch.indexOf(j)
    if (k >= 0) return { ...chemins, [c]: ch.slice(0, k + 1) } // on revient en arrière
    if (complet(nv, c, ch)) return null // déjà relié : on ne dépasse pas le point
    const p = pointDe(j)
    if (p && p !== c) return null // point d'une autre couleur : bloqué
    const res: Chemins = { ...chemins, [c]: [...ch, j] }
    // Le chemin d'une autre couleur passait ici : il est coupé.
    for (const d of couleurs) {
      if (d === c) continue
      const autre = res[d]
      const idx = autre?.indexOf(j) ?? -1
      if (idx >= 0) res[d] = autre!.slice(0, idx)
    }
    return res
  }

  const caseSous = (ev: PointerEvent) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r) return null
    const x = Math.floor(((ev.clientX - r.left) / r.width) * n)
    const y = Math.floor(((ev.clientY - r.top) / r.height) * n)
    return x < 0 || y < 0 || x >= n || y >= n ? null : y * n + x
  }

  const commencer = (i: number) => {
    if (gagne) return false
    const p = pointDe(i)
    const avant = partie.chemins
    let chemins: Chemins
    let c: string
    if (p) {
      c = p
      chemins = { ...avant, [c]: [i] } // on repart de ce point
    } else if (occupant[i]) {
      c = occupant[i]!
      const ch = avant[c]
      chemins = { ...avant, [c]: ch.slice(0, ch.indexOf(i) + 1) } // on reprend le chemin à cet endroit
    } else return false
    trace.current = { c, avant, touche: false }
    setPartie(s => ({ ...s, chemins }))
    setActif({ c, cell: i })
    if (sound) playSound('select')
    return true
  }
  const avancer = (j: number) => {
    const t = trace.current
    if (!t) return
    setPartie(s => {
      let chemins = s.chemins
      const ch = chemins[t.c] ?? []
      const dernier = ch[ch.length - 1]
      if (dernier === undefined || dernier === j) return s
      // Mouvement rapide en ligne droite : on passe par les cases intermédiaires.
      const dx = (j % n) - (dernier % n)
      const dy = Math.floor(j / n) - Math.floor(dernier / n)
      if (dx !== 0 && dy !== 0) return s
      const pas = dx !== 0 ? Math.sign(dx) : Math.sign(dy) * n
      for (let k = dernier + pas; ; k += pas) {
        const r = etendre(chemins, t.c, k)
        if (!r) break
        chemins = r
        t.touche = true
        if (k === j) break
      }
      if (chemins === s.chemins) return s
      if (complet(nv, t.c, chemins[t.c]) && !complet(nv, t.c, s.chemins[t.c])) {
        if (sound) playSound('match')
        if (vibe && canVibrate()) vibrate('tap')
      }
      return { ...s, chemins }
    })
    setActif(a => (a ? { ...a, cell: j } : a))
  }
  const finir = () => {
    const t = trace.current
    trace.current = null
    setActif(null)
    if (!t) return
    setPartie(s => {
      const change = JSON.stringify(s.chemins[t.c] ?? []) !== JSON.stringify(t.avant[t.c] ?? []) || t.touche
      if (!change) return s
      const coups = s.coups + (s.derniere === t.c ? 0 : 1)
      return { ...s, coups, derniere: t.c, historique: [...s.historique, { chemins: t.avant, coups: s.coups, derniere: s.derniere }] }
    })
  }

  // Victoire : on l'enregistre une fois.
  const vu = useRef<string>('')
  useEffect(() => {
    if (!gagne || vu.current === `${num}`) return
    vu.current = `${num}`
    // Avec un indice, le niveau compte comme réussi mais pas parfait.
    const score = partie.indices > 0 ? Math.max(partie.coups, NB_COULEURS[num - 1] + 1) : partie.coups
    setProgres(p => {
      const np = { ...p, [String(num)]: Math.min(score, p[String(num)] ?? Infinity) }
      saveJSON(PROGRES_KEY, np)
      return np
    })
    if (sound) playSound('win')
    if (vibe && canVibrate()) vibrate('win')
  }, [gagne, num, partie.coups, partie.indices, sound, vibe])
  useEffect(() => {
    vu.current = ''
  }, [num])

  const annuler = () => {
    const h = partie.historique[partie.historique.length - 1]
    if (!h || gagne) return
    setPartie(s => ({ ...s, chemins: h.chemins, coups: h.coups, derniere: h.derniere, historique: s.historique.slice(0, -1) }))
  }
  const indice = () => {
    if (gagne) return
    if (!solution.current) solution.current = resoudre(nv)
    const sol = solution.current
    if (!sol) return
    // Une couleur dont le chemin n'est pas encore le bon : on le trace pour toi.
    const c = couleurs.find(k => JSON.stringify(partie.chemins[k] ?? []) !== JSON.stringify(sol[k]) && JSON.stringify([...(partie.chemins[k] ?? [])].reverse()) !== JSON.stringify(sol[k]))
    if (!c) return
    const chemins: Chemins = { ...partie.chemins, [c]: sol[c] }
    const cases = new Set(sol[c])
    for (const d of couleurs) if (d !== c && chemins[d]) {
      const k = chemins[d].findIndex(i => cases.has(i))
      if (k >= 0) chemins[d] = chemins[d].slice(0, k)
    }
    setPartie(s => ({ ...s, chemins, indices: s.indices + 1, historique: [...s.historique, { chemins: s.chemins, coups: s.coups, derniere: s.derniere }] }))
    if (sound) playSound('select')
  }

  // Clavier : flèches pour bouger le curseur, Entrée pour prendre une couleur puis flèches pour tracer.
  const onKeyDown = (ev: KeyboardEvent) => {
    const dirs: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -n, ArrowDown: n }
    const c0 = curseur ?? nv.points[couleurs[0]][0]
    if (ev.key in dirs) {
      ev.preventDefault()
      const d = dirs[ev.key]
      const x = (c0 % n) + (d === 1 ? 1 : d === -1 ? -1 : 0)
      const y = Math.floor(c0 / n) + (d === n ? 1 : d === -n ? -1 : 0)
      if (x < 0 || y < 0 || x >= n || y >= n) return
      const j = y * n + x
      setCurseur(j)
      if (trace.current) avancer(j)
    } else if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault()
      if (trace.current) finir()
      else commencer(c0)
    } else if (ev.key === 'Escape') finir()
    else if ((ev.key === 'z' || ev.key === 'Z') && (ev.ctrlKey || ev.metaKey)) annuler()
  }

  const etatNiveau = (k: number) => {
    const v = progres[String(k)]
    return v === undefined ? '' : v <= NB_COULEURS[k - 1] ? 'parfait' : 'fait'
  }
  const parfait = gagne && partie.coups <= couleurs.length && partie.indices === 0

  return (
    <section className="ms points" aria-label="Relier les points">
      <Guide
        etapes={[
          { title: 'Relie les paires', text: 'Pose le doigt (ou la souris) sur un point et glisse jusqu’au point de la même couleur. Les chemins vont tout droit ou tournent, jamais en diagonale.' },
          { title: 'Sans croiser', text: 'Deux chemins ne peuvent pas se croiser. Si tu passes sur un autre chemin, il est coupé : il faudra le refaire.' },
          { title: 'Remplis tout', text: 'Le niveau est réussi quand toutes les paires sont reliées et que toutes les cases sont remplies. Chaque niveau n’a qu’une seule solution.' },
          { title: 'En peu de coups', text: `Un coup = tracer une couleur. Réussis avec autant de coups que de couleurs (sans indice) pour un niveau parfait. ${NIVEAUX.length} niveaux, du 5 × 5 au 9 × 9.` },
        ]}
        astuces={[
          'Commence par les points dans les coins et le long des bords : ils ont peu de chemins possibles.',
          'Si deux points de même couleur sont proches, le chemin direct n’est pas toujours le bon : il faut remplir la grille.',
          'Au clavier : flèches pour viser, Entrée pour prendre une couleur, flèches pour tracer, Entrée pour lâcher.',
        ]}
      />

      <ChoixNiveaux courant={num} etat={etatNiveau} onChoisir={charger} details={TAILLES} />

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="t48-bar">
          <div className="t48-score"><span>Niveau</span><strong>{num}</strong></div>
          <div className="t48-score"><span>Reliés</span><strong>{b.relies}<small>/{b.total}</small></strong></div>
          <div className="t48-score"><span>Rempli</span><strong>{Math.round(b.rempli * 100)}<small>%</small></strong></div>
          <div className="t48-score"><span>Coups</span><strong>{partie.coups}</strong></div>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        <div className="pt-zone">
          <svg
            ref={svgRef}
            className={gagne ? 'pt-grille is-gagne' : 'pt-grille'}
            viewBox={`0 0 ${n} ${n}`}
            role="application"
            tabIndex={0}
            aria-label={`Niveau ${num}, grille ${n} × ${n}, ${b.relies} paires reliées sur ${b.total}, ${Math.round(b.rempli * 100)} % rempli.`}
            onKeyDown={onKeyDown}
            onPointerDown={ev => {
              const i = caseSous(ev)
              if (i === null) return
              ;(ev.currentTarget as Element).setPointerCapture(ev.pointerId)
              setCurseur(i)
              commencer(i)
            }}
            onPointerMove={ev => {
              if (!trace.current) return
              const i = caseSous(ev)
              if (i !== null) avancer(i)
            }}
            onPointerUp={finir}
            onPointerCancel={finir}
          >
            <rect width={n} height={n} fill="#0e1218" />
            {/* Fond des cases coloré par le chemin qui les occupe */}
            {occupant.map((c, i) => c && <rect key={`f${i}`} x={i % n} y={Math.floor(i / n)} width="1" height="1" fill={COULEURS[c]} opacity={complet(nv, c, partie.chemins[c]) ? 0.24 : 0.13} />)}
            {Array.from({ length: n + 1 }, (_, k) => (
              <g key={`l${k}`} stroke="#ffffff1c" strokeWidth="0.025">
                <line x1={k} y1="0" x2={k} y2={n} />
                <line x1="0" y1={k} x2={n} y2={k} />
              </g>
            ))}
            {couleurs.map(c => {
              const ch = partie.chemins[c]
              if (!ch || ch.length < 2) return null
              return <polyline key={`c${c}`} points={ch.map(i => `${(i % n) + 0.5},${Math.floor(i / n) + 0.5}`).join(' ')} fill="none" stroke={COULEURS[c]} strokeWidth="0.32" strokeLinecap="round" strokeLinejoin="round" />
            })}
            {couleurs.map(c => nv.points[c].map(i => (
              <g key={`p${i}`}>
                <circle cx={(i % n) + 0.5} cy={Math.floor(i / n) + 0.5} r="0.36" fill={COULEURS[c]} />
                <text x={(i % n) + 0.5} y={Math.floor(i / n) + 0.62} textAnchor="middle" fontSize="0.32" fontWeight="800" fill="#0b0e12" opacity=".55">{c}</text>
              </g>
            )))}
            {actif && <circle cx={(actif.cell % n) + 0.5} cy={Math.floor(actif.cell / n) + 0.5} r="0.72" fill={COULEURS[actif.c]} opacity=".22" pointerEvents="none" />}
            {curseur !== null && !actif && <rect className="pt-curseur" x={(curseur % n) + 0.06} y={Math.floor(curseur / n) + 0.06} width="0.88" height="0.88" rx="0.12" fill="none" stroke="#a0c8ff" strokeWidth="0.05" />}
          </svg>
          {gagne && (
            <div className="pt-fin">
              <strong>{parfait ? <><Star size={20} className="pt-etoile" /> Parfait !</> : 'Niveau réussi !'}</strong>
              <span>{partie.coups} coups pour {couleurs.length} couleurs{partie.indices ? ` · ${partie.indices} indice${partie.indices > 1 ? 's' : ''}` : ''}</span>
              <div>
                <button type="button" className="button" onClick={() => charger(num)}><RotateCcw size={15} /> Rejouer</button>
                {num < NIVEAUX.length && <button type="button" className="button button-primary" onClick={() => charger(num + 1)}>Niveau suivant <ChevronRight size={15} /></button>}
              </div>
            </div>
          )}
        </div>

        <div className="sd-actions">
          <button type="button" className="sd-action" onClick={() => charger(num - 1)} disabled={num <= 1} aria-label="Niveau précédent"><ChevronLeft size={16} /></button>
          <button type="button" className="sd-action" onClick={annuler} disabled={!partie.historique.length || gagne}><Undo2 size={16} /> Annuler</button>
          <button type="button" className="sd-action" onClick={() => charger(num)} disabled={!Object.keys(partie.chemins).length || gagne}><RotateCcw size={16} /> Effacer</button>
          <button type="button" className="sd-action" onClick={indice} disabled={gagne}><Lightbulb size={16} /> Indice</button>
          <button type="button" className="sd-action" onClick={() => charger(num + 1)} disabled={num >= NIVEAUX.length} aria-label="Niveau suivant"><ChevronRight size={16} /></button>
        </div>

        <div className="ms-message">
          <span className="ms-hint">
            <span className="ms-hint-mouse">Clique sur un point et glisse jusqu’à l’autre point de la même couleur</span>
            <span className="ms-hint-touch">Pose le doigt sur un point et glisse jusqu’à l’autre</span>
          </span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Ta progression sur cet appareil</span>
        <ul>
          <li><span>Niveaux réussis</span><strong>{Object.keys(progres).length} / {NIVEAUX.length}</strong></li>
          <li><span>Parfaits</span><strong>{Object.keys(progres).filter(k => etatNiveau(Number(k)) === 'parfait').length} / {NIVEAUX.length}</strong></li>
        </ul>
        <ProgressionPaliers etat={etatNiveau} />
      </div>
    </section>
  )
}
