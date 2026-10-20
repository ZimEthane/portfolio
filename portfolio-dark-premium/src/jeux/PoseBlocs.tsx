import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { RotateCcw, Trophy } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { loadJSON, saveJSON, useRecords, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { useHaptique } from './commun/useHaptique'
import { aDeLaPlace, avecPiece, bloque, FORMES, lignesPleines, N, peutPoser, poser, tirerPieces, vide } from './pose-blocs-logic'
import type { Forme, Grille, Piece } from './pose-blocs-logic'
import './pose-blocs.css'

const PARTIE_KEY = 'ez-pose-blocs-partie'

interface Partie {
  g: Grille
  pieces: (Piece | null)[]
  score: number
  combo: number
  sansLigne: number
  fini: boolean
}
const nouvelle = (): Partie => {
  const g = vide()
  return { g, pieces: tirerPieces(g), score: 0, combo: 0, sansLigne: 0, fini: false }
}
function chargee(): Partie | null {
  const p = loadJSON<Partie | null>(PARTIE_KEY, null)
  if (!p || !Array.isArray(p.g) || p.g.length !== N * N || !Array.isArray(p.pieces) || p.fini) return null
  return { ...p, fini: bloque(p.g, p.pieces) }
}

// Une pièce dessinée en petits carrés (plateau du bas, guide, pièce en main).
function DessinPiece({ f, couleur, taille }: { f: Forme; couleur: string; taille: number }) {
  return (
    <span className="pb-piece" style={{ width: f.w * taille, height: f.h * taille, '--c': couleur } as CSSProperties}>
      {f.cases.map(([x, y]) => <i key={`${x}-${y}`} style={{ left: x * taille, top: y * taille, width: taille, height: taille }} />)}
    </span>
  )
}

export default function PoseBlocs() {
  const [partie, setPartie] = useState<Partie>(() => chargee() ?? nouvelle())
  const [prise, setPrise] = useState<number | null>(null) // pièce en main (glisser) ou choisie (toucher, clavier)
  const [glisse, setGlisse] = useState(false)
  const [cible, setCible] = useState<{ x: number; y: number } | null>(null)
  const [effacees, setEffacees] = useState<{ cases: { i: number; couleur: string }[]; key: number } | null>(null)
  const [posees, setPosees] = useState<{ cases: number[]; key: number } | null>(null)
  const [message, setMessage] = useState<{ points: number; texte: string; key: number } | null>(null)
  const [record, setRecord] = useState(false)
  const [cell, setCell] = useState(40)
  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const haptique = useHaptique(vibe)
  const records = useRecords('ez-pose-blocs', 'higher')
  const panelRef = useRef<HTMLDivElement>(null)
  const grilleRef = useRef<HTMLDivElement>(null)
  const fantomeRef = useRef<HTMLDivElement>(null)
  const plein = useFullscreen(panelRef)
  const drag = useRef<{ idx: number; touch: boolean; x0: number; y0: number; bouge: boolean } | null>(null)

  // Partie gardée sur l'appareil : on la retrouve en revenant.
  useEffect(() => {
    if (partie.fini) saveJSON(PARTIE_KEY, null)
    else saveJSON(PARTIE_KEY, partie)
  }, [partie])

  // Les blocs effacés s'envolent, puis on retire l'effet.
  useEffect(() => {
    if (!effacees) return
    const t = window.setTimeout(() => setEffacees(null), 750)
    return () => window.clearTimeout(t)
  }, [effacees])

  // Taille d'une case (pour dessiner la pièce en main à la bonne taille).
  useEffect(() => {
    const el = grilleRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setCell(el.getBoundingClientRect().width / N))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pieceMain = prise !== null ? partie.pieces[prise] : null
  const formeMain = pieceMain ? FORMES[pieceMain.forme].f : null
  const valide = !!(formeMain && cible && peutPoser(partie.g, formeMain, cible.x, cible.y))

  // Aperçu : cases de la pièce, et lignes qui disparaîtraient.
  const apercu = useMemo(() => {
    if (!formeMain || !cible || !valide || !pieceMain) return null
    const avec = avecPiece(partie.g, formeMain, cible.x, cible.y, pieceMain.couleur)
    const { lignes, colonnes } = lignesPleines(avec)
    const cases = new Set(formeMain.cases.map(([dx, dy]) => (cible.y + dy) * N + cible.x + dx))
    const ligne = new Set<number>()
    for (const l of lignes) for (let i = 0; i < N; i++) ligne.add(l * N + i)
    for (const c of colonnes) for (let i = 0; i < N; i++) ligne.add(i * N + c)
    return { cases, ligne, couleur: pieceMain.couleur }
  }, [formeMain, cible, valide, pieceMain, partie.g])

  const lacher = () => {
    setPrise(null)
    setCible(null)
    setGlisse(false)
  }

  const placer = (idx: number, x: number, y: number, parClic: boolean) => {
    const p = partie.pieces[idx]
    if (!p) return
    const f = FORMES[p.forme].f
    if (!peutPoser(partie.g, f, x, y)) {
      if (sound) playSound('error')
      return
    }
    const r = poser(partie.g, f, x, y, p.couleur, partie.combo, partie.sansLigne)
    let pieces = partie.pieces.map((q, k) => (k === idx ? null : q))
    if (pieces.every(q => !q)) pieces = tirerPieces(r.g)
    const fini = bloque(r.g, pieces)
    const score = partie.score + r.points
    setPartie({ g: r.g, pieces, score, combo: r.combo, sansLigne: r.sansLigne, fini })
    setPosees({ cases: f.cases.map(([dx, dy]) => (y + dy) * N + x + dx), key: Date.now() })
    lacher()
    if (r.effacees.length) {
      setEffacees({ cases: r.effacees, key: Date.now() })
      const texte = r.g.every(v => v === null) ? 'Grille vidée !' : r.nbLignes >= 4 ? 'Incroyable !' : r.nbLignes === 3 ? 'Triple !' : r.nbLignes === 2 ? 'Double !' : r.combo >= 2 ? `Combo ×${r.combo}` : 'Bien joué'
      setMessage({ points: r.points, texte: r.combo >= 2 && r.nbLignes >= 2 ? `${texte} Combo ×${r.combo}` : texte, key: Date.now() })
      if (sound) playSound('line', Math.min(4, r.nbLignes))
      if (vibe && canVibrate()) vibrate('success')
      else if (parClic) haptique.request('success')
    } else {
      if (sound) playSound('drop')
      if (vibe && canVibrate()) vibrate('tap')
      else if (parClic) haptique.request('tap')
    }
    if (fini) {
      setRecord(records.submit('score', score) && score > 0)
      window.setTimeout(() => sound && playSound('gameover'), 350)
      if (vibe && canVibrate()) vibrate('boom')
    }
  }

  const rejouer = () => {
    setPartie(nouvelle())
    setRecord(false)
    setEffacees(null)
    setMessage(null)
    lacher()
  }

  // ----- Glisser une pièce du bas vers la grille -----
  // La case visée est aussi gardée dans une référence : au moment de lâcher, on ne dépend pas d'un rendu en retard.
  const cibleRef = useRef<{ x: number; y: number } | null>(null)
  const viser = (cx: number, cy: number, touch: boolean, f: Forme) => {
    const gr = grilleRef.current?.getBoundingClientRect()
    if (!gr) return null
    const c = gr.width / N
    // Sur écran tactile, la pièce flotte au-dessus du doigt pour rester visible.
    const left = cx - (f.w * c) / 2
    const top = touch ? cy - f.h * c - c * 0.9 : cy - (f.h * c) / 2
    const el = fantomeRef.current
    if (el) el.style.transform = `translate(${left}px, ${top}px)`
    const fx = (left - gr.left) / c
    const fy = (top - gr.top) / c
    // Aimant : parmi les places autour de la pièce, la plus proche où elle rentre.
    const proches: { x: number; y: number; d: number }[] = []
    for (const x of new Set([Math.floor(fx), Math.ceil(fx), Math.round(fx)]))
      for (const y of new Set([Math.floor(fy), Math.ceil(fy), Math.round(fy)])) proches.push({ x, y, d: Math.hypot(x - fx, y - fy) })
    proches.sort((a, b) => a.d - b.d)
    const libre = proches.find(k => k.d < 0.95 && peutPoser(partie.g, f, k.x, k.y))
    const x = Math.round(fx)
    const y = Math.round(fy)
    const t = libre ? { x: libre.x, y: libre.y } : x > -f.w && y > -f.h && x < N && y < N ? { x, y } : null
    cibleRef.current = t
    setCible(c0 => (t && c0 && c0.x === t.x && c0.y === t.y ? c0 : t))
    return t
  }
  const onPointerDown = (ev: PointerEvent, idx: number) => {
    const p = partie.pieces[idx]
    if (partie.fini || !p || (ev.pointerType === 'mouse' && ev.button !== 0)) return
    ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
    drag.current = { idx, touch: ev.pointerType !== 'mouse', x0: ev.clientX, y0: ev.clientY, bouge: false }
  }
  const onPointerMove = (ev: PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = partie.pieces[d.idx]
    if (!p) return
    if (!d.bouge) {
      if (Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < 6) return
      d.bouge = true
      setPrise(d.idx)
      setGlisse(true)
      if (sound) playSound('select')
    }
    d.x0 = ev.clientX
    d.y0 = ev.clientY
    viser(ev.clientX, ev.clientY, d.touch, FORMES[p.forme].f)
  }
  const onPointerUp = (ev: PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (!d.bouge) {
      // Simple toucher : on choisit la pièce, puis on touche la grille pour la poser.
      setPrise(prise === d.idx ? null : d.idx)
      setCible(null)
      if (sound) playSound('select')
      return
    }
    // On recalcule la case visée là où le doigt se lève.
    const p = partie.pieces[d.idx]
    const f = p ? FORMES[p.forme].f : null
    const t = f ? viser(ev.clientX, ev.clientY, d.touch, f) : null
    if (f && t && peutPoser(partie.g, f, t.x, t.y)) placer(d.idx, t.x, t.y, false)
    else {
      if (t && sound) playSound('error')
      lacher()
    }
  }
  // Après un glisser, le fantôme est placé dès son apparition.
  useEffect(() => {
    if (!glisse) return
    const d = drag.current
    if (!d) return
    const p = partie.pieces[d.idx]
    if (p) viser(d.x0, d.y0, d.touch, FORMES[p.forme].f)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glisse])

  // ----- Pièce choisie au toucher ou au clavier : on la pose sur la case visée -----
  const caseVisee = (i: number) => {
    if (prise === null || glisse || !formeMain) return
    const x = Math.min(i % N, N - formeMain.w)
    const y = Math.min(Math.floor(i / N), N - formeMain.h)
    setCible({ x, y })
  }
  const toucherCase = (i: number) => {
    if (prise === null || glisse || !formeMain) return
    const x = Math.min(i % N, N - formeMain.w)
    const y = Math.min(Math.floor(i / N), N - formeMain.h)
    if (peutPoser(partie.g, formeMain, x, y)) placer(prise, x, y, true)
    else {
      setCible({ x, y })
      if (sound) playSound('error')
    }
  }
  const choisirAuClavier = (idx: number) => {
    const p = partie.pieces[idx]
    if (!p || partie.fini) return
    const f = FORMES[p.forme].f
    setPrise(idx)
    // Première place libre, pour commencer.
    for (let y = 0; y <= N - f.h; y++) for (let x = 0; x <= N - f.w; x++) if (peutPoser(partie.g, f, x, y)) return setCible({ x, y })
    setCible({ x: 0, y: 0 })
  }
  const onKeyDown = (ev: KeyboardEvent) => {
    if (prise === null || !formeMain) {
      const k = ['1', '2', '3'].indexOf(ev.key)
      if (k >= 0) choisirAuClavier(k)
      return
    }
    const dirs: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (dirs[ev.key]) {
      ev.preventDefault()
      const c = cible ?? { x: 0, y: 0 }
      setCible({ x: Math.max(0, Math.min(N - formeMain.w, c.x + dirs[ev.key][0])), y: Math.max(0, Math.min(N - formeMain.h, c.y + dirs[ev.key][1])) })
    } else if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault()
      if (cible) placer(prise, cible.x, cible.y, false)
    } else if (ev.key === 'Escape') lacher()
    else {
      const k = ['1', '2', '3'].indexOf(ev.key)
      if (k >= 0) choisirAuClavier(k)
    }
  }

  const meilleur = Math.max(records.records.score ?? 0, partie.score)
  const taillePlateau = Math.max(10, Math.min(cell * 0.5, 26))

  return (
    <section className="ms pose-blocs" aria-label="Pose-blocs">
      <Guide
        etapes={[
          { title: 'Pose les pièces', text: 'Fais glisser une des trois pièces du bas sur la grille. Elle ne tourne pas : trouve-lui une place où elle rentre telle quelle.', visual: <DessinPiece f={FORMES[16].f} couleur="#5b8cff" taille={22} /> },
          { title: 'Complète des lignes', text: 'Une ligne ou une colonne entièrement remplie disparaît. Plusieurs d’un coup rapportent beaucoup plus de points.' },
          { title: 'Enchaîne les combos', text: 'Efface au moins une ligne dans les trois poses qui suivent pour faire grimper le combo et multiplier les points.' },
          { title: 'Garde de la place', text: 'Quand les trois pièces sont posées, trois nouvelles arrivent. La partie s’arrête quand aucune ne rentre plus.' },
        ]}
        astuces={[
          'Garde un coin libre pour les grosses pièces (le carré de 3 × 3, les barres de 5).',
          'Au clavier : 1, 2 ou 3 pour choisir une pièce, les flèches pour la placer, Entrée pour la poser.',
          'Ta partie est gardée : tu peux fermer la page et revenir plus tard.',
        ]}
      />

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="t48-bar">
          <div className="t48-score"><span>Score</span><strong>{partie.score}</strong></div>
          <div className="t48-score"><span>Record</span><strong>{meilleur}</strong></div>
          <div className={partie.combo >= 2 ? 't48-score pb-combo is-on' : 't48-score pb-combo'}><span>Combo</span><strong>×{Math.max(1, partie.combo)}</strong></div>
          <button type="button" className="t48-btn" onClick={rejouer} aria-label="Nouvelle partie"><RotateCcw size={16} /> <span className="t48-btn-texte">Nouvelle</span></button>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        {haptique.input}
        <div className="pb-jeu" onKeyDown={onKeyDown}>
          <label {...haptique.labelProps} className="pb-cadre">
            <div ref={grilleRef} className="pb-grille" role="grid" aria-label={`Grille de 8 × 8, score ${partie.score}`}>
              {partie.g.map((v, i) => {
                const ap = apercu?.cases.has(i)
                const li = apercu?.ligne.has(i)
                const neuf = posees?.cases.includes(i)
                return (
                  <div
                    key={i}
                    role="gridcell"
                    className={`pb-case${v ? ' is-plein' : ''}${ap ? ' is-apercu' : ''}${li ? ' is-ligne' : ''}${neuf ? ' is-neuf' : ''}`}
                    style={{ '--c': ap || (li && apercu) ? apercu!.couleur : v ?? undefined } as CSSProperties}
                    data-k={neuf ? posees!.key : undefined}
                    onPointerEnter={() => caseVisee(i)}
                    onClick={() => toucherCase(i)}
                  />
                )
              })}
              {effacees && (
                <div key={effacees.key} className="pb-effets" aria-hidden="true">
                  {effacees.cases.map(({ i, couleur }) => (
                    <i key={i} style={{ '--x': i % N, '--y': Math.floor(i / N), '--c': couleur, animationDelay: `${((i % N) + Math.floor(i / N)) * 14}ms` } as CSSProperties} />
                  ))}
                </div>
              )}
              {message && (
                <div key={message.key} className="pb-message" aria-live="polite" onAnimationEnd={() => setMessage(null)}>
                  <strong>+{message.points}</strong>
                  <span>{message.texte}</span>
                </div>
              )}
              {partie.fini && (
                <div className="pb-fin">
                  <strong>{record ? <><Trophy size={20} /> Nouveau record !</> : 'Plus de place !'}</strong>
                  <span>Score : {partie.score}</span>
                  <button type="button" className="button button-primary" onClick={rejouer}>Rejouer</button>
                </div>
              )}
            </div>
          </label>

          <div className="pb-plateau" aria-label="Pièces à poser">
            {partie.pieces.map((p, idx) => {
              const f = p ? FORMES[p.forme].f : null
              const posable = !!(f && aDeLaPlace(partie.g, f))
              return (
                <div
                  key={p ? p.id : `vide-${idx}`}
                  role="button"
                  tabIndex={p && !partie.fini ? 0 : -1}
                  aria-label={p ? `Pièce ${idx + 1} de ${f!.cases.length} cases${posable ? '' : ', ne rentre pas'}${prise === idx ? ', choisie' : ''}` : 'Emplacement vide'}
                  aria-pressed={prise === idx}
                  className={`pb-emplacement${prise === idx ? ' is-pris' : ''}${p && !posable ? ' is-bloque' : ''}`}
                  onPointerDown={ev => onPointerDown(ev, idx)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={() => { drag.current = null; lacher() }}
                  onLostPointerCapture={() => { if (drag.current) { drag.current = null; lacher() } }}
                  onKeyDown={ev => (ev.key === 'Enter' || ev.key === ' ') && prise !== idx && (ev.preventDefault(), choisirAuClavier(idx))}
                >
                  {p && f && !(glisse && prise === idx) && <DessinPiece f={f} couleur={p.couleur} taille={taillePlateau} />}
                </div>
              )
            })}
          </div>
        </div>

        {glisse && pieceMain && formeMain && (
          <div ref={fantomeRef} className={valide ? 'pb-fantome is-ok' : 'pb-fantome'} aria-hidden="true">
            <DessinPiece f={formeMain} couleur={pieceMain.couleur} taille={cell} />
          </div>
        )}

        <div className="ms-message">
          <span className="ms-hint">
            <span className="ms-hint-mouse">Glisse une pièce sur la grille (clavier : 1, 2, 3, flèches, Entrée)</span>
            <span className="ms-hint-touch">Glisse une pièce sur la grille, ou touche-la puis touche une case</span>
          </span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Sur cet appareil</span>
        <ul>
          <li><span>Meilleur score</span><strong>{records.records.score ?? '—'}</strong></li>
        </ul>
      </div>
    </section>
  )
}
