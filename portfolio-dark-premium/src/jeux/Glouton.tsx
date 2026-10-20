import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { Heart, Pause, Play, RotateCcw, Trophy } from 'lucide-react'
import { canVibrate, playSound, vibrate } from './feedback'
import Guide from './commun/Guide'
import Outils from './commun/Outils'
import { useRecords, useSonVibrations } from './commun/reglages'
import { useFullscreen } from './commun/useFullscreen'
import { DELTA, H, niveauSuivant, nouvellePartie, pas, PLAN, reprendre, W } from './glouton-logic'
import type { Dir, Etat, Monstre } from './glouton-logic'
import './glouton.css'

const KEYS: Record<string, Dir> = { ArrowUp: 'haut', ArrowDown: 'bas', ArrowLeft: 'gauche', ArrowRight: 'droite', z: 'haut', w: 'haut', s: 'bas', q: 'gauche', a: 'gauche', d: 'droite' }
const COULEUR: Record<Monstre['nom'], string> = { Rouge: '#ff4d6d', Rose: '#ff7ad9', Bleu: '#4dd8ff', Ambre: '#ffb547' }

// Le labyrinthe (murs, porte) est dessiné une fois par taille d'écran.
function dessinerMurs(c: number, dpr: number): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = Math.round(W * c * dpr)
  cv.height = Math.round(H * c * dpr)
  const ctx = cv.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#070a12'
  ctx.fillRect(0, 0, W * c, H * c)
  // Les cases vides qu'on ne peut pas atteindre (les coins à côté des tunnels) sont dessinées comme des murs.
  const atteint = new Set<number>()
  const pile: number[] = []
  PLAN.forEach((l, y) => l.split('').forEach((ch, x) => { if (ch === 'P') { atteint.add(y * W + x); pile.push(y * W + x) } }))
  while (pile.length) {
    const i = pile.pop()!
    const x = i % W
    const y = (i - x) / W
    for (const [a, b] of [[(x + 1) % W, y], [(x + W - 1) % W, y], [x, y + 1], [x, y - 1]]) {
      if (b < 0 || b >= H || PLAN[b][a] === '#' || atteint.has(b * W + a)) continue
      atteint.add(b * W + a)
      pile.push(b * W + a)
    }
  }
  const mur = (x: number, y: number) => y >= 0 && y < H && x >= 0 && x < W && (PLAN[y][x] === '#' || !atteint.has(y * W + x))
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!mur(x, y)) continue
    ctx.fillStyle = '#0f2a2a'
    ctx.fillRect(x * c, y * c, c, c)
  }
  ctx.strokeStyle = '#2de0c4'
  ctx.lineWidth = Math.max(1.5, c * 0.09)
  ctx.shadowColor = '#2de0c4'
  ctx.shadowBlur = c * 0.35
  ctx.beginPath()
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!mur(x, y)) continue
    const libre = (a: number, b: number) => b >= 0 && b < H && a >= 0 && a < W && !mur(a, b)
    if (libre(x, y - 1)) { ctx.moveTo(x * c, y * c); ctx.lineTo(x * c + c, y * c) }
    if (libre(x, y + 1)) { ctx.moveTo(x * c, y * c + c); ctx.lineTo(x * c + c, y * c + c) }
    if (libre(x - 1, y)) { ctx.moveTo(x * c, y * c); ctx.lineTo(x * c, y * c + c) }
    if (libre(x + 1, y)) { ctx.moveTo(x * c + c, y * c); ctx.lineTo(x * c + c, y * c + c) }
  }
  ctx.stroke()
  ctx.shadowBlur = 0
  // Porte de la maison des monstres
  PLAN.forEach((l, y) => l.split('').forEach((ch, x) => {
    if (ch !== '-') return
    ctx.fillStyle = '#ff7ad9'
    ctx.fillRect(x * c, y * c + c * 0.42, c, c * 0.16)
  }))
  return cv
}

function dessinerGlouton(ctx: CanvasRenderingContext2D, x: number, y: number, c: number, dir: Dir, t: number, mort: number) {
  const cx = (x + 0.5) * c
  const cy = (y + 0.5) * c
  const r = c * 0.44 * (1 - mort)
  if (r <= 0) return
  ctx.save()
  ctx.translate(cx, cy)
  if (mort) ctx.rotate(mort * 8)
  ctx.shadowColor = '#b6f24a'
  ctx.shadowBlur = c * 0.4
  ctx.fillStyle = '#a6e22e'
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  const [dx, dy] = DELTA[dir]
  // Yeux qui regardent dans le sens de la marche.
  for (const k of [-1, 1]) {
    const ox = k * r * 0.3 + dx * r * 0.15
    const oy = -r * 0.3 + dy * r * 0.15
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(ox, oy, r * 0.22, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#10200a'
    ctx.beginPath()
    ctx.arc(ox + dx * r * 0.09, oy + dy * r * 0.09, r * 0.1, 0, Math.PI * 2)
    ctx.fill()
  }
  // Bouche ronde qui s'ouvre et se ferme (elle croque).
  const o = (Math.sin(t * 22) + 1) / 2
  ctx.fillStyle = '#2b4a0e'
  ctx.beginPath()
  ctx.ellipse(dx * r * 0.25, r * 0.35 + dy * r * 0.1, r * 0.3, r * (0.06 + o * 0.2), 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function dessinerMonstre(ctx: CanvasRenderingContext2D, m: Monstre, c: number, t: number, peur: number) {
  const cx = (m.x + 0.5) * c
  const cy = (m.y + 0.5) * c
  const r = c * 0.42
  const [dx, dy] = DELTA[m.dir]
  if (m.humeur !== 'yeux') {
    const effraye = m.humeur === 'peur'
    const clignote = effraye && peur < 1.8 && Math.floor(t * 6) % 2 === 0
    const coul = effraye ? (clignote ? '#e8edf5' : '#3a4dff') : COULEUR[m.nom]
    ctx.fillStyle = coul
    ctx.shadowColor = coul
    ctx.shadowBlur = c * 0.3
    // Corps rond avec deux antennes et deux petits pieds (dessin original).
    ctx.beginPath()
    ctx.roundRect(cx - r, cy - r * 0.8, r * 2, r * 1.6, [r, r, r * 0.45, r * 0.45])
    ctx.fill()
    ctx.shadowBlur = 0
    const pied = Math.sin(t * 14) * r * 0.08
    ctx.fillRect(cx - r * 0.75, cy + r * 0.7, r * 0.5, r * 0.3 + pied)
    ctx.fillRect(cx + r * 0.25, cy + r * 0.7, r * 0.5, r * 0.3 - pied)
    ctx.strokeStyle = coul
    ctx.lineWidth = Math.max(1, c * 0.06)
    for (const k of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx + k * r * 0.4, cy - r * 0.75)
      ctx.lineTo(cx + k * r * 0.65, cy - r * 1.15)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx + k * r * 0.67, cy - r * 1.18, r * 0.13, 0, Math.PI * 2)
      ctx.fill()
    }
    if (effraye) {
      // Effrayé : petits yeux et bouche en zigzag.
      ctx.fillStyle = clignote ? '#ff4d6d' : '#e8edf5'
      ctx.fillRect(cx - r * 0.4, cy - r * 0.25, r * 0.2, r * 0.2)
      ctx.fillRect(cx + r * 0.2, cy - r * 0.25, r * 0.2, r * 0.2)
      ctx.strokeStyle = ctx.fillStyle
      ctx.beginPath()
      for (let k = 0; k <= 4; k++) ctx.lineTo(cx - r * 0.5 + k * r * 0.25, cy + r * 0.3 + (k % 2 ? -r * 0.12 : 0))
      ctx.stroke()
      return
    }
  }
  // Yeux (seuls, quand le monstre a été mangé et rentre chez lui).
  for (const k of [-1, 1]) {
    const ex = cx + k * r * 0.38
    const ey = cy - r * 0.15
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.26, r * 0.32, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1a2a6a'
    ctx.beginPath()
    ctx.arc(ex + dx * r * 0.12, ey + dy * r * 0.14, r * 0.13, 0, Math.PI * 2)
    ctx.fill()
  }
}

export default function Glouton() {
  const [etat, setEtat] = useState<Etat>(() => nouvellePartie())
  const [enPause, setEnPause] = useState(false)
  const [record, setRecord] = useState(false)
  const { sound, vibe, toggleSound, toggleVibe } = useSonVibrations()
  const records = useRecords('ez-glouton', 'higher')
  const panelRef = useRef<HTMLDivElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const plein = useFullscreen(panelRef)
  const e = useRef(etat)
  const c = useRef(16)
  const murs = useRef<HTMLCanvasElement | null>(null)
  const pauseRef = useRef(false)
  pauseRef.current = enPause
  const reglages = useRef({ sound, vibe })
  reglages.current = { sound, vibe }
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const mortT = useRef(0)
  const croque = useRef(0)
  const soumettre = useRef(records.submit)
  soumettre.current = records.submit
  const etatRef = useRef(etat)
  etatRef.current = etat

  // Taille du canvas : le labyrinthe remplit la largeur.
  useEffect(() => {
    const zone = zoneRef.current
    const cv = canvasRef.current
    if (!zone || !cv) return
    const ro = new ResizeObserver(() => {
      const t = Math.max(8, Math.floor(zone.clientWidth / W))
      const dpr = window.devicePixelRatio || 1
      c.current = t
      cv.width = Math.round(W * t * dpr)
      cv.height = Math.round(H * t * dpr)
      cv.style.width = `${W * t}px`
      cv.style.height = `${H * t}px`
      murs.current = dessinerMurs(t, dpr)
    })
    ro.observe(zone)
    return () => ro.disconnect()
  }, [])

  const demarrer = useCallback(() => {
    const n = { ...nouvellePartie(), statut: 'joue' as const }
    e.current = n
    setEtat(n)
    setRecord(false)
    setEnPause(false)
    zoneRef.current?.focus({ preventScroll: true })
  }, [])

  // Boucle de jeu et d'affichage.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let affiche = 0
    const frame = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000)
      last = now
      let s = e.current
      const { sound: son, vibe: vib } = reglages.current
      if (!pauseRef.current) {
        if (s.statut === 'joue') {
          // Petits pas pour ne jamais sauter par-dessus un monstre.
          for (let k = 0; k < 2; k++) {
            const r = pas(s, dt / 2)
            s = r.e
            if (r.ev.graine && son && (croque.current++ % 2 === 0)) playSound('eat')
            if (r.ev.superGraine && son) playSound('match')
            if (r.ev.fruit && son) playSound('win')
            if (r.ev.monstreMange) {
              if (son) playSound('line', 2)
              if (vib && canVibrate()) vibrate('success')
            }
            if (r.ev.mort) {
              mortT.current = now
              if (son) playSound(s.statut === 'fini' ? 'gameover' : 'boom')
              if (vib && canVibrate()) vibrate('boom')
              if (s.statut === 'fini') setRecord(soumettre.current('score', s.score) && s.score > 0)
              break
            }
            if (r.ev.niveauFini) {
              if (son) playSound('win')
              if (vib && canVibrate()) vibrate('win')
              break
            }
          }
        } else if (s.statut === 'mort' || s.statut === 'niveau') {
          s = { ...s, pause: s.pause - dt }
          if (s.pause <= 0) s = s.statut === 'mort' ? reprendre(s) : niveauSuivant(s)
        }
      }
      e.current = s
      // Le score et les vies dans l'interface : quelques fois par seconde suffisent.
      if (now - affiche > 120 || s.statut !== etatRef.current.statut) {
        affiche = now
        setEtat(s)
      }
      dessiner(now / 1000)
      raf = requestAnimationFrame(frame)
    }
    const dessiner = (t: number) => {
      const cv = canvasRef.current
      const ctx = cv?.getContext('2d')
      if (!cv || !ctx) return
      const k = c.current
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (murs.current) ctx.drawImage(murs.current, 0, 0, W * k, H * k)
      const s = e.current
      ctx.fillStyle = '#f4e9c8'
      for (const i of s.graines) ctx.fillRect((i % W + 0.5) * k - k * 0.08, (Math.floor(i / W) + 0.5) * k - k * 0.08, k * 0.16, k * 0.16)
      const pulse = 0.28 + Math.sin(t * 8) * 0.06
      for (const i of s.super) {
        ctx.fillStyle = '#ffd36b'
        ctx.beginPath()
        ctx.arc((i % W + 0.5) * k, (Math.floor(i / W) + 0.5) * k, k * pulse, 0, Math.PI * 2)
        ctx.fill()
      }
      if (s.fruit) {
        // Bonus : un joyau rose.
        const fx = (s.fruit.x + 0.5) * k
        const fy = (s.fruit.y + 0.5) * k
        ctx.fillStyle = '#ff5fd1'
        ctx.shadowColor = '#ff5fd1'
        ctx.shadowBlur = k * 0.5
        ctx.beginPath()
        ctx.moveTo(fx, fy - k * 0.4)
        ctx.lineTo(fx + k * 0.35, fy - k * 0.1)
        ctx.lineTo(fx, fy + k * 0.4)
        ctx.lineTo(fx - k * 0.35, fy - k * 0.1)
        ctx.closePath()
        ctx.fill()
        ctx.shadowBlur = 0
      }
      for (const m of s.monstres) {
        dessinerMonstre(ctx, m, k, t, s.peur)
        // Dans le tunnel : on le dessine aussi de l'autre côté.
        if (m.x < 0.5) dessinerMonstre(ctx, { ...m, x: m.x + W }, k, t, s.peur)
        if (m.x > W - 1.5) dessinerMonstre(ctx, { ...m, x: m.x - W }, k, t, s.peur)
      }
      const mort = s.statut === 'mort' || s.statut === 'fini' ? Math.min(1, (performance.now() - mortT.current) / 1100) : 0
      dessinerGlouton(ctx, s.joueur.x, s.joueur.y, k, s.joueur.dir, t, mort)
      if (s.joueur.x > W - 1.5) dessinerGlouton(ctx, s.joueur.x - W, s.joueur.y, k, s.joueur.dir, t, mort)
      if (s.joueur.x < 0.5) dessinerGlouton(ctx, s.joueur.x + W, s.joueur.y, k, s.joueur.dir, t, mort)
      if (s.statut === 'niveau' || (s.statut === 'joue' && s.pause > 0 && s.temps === 0)) {
        ctx.fillStyle = '#ffd36b'
        ctx.font = `800 ${k * 1.1}px Manrope, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(s.statut === 'niveau' ? 'Bravo !' : `Niveau ${s.niveau}`, (W / 2) * k, 11.8 * k)
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  useEffect(() => {
    const onVis = () => document.hidden && e.current.statut === 'joue' && setEnPause(true)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const tourner = (d: Dir) => {
    const s = e.current
    if (s.statut === 'pret' || s.statut === 'fini') {
      demarrer()
      e.current = { ...e.current, joueur: { ...e.current.joueur, voulu: d } }
      return
    }
    if (enPause) setEnPause(false)
    e.current = { ...s, joueur: { ...s.joueur, voulu: d } }
  }
  const onKeyDown = (ev: KeyboardEvent) => {
    const d = KEYS[ev.key] ?? KEYS[ev.key.toLowerCase()]
    if (d) {
      ev.preventDefault()
      tourner(d)
    } else if (ev.key === ' ' || ev.key.toLowerCase() === 'p') {
      ev.preventDefault()
      if (e.current.statut === 'fini' || e.current.statut === 'pret') demarrer()
      else setEnPause(!enPause)
    }
  }
  const onPointerDown = (ev: PointerEvent) => {
    swipe.current = { x: ev.clientX, y: ev.clientY }
    zoneRef.current?.focus({ preventScroll: true })
  }
  const glisser = (ev: PointerEvent, fin: boolean) => {
    const s = swipe.current
    if (!s) return
    const dx = ev.clientX - s.x
    const dy = ev.clientY - s.y
    if (fin) swipe.current = null
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return
    tourner(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : dy > 0 ? 'bas' : 'haut')
    if (!fin) swipe.current = { x: ev.clientX, y: ev.clientY }
  }

  const meilleur = Math.max(records.records.score ?? 0, etat.score)
  const enJeu = etat.statut === 'joue' || etat.statut === 'mort' || etat.statut === 'niveau'

  return (
    <section className="ms glouton" aria-label="Glouton">
      <Guide
        etapes={[
          { title: 'Mange toutes les graines', text: 'Dirige le glouton avec les flèches (ou en glissant le doigt). Le niveau est fini quand il n’y a plus une graine.' },
          { title: 'Évite les monstres', text: 'Quatre monstres te poursuivent, chacun à sa manière : le rouge fonce sur toi, le rose te coupe la route, le bleu t’encercle, l’ambre est plus timide.' },
          { title: 'Les super-graines', text: 'Les grosses graines dorées rendent les monstres peureux quelques secondes : mange-les pour 200, 400, 800 puis 1600 points.' },
          { title: 'Tunnels et bonus', text: 'Le passage au milieu à gauche et à droite te fait ressortir de l’autre côté. Un joyau rose apparaît parfois : il rapporte gros.' },
        ]}
        astuces={[
          'Annonce ton virage un peu avant le carrefour : le glouton tourne dès qu’il peut.',
          'Garde les super-graines pour quand les monstres sont tout près.',
          'Espace ou P : pause.',
        ]}
      />

      <div ref={panelRef} className={plein.full ? 'ms-panel is-fullscreen' : 'ms-panel'}>
        <div className="t48-bar">
          <div className="t48-score"><span>Score</span><strong>{etat.score}</strong></div>
          <div className="t48-score"><span>Record</span><strong>{meilleur}</strong></div>
          <div className="t48-score gl-vies"><span>Niveau {etat.niveau}</span><strong aria-label={`${etat.vies} vies`}>{Array.from({ length: Math.max(0, etat.vies) }, (_, k) => <Heart key={k} size={14} />)}</strong></div>
          <button type="button" className="t48-btn" onClick={() => (enJeu ? setEnPause(!enPause) : demarrer())} aria-label={enJeu && !enPause ? 'Pause' : 'Jouer'}>
            {enJeu && !enPause ? <Pause size={16} /> : <Play size={16} />} <span className="t48-btn-texte">{enJeu && !enPause ? 'Pause' : 'Jouer'}</span>
          </button>
        </div>

        <Outils sound={sound} vibe={vibe} onSound={toggleSound} onVibe={toggleVibe} full={plein.full} onFull={plein.toggle} />

        <div
          ref={zoneRef}
          className="gl-zone"
          tabIndex={0}
          role="application"
          aria-label={`Glouton, score ${etat.score}, ${etat.vies} vies. Flèches pour diriger, Espace pour la pause.`}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={ev => glisser(ev, false)}
          onPointerUp={ev => glisser(ev, true)}
          onPointerCancel={() => (swipe.current = null)}
        >
          <canvas ref={canvasRef} aria-hidden="true" />
          {(etat.statut === 'pret' || etat.statut === 'fini' || enPause) && (
            <div className="gl-overlay">
              {etat.statut === 'fini' ? (
                <>
                  <strong>{record ? <><Trophy size={20} /> Nouveau record !</> : 'Partie terminée'}</strong>
                  <span>Score : {etat.score} · niveau {etat.niveau}</span>
                  <button type="button" className="button button-primary" onPointerDown={ev => ev.stopPropagation()} onClick={demarrer}><RotateCcw size={15} /> Rejouer</button>
                </>
              ) : enPause ? (
                <><strong>Pause</strong><span>Une flèche ou Espace pour reprendre</span></>
              ) : (
                <><strong>Prêt ?</strong><span>Appuie sur une flèche ou glisse le doigt pour partir</span></>
              )}
            </div>
          )}
        </div>

        <div className="ms-message">
          <span className="ms-hint">
            <span className="ms-hint-mouse">Flèches (ou Z Q S D) pour diriger · Espace : pause</span>
            <span className="ms-hint-touch">Glisse le doigt pour diriger le glouton</span>
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
