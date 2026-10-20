import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { ChevronRight, Lightbulb, RotateCcw, Star } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { loadJSON, saveJSON, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { ChoixNiveaux, ProgressionPaliers } from './commun/Niveaux'
import { coupConseille, DELTA, depart, estMur, glisser, lireNiveau } from './labyrinthe-logic'
import type { Dir, Niveau } from './labyrinthe-logic'
import { NIVEAUX } from './labyrinthe-niveaux'
import './labyrinthe.css'

const PROGRES_KEY = 'ez-labyrinthe-500' // { "12": 7 } : le moins de coups pour chaque niveau réussi
const NIVEAU_KEY = 'ez-labyrinthe-500-niveau'
const KEYS: Record<string, Dir> = { ArrowUp: 'haut', ArrowDown: 'bas', ArrowLeft: 'gauche', ArrowRight: 'droite', z: 'haut', w: 'haut', s: 'bas', q: 'gauche', a: 'gauche', d: 'droite' }
const VITESSE = 26 // cases par seconde
type Progres = Record<string, number>

interface Etat {
  x: number
  y: number
  coups: number
  statut: 'joue' | 'mort' | 'gagne'
}
const nouvelEtat = (n: Niveau): Etat => ({ ...depart(n), coups: 0, statut: 'joue' })

// Dessin du niveau : murs néon, pics, sortie, héros (avec sa traînée pendant une glissade).
function dessiner(ctx: CanvasRenderingContext2D, n: Niveau, c: number, e: Etat, anim: { x: number; y: number; dir: Dir | null; trainee: { x: number; y: number }[] } | null, t: number, indice: Dir | null, mortT: number) {
  const W = n.w * c
  const H = n.h * c
  ctx.fillStyle = '#0b0614'
  ctx.fillRect(0, 0, W, H)
  const mur = (x: number, y: number) => estMur(n, x, y)
  // Murs : remplis, et bord néon du côté du sol.
  for (let y = 0; y < n.h; y++) {
    for (let x = 0; x < n.w; x++) {
      if (!mur(x, y)) continue
      const voisin = !mur(x - 1, y) || !mur(x + 1, y) || !mur(x, y - 1) || !mur(x, y + 1) || !mur(x - 1, y - 1) || !mur(x + 1, y - 1) || !mur(x - 1, y + 1) || !mur(x + 1, y + 1)
      if (!voisin) continue
      ctx.fillStyle = '#26104a'
      ctx.fillRect(x * c, y * c, c, c)
      ctx.fillStyle = '#3a1a6a'
      if ((x + y) % 2 === 0) ctx.fillRect(x * c + c * 0.2, y * c + c * 0.2, c * 0.18, c * 0.18)
    }
  }
  ctx.strokeStyle = '#c45cff'
  ctx.lineWidth = Math.max(2, c * 0.1)
  ctx.lineCap = 'square'
  ctx.shadowColor = '#b44cff'
  ctx.shadowBlur = c * 0.4
  ctx.beginPath()
  for (let y = 0; y < n.h; y++) {
    for (let x = 0; x < n.w; x++) {
      if (!mur(x, y)) continue
      if (!mur(x, y - 1) && y > 0) { ctx.moveTo(x * c, y * c); ctx.lineTo(x * c + c, y * c) }
      if (!mur(x, y + 1) && y < n.h - 1) { ctx.moveTo(x * c, y * c + c); ctx.lineTo(x * c + c, y * c + c) }
      if (!mur(x - 1, y) && x > 0) { ctx.moveTo(x * c, y * c); ctx.lineTo(x * c, y * c + c) }
      if (!mur(x + 1, y) && x < n.w - 1) { ctx.moveTo(x * c + c, y * c); ctx.lineTo(x * c + c, y * c + c) }
    }
  }
  ctx.stroke()
  ctx.shadowBlur = 0

  for (let i = 0; i < n.cases.length; i++) {
    const ch = n.cases[i]
    const x = (i % n.w) * c
    const y = Math.floor(i / n.w) * c
    if (ch === '^') {
      ctx.fillStyle = '#ff4d6d'
      ctx.shadowColor = '#ff4d6d'
      ctx.shadowBlur = c * 0.3
      for (let k = 0; k < 3; k++) {
        const bx = x + c * (0.12 + k * 0.27)
        ctx.beginPath()
        ctx.moveTo(bx, y + c * 0.82)
        ctx.lineTo(bx + c * 0.13, y + c * 0.2)
        ctx.lineTo(bx + c * 0.26, y + c * 0.82)
        ctx.fill()
      }
      ctx.shadowBlur = 0
    } else if (ch === 'E') {
      // Sortie : un portail qui pulse.
      const p = (Math.sin(t * 4) + 1) / 2
      ctx.shadowColor = '#4dffb8'
      ctx.shadowBlur = c * (0.4 + p * 0.5)
      ctx.strokeStyle = '#4dffb8'
      ctx.lineWidth = Math.max(2, c * 0.1)
      ctx.strokeRect(x + c * 0.14, y + c * 0.14, c * 0.72, c * 0.72)
      ctx.fillStyle = `rgba(77, 255, 184, ${0.25 + p * 0.25})`
      ctx.fillRect(x + c * 0.3, y + c * 0.3, c * 0.4, c * 0.4)
      ctx.shadowBlur = 0
    }
  }

  // Indice : une flèche depuis le héros.
  if (indice && !anim && e.statut === 'joue') {
    const [dx, dy] = DELTA[indice]
    const cx = e.x * c + c / 2 + dx * c * 0.9
    const cy = e.y * c + c / 2 + dy * c * 0.9
    ctx.fillStyle = `rgba(255, 216, 77, ${0.55 + 0.45 * Math.abs(Math.sin(t * 5))})`
    ctx.beginPath()
    ctx.moveTo(cx + dx * c * 0.3, cy + dy * c * 0.3)
    ctx.lineTo(cx - dx * c * 0.15 + dy * c * 0.25, cy - dy * c * 0.15 + dx * c * 0.25)
    ctx.lineTo(cx - dx * c * 0.15 - dy * c * 0.25, cy - dy * c * 0.15 - dx * c * 0.25)
    ctx.fill()
  }

  // Héros : un petit cube original (bleu-vert, deux yeux), écrasé dans le sens de la glissade.
  const hx = anim ? anim.x : e.x
  const hy = anim ? anim.y : e.y
  if (anim) {
    anim.trainee.forEach((p, k) => {
      ctx.fillStyle = `rgba(77, 255, 210, ${(0.35 * (k + 1)) / anim.trainee.length})`
      const s = c * (0.3 + (0.35 * (k + 1)) / anim.trainee.length)
      ctx.fillRect(p.x * c + c / 2 - s / 2, p.y * c + c / 2 - s / 2, s, s)
    })
  }
  if (e.statut === 'gagne' && !anim) return
  const mort = e.statut === 'mort'
  let sx = 0.74
  let sy = 0.74
  if (anim?.dir) {
    if (anim.dir === 'gauche' || anim.dir === 'droite') { sx = 0.86; sy = 0.6 } else { sx = 0.6; sy = 0.86 }
  }
  const k = mort ? Math.max(0, 1 - mortT * 1.6) : 1
  const px = hx * c + c / 2
  const py = hy * c + c / 2
  ctx.shadowColor = mort ? '#ff4d6d' : '#4dffd2'
  ctx.shadowBlur = c * 0.5
  ctx.fillStyle = mort ? '#ff4d6d' : '#4dffd2'
  ctx.fillRect(px - (c * sx * k) / 2, py - (c * sy * k) / 2, c * sx * k, c * sy * k)
  ctx.shadowBlur = 0
  if (!mort) {
    const [dx, dy] = anim?.dir ? DELTA[anim.dir] : [0, 0]
    ctx.fillStyle = '#0b0614'
    const o = c * 0.08
    ctx.fillRect(px - c * 0.17 + dx * o, py - c * 0.1 + dy * o, c * 0.1, c * 0.14)
    ctx.fillRect(px + c * 0.07 + dx * o, py - c * 0.1 + dy * o, c * 0.1, c * 0.14)
  } else {
    // Éclats quand le héros touche un pic.
    for (let j = 0; j < 8; j++) {
      const a = (j / 8) * Math.PI * 2
      const r = c * 0.2 + mortT * c * 1.4
      ctx.fillStyle = `rgba(255, 77, 109, ${Math.max(0, 1 - mortT * 1.4)})`
      ctx.fillRect(px + Math.cos(a) * r - c * 0.06, py + Math.sin(a) * r - c * 0.06, c * 0.12, c * 0.12)
    }
  }
}

export default function Labyrinthe() {
  const [progres, setProgres] = useState<Progres>(() => loadJSON<Progres>(PROGRES_KEY, {}))
  const [num, setNum] = useState(() => {
    const s = loadJSON<number>(NIVEAU_KEY, 0)
    return s >= 1 && s <= NIVEAUX.length ? s : 1
  })
  const n = useMemo(() => lireNiveau(NIVEAUX[num - 1]), [num])
  const [etat, setEtat] = useState<Etat>(() => nouvelEtat(lireNiveau(NIVEAUX[num - 1])))
  const [indice, setIndice] = useState<Dir | null>(null)
  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const panelRef = useRef<HTMLDivElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const plein = useFullscreen(panelRef)
  const taille = useRef(20)
  const etatRef = useRef(etat)
  etatRef.current = etat
  const anim = useRef<{ x: number; y: number; dir: Dir; de: { x: number; y: number }; vers: { x: number; y: number }; t0: number; duree: number; chemin: number[]; issue: string; trainee: { x: number; y: number }[] } | null>(null)
  const file = useRef<Dir | null>(null)
  const mortT0 = useRef(0)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const reglages = useRef({ sound, vibe })
  reglages.current = { sound, vibe }
  const indiceRef = useRef(indice)
  indiceRef.current = indice

  useEffect(() => saveJSON(NIVEAU_KEY, num), [num])

  const charger = useCallback((k: number) => {
    const m = Math.max(1, Math.min(NIVEAUX.length, k))
    setNum(m)
    const nv = lireNiveau(NIVEAUX[m - 1])
    setEtat(nouvelEtat(nv))
    anim.current = null
    file.current = null
    setIndice(null)
    zoneRef.current?.focus({ preventScroll: true })
  }, [])
  const recommencer = () => charger(num)

  // Taille du canvas selon la place disponible.
  useEffect(() => {
    const zone = zoneRef.current
    const cv = canvasRef.current
    if (!zone || !cv) return
    const ro = new ResizeObserver(() => {
      const c = Math.max(8, Math.floor(zone.clientWidth / n.w))
      taille.current = c
      const dpr = window.devicePixelRatio || 1
      cv.width = Math.round(c * n.w * dpr)
      cv.height = Math.round(c * n.h * dpr)
      cv.style.height = `${c * n.h}px`
      cv.style.width = `${c * n.w}px`
    })
    ro.observe(zone)
    return () => ro.disconnect()
  }, [n])

  const terminer = useCallback((e: Etat, issue: string) => {
    const { sound: son, vibe: vib } = reglages.current
    if (issue === 'mort') {
      mortT0.current = performance.now()
      setEtat({ ...e, statut: 'mort' })
      if (son) playSound('boom')
      if (vib && canVibrate()) vibrate('boom')
      // On recommence le niveau tout seul après l'explosion.
      window.setTimeout(() => {
        if (etatRef.current.statut === 'mort') {
          setEtat(nouvelEtat(n))
          anim.current = null
        }
      }, 750)
    } else if (issue === 'sortie') {
      setEtat({ ...e, statut: 'gagne' })
      setProgres(p => {
        const ancien = p[String(num)]
        const nouveau = { ...p, [String(num)]: Math.min(e.coups, ancien ?? Infinity) }
        saveJSON(PROGRES_KEY, nouveau)
        return nouveau
      })
      if (son) playSound('win')
      if (vib && canVibrate()) vibrate('win')
    } else {
      setEtat(e)
      if (vib && canVibrate()) vibrate('tap')
    }
  }, [n, num])

  const bouger = useCallback((dir: Dir) => {
    const e = etatRef.current
    if (e.statut !== 'joue') return
    if (anim.current) {
      file.current = dir // gardé pour la fin de la glissade
      return
    }
    const g = glisser(n, e.x, e.y, dir)
    if (!g.chemin.length) return
    setIndice(null)
    const duree = Math.max(70, (g.chemin.length / VITESSE) * 1000)
    anim.current = { x: e.x, y: e.y, dir, de: { x: e.x, y: e.y }, vers: { x: g.x, y: g.y }, t0: performance.now(), duree, chemin: g.chemin, issue: g.issue, trainee: [] }
    if (reglages.current.sound) playSound('slide')
  }, [n])

  // Boucle d'animation et d'affichage.
  useEffect(() => {
    let raf = 0
    const frame = (now: number) => {
      const a = anim.current
      const e = etatRef.current
      if (a) {
        const p = Math.min(1, (now - a.t0) / a.duree)
        a.x = a.de.x + (a.vers.x - a.de.x) * p
        a.y = a.de.y + (a.vers.y - a.de.y) * p
        a.trainee.push({ x: a.x, y: a.y })
        if (a.trainee.length > 7) a.trainee.shift()
        if (p >= 1) {
          anim.current = null
          const fin = { ...e, x: a.vers.x, y: a.vers.y, coups: e.coups + 1 }
          etatRef.current = fin
          terminer(fin, a.issue)
          const suivant = file.current
          file.current = null
          if (suivant && a.issue === 'arret') window.setTimeout(() => bouger(suivant), 0)
        }
      }
      const cv = canvasRef.current
      const ctx = cv?.getContext('2d')
      if (cv && ctx) {
        const dpr = window.devicePixelRatio || 1
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        const mortT = (now - mortT0.current) / 1000
        dessiner(ctx, n, taille.current, etatRef.current, anim.current, now / 1000, indiceRef.current, mortT)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [n, bouger, terminer])

  const onKeyDown = (ev: KeyboardEvent) => {
    const d = KEYS[ev.key] ?? KEYS[ev.key.toLowerCase()]
    if (d) {
      ev.preventDefault()
      bouger(d)
    } else if (ev.key === 'r' || ev.key === 'R') recommencer()
    else if ((ev.key === 'Enter' || ev.key === ' ') && etat.statut === 'gagne') {
      ev.preventDefault()
      charger(num + 1)
    }
  }
  const onPointerDown = (ev: PointerEvent) => {
    swipe.current = { x: ev.clientX, y: ev.clientY }
    zoneRef.current?.focus({ preventScroll: true })
  }
  const glisserDoigt = (ev: PointerEvent, fin: boolean) => {
    const s = swipe.current
    if (!s) return
    const dx = ev.clientX - s.x
    const dy = ev.clientY - s.y
    if (fin) swipe.current = null
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return
    bouger(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : dy > 0 ? 'bas' : 'haut')
    if (!fin) swipe.current = { x: ev.clientX, y: ev.clientY }
  }
  const demanderIndice = () => {
    if (etat.statut !== 'joue' || anim.current) return
    setIndice(coupConseille(n, etat.x, etat.y))
    if (sound) playSound('select')
  }

  const meilleur = progres[String(num)]
  const gagne = etat.statut === 'gagne'
  const parfait = gagne && etat.coups <= n.min
  const etatNiveau = (k: number) => {
    const v = progres[String(k)]
    if (v === undefined) return ''
    return v <= lireNiveau(NIVEAUX[k - 1]).min ? 'parfait' : 'fait'
  }
  const nbParfaits = Object.keys(progres).filter(k => etatNiveau(Number(k)) === 'parfait').length

  return (
    <section className="ms labyrinthe" aria-label="Labyrinthe">
      <Guide
        etapes={[
          { title: 'Glisse jusqu’au mur', text: 'Glisse le doigt (ou appuie sur une flèche) : le héros fonce tout droit et ne s’arrête qu’en touchant un mur.' },
          { title: 'Trouve la sortie', text: 'Atteins le portail vert. Il faut souvent faire un détour pour s’arrêter au bon endroit.' },
          { title: 'Attention aux pics', text: 'Les pics rouges sont mortels : si le héros glisse dessus, le niveau recommence.' },
          { title: 'Le moins de coups', text: `Un coup = une glissade. Le minimum possible est affiché : sors en le faisant pour un niveau parfait (étoile). ${NIVEAUX.length} niveaux, de débutant à expert.` },
        ]}
        astuces={[
          'Avant de partir, regarde où chaque direction t’emmène : un mur au bon endroit fait tout.',
          'Bloqué ? Le bouton « Indice » montre le bon coup (mais il ne compte pas pour toi).',
          'Au clavier : flèches ou Z Q S D, R pour recommencer.',
        ]}
      />

      <ChoixNiveaux courant={num} etat={etatNiveau} onChoisir={charger} />

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="t48-bar">
          <div className="t48-score"><span>Niveau</span><strong>{num}</strong></div>
          <div className="t48-score" title="Tes coups, et le minimum possible"><span>Coups</span><strong>{etat.coups}<small> / {n.min}</small></strong></div>
          <div className="t48-score" title="Ton meilleur score sur ce niveau"><span>Meilleur</span><strong className="lb-meilleur">{meilleur ?? '—'}{meilleur !== undefined && meilleur <= n.min && <Star size={13} className="lb-etoile" aria-label="parfait" />}</strong></div>
          <button type="button" className="t48-btn" onClick={recommencer} aria-label="Recommencer"><RotateCcw size={16} /> <span className="t48-btn-texte">Recommencer</span></button>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle}>
          <button type="button" className="ms-switch lb-indice" onClick={demanderIndice} disabled={etat.statut !== 'joue'}><Lightbulb size={15} /> Indice</button>
        </Outils>

        <div
          ref={zoneRef}
          className="lb-zone"
          style={{ '--ratio': n.w / n.h } as CSSProperties}
          tabIndex={0}
          role="application"
          aria-label={`Labyrinthe, niveau ${num}. Flèches pour glisser. ${etat.coups} coups, minimum ${n.min}.`}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={ev => glisserDoigt(ev, false)}
          onPointerUp={ev => glisserDoigt(ev, true)}
          onPointerCancel={() => (swipe.current = null)}
        >
          <canvas ref={canvasRef} aria-hidden="true" />
          {gagne && (
            <div className="lb-fin">
              {parfait && <Star size={34} className="lb-grande-etoile" aria-hidden="true" />}
              <strong>{parfait ? 'Parfait !' : `Niveau ${num} réussi !`}</strong>
              <span>{parfait ? `${etat.coups} coups : le minimum possible.` : `${etat.coups} coups. Le minimum est ${n.min} : tu peux faire mieux !`}</span>
              <div>
                <button type="button" className="button" onPointerDown={e => e.stopPropagation()} onClick={recommencer}><RotateCcw size={15} /> Rejouer</button>
                {num < NIVEAUX.length && <button type="button" className="button button-primary" onPointerDown={e => e.stopPropagation()} onClick={() => charger(num + 1)}>Niveau suivant <ChevronRight size={15} /></button>}
              </div>
            </div>
          )}
        </div>

        <div className="ms-message">
          <span className="ms-hint">
            <span className="ms-hint-mouse">Flèches (ou Z Q S D) pour glisser · R pour recommencer</span>
            <span className="ms-hint-touch">Glisse le doigt sur le labyrinthe</span>
          </span>
        </div>
      </div>

      <div className="ms-records">
        <span className="mini-label">Ta progression sur cet appareil</span>
        <ul>
          <li><span>Niveaux réussis</span><strong>{Object.keys(progres).length} / {NIVEAUX.length}</strong></li>
          <li><span>Niveaux parfaits</span><strong>{nbParfaits} / {NIVEAUX.length}</strong></li>
        </ul>
        <ProgressionPaliers etat={etatNiveau} />
      </div>
    </section>
  )
}
