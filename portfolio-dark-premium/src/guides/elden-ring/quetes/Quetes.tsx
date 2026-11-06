import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, Eye, Lightbulb, Map as IconeCarte, MapPin, Navigation } from 'lucide-react'
import { ecrireEtapes, lireEtapes } from '../coches'
import './quetes.css'

// Guides de quêtes (voir scripts/carte-elden-ring/extraire_quetes.py).
interface Point { x: number; y: number; n: string; id: string }
interface Carte { s: 0 | 1; cible: Point; depart?: Point; autres: Point[]; via?: Point[]; chemin?: string }
interface Etape {
  titre?: string; region?: string; niveau?: string; texte?: string; repere?: string; astuce?: string; alerte?: string // guide détaillé
  chapitre?: string; lien?: string; html?: string // étape reprise du guide
  objets?: string[] // objets cités (illustrations)
  carte: Carte | null
}
interface Quete { id: string; nom: string; en?: string; region?: string; fond?: string; detaille?: boolean; resume?: string; recompenses?: (string | null)[]; alertes?: string[]; etapes: Etape[] }

const RACINE = `${import.meta.env.BASE_URL}guides/elden-ring/`
const LIEN = '#guides/elden-ring/quetes-pas-a-pas'
const COUCHES = [{ id: 'surface', w: 9728, h: 9216 }, { id: 'souterrain', w: 6400, h: 6912 }]
const FLAMME = 'M0,-4.6 C2.2,-2.4 3.2,-0.6 3.2,1.2 C3.2,3.2 1.7,4.6 0,4.6 C-1.7,4.6 -3.2,3.2 -3.2,1.2 C-3.2,-0.4 -2.2,-1.6 -1.2,-2.6 C-1,-1.2 -0.4,-0.4 0.4,-0.2 C0.6,-1.8 0.2,-3.2 0,-4.6Z'

let cache: Promise<{ quetes: Quete[] }> | null = null
const charger = () => (cache ??= fetch(`${RACINE}quetes/quetes.json`).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() }))
let cacheObjets: Promise<Map<string, { n: string; i?: number }>> | null = null
const chargerObjets = () => (cacheObjets ??= fetch(`${RACINE}objets/objets.json`).then(r => r.json()).then((d: { objets: { s: string; n: string; i?: number }[] }) => new Map(d.objets.map(o => [o.s, o]))))

// Carte d'une étape : un morceau de la carte du jeu (tuiles), la cible entourée, le site de grâce de départ et une flèche.
function MiniCarte({ carte: c }: { carte: Carte }) {
  const W = 640, H = 300
  const pts = [c.cible, ...(c.depart ? [c.depart] : []), ...(c.via ?? []), ...c.autres]
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const f0 = Math.min((W - 170) / Math.max(1, x1 - x0), (H - 110) / Math.max(1, y1 - y0), 1)
  const z = Math.max(2, Math.min(5, Math.floor(6 + Math.log2(f0)))) // au plus 1 px = 2 m : on garde des repères autour
  const f = 2 ** (z - 6)
  const cx = ((x0 + x1) / 2) * f, cy = ((y0 + y1) / 2) * f
  const vx = cx - W / 2, vy = cy - H / 2
  const couche = COUCHES[c.s]
  const nx = Math.ceil((couche.w * f) / 256), ny = Math.ceil((couche.h * f) / 256)
  const tuiles: [number, number][] = []
  for (let tx = Math.max(0, Math.floor(vx / 256)); tx <= Math.min(nx - 1, Math.floor((vx + W) / 256)); tx++)
    for (let ty = Math.max(0, Math.floor(vy / 256)); ty <= Math.min(ny - 1, Math.floor((vy + H) / 256)); ty++) tuiles.push([tx, ty])
  const P = (p: Point) => [p.x * f, p.y * f] as const
  const [tx, ty] = P(c.cible)
  const etiquette = (x: number, y: number, texte: string, classe: string, dy = -16) => (
    <text x={x} y={y + dy} textAnchor="middle" className={`erq-etiq ${classe}`}>{texte.length > 34 ? `${texte.slice(0, 33)}…` : texte}</text>
  )
  return (
    <a className="erq-carte" href={`#guides/elden-ring/carte/${c.cible.id}`} title="Ouvrir sur la carte interactive">
      <svg viewBox={`${vx} ${vy} ${W} ${H}`} role="img" aria-label={`Carte : ${c.cible.n}`}>
        <defs>
          <marker id="erq-fleche" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 Z" fill="#f3e6c3" />
          </marker>
        </defs>
        <rect x={vx} y={vy} width={W} height={H} fill="#1a1611" />
        {tuiles.map(([a, b]) => <image key={`${a}-${b}`} href={`${RACINE}carte/${couche.id}/${z}/${a}/${b}.webp`} x={a * 256} y={b * 256} width={256.6} height={256.6} />)}
        {c.depart && (() => {
          const [dx, dy] = P(c.depart)
          const etapes = [[dx, dy], ...(c.via ?? []).map(P), [tx, ty]]
          const [ax, ay] = etapes[etapes.length - 2]
          const L = Math.hypot(tx - ax, ty - ay), k = L > 30 ? (L - 22) / L : 1
          const trace = etapes.slice(0, -1).map(([x, y]) => `${x},${y}`).join(' ') + ` ${ax + (tx - ax) * k},${ay + (ty - ay) * k}`
          const long = Math.hypot(tx - dx, ty - dy) > 40 || (c.via?.length ?? 0) > 0
          return (
            <>
              {long && <polyline points={trace} className={c.via?.length ? 'erq-route' : 'erq-trait'} markerEnd="url(#erq-fleche)" />}
              <g transform={`translate(${dx} ${dy}) scale(1.6)`}><circle r="6.6" fill="#1d1813" stroke="#e8c35a" strokeWidth="1.3" /><path d={FLAMME} fill="#e8c35a" /></g>
              {etiquette(dx, dy, c.depart.n, 'is-grace', dy < ty ? -16 : 28)}
            </>
          )
        })()}
        {c.autres.map(a => { const [ax, ay] = P(a); return <g key={a.id}><circle cx={ax} cy={ay} r="6" className="erq-autre" />{etiquette(ax, ay, a.n, 'is-autre', -11)}</g> })}
        <circle cx={tx} cy={ty} r="16" className="erq-halo" />
        <circle cx={tx} cy={ty} r="7.5" className="erq-cible" />
        {(() => {
          // L'étiquette de la cible passe dessous si le site de grâce est juste au-dessus d'elle.
          const d = c.depart ? P(c.depart) : null
          const dessous = d && d[1] < ty && Math.hypot(d[0] - tx, d[1] - ty) < 90
          return etiquette(tx, ty, c.cible.n, 'is-cible', dessous ? 36 : -24)
        })()}
      </svg>
      <span className="erq-ouvrir"><IconeCarte size={13} /> Carte interactive</span>
    </a>
  )
}

function ObjetsEtape({ slugs }: { slugs: string[] }) {
  const [objets, setObjets] = useState<Map<string, { n: string; i?: number }> | null>(null)
  useEffect(() => { chargerObjets().then(setObjets, () => undefined) }, [])
  if (!objets) return null
  return (
    <ul className="erq-objets" aria-label="Objets de l'étape">
      {slugs.map(s => {
        const o = objets.get(s)
        return o ? <li key={s}><a href={`#guides/elden-ring/objets/${s}`}>{o.i !== undefined && <img src={`${RACINE}objets/min/${o.i}.webp`} alt="" width={40} height={40} loading="lazy" />}<span>{o.n}</span></a></li> : null
      })}
    </ul>
  )
}

function Recompenses({ slugs }: { slugs: (string | null)[] }) {
  const [objets, setObjets] = useState<Map<string, { n: string; i?: number }> | null>(null)
  useEffect(() => { chargerObjets().then(setObjets, () => undefined) }, [])
  const liste = slugs.filter((s): s is string => !!s)
  if (!objets || !liste.length) return null
  return (
    <ul className="erq-recompenses">
      {liste.map(s => {
        const o = objets.get(s)
        return o ? <li key={s}><a href={`#guides/elden-ring/objets/${s}`}>{o.i !== undefined && <img src={`${RACINE}objets/min/${o.i}.webp`} alt="" width={44} height={44} />}<span>{o.n}</span></a></li> : null
      })}
    </ul>
  )
}

function VueQuete({ q, faites, basculer }: { q: Quete; faites: Set<string>; basculer: (k: string) => void }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [q.id])
  const nb = q.etapes.filter((_, i) => faites.has(`${q.id}:${i}`)).length
  return (
    <article className="erq">
      <a className="erq-retour" href={LIEN}><ArrowLeft size={15} /> Toutes les quêtes</a>
      <header className={q.fond ? 'erq-tete has-fond' : 'erq-tete'} style={q.fond ? { backgroundImage: `url(${RACINE}img/ambiance/${q.fond}.webp)` } : undefined}>
        <span className="erq-sur">{q.detaille ? 'Guide de quête détaillé' : 'Quête pas à pas'}</span>
        <h1>{q.nom}</h1>
        {q.en && <span className="erq-en">{q.en}</span>}
        {q.resume && <p>{q.resume}</p>}
        <div className="erq-infos">
          {q.region && <span>{q.region}</span>}
          <span>{q.etapes.length} étapes</span>
          <span>{q.etapes.filter(e => e.carte).length} cartes</span>
        </div>
        {q.recompenses && <Recompenses slugs={q.recompenses} />}
      </header>
      {q.alertes && (
        <aside className="erq-alertes">
          <h2><AlertTriangle size={16} /> Points de non-retour</h2>
          <ul>{q.alertes.map(a => <li key={a}>{a}</li>)}</ul>
        </aside>
      )}
      <div className="erq-progres" aria-live="polite">
        <span><Check size={15} /> <b>{nb}</b> / {q.etapes.length} étapes faites</span>
        <i><b style={{ width: `${(nb / q.etapes.length) * 100}%` }} /></i>
      </div>
      <ol className="erq-etapes">
        {q.etapes.map((e, i) => {
          const cle = `${q.id}:${i}`
          const faite = faites.has(cle)
          return (
            <li key={cle} className={faite ? 'is-faite' : undefined}>
              <div className="erq-num">{i + 1}</div>
              <div className="erq-corps">
                <header>
                  {e.titre && <h2>{e.titre}</h2>}
                  <div className="erq-puces">
                    {e.region && <span><MapPin size={12} /> {e.region}</span>}
                    {e.niveau && <span>{e.niveau}</span>}
                    {e.chapitre && e.lien && <a href={`#guides/elden-ring/progression/${e.lien}`}>{e.chapitre}</a>}
                  </div>
                </header>
                {e.texte && <p className="erq-texte" dangerouslySetInnerHTML={{ __html: e.texte }} />}
                {e.html && <div className="er-livre erq-html"><div className="sec s4"><p dangerouslySetInnerHTML={{ __html: e.html }} /></div></div>}
                {e.objets && <ObjetsEtape slugs={e.objets} />}
                {e.alerte && <p className="erq-note is-alerte"><AlertTriangle size={15} /> {e.alerte}</p>}
                {e.carte && (
                  <figure className="erq-figure">
                    <MiniCarte carte={e.carte} />
                    {e.carte.chemin && <figcaption><Navigation size={14} /> {e.carte.chemin}</figcaption>}
                  </figure>
                )}
                {e.repere && <p className="erq-note"><Eye size={15} /> <span><b>À reconnaître :</b> {e.repere}</span></p>}
                {e.astuce && <p className="erq-note"><Lightbulb size={15} /> <span>{e.astuce}</span></p>}
                <button type="button" className={faite ? 'erq-faite is-oui' : 'erq-faite'} onClick={() => basculer(cle)} aria-pressed={faite}>
                  <Check size={14} /> {faite ? 'Étape faite' : 'Marquer comme faite'}
                </button>
              </div>
            </li>
          )
        })}
      </ol>
    </article>
  )
}

export default function Quetes({ chemin }: { chemin: string }) {
  const [quetes, setQuetes] = useState<Quete[] | null>(null)
  const [erreur, setErreur] = useState(false)
  const [faites, setFaites] = useState(lireEtapes)
  useEffect(() => { charger().then(d => setQuetes(d.quetes), () => setErreur(true)) }, [])
  const id = chemin.split('/')[1] ?? ''
  const basculer = (k: string) => setFaites(avant => {
    const s = new Set(avant)
    if (s.has(k)) s.delete(k); else s.add(k)
    ecrireEtapes(s)
    return s
  })
  const quete = useMemo(() => quetes?.find(q => q.id === id), [quetes, id])

  if (erreur) return <p className="erq-etat">Impossible de charger les guides de quêtes.</p>
  if (!quetes) return <p className="erq-etat">Chargement des quêtes…</p>
  if (quete) return <VueQuete q={quete} faites={faites} basculer={basculer} />

  const carteQuete = (q: Quete) => {
    const nb = q.etapes.filter((_, i) => faites.has(`${q.id}:${i}`)).length
    return (
      <li key={q.id} className={q.detaille ? 'is-detaille' : undefined}>
        <a href={`${LIEN}/${q.id}`}>
          {q.fond && <span className="erq-vignette" style={{ backgroundImage: `url(${RACINE}img/ambiance/${q.fond}.webp)` }} aria-hidden="true" />}
          <b>{q.nom}</b>
          <small>{q.region ? `${q.region} · ` : ''}{q.etapes.length} étapes · {q.etapes.filter(e => e.carte).length} cartes</small>
          <i><b style={{ width: `${(nb / q.etapes.length) * 100}%` }} /></i>
        </a>
      </li>
    )
  }

  return (
    <div className="erq">
      <header className="erq-tete has-fond" style={{ backgroundImage: `url(${RACINE}img/ambiance/grace.webp)` }}>
        <span className="erq-sur">Guides de quêtes</span>
        <h1>Toutes les quêtes, pas à pas</h1>
        <p>Chaque étape avec sa carte : où aller, depuis quel site de grâce, dans quelle direction et à quelle distance. Les personnages et les objets sont placés d'après les données du jeu, avec ce qu'il faut reconnaître sur place et les pièges à éviter. Coche les étapes au fur et à mesure.</p>
      </header>
      <h2 className="erq-groupe-titre">Guides détaillés</h2>
      <ul className="erq-liste">{quetes.filter(q => q.detaille).map(carteQuete)}</ul>
      {quetes.some(q => !q.detaille) && (
        <>
          <h2 className="erq-groupe-titre">Autres quêtes (étapes du guide, avec carte)</h2>
          <ul className="erq-liste">{quetes.filter(q => !q.detaille).map(carteQuete)}</ul>
        </>
      )}
    </div>
  )
}
