import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { Lightbulb, RotateCcw, Timer, Trophy, Undo2 } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { loadJSON, saveJSON, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { conseil, deplacer, destinationAuto, ENSEIGNES, finissable, gagne, NOM_ENSEIGNE, NOM_RANG, nouvellePartie, peutColonne, peutFondation, piocher, prendre, RANGS, rouge, SYMBOLE } from './solitaire-logic'
import type { Carte, Destination, Jeu, Lieu } from './solitaire-logic'
import './solitaire.css'

const PARTIE_KEY = 'ez-solitaire-partie'
const STATS_KEY = 'ez-solitaire' // { gagnees: n, jouees: n, temps1: s, temps3: s }
interface Etat {
  jeu: Jeu
  coups: number
  historique: Jeu[]
  debut: number
  fin: number | null
}
interface Stats { gagnees: number; jouees: number; temps1?: number; temps3?: number }
const nouvelEtat = (tirage: 1 | 3): Etat => ({ jeu: nouvellePartie(tirage), coups: 0, historique: [], debut: Date.now(), fin: null })
const temps = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const nomCarte = (c: Carte) => `${NOM_RANG[c.rang - 1]} de ${NOM_ENSEIGNE[c.e]}`

function FaceCarte({ c }: { c: Carte }) {
  const s = SYMBOLE[c.e]
  const tete = c.rang > 10
  return (
    <>
      <span className="sl-coin">{RANGS[c.rang - 1]}<i>{s}</i></span>
      <span className={tete ? 'sl-centre is-tete' : 'sl-centre'}>{tete ? RANGS[c.rang - 1] : s}</span>
      {tete && <span className="sl-tete-enseigne">{s}</span>}
    </>
  )
}

export default function Solitaire() {
  const [etat, setEtat] = useState<Etat>(() => {
    const s = loadJSON<Etat | null>(PARTIE_KEY, null)
    return s && s.jeu && Array.isArray(s.jeu.colonnes) && !s.fin ? { ...s, historique: [] } : nouvelEtat(1)
  })
  const [stats, setStats] = useState<Stats>(() => loadJSON<Stats>(STATS_KEY, { gagnees: 0, jouees: 0 }))
  const [maintenant, setMaintenant] = useState(Date.now())
  const [secoue, setSecoue] = useState<number | null>(null)
  const [indice, setIndice] = useState<{ de: Lieu | 'pioche'; vers?: Destination } | null>(null)
  const [sansCoup, setSansCoup] = useState<Jeu | null>(null) // la position où l'indice n'a rien trouvé
  const [glisse, setGlisse] = useState<{ de: Lieu; cartes: Carte[] } | null>(null)
  const [largeur, setLargeur] = useState(70)
  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const panelRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const fantomeRef = useRef<HTMLDivElement>(null)
  const plein = useFullscreen(panelRef)
  const drag = useRef<{ de: Lieu; x0: number; y0: number; dx: number; dy: number; bouge: boolean; pointer: number } | null>(null)
  const { jeu } = etat
  const fini = gagne(jeu)

  useEffect(() => {
    if (fini) saveJSON(PARTIE_KEY, null)
    else saveJSON(PARTIE_KEY, { ...etat, historique: [] })
  }, [etat, fini])
  useEffect(() => {
    if (etat.fin) return
    const t = window.setInterval(() => setMaintenant(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [etat.fin])
  // Largeur d'une carte : 7 colonnes dans la place disponible.
  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      const gap = w < 500 ? 5 : 10
      setLargeur(Math.min(96, (w - gap * 6) / 7))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const jouer = (nouveau: Jeu) => {
    setEtat(s => {
      const g = gagne(nouveau)
      return { ...s, jeu: nouveau, coups: s.coups + 1, historique: [...s.historique.slice(-200), s.jeu], fin: g ? Date.now() : null }
    })
    setIndice(null)
  }
  const nouvellePartieJeu = (tirage: 1 | 3 = jeu.tirage) => {
    setEtat(nouvelEtat(tirage))
    setIndice(null)
  }

  // Victoire : statistiques et son.
  const enregistre = useRef(false)
  useEffect(() => {
    if (!fini || enregistre.current) return
    enregistre.current = true
    const s = Math.round(((etat.fin ?? Date.now()) - etat.debut) / 1000)
    setStats(st => {
      const cle = jeu.tirage === 1 ? 'temps1' : 'temps3'
      const n: Stats = { ...st, gagnees: st.gagnees + 1, jouees: st.jouees + 1, [cle]: Math.min(s, st[cle] ?? Infinity) }
      saveJSON(STATS_KEY, n)
      return n
    })
    if (sound) playSound('win')
    if (vibe && canVibrate()) vibrate('win')
  }, [fini, etat.fin, etat.debut, jeu.tirage, sound, vibe])
  useEffect(() => {
    if (!fini) enregistre.current = false
  }, [fini])

  // Fin automatique : quand tout est visible, les cartes montent seules sur les fondations.
  useEffect(() => {
    if (fini || !finissable(jeu)) return
    const t = window.setTimeout(() => {
      for (let i = 0; i < 7; i++) {
        const col = jeu.colonnes[i]
        if (!col.length) continue
        const c = col[col.length - 1]
        const f = ENSEIGNES.indexOf(c.e)
        if (peutFondation(jeu, c, f)) {
          const n = deplacer(jeu, { t: 'colonne', i, k: col.length - 1 }, { t: 'fondation', i: f })
          if (n) {
            setEtat(s => ({ ...s, jeu: n, fin: gagne(n) ? Date.now() : null }))
            if (sound) playSound('flip')
            return
          }
        }
      }
    }, 90)
    return () => window.clearTimeout(t)
  }, [jeu, fini, sound])

  const piocherCartes = () => {
    if (fini) return
    if (!jeu.pioche.length && !jeu.defausse.length) return
    jouer(piocher(jeu))
    if (sound) playSound('flip')
  }

  const toucher = (de: Lieu) => {
    if (fini) return
    const d = destinationAuto(jeu, de)
    if (!d) {
      setSecoue(Date.now())
      if (sound) playSound('nomatch')
      return
    }
    const n = deplacer(jeu, de, d)
    if (n) {
      jouer(n)
      if (sound) playSound(d.t === 'fondation' ? 'match' : 'slide')
      if (vibe && canVibrate()) vibrate('tap')
    }
  }

  const annuler = () => {
    if (!etat.historique.length || fini) return
    setEtat(s => ({ ...s, jeu: s.historique[s.historique.length - 1], historique: s.historique.slice(0, -1), coups: s.coups + 1 }))
    setIndice(null)
    if (sound) playSound('unflag')
  }

  const demanderIndice = () => {
    const c = conseil(jeu)
    if (!c) {
      setIndice(null)
      setSansCoup(jeu)
      if (sound) playSound('nomatch')
      return
    }
    setIndice(c === 'piocher' ? { de: 'pioche' } : c)
    if (sound) playSound('select')
  }

  // ----- Glisser des cartes -----
  const cibleSous = (x: number, y: number): Destination | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-cible]') as HTMLElement | null
    if (!el) return null
    const [t, i] = el.dataset.cible!.split('-')
    return { t: t as 'fondation' | 'colonne', i: Number(i) }
  }
  const onPointerDown = (ev: PointerEvent, de: Lieu) => {
    if (fini || (ev.pointerType === 'mouse' && ev.button !== 0)) return
    if (!prendre(jeu, de).length) return
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
    ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
    drag.current = { de, x0: ev.clientX, y0: ev.clientY, dx: ev.clientX - r.left, dy: ev.clientY - r.top, bouge: false, pointer: ev.pointerId }
  }
  const onPointerMove = (ev: PointerEvent) => {
    const d = drag.current
    if (!d) return
    if (!d.bouge) {
      if (Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < 7) return
      d.bouge = true
      setGlisse({ de: d.de, cartes: prendre(jeu, d.de) })
    }
    const f = fantomeRef.current
    if (f) f.style.transform = `translate(${ev.clientX - d.dx}px, ${ev.clientY - d.dy}px)`
  }
  const onPointerUp = (ev: PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (!d.bouge) return toucher(d.de)
    setGlisse(null)
    // On cherche la cible sous le pointeur (le fantôme est transparent aux clics).
    const cible = cibleSous(ev.clientX, ev.clientY)
    if (!cible) return
    const n = deplacer(jeu, d.de, cible)
    if (n) {
      jouer(n)
      if (sound) playSound(cible.t === 'fondation' ? 'match' : 'slide')
      if (vibe && canVibrate()) vibrate('tap')
    } else if (sound) playSound('nomatch')
  }
  useEffect(() => {
    if (!glisse) return
    const f = fantomeRef.current
    const d = drag.current
    if (f && d) f.style.transform = `translate(${d.x0 - d.dx}px, ${d.y0 - d.dy}px)`
  }, [glisse])

  // Cibles possibles pendant un glisser (mises en valeur).
  const cibles = useMemo(() => {
    if (!glisse) return new Set<string>()
    const s = new Set<string>()
    const c = glisse.cartes[0]
    if (glisse.cartes.length === 1) ENSEIGNES.forEach((_, i) => peutFondation(jeu, c, i) && s.add(`fondation-${i}`))
    for (let i = 0; i < 7; i++) if (!(glisse.de.t === 'colonne' && glisse.de.i === i) && peutColonne(jeu, c, i)) s.add(`colonne-${i}`)
    return s
  }, [glisse, jeu])

  const H = largeur * 1.4
  const enMain = (l: Lieu) => !!glisse && JSON.stringify(glisse.de) === JSON.stringify(l)
  const estIndice = (l: Lieu) => !!indice && indice.de !== 'pioche' && JSON.stringify(indice.de) === JSON.stringify(l)
  const duree = Math.max(0, Math.round(((etat.fin ?? maintenant) - etat.debut) / 1000))

  const carte = (c: Carte, l: Lieu, style: CSSProperties, cachee = false) => (
    <div
      key={c.id}
      role="button"
      tabIndex={c.visible ? 0 : -1}
      aria-label={c.visible ? nomCarte(c) : 'Carte retournée'}
      className={`sl-carte${c.visible ? (rouge(c.e) ? ' is-rouge' : ' is-noire') : ' is-dos'}${cachee ? ' is-cachee' : ''}${estIndice(l) ? ' is-indice' : ''}`}
      style={style}
      onPointerDown={c.visible ? ev => onPointerDown(ev, l) : undefined}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { drag.current = null; setGlisse(null) }}
      onLostPointerCapture={() => { if (drag.current) { drag.current = null; setGlisse(null) } }}
      onKeyDown={ev => (ev.key === 'Enter' || ev.key === ' ') && c.visible && (ev.preventDefault(), toucher(l))}
    >
      {c.visible && <FaceCarte c={c} />}
    </div>
  )

  return (
    <section className="ms solitaire" aria-label="Solitaire">
      <Guide
        etapes={[
          { title: 'Monte les quatre familles', text: 'Range chaque famille (♠ ♥ ♦ ♣) de l’As au Roi sur les quatre emplacements en haut à droite.' },
          { title: 'Descends dans les colonnes', text: 'Dans les colonnes, pose une carte sur une carte de rang juste au-dessus et de l’autre couleur : un 7 rouge sur un 8 noir. Seul un Roi peut aller sur une colonne vide.' },
          { title: 'Pioche', text: 'Touche la pioche pour retourner des cartes (1 ou 3 selon le mode). Quand elle est vide, la défausse y retourne.' },
          { title: 'Touche ou glisse', text: 'Touche une carte : elle part toute seule au meilleur endroit. Tu peux aussi la faire glisser où tu veux, avec les cartes posées dessus.' },
        ]}
        astuces={[
          'Découvre en priorité les cartes cachées des grandes colonnes.',
          'Ne vide pas une colonne si tu n’as pas de Roi à y mettre.',
          'Bloqué ? « Indice » montre un coup, « Annuler » revient en arrière.',
        ]}
      />

      <div className="ms-levels sl-modes" role="radiogroup" aria-label="Mode de pioche">
        {([1, 3] as const).map(t => (
          <button key={t} type="button" role="radio" aria-checked={jeu.tirage === t} className={jeu.tirage === t ? 'is-active' : ''} onClick={() => jeu.tirage !== t && nouvellePartieJeu(t)}>
            <strong>Pioche {t === 1 ? 'une carte' : 'trois cartes'}</strong>
            <small>{t === 1 ? 'plus facile' : 'le classique'}</small>
          </button>
        ))}
      </div>

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="sd-bar ng-bar">
          <span className="ms-counter" title="Temps"><Timer size={15} /> {temps(duree)}</span>
          <span className="ms-counter" title="Coups">{etat.coups} <small className="sl-unite">coups</small></span>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        <div ref={tableRef} className="sl-table" style={{ '--w': `${largeur}px`, '--h': `${H}px` } as CSSProperties}>
          <div className="sl-haut">
            <div
              role="button"
              tabIndex={0}
              className={`sl-emplacement sl-pioche${indice?.de === 'pioche' ? ' is-indice' : ''}`}
              aria-label={jeu.pioche.length ? `Pioche, ${jeu.pioche.length} cartes` : 'Pioche vide : retourner la défausse'}
              onClick={piocherCartes}
              onKeyDown={ev => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), piocherCartes())}
            >
              {jeu.pioche.length > 0 ? <div className="sl-carte is-dos" /> : jeu.defausse.length > 0 && <RotateCcw size={22} />}
            </div>
            <div className="sl-emplacement sl-defausse">
              {jeu.defausse.slice(-3).map((c, k, arr) => {
                const dernier = k === arr.length - 1
                const decal = jeu.tirage === 3 ? k * largeur * 0.22 : 0
                return dernier
                  ? carte(c, { t: 'defausse' }, { left: decal, zIndex: k }, enMain({ t: 'defausse' }))
                  : <div key={c.id} className={`sl-carte ${rouge(c.e) ? 'is-rouge' : 'is-noire'}`} style={{ left: decal, zIndex: k }} aria-hidden="true"><FaceCarte c={c} /></div>
              })}
            </div>
            <div className="sl-vide" />
            {jeu.fondations.map((f, i) => (
              <div key={i} data-cible={`fondation-${i}`} className={`sl-emplacement sl-fondation${cibles.has(`fondation-${i}`) ? ' is-cible' : ''}${indice?.vers?.t === 'fondation' && indice.vers.i === i ? ' is-indice' : ''}`} aria-label={`Fondation ${NOM_ENSEIGNE[ENSEIGNES[i]]} : ${f.length ? nomCarte(f[f.length - 1]) : 'vide'}`}>
                <span className="sl-fond-symbole" aria-hidden="true">{SYMBOLE[ENSEIGNES[i]]}</span>
                {f.length > 0 && carte(f[f.length - 1], { t: 'fondation', i }, {}, enMain({ t: 'fondation', i }))}
              </div>
            ))}
          </div>

          <div className="sl-colonnes">
            {jeu.colonnes.map((col, i) => {
              // Écart entre les cartes : plus serré si la colonne est longue.
              const cachees = col.filter(c => !c.visible).length
              const visibles = col.length - cachees
              const max = H * 3.6
              let pasCache = H * 0.16
              let pasVisible = H * 0.27
              const total = cachees * pasCache + Math.max(0, visibles - 1) * pasVisible
              if (total > max) {
                const k = max / total
                pasCache *= k
                pasVisible *= k
              }
              let y = 0
              return (
                <div key={i} data-cible={`colonne-${i}`} className={`sl-colonne${cibles.has(`colonne-${i}`) ? ' is-cible' : ''}${indice?.vers?.t === 'colonne' && indice.vers.i === i ? ' is-indice' : ''}`} style={{ minHeight: H + Math.min(max, total) }} aria-label={`Colonne ${i + 1}`}>
                  {col.map((c, k) => {
                    const top = y
                    y += c.visible ? pasVisible : pasCache
                    const l: Lieu = { t: 'colonne', i, k }
                    const cachee = !!glisse && glisse.de.t === 'colonne' && glisse.de.i === i && k >= glisse.de.k
                    return carte(c, l, { top, zIndex: k }, cachee)
                  })}
                </div>
              )
            })}
          </div>

          {fini && (
            <div className="sl-fin">
              <strong><Trophy size={20} /> Gagné !</strong>
              <span>En {temps(duree)} et {etat.coups} coups</span>
              <button type="button" className="button button-primary" onClick={() => nouvellePartieJeu()}>Nouvelle partie</button>
            </div>
          )}
        </div>

        {glisse && (
          <div ref={fantomeRef} className="sl-fantome" style={{ '--w': `${largeur}px`, '--h': `${H}px` } as CSSProperties} aria-hidden="true">
            {glisse.cartes.map((c, k) => (
              <div key={c.id} className={`sl-carte ${rouge(c.e) ? 'is-rouge' : 'is-noire'}`} style={{ top: k * H * 0.27 }}><FaceCarte c={c} /></div>
            ))}
          </div>
        )}

        <div className="sd-actions">
          <button type="button" className="sd-action" onClick={annuler} disabled={!etat.historique.length || fini}><Undo2 size={16} /> Annuler</button>
          <button type="button" className="sd-action" onClick={demanderIndice} disabled={fini}><Lightbulb size={16} /> Indice</button>
          <button type="button" className="sd-action" onClick={() => nouvellePartieJeu()}><RotateCcw size={16} /> Nouvelle partie</button>
        </div>

        <div className="ms-message" aria-live="polite">
          <span className="ms-hint">
            {sansCoup === jeu ? 'Plus aucun coup utile : « Annuler » pour revenir en arrière, ou lance une nouvelle partie.' : indice === null && secoue && Date.now() - secoue < 1500 ? 'Cette carte ne peut aller nulle part pour l’instant.' : (
              <>
                <span className="ms-hint-mouse">Clique une carte pour la jouer, ou fais-la glisser · la pioche est en haut à gauche</span>
                <span className="ms-hint-touch">Touche une carte pour la jouer, ou fais-la glisser</span>
              </>
            )}
          </span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Sur cet appareil</span>
        <ul>
          <li><span>Parties gagnées</span><strong>{stats.gagnees}</strong></li>
          <li><span>Meilleur temps</span><strong>{stats.temps1 !== undefined ? temps(stats.temps1) : '—'}</strong><small>pioche une carte</small></li>
          <li><span>Meilleur temps</span><strong>{stats.temps3 !== undefined ? temps(stats.temps3) : '—'}</strong><small>pioche trois cartes</small></li>
        </ul>
      </div>
    </section>
  )
}
