import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { ArrowDown, ArrowUp, Pause, Play, RotateCcw, Trophy } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { useRecords, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { useHaptique } from './commun/useHaptique'
import { avancer, MEDAILLES, medailleDe, MONDE_L, MONDE_PAS, mondeDe, nouvelEtat, score } from './ninja-logic'
import type { Etat } from './ninja-logic'
import { dessinerMonde, dessinerNinja, dessinerObstacle, MONDES } from './ninja-mondes'
import './ninja.css'

const MONDE_H = 150
const FONDU = 1.2 // durée du fondu entre deux mondes (s)
type Statut = 'pret' | 'joue' | 'pause' | 'perdu'

function Medaille({ niveau, taille = 34, verrou = false }: { niveau: number; taille?: number; verrou?: boolean }) {
  const m = MEDAILLES[niveau]
  const id = `med-${niveau}-${verrou ? 'v' : 'o'}`
  return (
    <svg width={taille} height={taille} viewBox="0 0 40 40" aria-hidden="true" className={verrou ? 'nj-medaille is-locked' : 'nj-medaille'}>
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity=".9" />
          <stop offset=".35" stopColor={m.c} />
          <stop offset="1" stopColor={m.c} stopOpacity=".75" />
        </radialGradient>
      </defs>
      <path d="M12 2 L18 14 L13 16 Z" fill="#4d8cff" /><path d="M28 2 L22 14 L27 16 Z" fill="#ff5a5a" />
      <circle cx="20" cy="25" r="12.5" fill={`url(#${id})`} stroke="#00000040" strokeWidth="1.5" />
      <path d="M20 17.5 l2.2 4.6 5 .6 -3.7 3.4 1 4.9 -4.5 -2.5 -4.5 2.5 1 -4.9 -3.7 -3.4 5 -.6 z" fill="#00000035" />
    </svg>
  )
}

export default function Ninja() {
  const [statut, setStatut] = useState<Statut>('pret')
  const [points, setPoints] = useState(0)
  const [record, setRecord] = useState(false)
  const [annonces, setAnnonces] = useState<{ texte: string; medaille?: number; key: number }[]>([])
  const annonce = annonces[0]
  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const haptique = useHaptique(vibe)
  const panelRef = useRef<HTMLDivElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const plein = useFullscreen(panelRef)
  const records = useRecords('ez-ninja', 'higher')

  const e = useRef<Etat>(nouvelEtat())
  const statutRef = useRef<Statut>('pret')
  statutRef.current = statut
  const entree = useRef({ saut: false, bas: false })
  const echelle = useRef(1)
  const hauteur = useRef(MONDE_H) // hauteur visible du monde : plus de ciel sur téléphone
  const fondu = useRef<{ de: number; vers: number; t0: number } | null>(null)
  const opts = useRef({ sound, vibe, records })
  opts.current = { sound, vibe, records }

  const dessiner = useCallback(() => {
    const cv = canvasRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const k = echelle.current
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(k * dpr, 0, 0, k * dpr, 0, 0)
    const s = e.current
    const f = fondu.current
    // Ciel en plus au-dessus du monde (téléphone), de la couleur du haut du ciel.
    const extra = hauteur.current - MONDE_H
    if (extra > 0) {
      ctx.fillStyle = MONDES[f ? f.de : mondeDe(score(s))].ciel[0]
      ctx.fillRect(0, 0, MONDE_L, extra + 1)
      if (f) {
        ctx.globalAlpha = Math.min(1, (s.t - f.t0) / FONDU)
        ctx.fillStyle = MONDES[f.vers].ciel[0]
        ctx.fillRect(0, 0, MONDE_L, extra + 1)
        ctx.globalAlpha = 1
      }
      ctx.translate(0, extra)
    }
    if (f) {
      const p = Math.min(1, (s.t - f.t0) / FONDU)
      dessinerMonde(ctx, MONDES[f.de], s.distance, s.t)
      dessinerMonde(ctx, MONDES[f.vers], s.distance, s.t, p)
      if (p >= 1) fondu.current = null
    } else dessinerMonde(ctx, MONDES[mondeDe(score(s))], s.distance, s.t)
    for (const o of s.obstacles) dessinerObstacle(ctx, o, s.t)
    dessinerNinja(ctx, s, s.mort)
  }, [])

  useEffect(() => {
    const zone = zoneRef.current
    const cv = canvasRef.current
    if (!zone || !cv) return
    const ro = new ResizeObserver(() => {
      const w = zone.clientWidth
      const dpr = window.devicePixelRatio || 1
      const k = w / MONDE_L
      // Sur un écran étroit, la zone fait au moins 140 px de haut (ciel en plus) pour que tout y tienne.
      const h = Math.max(w / 4, Math.min(140, w * 0.42))
      echelle.current = k
      hauteur.current = h / k
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      // Largeur gérée en CSS (100 %) : le canvas ne force jamais la zone à rester large.
      cv.style.height = `${h}px`
      dessiner()
    })
    ro.observe(zone)
    return () => ro.disconnect()
  }, [dessiner])

  // Boucle de jeu.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (statutRef.current === 'joue') {
        const avant = score(e.current)
        const res = avancer(e.current, dt, entree.current.saut, entree.current.bas)
        entree.current.saut = false
        e.current = res.e
        const apres = score(res.e)
        const { sound: son, vibe: vib } = opts.current
        if (res.sauté && son) playSound('select')
        // Changement de monde.
        if (mondeDe(apres) !== mondeDe(avant)) {
          fondu.current = { de: mondeDe(avant), vers: mondeDe(apres), t0: res.e.t }
          setAnnonces(a => [...a, { texte: MONDES[mondeDe(apres)].nom, key: performance.now() }])
          if (son) playSound('match')
        }
        // Nouvelle médaille.
        const med = medailleDe(apres)
        if (med > medailleDe(avant)) {
          setAnnonces(a => [...a, { texte: `Médaille ${MEDAILLES[med].nom} !`, medaille: med, key: performance.now() + 1 }])
          if (son) playSound('win')
          if (vib && canVibrate()) vibrate('success')
        } else if (res.palier && son && mondeDe(apres) === mondeDe(avant)) playSound('eat')
        if (res.e.mort) {
          setStatut('perdu')
          statutRef.current = 'perdu'
          setRecord(opts.current.records.submit('score', apres) && apres > 0)
          if (son) playSound('gameover')
          if (vib && canVibrate()) vibrate('boom')
        }
        setPoints(apres)
      }
      dessiner()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [dessiner])

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && statutRef.current === 'joue') setStatut('pause')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const demarrer = () => {
    e.current = nouvelEtat()
    fondu.current = null
    entree.current = { saut: false, bas: false }
    setRecord(false)
    setPoints(0)
    setAnnonces([])
    setStatut('joue')
    statutRef.current = 'joue'
    zoneRef.current?.focus({ preventScroll: true })
  }
  // Sauter démarre aussi la partie (et la reprend après une pause).
  const sauter = () => {
    if (statutRef.current === 'pret' || statutRef.current === 'perdu') return demarrer()
    if (statutRef.current === 'pause') return setStatut('joue')
    entree.current.saut = true
  }
  const baisser = (on: boolean) => {
    entree.current.bas = on
  }
  const basculerPause = () => {
    if (statut === 'joue') setStatut('pause')
    else if (statut === 'pause') setStatut('joue')
    else demarrer()
  }

  const onKeyDown = (ev: KeyboardEvent) => {
    const k = ev.key
    if ([' ', 'ArrowUp', 'ArrowDown'].includes(k)) ev.preventDefault()
    if (ev.repeat && k !== 'ArrowDown' && k !== 's' && k !== 'S') return
    if (k === ' ' || k === 'ArrowUp' || k === 'z' || k === 'Z' || k === 'w' || k === 'W') sauter()
    else if (k === 'ArrowDown' || k === 's' || k === 'S') baisser(true)
    else if (k === 'p' || k === 'P' || k === 'Escape') basculerPause()
  }
  const onKeyUp = (ev: KeyboardEvent) => {
    if (ev.key === 'ArrowDown' || ev.key === 's' || ev.key === 'S') baisser(false)
  }
  // Toucher la zone de jeu = sauter (preventDefault : le focus reste sur la zone de jeu).
  const onPointerDown = (ev: PointerEvent) => {
    ev.preventDefault()
    if (ev.pointerType !== 'mouse' || ev.button === 0) sauter()
    zoneRef.current?.focus({ preventScroll: true })
  }

  const meilleur = Math.max(records.records.score ?? 0, points)
  const medPartie = medailleDe(points)
  const medRecord = medailleDe(records.records.score ?? 0)
  const prochaine = MEDAILLES[medPartie + 1]

  return (
    <section className="ms ninja" aria-label="Ninja">
      <Guide
        etapes={[
          { title: 'Saute', text: 'Espace ou flèche du haut sur ordinateur, toucher l’écran ou le bouton « Sauter » sur téléphone. Saute par-dessus les obstacles au sol et ceux qui volent bas.' },
          { title: 'Baisse-toi', text: 'Flèche du bas (ou bouton « Se baisser », à maintenir) pour glisser sous ce qui vole à mi-hauteur. En l’air, ça fait redescendre plus vite.' },
          { title: 'Traverse les mondes', text: `Tous les ${MONDE_PAS} points, tu changes de monde : plaine, forêt, désert, banquise, jungle, Japon, monde de lave et monde du vide. Le ninja accélère petit à petit.` },
          { title: 'Gagne des médailles', text: 'Du cuivre (100 points) à la médaille Légende (4000 points) : neuf médailles à collectionner, gardées sur ton appareil.' },
        ]}
        astuces={[
          'Ne saute pas trop tôt : attends que l’obstacle soit proche, surtout quand tout va vite.',
          'Ce qui vole tout en haut passe au-dessus de ta tête : reste au sol.',
          'P ou Échap pour faire une pause.',
        ]}
      />

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="t48-bar">
          <div className="t48-score"><span>Score</span><strong>{String(points).padStart(5, '0')}</strong></div>
          <div className="t48-score"><span>Record</span><strong>{String(meilleur).padStart(5, '0')}</strong></div>
          <button type="button" className="t48-btn" onClick={basculerPause}>
            {statut === 'joue' ? <><Pause size={16} /> Pause</> : <><Play size={16} /> {statut === 'pause' ? 'Reprendre' : 'Jouer'}</>}
          </button>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        <div
          ref={zoneRef}
          className="nj-zone"
          tabIndex={0}
          role="application"
          aria-label={`Ninja : score ${points}, monde ${MONDES[mondeDe(points)].nom}. Espace pour sauter, flèche du bas pour se baisser.`}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={() => baisser(false)}
          onPointerDown={onPointerDown}
        >
          <canvas ref={canvasRef} aria-hidden="true" />
          {!(annonce && statut === 'joue') && <span className="nj-coin" aria-hidden="true">{MONDES[mondeDe(points)].nom}</span>}
          {annonce && statut === 'joue' && (
            <div key={annonce.key} className={annonce.medaille !== undefined ? 'nj-annonce is-medaille' : 'nj-annonce'} onAnimationEnd={() => setAnnonces(a => a.slice(1))}>
              {annonce.medaille !== undefined ? <Medaille niveau={annonce.medaille} taille={22} /> : <span className="mini-label">Monde</span>}
              {annonce.texte}
            </div>
          )}
          {statut !== 'joue' && (
            <div className="nj-overlay">
              {statut === 'pret' && <><strong>Prêt ?</strong><span>Espace, flèche du haut ou touche l’écran pour partir</span></>}
              {statut === 'pause' && <><strong>Pause</strong><span>Saute pour reprendre</span></>}
              {statut === 'perdu' && (
                <>
                  <strong>{record ? <><Trophy size={18} /> Nouveau record !</> : 'Aïe !'}</strong>
                  <span className="nj-fin">
                    {medPartie >= 0 && <Medaille niveau={medPartie} taille={22} />}
                    Score : {points}{medPartie >= 0 ? ` · médaille ${MEDAILLES[medPartie].nom}` : ''}
                  </span>
                  {prochaine && <span>Prochaine médaille ({prochaine.nom}) à {prochaine.seuil} points</span>}
                  <button type="button" className="button button-primary" onPointerDown={ev => ev.stopPropagation()} onClick={demarrer}><RotateCcw size={15} /> Rejouer</button>
                </>
              )}
            </div>
          )}
        </div>

        {haptique.input}
        <label {...haptique.labelProps} className="nj-boutons" aria-label="Commandes">
          <div role="button" className="nj-btn" onPointerDown={ev => { ev.preventDefault(); baisser(true) }} onPointerUp={() => baisser(false)} onPointerCancel={() => baisser(false)} onPointerLeave={() => baisser(false)} onClick={() => haptique.request('tap')}><ArrowDown size={22} /> Se baisser</div>
          <div role="button" className="nj-btn is-saut" onPointerDown={ev => { ev.preventDefault(); sauter() }} onClick={() => haptique.request('tap')}><ArrowUp size={22} /> Sauter</div>
        </label>

        <div className="ms-message">
          <span className="ms-hint">
            <span className="ms-hint-mouse">Espace ou ↑ : sauter · ↓ : se baisser · P : pause</span>
            <span className="ms-hint-touch">Touche l’écran pour sauter, maintiens « Se baisser » pour te baisser</span>
          </span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Tes médailles (meilleur score : {records.records.score ?? 0})</span>
        <ul className="nj-medailles">
          {MEDAILLES.map((m, k) => (
            <li key={m.nom} className={k <= medRecord ? 'is-won' : ''} title={`${m.nom} : ${m.seuil} points`}>
              <Medaille niveau={k} taille={30} verrou={k > medRecord} />
              <span>{m.nom}</span>
              <small>{m.seuil}</small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
