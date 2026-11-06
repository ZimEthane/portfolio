import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, MapPin, Search, ShoppingBag, Skull, Trophy } from 'lucide-react'
import { ecrireObtenus, lireObtenus } from '../coches'
import './objets.css'

// Une fiche d'objet (voir scripts/carte-elden-ring/extraire_objets.py).
type Valeur = number | string | Record<string, number | string>
interface Source {
  t: 'carte' | 'boutique' | 'recompense' | 'butin'
  id?: string // repère de la carte
  comment?: string
  pres?: string
  z?: string
  sous?: number
  qui?: string
  prix?: number
  echange?: string
  stock?: number
  quoi?: string
  pc?: number
}
export interface Objet {
  s: string // adresse
  t: string // groupe
  n: string
  en: string
  c: string // sous-catégorie
  i?: number // illustration
  d: string // description
  e?: string // effet
  st?: Record<string, Valeur>
  ou?: Source[]
}
interface Donnees { version: string; groupes: { t: string; nom: string }[]; objets: Objet[] }

const BASE = `${import.meta.env.BASE_URL}guides/elden-ring/objets/`
const LIEN = '#guides/elden-ring/objets'
const norme = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const runes = (n: number) => `${n.toLocaleString('fr-FR')} runes`

let cache: Promise<Donnees> | null = null
const charger = () => (cache ??= fetch(`${BASE}objets.json`).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<Donnees> }))

function Illustration({ objet, taille }: { objet: Objet; taille: 'min' | 'img' }) {
  if (objet.i === undefined) return <span className={`ero-illus ero-${taille} is-vide`} />
  return <img className={`ero-illus ero-${taille}`} src={`${BASE}${taille}/${objet.i}.webp`} alt="" loading="lazy" decoding="async" />
}

function Stats({ st }: { st: Record<string, Valeur> }) {
  const simples = Object.entries(st).filter(([, v]) => typeof v !== 'object') as [string, number | string][]
  const tableaux = Object.entries(st).filter(([, v]) => typeof v === 'object') as [string, Record<string, number | string>][]
  return (
    <div className="ero-stats">
      {tableaux.map(([titre, v]) => (
        <section key={titre}>
          <h3>{titre}</h3>
          <dl>{Object.entries(v).map(([k, x]) => <div key={k}><dt>{k}</dt><dd>{typeof x === 'number' ? x.toLocaleString('fr-FR') : x}</dd></div>)}</dl>
        </section>
      ))}
      {simples.length > 0 && (
        <section>
          <h3>Caractéristiques</h3>
          <dl>{simples.map(([k, x]) => <div key={k}><dt>{k}</dt><dd>{typeof x === 'number' ? x.toLocaleString('fr-FR') : x}</dd></div>)}</dl>
        </section>
      )}
    </div>
  )
}

function Ou({ sources }: { sources?: Source[] }) {
  if (!sources?.length) {
    return <p className="ero-vide">Aucun emplacement fixe répertorié : objet de départ d'une classe, récompense de quête ou butin rare. Cherche son nom dans le guide.</p>
  }
  return (
    <ul className="ero-ou">
      {sources.map((s, k) => {
        if (s.t === 'carte') return (
          <li key={k}>
            <MapPin size={16} />
            <span>
              <b>{s.comment}</b>
              {s.z ? <> à l'intérieur de <b>{s.z}</b></> : null}
              {s.pres ? <small>Grâce la plus proche : {s.pres}{s.sous ? ' (souterrain)' : ''}</small> : null}
            </span>
            <a href={`#guides/elden-ring/carte/${s.id}`} className="ero-voir">Voir sur la carte</a>
          </li>
        )
        if (s.t === 'boutique') return (
          <li key={k}>
            <ShoppingBag size={16} />
            <span>
              <b>Vendu par {s.qui}</b>
              <small>
                {s.echange ? `Échange contre : ${s.echange}` : s.prix ? runes(s.prix) : 'Prix variable'}
                {s.stock ? ` · ${s.stock} en stock` : ' · stock illimité'}
              </small>
            </span>
          </li>
        )
        if (s.t === 'butin') return (
          <li key={k}><Skull size={16} /><span><b>Lâché par {s.qui}</b><small>Chance : {s.pc?.toLocaleString('fr-FR')} %</small></span></li>
        )
        return <li key={k}><Trophy size={16} /><span><b>Obtenu : {s.quoi}</b><small>Récompense (boss, quête ou personnage)</small></span></li>
      })}
    </ul>
  )
}

function Fiche({ objet, voisins, obtenu, onObtenu, nomGroupe }: { objet: Objet; voisins: [Objet | undefined, Objet | undefined]; obtenu: boolean; onObtenu: () => void; nomGroupe: string }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [objet.s])
  const [avant, apres] = voisins
  return (
    <article className="ero-fiche">
      <a className="ero-retour" href={`${LIEN}?${objet.t}`}><ArrowLeft size={15} /> {nomGroupe}</a>
      <header className="ero-tete">
        <Illustration objet={objet} taille="img" />
        <div>
          <span className="ero-cat">{nomGroupe}{objet.c ? ` · ${objet.c}` : ''}</span>
          <h1>{objet.n}</h1>
          {objet.en !== objet.n && <span className="ero-en">{objet.en}</span>}
          {objet.e && <p className="ero-effet">{objet.e}</p>}
          <button type="button" className={obtenu ? 'ero-obtenu is-oui' : 'ero-obtenu'} onClick={onObtenu} aria-pressed={obtenu}>
            <Check size={15} /> {obtenu ? 'Obtenu' : 'Marquer comme obtenu'}
          </button>
        </div>
      </header>
      {objet.st && <Stats st={objet.st} />}
      <section className="ero-bloc">
        <h2>Où le trouver</h2>
        <Ou sources={objet.ou} />
      </section>
      {objet.d && (
        <section className="ero-bloc">
          <h2>Description</h2>
          <div className="ero-desc">{objet.d.split('\n').map((l, k) => (l ? <p key={k}>{l}</p> : <br key={k} />))}</div>
        </section>
      )}
      <nav className="ero-voisins" aria-label="Objets voisins">
        {avant ? <a href={`${LIEN}/${avant.s}`}><ArrowLeft size={15} /> {avant.n}</a> : <span />}
        {apres ? <a href={`${LIEN}/${apres.s}`}>{apres.n} <ArrowRight size={15} /></a> : <span />}
      </nav>
    </article>
  )
}

export default function Objets({ chemin }: { chemin: string }) {
  const [d, setD] = useState<Donnees | null>(null)
  const [erreur, setErreur] = useState(false)
  const [obtenus, setObtenus] = useState(lireObtenus)
  const [recherche, setRecherche] = useState('')
  const [groupeChoisi, setGroupe] = useState('')
  const [sous, setSous] = useState('')
  useEffect(() => { charger().then(setD, () => setErreur(true)) }, [])

  const [adresse, requete = ''] = chemin.split('?')
  const slug = adresse.split('/')[1] ?? ''
  const groupe = groupeChoisi || requete || d?.groupes[0]?.t || ''
  useEffect(() => { if (requete) { setGroupe(requete); setSous('') } }, [requete])

  const basculer = (s: string) => setObtenus(avant => {
    const suite = new Set(avant)
    if (suite.has(s)) suite.delete(s); else suite.add(s)
    ecrireObtenus(suite)
    return suite
  })

  const parGroupe = useMemo(() => {
    const m = new Map<string, Objet[]>()
    d?.objets.forEach(o => { const l = m.get(o.t) ?? []; l.push(o); m.set(o.t, l) })
    return m
  }, [d])

  const liste = useMemo(() => {
    if (!d) return []
    const q = norme(recherche.trim())
    if (q.length >= 2) {
      const mots = q.split(/\s+/)
      return d.objets.filter(o => { const t = norme(`${o.n} ${o.en} ${o.c}`); return mots.every(w => t.includes(w)) }).slice(0, 200)
    }
    return (parGroupe.get(groupe) ?? []).filter(o => !sous || o.c === sous)
  }, [d, recherche, groupe, sous, parGroupe])

  const sousCats = useMemo(() => [...new Set((parGroupe.get(groupe) ?? []).map(o => o.c).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')), [parGroupe, groupe])

  if (erreur) return <p className="ero-etat">Impossible de charger l'encyclopédie des objets.</p>
  if (!d) return <p className="ero-etat">Chargement des objets…</p>

  const objet = slug ? d.objets.find(o => o.s === slug) : undefined
  if (slug && objet) {
    const l = parGroupe.get(objet.t) ?? []
    const i = l.indexOf(objet)
    return <Fiche objet={objet} voisins={[l[i - 1], l[i + 1]]} obtenu={obtenus.has(objet.s)} onObtenu={() => basculer(objet.s)} nomGroupe={d.groupes.find(g => g.t === objet.t)?.nom ?? ''} />
  }

  const total = parGroupe.get(groupe)?.length ?? 0
  const faits = (parGroupe.get(groupe) ?? []).filter(o => obtenus.has(o.s)).length
  return (
    <div className="ero">
      <header className="ero-intro">
        <h1>Encyclopédie des objets</h1>
        <p>Les {d.objets.length.toLocaleString('fr-FR')} objets du jeu de base, avec leur illustration, leurs statistiques et où les trouver : emplacement sur la carte, marchand, butin ou récompense. Données extraites du jeu (version {d.version}).</p>
        <div className="ero-recherche">
          <Search size={17} />
          <input type="search" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Chercher un objet (français ou anglais)…" aria-label="Chercher un objet" />
        </div>
      </header>
      {recherche.trim().length < 2 && (
        <>
          <nav className="ero-groupes" aria-label="Catégories">
            {d.groupes.map(g => (
              <button key={g.t} type="button" aria-pressed={g.t === groupe} onClick={() => { setGroupe(g.t); setSous('') }}>
                {g.nom} <small>{parGroupe.get(g.t)?.length ?? 0}</small>
              </button>
            ))}
          </nav>
          {sousCats.length > 1 && (
            <div className="ero-sous" role="group" aria-label="Sous-catégories">
              <button type="button" aria-pressed={!sous} onClick={() => setSous('')}>Tout</button>
              {sousCats.map(c => <button key={c} type="button" aria-pressed={sous === c} onClick={() => setSous(c)}>{c}</button>)}
            </div>
          )}
          <p className="ero-compte"><Check size={14} /> {faits} / {total} obtenus dans cette catégorie</p>
        </>
      )}
      <ul className="ero-grille">
        {liste.map(o => (
          <li key={o.s} className={obtenus.has(o.s) ? 'is-obtenu' : undefined}>
            <a href={`${LIEN}/${o.s}`}>
              <Illustration objet={o} taille="min" />
              <span><b>{o.n}</b><small>{o.c || d.groupes.find(g => g.t === o.t)?.nom}</small></span>
              {obtenus.has(o.s) && <Check size={15} className="ero-coche" />}
            </a>
          </li>
        ))}
      </ul>
      {liste.length === 0 && <p className="ero-etat">Aucun objet trouvé.</p>}
    </div>
  )
}
