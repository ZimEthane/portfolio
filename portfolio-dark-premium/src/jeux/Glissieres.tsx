import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { ChevronLeft, ChevronRight, Lightbulb, RotateCcw, Star, Trophy, Undo2 } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { loadJSON, saveJSON, useRecords, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { useHaptique } from './commun/useHaptique'
import { BUT, coupVers, encoder, gagne, H, lire, occupation, peutAller, places, resoudre, TAILLE, W } from './glissieres-logic'
import type { Coup, Piece, Type } from './glissieres-logic'
import { NIVEAUX } from './glissieres-niveaux'
import './glissieres.css'

const NB = NIVEAUX.length
const PALIERS = [
  { nom: 'Débutant', de: 1, a: 100 },
  { nom: 'Facile', de: 101, a: 200 },
  { nom: 'Moyen', de: 201, a: 300 },
  { nom: 'Difficile', de: 301, a: 400 },
  { nom: 'Expert', de: 401, a: 500 },
]
const palierDe = (n: number) => PALIERS.find(p => n >= p.de && n <= p.a) ?? PALIERS[PALIERS.length - 1]
const NIVEAU_KEY = 'ez-glissieres-niveau'
const NOMS: Record<Type, string> = { R: 'Gros bloc rouge', V: 'Bloc bleu vertical', H: 'Bloc vert horizontal', S: 'Petit bloc jaune' }

const niveau = (n: number) => {
  const [code, min] = NIVEAUX[n - 1].split(':')
  return { code, min: Number(min) }
}

interface Partie {
  n: number
  pieces: Piece[]
  coups: number
  dernier: number | null // dernière pièce déplacée : la rebouger tout de suite ne compte pas un coup de plus
  historique: { pieces: Piece[]; coups: number; dernier: number | null }[]
  indices: number
  fini: boolean
  record: boolean
}
const nouvellePartie = (n: number): Partie => ({ n, pieces: lire(niveau(n).code), coups: 0, dernier: null, historique: [], indices: 0, fini: false, record: false })

// Motifs en relief des blocs (dessins simples, inspirés du jeu en vrai).
function Motif({ type }: { type: Type }) {
  const { w, h } = TAILLE[type]
  const trace =
    type === 'R'
      ? 'M18 34 V18 H34 M66 18 H82 V34 M82 66 V82 H66 M34 82 H18 V66 M50 34 a16 16 0 1 0 0.01 0 M50 45 a5 5 0 1 0 0.01 0'
      : type === 'V'
        ? 'M25 24 V76 M25 24 L13 12 M25 24 L37 12 M25 76 L13 88 M25 76 L37 88'
        : type === 'H'
          ? 'M24 25 H76 M24 25 L12 13 M24 25 L12 37 M76 25 L88 13 M76 25 L88 37'
          : 'M25 11 L39 25 L25 39 L11 25 Z M25 19 L31 25 L25 31 L19 25 Z'
  return (
    <svg className="gl-motif" viewBox={`0 0 ${w * 50} ${h * 50}`} aria-hidden="true">
      <path d={trace} className="gl-motif-clair" transform="translate(1.4 1.4)" />
      <path d={trace} className="gl-motif-creux" />
    </svg>
  )
}

// Mini écran LED : la disposition du niveau, comme sur le jeu en vrai.
function Led({ code, petit = false }: { code: string; petit?: boolean }) {
  const pieces = lire(code)
  const g = occupation(pieces)
  return (
    <div className={petit ? 'gl-led is-petit' : 'gl-led'} aria-hidden="true">
      {Array.from(g).map((v, i) => <i key={i} className={v < 0 ? '' : `is-${pieces[v].type}`} />)}
    </div>
  )
}

const pos = (x: number, y: number, type: Type): CSSProperties => ({
  left: `calc(${(x / W) * 100}% + 3px)`,
  top: `calc(${(y / H) * 100}% + 3px)`,
  width: `calc(${(TAILLE[type].w / W) * 100}% - 6px)`,
  height: `calc(${(TAILLE[type].h / H) * 100}% - 6px)`,
})

export default function Glissieres() {
  const records = useRecords('ez-glissieres', 'lower')
  const [partie, setPartie] = useState<Partie>(() => {
    const sauve = loadJSON<number>(NIVEAU_KEY, 0)
    if (sauve >= 1 && sauve <= NB) return nouvellePartie(sauve)
    // Sinon : le premier niveau pas encore réussi.
    let n = 1
    while (n < NB && records.records[String(n)] !== undefined) n++
    return nouvellePartie(n)
  })
  const [choix, setChoix] = useState<number | null>(null) // palier dont la grille de niveaux est ouverte
  const [sel, setSel] = useState<number | null>(null) // pièce choisie (id) : on montre où elle peut aller
  const [indice, setIndice] = useState<{ id: number; x: number; y: number } | null>(null)
  const [calcul, setCalcul] = useState(false)
  const [glisse, setGlisse] = useState<number | null>(null)
  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const haptique = useHaptique(vibe)
  const panelRef = useRef<HTMLDivElement>(null)
  const plateauRef = useRef<HTMLDivElement>(null)
  const plein = useFullscreen(panelRef)
  const drag = useRef<{ id: number; avant: Piece[]; px: number; py: number; x0: number; y0: number; cases: { x: number; y: number }[]; bouge: boolean } | null>(null)
  const ignorerClic = useRef(false)
  const chemin = useRef<string[] | null>(null) // solution trouvée par le dernier indice

  const { code, min } = niveau(partie.n)
  const p = palierDe(partie.n)
  const best = records.records[String(partie.n)]

  useEffect(() => saveJSON(NIVEAU_KEY, partie.n), [partie.n])

  const charger = (n: number) => {
    const m = Math.min(NB, Math.max(1, n))
    setPartie(nouvellePartie(m))
    setSel(null)
    setIndice(null)
    setCalcul(false)
    chemin.current = null
  }

  // Applique un déplacement déjà fait (pieces = nouvelles positions, avant = positions d'avant).
  const valider = (id: number, avant: Piece[], pieces: Piece[], parClic: boolean) => {
    const prec = avant.find(q => q.id === id)!
    const apres = pieces.find(q => q.id === id)!
    if (prec.x === apres.x && prec.y === apres.y) {
      setPartie(s => ({ ...s, pieces: avant }))
      return
    }
    const coups = partie.coups + (partie.dernier === id ? 0 : 1)
    const fini = gagne(pieces)
    const ancien = records.records[String(partie.n)]
    const record = fini ? records.submit(String(partie.n), coups) && ancien !== undefined : false // « record » seulement si on bat un ancien score
    setPartie(s => ({ ...s, pieces, coups, dernier: id, fini, record, historique: [...s.historique, { pieces: avant, coups: s.coups, dernier: s.dernier }] }))
    setSel(null)
    setIndice(null)
    if (fini) {
      if (sound) playSound('win')
      if (vibe && canVibrate()) vibrate('win')
      else if (parClic) haptique.request('success')
    } else {
      if (sound) playSound('slide')
      if (parClic) haptique.request('tap')
      else if (vibe && canVibrate()) vibrate('tap')
    }
  }

  const deplacerVers = (id: number, x: number, y: number, parClic: boolean) => {
    const pieces = partie.pieces.map(q => (q.id === id ? { ...q, x, y } : q))
    valider(id, partie.pieces, pieces, parClic)
  }

  const annuler = () => {
    const h = partie.historique[partie.historique.length - 1]
    if (!h || partie.fini) return
    setPartie(s => ({ ...s, pieces: h.pieces, coups: h.coups, dernier: h.dernier, historique: s.historique.slice(0, -1) }))
    setSel(null)
    setIndice(null)
    if (sound) playSound('unflag')
  }

  const montrerIndice = (c: Coup) => {
    const q = partie.pieces[c.piece]
    setIndice({ id: q.id, x: c.x, y: c.y })
    setPartie(s => ({ ...s, indices: s.indices + 1 }))
    if (sound) playSound('select')
  }
  const demanderIndice = () => {
    if (partie.fini || calcul) return
    setSel(null)
    // Si on suit toujours la solution du dernier indice, le coup suivant est déjà connu.
    const c = chemin.current
    const k = c ? c.indexOf(encoder(partie.pieces)) : -1
    const suivant = c && k >= 0 && k < c.length - 1 ? coupVers(partie.pieces, c[k + 1]) : null
    if (suivant) return montrerIndice(suivant)
    setCalcul(true)
    // Laisse le temps d'afficher « Je réfléchis… » avant le calcul.
    window.setTimeout(() => {
      const r = resoudre(partie.pieces)
      setCalcul(false)
      chemin.current = r?.chemin ?? null
      if (r?.premier) montrerIndice(r.premier)
    }, 30)
  }

  // ----- Glisser au doigt ou à la souris -----
  const taille = () => (plateauRef.current?.getBoundingClientRect().width ?? 320) / W

  const onPointerDown = (ev: PointerEvent, id: number) => {
    if (partie.fini || (ev.pointerType === 'mouse' && ev.button !== 0)) return
    const n = partie.pieces.findIndex(q => q.id === id)
    const q = partie.pieces[n]
    ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
    drag.current = { id, avant: partie.pieces, px: ev.clientX, py: ev.clientY, x0: q.x, y0: q.y, cases: [{ x: q.x, y: q.y }, ...places(partie.pieces, n)], bouge: false }
    ignorerClic.current = false
  }
  const onPointerMove = (ev: PointerEvent) => {
    const d = drag.current
    if (!d) return
    const c = taille()
    const fx = d.x0 + (ev.clientX - d.px) / c
    const fy = d.y0 + (ev.clientY - d.py) / c
    if (!d.bouge && Math.hypot(ev.clientX - d.px, ev.clientY - d.py) < 8) return
    if (!d.bouge) {
      d.bouge = true
      setGlisse(d.id)
      setSel(null)
    }
    // La place atteignable la plus proche du doigt.
    let mieux = d.cases[0]
    let dist = Infinity
    for (const pl of d.cases) {
      const e = (pl.x - fx) ** 2 + (pl.y - fy) ** 2
      if (e < dist - 1e-9) {
        dist = e
        mieux = pl
      }
    }
    setPartie(s => {
      const cur = s.pieces.find(q => q.id === d.id)!
      if (cur.x === mieux.x && cur.y === mieux.y) return s
      return { ...s, pieces: s.pieces.map(q => (q.id === d.id ? { ...q, x: mieux.x, y: mieux.y } : q)) }
    })
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    setGlisse(null)
    if (!d || !d.bouge) return
    ignorerClic.current = true
    valider(d.id, d.avant, partie.pieces, false)
  }

  // ----- Toucher une pièce, puis l'endroit où elle doit aller -----
  const onClicPiece = (id: number) => {
    if (ignorerClic.current) {
      ignorerClic.current = false
      return
    }
    if (partie.fini) return
    const n = partie.pieces.findIndex(q => q.id === id)
    const dest = places(partie.pieces, n)
    if (dest.length === 1) return deplacerVers(id, dest[0].x, dest[0].y, true) // une seule place possible : on y va
    if (!dest.length) {
      if (sound) playSound('error')
      setSel(null)
      return
    }
    if (sound) playSound('select')
    setSel(sel === id ? null : id)
  }

  // Clavier : Tab pour choisir une pièce, flèches pour la déplacer d'une case.
  const onKeyPiece = (ev: KeyboardEvent, id: number) => {
    const dirs: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const dir = dirs[ev.key]
    if (dir) {
      ev.preventDefault()
      const n = partie.pieces.findIndex(q => q.id === id)
      if (partie.fini || !peutAller(partie.pieces, n, dir[0], dir[1])) {
        if (sound && !partie.fini) playSound('error')
        return
      }
      const q = partie.pieces[n]
      deplacerVers(id, q.x + dir[0], q.y + dir[1], false)
    } else if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault()
      onClicPiece(id)
    }
  }
  const onKeyPanel = (ev: KeyboardEvent) => {
    if ((ev.key === 'z' || ev.key === 'Z') && (ev.ctrlKey || ev.metaKey || !ev.altKey)) {
      if (ev.target instanceof HTMLInputElement) return
      ev.preventDefault()
      annuler()
    } else if (ev.key === 'Escape') setSel(null)
  }

  const destinations = useMemo(() => {
    if (sel === null) return []
    const n = partie.pieces.findIndex(q => q.id === sel)
    return n < 0 ? [] : places(partie.pieces, n)
  }, [sel, partie.pieces])
  const pieceSel = partie.pieces.find(q => q.id === sel)
  const pieceIndice = indice ? partie.pieces.find(q => q.id === indice.id) : undefined

  const faits = (de: number, a: number) => {
    let r = 0
    let parfaits = 0
    for (let n = de; n <= a; n++) {
      const v = records.records[String(n)]
      if (v !== undefined) {
        r++
        if (v <= niveau(n).min) parfaits++
      }
    }
    return { r, parfaits }
  }
  const total = faits(1, NB)
  const parfait = partie.fini && partie.coups <= min

  return (
    <section className="ms glissieres" aria-label="Glissières">
      <Guide
        etapes={[
          { title: 'Fais sortir le bloc rouge', text: 'Le gros bloc rouge doit arriver tout en bas au milieu, devant l’ouverture : il glisse alors hors du plateau et le niveau est gagné.', visual: <Led code="^<>^vRRvSRRSS^^S.vv." petit /> },
          { title: 'Fais glisser les blocs', text: 'Au doigt ou à la souris, vers le haut, le bas, la gauche ou la droite. Les blocs ne se soulèvent pas et ne se chevauchent pas : il faut faire de la place. Tu peux aussi toucher un bloc, puis l’endroit où il doit aller.' },
          { title: 'Compte tes coups', text: 'Un coup = un bloc déplacé, même de plusieurs cases. Le minimum possible est affiché : fais-le pour obtenir l’étoile d’un niveau parfait.' },
          { title: '500 niveaux', text: 'Du niveau débutant (quelques coups) à l’expert (plus de 80 coups). Bloqué ? « Indice » montre le bon coup, « Annuler » revient en arrière.' },
        ]}
        astuces={[
          'Commence souvent par libérer la place juste sous le bloc rouge.',
          'Les petits blocs jaunes se casent partout : garde-les pour boucher les trous.',
          'Au clavier : Tab pour choisir un bloc, les flèches pour le déplacer, Z pour annuler.',
        ]}
      />

      <div className="ms-levels gl-paliers" role="group" aria-label="Choisir un niveau">
        {PALIERS.map((x, k) => {
          const f = faits(x.de, x.a)
          const actif = x === p
          return (
            <button key={x.nom} type="button" aria-expanded={choix === k} aria-controls="gl-niveaux" className={`${actif ? 'is-active' : ''}${choix === k ? ' is-open' : ''}`} onClick={() => setChoix(choix === k ? null : k)}>
              <strong>{x.nom}</strong>
              <small>{x.de} à {x.a}</small>
              <small>{f.r}/100 réussis</small>
            </button>
          )
        })}
      </div>
      {choix !== null && (
        <div id="gl-niveaux" className="gl-grille-niveaux" role="group" aria-label={`Niveaux ${PALIERS[choix].nom}`}>
          {Array.from({ length: PALIERS[choix].a - PALIERS[choix].de + 1 }, (_, k) => PALIERS[choix].de + k).map(n => {
            const v = records.records[String(n)]
            const etat = v === undefined ? '' : v <= niveau(n).min ? ' is-parfait' : ' is-fait'
            return (
              <button key={n} type="button" className={`gl-n${etat}${n === partie.n ? ' is-current' : ''}`} aria-label={`Niveau ${n}${v === undefined ? '' : v <= niveau(n).min ? ', parfait' : ', réussi'}`} onClick={() => { charger(n); setChoix(null) }}>
                {n}
              </button>
            )
          })}
        </div>
      )}

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'} onKeyDown={onKeyPanel}>
        <div className="t48-bar">
          <div className="t48-score"><span>Coups</span><strong>{partie.coups}</strong></div>
          <div className="t48-score" title="Le moins de coups possible pour ce niveau"><span>Minimum</span><strong>{min}</strong></div>
          <div className="t48-score" title="Ton meilleur score sur ce niveau"><span>Meilleur</span><strong className="gl-best">{best ?? '—'}{best !== undefined && best <= min && <Star size={14} className="gl-etoile" aria-label="parfait" />}</strong></div>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        <div className="gl-console">
          <div className="gl-tete">
            <Led code={code} />
            <div className="gl-num">
              <small>Niveau</small>
              <strong>{String(partie.n).padStart(3, '0')}</strong>
              <span>{p.nom}</span>
            </div>
            <div className="gl-fleches">
              <button type="button" aria-label="Niveau précédent" disabled={partie.n <= 1} onClick={() => charger(partie.n - 1)}><ChevronLeft size={18} /></button>
              <button type="button" aria-label="Niveau suivant" disabled={partie.n >= NB} onClick={() => charger(partie.n + 1)}><ChevronRight size={18} /></button>
            </div>
          </div>

          {haptique.input}
          <label {...haptique.labelProps} className="gl-cadre">
            <div ref={plateauRef} className={`gl-plateau${partie.fini ? ' is-fini' : ''}`} role="group" aria-label={`Plateau du niveau ${partie.n}`}>
              <span className="gl-but" style={pos(BUT.x, BUT.y, 'R')} aria-hidden="true" />
              {destinations.map(d => (
                <div key={`${d.x}-${d.y}`} role="button" tabIndex={-1} className="gl-fantome" style={pos(d.x, d.y, pieceSel!.type)} aria-label={`Déplacer ici : colonne ${d.x + 1}, ligne ${d.y + 1}`} onClick={() => deplacerVers(sel!, d.x, d.y, true)} />
              ))}
              {indice && pieceIndice && (
                <div role="button" tabIndex={-1} className="gl-fantome is-indice" style={pos(indice.x, indice.y, pieceIndice.type)} aria-label="Coup conseillé" onClick={() => deplacerVers(indice.id, indice.x, indice.y, true)} />
              )}
              {partie.pieces.map(q => (
                <div
                  key={q.id}
                  role="button"
                  tabIndex={partie.fini ? -1 : 0}
                  className={`gl-piece is-${q.type}${sel === q.id ? ' is-sel' : ''}${glisse === q.id ? ' is-drag' : ''}${indice?.id === q.id ? ' is-indice' : ''}${partie.fini && q.type === 'R' ? ' is-sortie' : ''}`}
                  style={pos(q.x, q.y, q.type)}
                  aria-label={`${NOMS[q.type]}, colonne ${q.x + 1}, ligne ${q.y + 1}${sel === q.id ? ', choisi' : ''}`}
                  onPointerDown={ev => onPointerDown(ev, q.id)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onClick={() => onClicPiece(q.id)}
                  onKeyDown={ev => onKeyPiece(ev, q.id)}
                >
                  <Motif type={q.type} />
                </div>
              ))}
              {partie.fini && (
                <div className="gl-bravo">
                  <strong>{parfait ? <><Star size={18} className="gl-etoile" /> Parfait !</> : <><Trophy size={18} /> Bravo !</>}</strong>
                  <span>{partie.coups} coups{parfait ? '' : ` (minimum ${min})`}{partie.record ? ' · nouveau record' : ''}</span>
                  <div>
                    <button type="button" className="button" onClick={() => charger(partie.n)}><RotateCcw size={15} /> Rejouer</button>
                    {partie.n < NB && <button type="button" className="button button-primary" onClick={() => charger(partie.n + 1)}>Niveau suivant <ChevronRight size={15} /></button>}
                  </div>
                </div>
              )}
            </div>
            <span className="gl-sortie" aria-hidden="true" />
          </label>
        </div>

        <div className="sd-actions">
          <button type="button" className="sd-action" onClick={annuler} disabled={!partie.historique.length || partie.fini}><Undo2 size={16} /> Annuler</button>
          <button type="button" className="sd-action" onClick={() => charger(partie.n)} disabled={!partie.historique.length && !partie.fini}><RotateCcw size={16} /> Recommencer</button>
          <button type="button" className="sd-action" onClick={demanderIndice} disabled={partie.fini || calcul}><Lightbulb size={16} /> {calcul ? 'Je réfléchis…' : 'Indice'}</button>
        </div>

        <div className="ms-message" aria-live="polite">
          {partie.fini ? (
            <span className="ms-win"><Trophy size={16} /> Niveau {partie.n} réussi en {partie.coups} coups{parfait ? ' : parfait !' : ''}</span>
          ) : indice ? (
            <span className="ms-hint">Conseil : déplace le bloc qui clignote vers le contour jaune{partie.indices > 1 ? ` (${partie.indices} indices)` : ''}</span>
          ) : (
            <span className="ms-hint">
              <span className="ms-hint-mouse">Fais glisser les blocs à la souris (ou clique un bloc, puis sa nouvelle place)</span>
              <span className="ms-hint-touch">Fais glisser les blocs, ou touche un bloc puis sa nouvelle place</span>
            </span>
          )}
        </div>
      </div>

      <div className="ms-records gl-progression">
        <span className="mini-label">Ta progression sur cet appareil</span>
        <ul className="gl-totaux">
          <li><span>Niveaux réussis</span><strong>{total.r} / {NB}</strong></li>
          <li><span>Niveaux parfaits</span><strong>{total.parfaits} / {NB}</strong></li>
        </ul>
        <ul className="gl-paliers-prog">
          {PALIERS.map(x => {
            const f = faits(x.de, x.a)
            return (
              <li key={x.nom}>
                <span>{x.nom}</span>
                <strong>{f.r} / 100</strong>
                <i className="gl-jauge" aria-hidden="true"><b style={{ width: `${f.r}%` }} /></i>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
