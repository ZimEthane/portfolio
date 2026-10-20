import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { Check, ChevronRight, Lightbulb, Shuffle, Sparkles, X } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { loadJSON, saveJSON, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { ChoixNiveaux, ProgressionPaliers } from './commun/Niveaux'
import { chargerLexique } from './lexique'
import type { Lexique } from './lexique'
import { lireNiveau, prochainIndice } from './mots-logic'
import { NIVEAUX } from './mots-niveaux'
import './mots.css'

const PROGRES_KEY = 'ez-mots-500' // { fait: [niveaux réussis], parfaits: [réussis sans indice], indices, bonus }
const PARTIE_KEY = 'ez-mots-500-partie'
const LETTRES = ['4 lettres', '5 lettres', '6 lettres', '7 lettres', '8 lettres']
const BONUS_PAR_INDICE = 3 // un indice gagné tous les 3 mots bonus

interface Progres { fait: number[]; parfaits: number[]; indices: number; bonus: number }
interface Partie { num: number; trouves: string[]; reveles: Record<string, number[]>; bonus: string[] }
const nouvelle = (num: number): Partie => ({ num, trouves: [], reveles: {}, bonus: [] })
const PROGRES_VIDE: Progres = { fait: [], parfaits: [], indices: 3, bonus: 0 }
type Message = { texte: string; ton: 'ok' | 'bonus' | 'non' | 'info'; id: number }

export default function Mots() {
  const [progres, setProgres] = useState<Progres>(() => ({ ...PROGRES_VIDE, ...loadJSON<Partial<Progres>>(PROGRES_KEY, {}) }))
  const [partie, setPartie] = useState<Partie>(() => {
    const p = loadJSON<Partie | null>(PARTIE_KEY, null)
    if (p && p.num >= 1 && p.num <= NIVEAUX.length && Array.isArray(p.trouves)) return { ...nouvelle(p.num), ...p }
    const fait = loadJSON<Partial<Progres>>(PROGRES_KEY, {}).fait ?? []
    let k = 1
    while (k < NIVEAUX.length && fait.includes(k)) k++
    return nouvelle(k)
  })
  const nv = useMemo(() => lireNiveau(NIVEAUX[partie.num - 1]), [partie.num])
  const [ordre, setOrdre] = useState<number[]>(() => nv.lettres.split('').map((_, i) => i))
  const [sel, setSel] = useState<number[]>([])
  const [modeTape, setModeTape] = useState(false) // lettres touchées une à une (sinon : on glisse)
  const [doigt, setDoigt] = useState<{ x: number; y: number } | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const [nouveau, setNouveau] = useState<string | null>(null) // dernier mot trouvé (animation)
  const [voirBonus, setVoirBonus] = useState(false)
  const [gain, setGain] = useState(false) // le niveau qu'on vient de finir a rapporté un indice
  const [lexique, setLexique] = useState<Lexique | null>(null)
  const [erreurLexique, setErreurLexique] = useState(false)
  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const panelRef = useRef<HTMLDivElement>(null)
  const roueRef = useRef<SVGSVGElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const plein = useFullscreen(panelRef)
  const glisse = useRef<{ bouge: boolean } | null>(null)

  useEffect(() => saveJSON(PARTIE_KEY, partie), [partie])
  useEffect(() => saveJSON(PROGRES_KEY, progres), [progres])
  useEffect(() => {
    let actif = true
    chargerLexique().then(l => actif && setLexique(l)).catch(() => actif && setErreurLexique(true))
    return () => { actif = false }
  }, [])
  // Nouvelle roue à chaque niveau.
  useEffect(() => {
    setOrdre(nv.lettres.split('').map((_, i) => i))
    setSel([])
    setModeTape(false)
  }, [nv])
  useEffect(() => {
    if (!message) return
    const t = window.setTimeout(() => setMessage(null), 1800)
    return () => window.clearTimeout(t)
  }, [message])

  const fini = nv.mots.every(m => partie.trouves.includes(m))
  const mot = sel.map(i => nv.lettres[i]).join('')
  const dire = (texte: string, ton: Message['ton']) => setMessage({ texte, ton, id: Date.now() })
  // La roue tremble quand le mot n'est pas bon (sans la redessiner, pour garder le clavier).
  const secouer = () => zoneRef.current?.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }],
    { duration: 320, easing: 'ease-out' },
  )

  const charger = (num: number) => {
    setPartie(nouvelle(Math.max(1, Math.min(NIVEAUX.length, num))))
    setVoirBonus(false)
    setMessage(null)
  }

  const trouver = (p: Partie, m: string): Partie => {
    const trouves = [...p.trouves, m]
    if (nv.mots.every(x => trouves.includes(x))) {
      // Niveau réussi : on le note et on gagne un indice (la première fois).
      setGain(!progres.fait.includes(p.num))
      // Parfait : aucune lettre dévoilée par un indice.
      const sansIndice = Object.keys(p.reveles).length === 0
      setProgres(g => ({
        ...g,
        fait: g.fait.includes(p.num) ? g.fait : [...g.fait, p.num],
        parfaits: sansIndice && !g.parfaits.includes(p.num) ? [...g.parfaits, p.num] : g.parfaits,
        indices: g.indices + (g.fait.includes(p.num) ? 0 : 1),
      }))
      window.setTimeout(() => {
        if (sound) playSound('win')
        if (vibe && canVibrate()) vibrate('win')
      }, 250)
    }
    return { ...p, trouves }
  }

  const valider = (m: string) => {
    setSel([])
    setModeTape(false)
    if (!m) return
    if (m.length < 3) return dire('Au moins 3 lettres', 'info')
    if (nv.mots.includes(m)) {
      if (partie.trouves.includes(m)) {
        secouer()
        return dire('Déjà trouvé', 'info')
      }
      setPartie(p => trouver(p, m))
      setNouveau(m)
      setMessage(null)
      if (sound) playSound('match')
      if (vibe && canVibrate()) vibrate('success')
      return
    }
    if (!lexique) {
      secouer()
      return dire(erreurLexique ? 'Pas dans la liste (dictionnaire indisponible)' : 'Pas dans la liste', 'non')
    }
    if (lexique.contient(m)) {
      if (partie.bonus.includes(m)) return dire('Déjà dans tes mots bonus', 'info')
      setPartie(p => ({ ...p, bonus: [...p.bonus, m] }))
      setProgres(g => {
        const bonus = g.bonus + 1
        return { ...g, bonus, indices: g.indices + (bonus % BONUS_PAR_INDICE === 0 ? 1 : 0) }
      })
      const gagne = (progres.bonus + 1) % BONUS_PAR_INDICE === 0
      dire(gagne ? `Mot bonus : ${m} ! +1 indice` : `Mot bonus : ${m} !`, 'bonus')
      if (sound) playSound('flip')
      return
    }
    secouer()
    dire(`« ${m} » n’est pas dans le dictionnaire`, 'non')
    if (sound) playSound('nomatch')
    if (vibe && canVibrate()) vibrate('error')
  }

  const indice = () => {
    if (fini) return
    if (progres.indices <= 0) return dire('Plus d’indice : trouve des mots bonus pour en gagner', 'info')
    const h = prochainIndice(nv, partie.trouves, partie.reveles)
    if (!h) return
    setProgres(g => ({ ...g, indices: g.indices - 1 }))
    setPartie(p => {
      const reveles = { ...p.reveles, [h.mot]: [...(p.reveles[h.mot] ?? []), h.i] }
      const n = { ...p, reveles }
      // Toutes les lettres dévoilées : le mot compte comme trouvé.
      return reveles[h.mot].length === h.mot.length ? trouver(n, h.mot) : n
    })
    if (sound) playSound('reveal')
  }

  const melanger = () => {
    setOrdre(o => {
      let n = o
      for (let essai = 0; essai < 6 && n.join() === o.join(); essai++) n = [...o].sort(() => Math.random() - 0.5)
      return n
    })
    setSel([])
    setModeTape(false)
    if (sound) playSound('slide')
  }

  // ----- La roue -----
  const N = nv.lettres.length
  const R = N <= 4 ? 30 : N <= 5 ? 33 : 35 // rayon du cercle des lettres (la roue fait 100 × 100)
  const rLettre = N <= 5 ? 12 : N === 6 ? 11 : 10
  const pos = (place: number) => {
    const a = -Math.PI / 2 + (place / N) * Math.PI * 2
    return { x: 50 + Math.cos(a) * R, y: 50 + Math.sin(a) * R }
  }
  const placeDe = (i: number) => ordre.indexOf(i)
  const versRoue = (ev: PointerEvent) => {
    const r = roueRef.current!.getBoundingClientRect()
    return { x: ((ev.clientX - r.left) / r.width) * 100, y: ((ev.clientY - r.top) / r.height) * 100 }
  }
  const lettreSous = (p: { x: number; y: number }) => {
    for (let i = 0; i < N; i++) {
      const c = pos(placeDe(i))
      if (Math.hypot(p.x - c.x, p.y - c.y) < rLettre + 2) return i
    }
    return null
  }
  const ajouter = (i: number) => {
    setSel(s => [...s, i])
    if (sound) playSound('select')
    if (vibe && canVibrate()) vibrate('tap')
  }
  const onPointerDown = (ev: PointerEvent<SVGSVGElement>) => {
    if (fini) return
    const p = versRoue(ev)
    const i = lettreSous(p)
    if (i === null) return
    ev.currentTarget.setPointerCapture(ev.pointerId)
    if (modeTape && sel.length) {
      // Lettres touchées une à une : retoucher la dernière l'enlève.
      if (sel[sel.length - 1] === i) setSel(s => s.slice(0, -1))
      else if (!sel.includes(i)) ajouter(i)
      return
    }
    setSel([i])
    if (sound) playSound('select')
    setModeTape(false)
    glisse.current = { bouge: false }
    setDoigt(p)
  }
  const onPointerMove = (ev: PointerEvent<SVGSVGElement>) => {
    if (!glisse.current) return
    const p = versRoue(ev)
    setDoigt(p)
    const i = lettreSous(p)
    if (i === null) return
    setSel(s => {
      if (s.includes(i)) {
        // Revenir sur l'avant-dernière lettre efface la dernière.
        if (s.length >= 2 && s[s.length - 2] === i) return s.slice(0, -1)
        return s
      }
      glisse.current!.bouge = true
      if (sound) playSound('select')
      if (vibe && canVibrate()) vibrate('tap')
      return [...s, i]
    })
  }
  const onPointerUp = () => {
    const g = glisse.current
    glisse.current = null
    setDoigt(null)
    if (!g) return
    if (g.bouge && sel.length >= 2) valider(mot)
    else setModeTape(true) // simple toucher : on continue lettre par lettre
  }
  const onKeyDown = (ev: KeyboardEvent) => {
    if (fini) return
    const k = ev.key.length === 1 ? ev.key.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase() : ev.key
    if (/^[A-Z]$/.test(k)) {
      const i = ordre.find(j => nv.lettres[j] === k && !sel.includes(j))
      if (i !== undefined) {
        ev.preventDefault()
        setModeTape(true)
        ajouter(i)
      }
    } else if (k === 'Backspace') {
      ev.preventDefault()
      setSel(s => s.slice(0, -1))
    } else if (k === 'Enter') {
      ev.preventDefault()
      valider(mot)
    } else if (k === 'Escape') {
      setSel([])
      setModeTape(false)
    } else if (k === ' ') {
      ev.preventDefault()
      melanger()
    }
  }

  // Taille des cases selon le nombre total de lettres à placer.
  const totalLettres = nv.mots.reduce((a, m) => a + m.length, 0)
  const taille = totalLettres <= 24 ? 34 : totalLettres <= 40 ? 30 : totalLettres <= 60 ? 26 : 23
  const nbIndice = progres.indices
  const enCours = sel.length > 0

  return (
    <section className="ms mots" aria-label="Mots mélangés">
      <Guide
        etapes={[
          { title: 'Relie les lettres', text: 'Fais glisser ton doigt (ou la souris) d’une lettre à l’autre pour écrire un mot, puis lâche. Tu peux aussi toucher les lettres une par une et valider avec ✓.' },
          { title: 'Trouve tous les mots', text: 'Les cases montrent les mots à trouver et leur longueur. Le niveau est réussi quand toutes les cases sont remplies.' },
          { title: 'Mots bonus', text: 'Un vrai mot qui n’est pas dans la grille compte comme mot bonus. Tous les 3 mots bonus, tu gagnes un indice.' },
          { title: 'Indices et mélange', text: 'Un indice dévoile une lettre. « Mélanger » change la place des lettres sur la roue : ça aide à voir de nouveaux mots.' },
        ]}
        astuces={[
          'Cherche d’abord les petits mots de 3 lettres, puis ajoute une lettre.',
          'Pense aux pluriels et aux verbes conjugués : ils sont souvent dans la grille.',
          'Au clavier : tape les lettres, Entrée pour valider, Retour arrière pour effacer, Espace pour mélanger.',
        ]}
      />

      <ChoixNiveaux courant={partie.num} etat={k => (progres.parfaits.includes(k) ? 'parfait' : progres.fait.includes(k) ? 'fait' : '')} onChoisir={charger} details={LETTRES} parfait="sans indice" />

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="t48-bar">
          <div className="t48-score"><span>Niveau</span><strong>{partie.num}</strong></div>
          <div className="t48-score"><span>Trouvés</span><strong>{partie.trouves.length}<small>/{nv.mots.length}</small></strong></div>
          <button type="button" className="t48-score mm-niveau" onClick={() => setVoirBonus(v => !v)} aria-expanded={voirBonus} title="Voir les mots bonus">
            <span>Bonus</span><strong>{partie.bonus.length}</strong>
          </button>
        </div>

        {voirBonus && (
          <div className="mm-bonus-liste">
            <strong><Sparkles size={14} /> Mots bonus de ce niveau</strong>
            <p>{partie.bonus.length ? partie.bonus.join(' · ') : 'Aucun pour l’instant : essaie des mots qui ne sont pas dans la grille !'}</p>
            <small>{progres.bonus} mots bonus en tout · un indice tous les {BONUS_PAR_INDICE}</small>
          </div>
        )}

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        <div className="mm-jeu">
          <div className="mm-grille" style={{ '--b': `${taille}px` } as CSSProperties} aria-label={`Mots à trouver : ${partie.trouves.length} sur ${nv.mots.length}`}>
            {nv.mots.map(m => {
              const trouve = partie.trouves.includes(m)
              const rev = partie.reveles[m] ?? []
              const forme = nv.formes[m]
              return (
                <div key={m} className={`mm-mot${trouve ? ' is-trouve' : ''}${nouveau === m ? ' is-nouveau' : ''}`} aria-label={trouve ? forme : `${m.length} lettres`}>
                  {m.split('').map((c, i) => (
                    <span key={i} className={!trouve && rev.includes(i) ? 'is-indice' : ''} style={{ '--i': i } as CSSProperties}>
                      {trouve || rev.includes(i) ? forme[i] ?? c : ''}
                    </span>
                  ))}
                </div>
              )
            })}
          </div>

          <div className="mm-saisie" aria-live="polite">
            {message && !enCours
              ? <span key={message.id} className={`mm-message is-${message.ton}`}>{message.texte}</span>
              : <span className={`mm-courant${enCours ? ' is-actif' : ''}`}>{mot || ' '}</span>}
          </div>

          <div ref={zoneRef} className="mm-roue-zone">
            <svg
              ref={roueRef}
              className="mm-roue"
              viewBox="0 0 100 100"
              role="application"
              tabIndex={0}
              aria-label={`Roue de lettres : ${ordre.map(i => nv.lettres[i]).join(', ')}. Tape les lettres au clavier, Entrée pour valider.`}
              onKeyDown={onKeyDown}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => { glisse.current = null; setDoigt(null); setSel([]) }}
            >
              <circle cx="50" cy="50" r={R + rLettre + 3} className="mm-fond" />
              {sel.length > 0 && (
                <polyline
                  className="mm-trait"
                  points={[...sel.map(i => pos(placeDe(i))), ...(doigt ? [doigt] : [])].map(p => `${p.x},${p.y}`).join(' ')}
                />
              )}
              {ordre.map((i, place) => {
                const p = pos(place)
                const choisi = sel.includes(i)
                return (
                  <g key={i} className={choisi ? 'mm-lettre is-choisie' : 'mm-lettre'} style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
                    <circle r={rLettre} />
                    <text y={rLettre * 0.36} fontSize={rLettre * 1.05}>{nv.lettres[i]}</text>
                  </g>
                )
              })}
            </svg>
            {modeTape && enCours && (
              <div className="mm-tape">
                <button type="button" className="mm-tape-ok" onClick={() => valider(mot)} aria-label="Valider le mot"><Check size={20} /></button>
                <button type="button" className="mm-tape-non" onClick={() => { setSel([]); setModeTape(false) }} aria-label="Effacer"><X size={16} /></button>
              </div>
            )}
            {fini && (
              <div className="mm-fin">
                <strong>Bravo !</strong>
                <span>{nv.mots.length} mots trouvés{partie.bonus.length ? `, ${partie.bonus.length} bonus` : ''}{gain ? '. +1 indice' : ''}</span>
                {partie.num < NIVEAUX.length
                  ? <button type="button" className="button button-primary" onClick={() => charger(partie.num + 1)}>Niveau suivant <ChevronRight size={16} /></button>
                  : <span>Tu as fini les {NIVEAUX.length} niveaux !</span>}
              </div>
            )}
          </div>

        </div>

        <div className="sd-actions">
          <button type="button" className="sd-action" onClick={melanger} disabled={fini}><Shuffle size={16} /> Mélanger</button>
          <button type="button" className="sd-action" onClick={indice} disabled={fini}><Lightbulb size={16} /> Indice <b className="mm-pastille">{nbIndice}</b></button>
        </div>

        <div className="ms-message">
          <span className="ms-hint">
            {erreurLexique ? 'Dictionnaire indisponible : seuls les mots de la grille sont reconnus.' : !lexique ? 'Chargement du dictionnaire…' : (
              <>
                <span className="ms-hint-mouse">Glisse d’une lettre à l’autre, ou tape les lettres au clavier</span>
                <span className="ms-hint-touch">Glisse d’une lettre à l’autre, puis lâche</span>
              </>
            )}
          </span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Ta progression sur cet appareil</span>
        <ul>
          <li><span>Niveaux réussis</span><strong>{progres.fait.length} / {NIVEAUX.length}</strong></li>
          <li><span>Sans indice</span><strong>{progres.parfaits.length} / {NIVEAUX.length}</strong></li>
          <li><span>Mots bonus</span><strong>{progres.bonus}</strong></li>
          <li><span>Indices</span><strong>{progres.indices}</strong></li>
        </ul>
        <ProgressionPaliers etat={k => (progres.parfaits.includes(k) ? 'parfait' : progres.fait.includes(k) ? 'fait' : '')} />
      </div>
    </section>
  )
}
