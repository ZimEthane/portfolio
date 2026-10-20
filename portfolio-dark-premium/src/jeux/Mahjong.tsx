import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Lightbulb, RotateCcw, Shuffle, Timer, Trophy, Undo2 } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { loadJSON, saveJSON, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { useHaptique } from './commun/useHaptique'
import { DISPOSITIONS, distribuer, libre, melanger, pairePossible, vont } from './mahjong-logic'
import type { Tuile } from './mahjong-logic'
import { FaceTuile, nomTuile } from './mahjong-tuiles'
import './mahjong.css'

const STATS_KEY = 'ez-mahjong' // { tortue: { gagnees, temps }, … }
type Stats = Record<string, { gagnees: number; temps?: number }>
interface Partie {
  dispo: string
  tuiles: Tuile[]
  presentes: boolean[]
  historique: { a: number; b: number }[]
  melanges: number
  debut: number
  fin: number | null
}
const nouvelle = (dispo: string): Partie => {
  const d = DISPOSITIONS.find(x => x.id === dispo) ?? DISPOSITIONS[0]
  const tuiles = distribuer(d.pos)
  return { dispo: d.id, tuiles, presentes: tuiles.map(() => true), historique: [], melanges: 0, debut: Date.now(), fin: null }
}
const temps = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function Mahjong() {
  const [partie, setPartie] = useState<Partie>(() => nouvelle(window.innerWidth < 640 ? 'tour' : 'tortue'))
  const [sel, setSel] = useState<number | null>(null)
  const [indice, setIndice] = useState<[number, number] | null>(null)
  const [secoue, setSecoue] = useState<{ i: number; k: number } | null>(null)
  const [aide, setAide] = useState(true)
  const [stats, setStats] = useState<Stats>(() => loadJSON(STATS_KEY, {}))
  const [maintenant, setMaintenant] = useState(Date.now())
  const [tw, setTw] = useState(40)
  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const haptique = useHaptique(vibe)
  const panelRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const plein = useFullscreen(panelRef)

  const { tuiles, presentes } = partie
  const restantes = presentes.filter(Boolean).length
  const gagne = restantes === 0
  const libres = useMemo(() => tuiles.map((_, i) => presentes[i] && libre(tuiles, i, presentes)), [tuiles, presentes])
  const paires = useMemo(() => {
    let n = 0
    const idx = tuiles.map((_, i) => i).filter(i => libres[i])
    for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) if (vont(tuiles[idx[a]].t, tuiles[idx[b]].t)) n++
    return n
  }, [tuiles, libres])
  const bloque = !gagne && paires === 0

  // Taille des tuiles : toute la disposition doit tenir dans la largeur (et la hauteur en plein écran).
  const bornes = useMemo(() => {
    const maxX = Math.max(...tuiles.map(t => t.x)) + 2
    const maxY = Math.max(...tuiles.map(t => t.y)) + 2
    const maxZ = Math.max(...tuiles.map(t => t.z))
    return { maxX, maxY, maxZ }
  }, [tuiles])
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const calc = () => {
      const W = el.clientWidth - 12
      const parLargeur = W / (bornes.maxX / 2 + bornes.maxZ * 0.12 + 0.15)
      // En plein écran : la hauteur de l'écran moins tout ce qui n'est pas le plateau (compteurs, boutons…).
      let H = Infinity
      const panel = panelRef.current
      const plateau = el.firstElementChild as HTMLElement | null
      if (plein.full && panel && plateau && panel.firstElementChild && panel.lastElementChild) {
        const contenu = panel.lastElementChild.getBoundingClientRect().bottom - panel.firstElementChild.getBoundingClientRect().top
        H = window.innerHeight - (contenu - plateau.getBoundingClientRect().height) - 40
      }
      const parHauteur = H / ((bornes.maxY / 2) * 1.3 + bornes.maxZ * 0.12 + 0.2)
      // Arrondi au demi-pixel, et on ignore les toutes petites variations (sinon la taille peut osciller).
      const v = Math.floor(Math.max(18, Math.min(64, parLargeur, parHauteur)) * 2) / 2
      setTw(t => (Math.abs(t - v) < 0.75 ? t : v))
    }
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    calc()
    return () => ro.disconnect()
  }, [bornes, plein.full])

  useEffect(() => {
    if (partie.fin) return
    const t = window.setInterval(() => setMaintenant(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [partie.fin])

  const recommencer = (dispo = partie.dispo) => {
    setPartie(nouvelle(dispo))
    setSel(null)
    setIndice(null)
  }

  const toucher = (i: number) => {
    if (!presentes[i] || gagne) return
    if (!libres[i]) {
      setSecoue({ i, k: Date.now() })
      if (sound) playSound('error')
      haptique.request('error')
      return
    }
    if (sel === null || sel === i) {
      setSel(sel === i ? null : i)
      if (sound) playSound('select')
      haptique.request('tap')
      return
    }
    if (vont(tuiles[sel].t, tuiles[i].t)) {
      const p = presentes.slice()
      p[sel] = false
      p[i] = false
      const fini = p.every(x => !x)
      setPartie(s => ({ ...s, presentes: p, historique: [...s.historique, { a: sel, b: i }], fin: fini ? Date.now() : null }))
      setSel(null)
      setIndice(null)
      if (sound) playSound(fini ? 'win' : 'match')
      if (vibe && canVibrate()) vibrate(fini ? 'win' : 'success')
      else haptique.request('success')
      if (fini) {
        const s = Math.round((Date.now() - partie.debut) / 1000)
        setStats(st => {
          const prec = st[partie.dispo]
          const n = { ...st, [partie.dispo]: { gagnees: (prec?.gagnees ?? 0) + 1, temps: Math.min(s, prec?.temps ?? Infinity) } }
          saveJSON(STATS_KEY, n)
          return n
        })
      }
    } else {
      setSel(i)
      if (sound) playSound('nomatch')
      haptique.request('tap')
    }
  }

  const annuler = () => {
    const h = partie.historique[partie.historique.length - 1]
    if (!h || gagne) return
    const p = presentes.slice()
    p[h.a] = true
    p[h.b] = true
    setPartie(s => ({ ...s, presentes: p, historique: s.historique.slice(0, -1) }))
    setSel(null)
    if (sound) playSound('unflag')
  }
  const demanderIndice = () => {
    const p = pairePossible(tuiles, presentes)
    setIndice(p)
    if (sound) playSound('select')
  }
  const melangerTuiles = () => {
    if (gagne) return
    setPartie(s => ({ ...s, tuiles: melanger(s.tuiles, s.presentes), melanges: s.melanges + 1, historique: [] }))
    setSel(null)
    setIndice(null)
    if (sound) playSound('cascade')
  }

  const th = tw * 1.3
  const dz = tw * 0.12
  const largeur = (bornes.maxX / 2) * tw + bornes.maxZ * dz + 6
  const hauteur = (bornes.maxY / 2) * th + bornes.maxZ * dz + 8
  // Ordre d'affichage : étage, puis de haut en bas, de gauche à droite.
  const ordre = useMemo(() => tuiles.map((_, i) => i).sort((a, b) => tuiles[a].z - tuiles[b].z || tuiles[a].y - tuiles[b].y || tuiles[a].x - tuiles[b].x), [tuiles])
  const duree = Math.max(0, Math.round(((partie.fin ?? maintenant) - partie.debut) / 1000))

  return (
    <section className="ms mahjong" aria-label="Mahjong">
      <Guide
        etapes={[
          { title: 'Retire les tuiles par paires', text: 'Touche deux tuiles identiques pour les retirer. Le but : vider tout le plateau.' },
          { title: 'Seulement les tuiles libres', text: 'Une tuile est libre si rien n’est posé dessus et si son côté gauche ou son côté droit est dégagé. L’option « Aide » assombrit les tuiles bloquées.' },
          { title: 'Fleurs et saisons', text: 'Deux fleurs différentes vont ensemble, et deux saisons différentes aussi. Toutes les autres tuiles se marient avec leur jumelle exacte.' },
          { title: 'Toujours une solution', text: 'Chaque donne peut être terminée. Bloqué ? « Mélanger » redistribue les tuiles restantes (en gardant une solution), « Annuler » revient en arrière.' },
        ]}
        astuces={[
          'Libère d’abord les tuiles du haut de la pile et les longues rangées.',
          'Quand les quatre tuiles d’une sorte sont libres, retire-les toutes.',
          'La « Tour » est faite pour jouer sur un téléphone tenu droit.',
        ]}
      />

      <div className="ms-levels mj-dispos" role="radiogroup" aria-label="Disposition">
        {DISPOSITIONS.map(d => (
          <button key={d.id} type="button" role="radio" aria-checked={partie.dispo === d.id} className={partie.dispo === d.id ? 'is-active' : ''} onClick={() => recommencer(d.id)}>
            <strong>{d.nom}</strong>
            <small>{d.info}</small>
          </button>
        ))}
      </div>

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="sd-bar ng-bar">
          <span className="ms-counter" title="Temps"><Timer size={15} /> {temps(duree)}</span>
          <span className="ms-counter" title="Tuiles restantes">{restantes} <small className="sl-unite">tuiles</small></span>
          <span className="ms-counter" title="Paires jouables">{paires} <small className="sl-unite">paires</small></span>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle}>
          <button type="button" role="switch" aria-checked={aide} className={aide ? 'ms-switch is-on' : 'ms-switch'} onClick={() => setAide(!aide)} title="Assombrit les tuiles bloquées">
            Aide <span className="ms-switch-track" aria-hidden="true" />
          </button>
        </Outils>

        {haptique.input}
        <div ref={wrapRef} className="mj-wrap">
          <label {...haptique.labelProps} className={`mj-plateau${aide ? ' avec-aide' : ''}`} style={{ width: largeur, height: hauteur, '--tw': `${tw}px`, '--th': `${th}px` } as CSSProperties} aria-label={`Plateau de Mahjong, ${restantes} tuiles`}>
            {ordre.map(i => {
              const t = tuiles[i]
              if (!presentes[i]) return null
              const left = (t.x / 2) * tw + (bornes.maxZ - t.z) * dz
              const top = (t.y / 2) * th + (bornes.maxZ - t.z) * dz
              return (
                <div
                  key={`${i}-${t.t}`}
                  role="button"
                  tabIndex={libres[i] ? 0 : -1}
                  aria-label={`${nomTuile(t.t)}${libres[i] ? '' : ', bloquée'}${sel === i ? ', choisie' : ''}`}
                  className={`mj-tuile${libres[i] ? ' is-libre' : ''}${sel === i ? ' is-sel' : ''}${indice && indice.includes(i) ? ' is-indice' : ''}${secoue?.i === i ? ' is-secoue' : ''}`}
                  data-k={secoue?.i === i ? secoue.k : undefined}
                  style={{ left, top, zIndex: t.z * 1000 + i } as CSSProperties}
                  onClick={() => toucher(i)}
                  onKeyDown={ev => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), toucher(i))}
                >
                  <FaceTuile t={t.t} />
                </div>
              )
            })}
          </label>
          {(gagne || bloque) && (
            <div className="mj-fin">
              {gagne ? (
                <>
                  <strong><Trophy size={20} /> Plateau vidé !</strong>
                  <span>En {temps(duree)}{partie.melanges ? `, avec ${partie.melanges} mélange${partie.melanges > 1 ? 's' : ''}` : ''}</span>
                  <button type="button" className="button button-primary" onClick={() => recommencer()}>Nouvelle partie</button>
                </>
              ) : (
                <>
                  <strong>Plus aucune paire possible</strong>
                  <span>Mélange les tuiles restantes, ou annule tes derniers coups.</span>
                  <div>
                    <button type="button" className="button" onClick={annuler} disabled={!partie.historique.length}><Undo2 size={15} /> Annuler</button>
                    <button type="button" className="button button-primary" onClick={melangerTuiles}><Shuffle size={15} /> Mélanger</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="sd-actions">
          <button type="button" className="sd-action" onClick={annuler} disabled={!partie.historique.length || gagne}><Undo2 size={16} /> Annuler</button>
          <button type="button" className="sd-action" onClick={demanderIndice} disabled={gagne || bloque}><Lightbulb size={16} /> Indice</button>
          <button type="button" className="sd-action" onClick={melangerTuiles} disabled={gagne}><Shuffle size={16} /> Mélanger</button>
          <button type="button" className="sd-action" onClick={() => recommencer()}><RotateCcw size={16} /> Nouvelle</button>
        </div>

        <div className="ms-message">
          <span className="ms-hint">Touche deux tuiles identiques et libres pour les retirer</span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Sur cet appareil</span>
        <ul>
          {DISPOSITIONS.map(d => (
            <li key={d.id}><span>{d.nom}</span><strong>{stats[d.id]?.temps !== undefined ? temps(stats[d.id].temps!) : '—'}</strong><small>{stats[d.id]?.gagnees ? `${stats[d.id].gagnees} victoire${stats[d.id].gagnees > 1 ? 's' : ''}` : 'meilleur temps'}</small></li>
          ))}
        </ul>
      </div>
    </section>
  )
}
