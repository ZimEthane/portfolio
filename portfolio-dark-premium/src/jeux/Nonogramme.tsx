import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { Heart, Lightbulb, RotateCcw, Shuffle, Square, Timer, Trophy, X } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { loadJSON, saveJSON, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { useHaptique } from './commun/useHaptique'
import { aleatoire, indicesColonnes, indicesLignes, lire } from './nonogramme-logic'
import type { Grille } from './nonogramme-logic'
import { IMAGES } from './nonogramme-images'
import './nonogramme.css'

const PROGRES_KEY = 'ez-nonogramme' // { "Chat": 83, … } : meilleur temps (s) des images trouvées
const VIES = 3
const INDICES = 3
const TAILLES = [
  { id: 5, nom: 'Facile', info: '5 × 5' },
  { id: 10, nom: 'Moyen', info: '10 × 10' },
  { id: 15, nom: 'Difficile', info: '15 × 15' },
]

// État d'une case : 0 inconnue, 1 noircie, 2 croix, 3 erreur (noircie à tort : croix rouge), 4 erreur (croix à tort : case noire marquée)
type Case = 0 | 1 | 2 | 3 | 4
const estNoire = (c: Case) => c === 1 || c === 4

interface Partie {
  nom: string | null // null : grille aléatoire
  g: Grille
  etat: Case[]
  vies: number
  indices: number
  debut: number
  fin: number | null
  issue: 'gagne' | 'perdu' | null
}
const nouvellePartie = (nom: string | null, g: Grille): Partie => ({ nom, g, etat: new Array(g.w * g.h).fill(0), vies: VIES, indices: INDICES, debut: Date.now(), fin: null, issue: null })
const temps = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Une ligne (ou colonne) est terminée quand toutes ses cases noires sont trouvées : on coche le reste.
function completer(p: Partie, etat: Case[]): Case[] {
  const { w, h, cases } = p.g
  const e = etat.slice()
  for (let y = 0; y < h; y++) {
    let fini = true
    for (let x = 0; x < w; x++) if (cases[y * w + x] && !estNoire(e[y * w + x])) { fini = false; break }
    if (fini) for (let x = 0; x < w; x++) if (e[y * w + x] === 0) e[y * w + x] = 2
  }
  for (let x = 0; x < w; x++) {
    let fini = true
    for (let y = 0; y < h; y++) if (cases[y * w + x] && !estNoire(e[y * w + x])) { fini = false; break }
    if (fini) for (let y = 0; y < h; y++) if (e[y * w + x] === 0) e[y * w + x] = 2
  }
  return e
}

// Petite image (choix des images, guide).
function Mini({ g, taille = 3 }: { g: Grille; taille?: number }) {
  return (
    <span className="ng-mini" style={{ gridTemplateColumns: `repeat(${g.w}, ${taille}px)`, gridAutoRows: `${taille}px` } as CSSProperties} aria-hidden="true">
      {g.cases.map((c, i) => <i key={i} className={c ? 'is-on' : ''} />)}
    </span>
  )
}

export default function Nonogramme() {
  const [progres, setProgres] = useState<Record<string, number>>(() => loadJSON(PROGRES_KEY, {}))
  const [taille, setTaille] = useState(5)
  const [partie, setPartie] = useState<Partie>(() => {
    const im = IMAGES.find(i => !(i.nom in loadJSON<Record<string, number>>(PROGRES_KEY, {}))) ?? IMAGES[0]
    return nouvellePartie(im.nom, lire(im.dessin))
  })
  const [mode, setMode] = useState<'noir' | 'croix'>('noir')
  const [curseur, setCurseur] = useState(0)
  const [survol, setSurvol] = useState<number | null>(null)
  const [maintenant, setMaintenant] = useState(Date.now())
  const [secoue, setSecoue] = useState(0)
  const [cell, setCell] = useState(28)
  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const haptique = useHaptique(vibe)
  const panelRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const grilleRef = useRef<HTMLDivElement>(null)
  const plein = useFullscreen(panelRef)
  const drag = useRef<{ action: 'noir' | 'croix'; depart: number; axe: 'x' | 'y' | null; stop: boolean } | null>(null)
  const partieRef = useRef(partie)
  partieRef.current = partie

  const { g } = partie
  const li = useMemo(() => indicesLignes(g), [g])
  const co = useMemo(() => indicesColonnes(g), [g])
  const maxLi = Math.max(1, ...li.map(l => l.length))
  const maxCo = Math.max(1, ...co.map(c => c.length))

  useEffect(() => {
    if (partie.issue) return
    const t = window.setInterval(() => setMaintenant(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [partie.issue])

  // Taille des cases selon la place (les indices des lignes prennent de la largeur).
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const calc = () => {
      const W = el.clientWidth
      const c = Math.floor((W - 10) / (g.w + 0.62 * maxLi + 0.4))
      setCell(Math.max(14, Math.min(g.w <= 5 ? 52 : 36, c)))
    }
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    calc()
    return () => ro.disconnect()
  }, [g.w, maxLi])

  const jouer = (nom: string | null, gr: Grille) => {
    setPartie(nouvellePartie(nom, gr))
    setCurseur(0)
    setMaintenant(Date.now())
  }
  const choisirImage = (nom: string) => {
    const im = IMAGES.find(i => i.nom === nom)!
    jouer(im.nom, lire(im.dessin))
  }
  const nouvelleAleatoire = (t: number) => jouer(null, aleatoire(t))

  // Applique une action à une case. Renvoie false si c'était une erreur (le glisser s'arrête).
  const agir = (i: number, action: 'noir' | 'croix', parClic: boolean): boolean => {
    const p = partieRef.current
    if (p.issue || p.etat[i] !== 0) return true
    const noire = p.g.cases[i]
    let etat = p.etat.slice() as Case[]
    let vies = p.vies
    let ok = true
    if (action === 'noir') {
      if (noire) etat[i] = 1
      else { etat[i] = 3; vies--; ok = false }
    } else {
      if (!noire) etat[i] = 2
      else { etat[i] = 4; vies--; ok = false }
    }
    etat = completer(p, etat)
    const gagne = p.g.cases.every((c, k) => !c || estNoire(etat[k]))
    const issue = gagne ? 'gagne' : vies <= 0 ? 'perdu' : null
    const suite: Partie = { ...p, etat, vies, issue, fin: issue ? Date.now() : null }
    partieRef.current = suite
    setPartie(suite)
    if (!ok) {
      setSecoue(Date.now())
      if (sound) playSound('error')
      if (vibe && canVibrate()) vibrate('error')
      else if (parClic) haptique.request('error')
    } else {
      if (sound) playSound(action === 'noir' ? 'reveal' : 'flag', 1)
      if (parClic) haptique.request('tap')
    }
    if (issue === 'gagne') {
      const s = Math.round((Date.now() - p.debut) / 1000)
      if (p.nom) {
        setProgres(pr => {
          const n = { ...pr, [p.nom!]: Math.min(s, pr[p.nom!] ?? Infinity) }
          saveJSON(PROGRES_KEY, n)
          return n
        })
      }
      window.setTimeout(() => sound && playSound('win'), 150)
      if (vibe && canVibrate()) vibrate('win')
    } else if (issue === 'perdu') {
      if (sound) playSound('gameover')
      if (vibe && canVibrate()) vibrate('boom')
    }
    return ok
  }

  const caseSous = (ev: PointerEvent) => {
    const r = grilleRef.current?.getBoundingClientRect()
    if (!r) return null
    const x = Math.floor(((ev.clientX - r.left) / r.width) * g.w)
    const y = Math.floor(((ev.clientY - r.top) / r.height) * g.h)
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) return null
    return y * g.w + x
  }
  const onPointerDown = (ev: PointerEvent) => {
    if (partie.issue) return
    const i = caseSous(ev)
    if (i === null) return
    ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
    const action = ev.button === 2 ? 'croix' : mode // clic droit : croix
    setCurseur(i)
    drag.current = { action, depart: i, axe: null, stop: false }
    if (!agir(i, action, true)) drag.current.stop = true
  }
  const onPointerMove = (ev: PointerEvent) => {
    const i = caseSous(ev)
    setSurvol(i)
    const d = drag.current
    if (!d || d.stop || i === null) return
    const x0 = d.depart % g.w
    const y0 = Math.floor(d.depart / g.w)
    const x = i % g.w
    const y = Math.floor(i / g.w)
    if (!d.axe) {
      if (x === x0 && y === y0) return
      d.axe = Math.abs(x - x0) >= Math.abs(y - y0) ? 'x' : 'y'
    }
    // On reste sur la ligne (ou la colonne) de départ, et on remplit tout l'intervalle.
    const pas = d.axe === 'x' ? Math.sign(x - x0) : Math.sign(y - y0)
    const fin = d.axe === 'x' ? x : y
    for (let k = d.axe === 'x' ? x0 : y0; pas !== 0; k += pas) {
      const idx = d.axe === 'x' ? y0 * g.w + k : k * g.w + x0
      if (!agir(idx, d.action, false)) { d.stop = true; break }
      setCurseur(idx)
      if (k === fin) break
    }
  }
  const onPointerUp = () => {
    drag.current = null
  }

  const onKeyDown = (ev: KeyboardEvent) => {
    const x = curseur % g.w
    const y = Math.floor(curseur / g.w)
    const dirs: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (dirs[ev.key]) {
      ev.preventDefault()
      const nx = Math.max(0, Math.min(g.w - 1, x + dirs[ev.key][0]))
      const ny = Math.max(0, Math.min(g.h - 1, y + dirs[ev.key][1]))
      setCurseur(ny * g.w + nx)
    } else if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault()
      agir(curseur, mode, false)
    } else if (ev.key === 'x' || ev.key === 'X') agir(curseur, 'croix', false)
    else if (ev.key === 'm' || ev.key === 'M') setMode(mode === 'noir' ? 'croix' : 'noir')
  }

  const indice = () => {
    const p = partieRef.current
    if (p.issue || p.indices <= 0) return
    const restantes = p.g.cases.map((c, i) => (c && p.etat[i] === 0 ? i : -1)).filter(i => i >= 0)
    if (!restantes.length) return
    const i = restantes[Math.floor(Math.random() * restantes.length)]
    partieRef.current = { ...p, indices: p.indices - 1 }
    setPartie(partieRef.current)
    agir(i, 'noir', false)
    setCurseur(i)
  }

  // Lignes et colonnes terminées : leurs indices s'effacent.
  const ligneFinie = (y: number) => g.cases.slice(y * g.w, y * g.w + g.w).every((c, x) => !c || estNoire(partie.etat[y * g.w + x]))
  const colFinie = (x: number) => Array.from({ length: g.h }, (_, y) => y * g.w + x).every(i => !g.cases[i] || estNoire(partie.etat[i]))
  const sx = (survol ?? curseur) % g.w
  const sy = Math.floor((survol ?? curseur) / g.w)
  const duree = Math.max(0, Math.round(((partie.fin ?? maintenant) - partie.debut) / 1000))
  const parTaille = IMAGES.filter(im => lire(im.dessin).w === taille)
  const trouvees = IMAGES.filter(im => im.nom in progres).length

  return (
    <section className="ms nonogramme" aria-label="Nonogramme">
      <Guide
        etapes={[
          { title: 'Lis les nombres', text: 'Chaque nombre est un groupe de cases noires qui se suivent, dans l’ordre, sur la ligne (à gauche) ou la colonne (en haut). « 3 1 » : un groupe de 3, au moins une case vide, puis un groupe de 1.', visual: <Mini g={lire(IMAGES[0].dessin)} taille={14} /> },
          { title: 'Noircis ou coche', text: 'Mode « carré » pour noircir une case, mode « croix » pour marquer une case vide. Tu peux glisser pour remplir plusieurs cases d’un coup. Clic droit : croix.' },
          { title: 'Attention aux erreurs', text: 'Une erreur coûte un cœur et la case est corrigée. À trois erreurs, la grille est perdue.' },
          { title: 'Découvre l’image', text: `${IMAGES.length} dessins à découvrir, du 5 × 5 au 15 × 15, et des grilles aléatoires à l’infini. Une ligne terminée se coche toute seule.` },
        ]}
        astuces={[
          'Commence par les grands nombres : dans une ligne de 10, un groupe de 8 noircit forcément les 6 cases du milieu.',
          'Une ligne « 0 » (sans nombre) est entièrement vide.',
          'Au clavier : flèches pour bouger, Espace pour noircir, X pour une croix, M pour changer de mode.',
        ]}
      />

      <div className="ms-levels ng-tailles" role="group" aria-label="Taille des grilles">
        {TAILLES.map(t => {
          const n = IMAGES.filter(im => lire(im.dessin).w === t.id)
          return (
            <button key={t.id} type="button" aria-pressed={taille === t.id} className={taille === t.id ? 'is-active' : ''} onClick={() => setTaille(t.id)}>
              <strong>{t.nom}</strong>
              <small>{t.info} · {n.filter(im => im.nom in progres).length}/{n.length}</small>
            </button>
          )
        })}
      </div>
      <div className="ng-images" role="group" aria-label="Choisir une image">
        {parTaille.map((im, k) => {
          const fait = im.nom in progres
          return (
            <button key={im.nom} type="button" className={`${fait ? 'is-fait' : ''}${partie.nom === im.nom ? ' is-current' : ''}`} onClick={() => choisirImage(im.nom)} aria-label={fait ? `${im.nom}, trouvée en ${temps(progres[im.nom])}` : `Image ${k + 1}, à découvrir`}>
              {fait ? <Mini g={lire(im.dessin)} taille={taille === 5 ? 7 : taille === 10 ? 4 : 3} /> : <span className="ng-q">?</span>}
              <small>{fait ? im.nom : `n° ${k + 1}`}</small>
            </button>
          )
        })}
        <button type="button" className={`ng-alea${partie.nom === null && partie.g.w === taille ? ' is-current' : ''}`} onClick={() => nouvelleAleatoire(taille)}>
          <Shuffle size={18} />
          <small>Aléatoire</small>
        </button>
      </div>

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="sd-bar ng-bar">
          <span className="ms-counter" title="Temps"><Timer size={15} /> {temps(duree)}</span>
          <span className="ms-counter ng-vies" title="Vies" aria-label={`${partie.vies} vie${partie.vies > 1 ? 's' : ''}`}>
            {Array.from({ length: VIES }, (_, k) => <Heart key={`${k}-${secoue}`} size={16} className={k < partie.vies ? 'is-on' : k === partie.vies && secoue ? 'is-perdu' : ''} />)}
          </span>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle}>
          <div className="ng-mode" role="radiogroup" aria-label="Mode">
            <button type="button" role="radio" aria-checked={mode === 'noir'} className={mode === 'noir' ? 'is-active' : ''} onClick={() => setMode('noir')} aria-label="Noircir"><Square size={16} fill="currentColor" /></button>
            <button type="button" role="radio" aria-checked={mode === 'croix'} className={mode === 'croix' ? 'is-active' : ''} onClick={() => setMode('croix')} aria-label="Croix"><X size={17} /></button>
          </div>
        </Outils>

        {haptique.input}
        <div ref={wrapRef} className="ng-wrap">
          <div
            className={`ng-plateau${partie.issue === 'gagne' ? ' is-gagne' : ''}${g.w >= 10 ? ' is-grand' : ''}`}
            style={{ '--cell': `${cell}px`, '--w': g.w, '--h': g.h, '--li': maxLi, '--co': maxCo } as CSSProperties}
          >
            <div className="ng-coin" />
            <div className="ng-cols" aria-hidden="true">
              {co.map((c, x) => (
                <div key={x} className={`${colFinie(x) ? 'is-fini' : ''}${x === sx ? ' is-vise' : ''}`}>
                  {(c.length ? c : [0]).map((v, k) => <span key={k}>{v}</span>)}
                </div>
              ))}
            </div>
            <div className="ng-lignes" aria-hidden="true">
              {li.map((l, y) => (
                <div key={y} className={`${ligneFinie(y) ? 'is-fini' : ''}${y === sy ? ' is-vise' : ''}`}>
                  {(l.length ? l : [0]).map((v, k) => <span key={k}>{v}</span>)}
                </div>
              ))}
            </div>
            <label {...haptique.labelProps} className="ng-label">
              <div
                ref={grilleRef}
                key={secoue}
                className={`ng-grille${secoue ? ' is-secoue' : ''}`}
                role="grid"
                tabIndex={0}
                aria-label={`Grille ${g.w} × ${g.h}. Flèches pour bouger, Espace pour noircir, X pour une croix.`}
                onKeyDown={onKeyDown}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onPointerLeave={() => setSurvol(null)}
                onContextMenu={ev => ev.preventDefault()}
              >
                {partie.etat.map((c, i) => {
                  const x = i % g.w
                  const y = Math.floor(i / g.w)
                  const cls = ['ng-case', `e${c}`]
                  if (x === sx || y === sy) cls.push('is-axe')
                  if (i === curseur) cls.push('is-curseur')
                  if (x % 5 === 4 && x < g.w - 1) cls.push('bd')
                  if (y % 5 === 4 && y < g.h - 1) cls.push('bb')
                  return <div key={i} className={cls.join(' ')} role="gridcell" aria-label={`Ligne ${y + 1}, colonne ${x + 1}`} />
                })}
              </div>
            </label>
            {partie.issue && (
              <div className="ng-fin">
                <strong>{partie.issue === 'gagne' ? <><Trophy size={18} /> {partie.nom ? `C’est : ${partie.nom} !` : 'Grille terminée !'}</> : 'Plus de cœurs…'}</strong>
                <span>{partie.issue === 'gagne' ? `En ${temps(duree)}${partie.vies < VIES ? `, avec ${VIES - partie.vies} erreur${VIES - partie.vies > 1 ? 's' : ''}` : ', sans erreur'}` : 'Trois erreurs : on recommence ?'}</span>
                <div>
                  <button type="button" className="button" onClick={() => (partie.nom ? choisirImage(partie.nom) : jouer(null, partie.g))}><RotateCcw size={15} /> Rejouer</button>
                  {partie.issue === 'gagne' && (
                    <button type="button" className="button button-primary" onClick={() => {
                      const suivante = IMAGES.find(im => !(im.nom in progres) && im.nom !== partie.nom)
                      if (partie.nom && suivante) choisirImage(suivante.nom)
                      else nouvelleAleatoire(g.w)
                    }}>Grille suivante</button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sd-actions">
          <button type="button" className="sd-action" onClick={indice} disabled={!!partie.issue || partie.indices <= 0}><Lightbulb size={16} /> Indice ({partie.indices})</button>
          <button type="button" className="sd-action" onClick={() => (partie.nom ? choisirImage(partie.nom) : jouer(null, partie.g))}><RotateCcw size={16} /> Recommencer</button>
        </div>

        <div className="ms-message">
          <span className="ms-hint">
            <span className="ms-hint-mouse">Clic : {mode === 'noir' ? 'noircir' : 'croix'} · clic droit : croix · glisse pour remplir une ligne</span>
            <span className="ms-hint-touch">Touche ou glisse sur les cases · choisis le mode carré ou croix</span>
          </span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Ta progression sur cet appareil</span>
        <ul>
          <li><span>Images découvertes</span><strong>{trouvees} / {IMAGES.length}</strong></li>
          {TAILLES.map(t => {
            const n = IMAGES.filter(im => lire(im.dessin).w === t.id && im.nom in progres)
            const best = n.length ? Math.min(...n.map(im => progres[im.nom])) : null
            return <li key={t.id}><span>{t.info}</span><strong>{best !== null ? temps(best) : '—'}</strong><small>meilleur temps</small></li>
          })}
        </ul>
      </div>
    </section>
  )
}
