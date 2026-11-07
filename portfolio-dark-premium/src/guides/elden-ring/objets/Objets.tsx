import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Gift, Hammer, Leaf, Map as IconeCarte, MapPin, ScrollText, Search, ShoppingBag, Skull, Sparkles, Trophy, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ecrireObtenus, lireObtenus } from '../coches'
import { aDesCibles, BASE_OBJETS as BASE, chargerObjets as charger, LIEN_CARTE_OBJET, LIEN_OBJETS as LIEN, lienQuete, texteSource } from './donnees'
import type { Donnees, Lien, Objet, Source, Valeur } from './donnees'
import './objets.css'

export type { Objet } from './donnees'

const norme = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

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

const ICONES: Record<Source['t'], LucideIcon> = {
  carte: MapPin, cueillette: Leaf, 'hors-carte': MapPin, boutique: ShoppingBag, recompense: Trophy, butin: Skull, fabrication: Hammer,
  depart: User, souvenir: Gift, retouche: Sparkles, fiole: Sparkles, attachee: Sparkles, aide: BookOpen, quete: ScrollText,
}

function Liens({ titre, liens }: { titre: string; liens?: Lien[] }) {
  const l = (liens ?? []).filter(x => x.s)
  if (!l.length) return null
  return (
    <small className="ero-liens">
      {titre} :{' '}
      {l.map((x, k) => <span key={x.s}>{k > 0 && ', '}<a href={`${LIEN}/${x.s}`}>{x.n}</a>{x.q && x.q > 1 ? ` ×${x.q}` : ''}</span>)}
    </small>
  )
}

function Ou({ objet }: { objet: Objet }) {
  const sources = objet.ou
  if (!sources?.length) {
    return <p className="ero-vide">Aucun emplacement répertorié pour cet objet.</p>
  }
  return (
    <ul className="ero-ou">
      {sources.map((s, k) => {
        const { titre, detail } = texteSource(s)
        const Icone = ICONES[s.t] ?? MapPin
        return (
          <li key={k}>
            <Icone size={16} />
            <span>
              <b>{titre}</b>
              {detail && <small>{detail}</small>}
              {s.t === 'fabrication' && <><Liens titre="Livre" liens={s.livres} /><Liens titre="Ingrédients" liens={s.ingredients} /></>}
              {(s.t === 'retouche' || s.t === 'fiole') && s.s && <Liens titre="Fiche" liens={[{ s: s.s, n: s.n ?? '' }]} />}
              {s.t === 'attachee' && <Liens titre="Arme" liens={s.armes} />}
              {s.perle && <Liens titre="Perle cinéraire" liens={[s.perle]} />}
              {s.tableau && <Liens titre="Tableau" liens={[{ ...s.tableau, n: s.tableau.n.replace(/^Tableau\s*:\s*/, '') }]} />}
            </span>
            {s.t === 'quete' && <a href={lienQuete(s)} className="ero-voir">Voir la quête</a>}
            {aDesCibles(s) && <a href={`${LIEN_CARTE_OBJET}/${objet.s}/${k}`} className="ero-voir">Voir sur la carte</a>}
          </li>
        )
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
        <div className="ero-bloc-tete">
          <h2>Où le trouver</h2>
          {objet.ou?.some(aDesCibles) && (
            <a className="ero-tout-carte" href={`${LIEN_CARTE_OBJET}/${objet.s}`}><IconeCarte size={15} /> Tous les emplacements sur la carte</a>
          )}
        </div>
        <Ou objet={objet} />
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
