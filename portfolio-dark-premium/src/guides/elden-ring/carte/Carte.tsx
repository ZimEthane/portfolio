import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BookOpen, Check, Eye, EyeOff, Link2, Mountain, Search, SlidersHorizontal, X } from 'lucide-react'
import type { Livre } from '../livre'
import Fiche from '../Fiche'
import { ecrireCoches, ecrireTrouves, lireCoches, lireTrouves } from '../coches'
import { CATEGORIES, PAR_ID } from './categories'
import './carte.css'

// Un repère de la carte (voir scripts/carte-elden-ring : extrait des fichiers du jeu).
export interface Marqueur {
  id: string
  c: string // catégorie
  n: string // nom (français)
  en?: string // nom anglais (recherche, liens avec le guide)
  s: 0 | 1 // 0 : surface, 1 : souterrain
  x: number // pixels de l'image d'origine (1 px = 1 m)
  y: number
  q?: number // quantité
  ico?: string // icône de l'objet
  plus?: string[] // autres objets au même endroit, ou butin du boss
  d?: string // précision (« Coffre »)
  f?: string // fiche du guide (d05, b029)
  pres?: string // site de grâce le plus proche
  z?: string // donjon qui le contient
}

const BASE = `${import.meta.env.BASE_URL}guides/elden-ring/carte/`
const NATIF = 6 // niveau de zoom où 1 pixel d'écran = 1 pixel de l'image
const COUCHES = [
  { id: 'surface', nom: 'Entre-terre', w: 9728, h: 9216 },
  { id: 'souterrain', nom: 'Souterrain', w: 6400, h: 6912 },
] as const
const CLE_FILTRES = 'guides:elden-ring:carte-filtres'

const norme = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const tailleZoom = (z: number) => Math.round(Math.min(30, Math.max(15, 15 + (z - 2) * 3.4)))

// Pictogrammes des catégories, dessinés une fois dans des canevas (voir Sprites).
const SPRITES: Record<string, HTMLCanvasElement> = {}

// Repère dessiné sur le canevas de Leaflet : rapide même avec des milliers de points.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RepereCanvas = (L.CircleMarker as any).extend({
  _project() {
    this._radius = tailleZoom(this._map.getZoom()) / 2
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(L.CircleMarker.prototype as any)._project.call(this)
  },
  _updatePath() {
    const r = this._renderer
    const sprite = SPRITES[this.options.categorie]
    if (!r._drawing || this._empty() || !sprite) return
    const t = this._radius * 2
    const ctx: CanvasRenderingContext2D = r._ctx
    ctx.globalAlpha = this.options.estompe ? 0.32 : 1
    ctx.drawImage(sprite, this._point.x - t / 2, this._point.y - t / 2, t, t)
    ctx.globalAlpha = 1
  },
}) as new (latlng: L.LatLngExpression, options: L.CircleMarkerOptions & { categorie: string; estompe?: boolean }) => L.CircleMarker & { options: { estompe?: boolean } }

function lireFiltres(): Set<string> {
  try {
    const v = localStorage.getItem(CLE_FILTRES)
    if (v) return new Set(JSON.parse(v) as string[])
  } catch { /* rien */ }
  return new Set(CATEGORIES.filter(c => c.visible).map(c => c.id))
}

// Rend les icônes lucide une fois (cachées), puis les copie dans des canevas ronds aux couleurs des catégories.
function Sprites({ onPret }: { onPret: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const dpr = Math.min(3, window.devicePixelRatio || 1)
    const T = 32 * dpr
    let restants = CATEGORIES.length
    for (const c of CATEGORIES) {
      const svg = el.querySelector(`[data-cat="${c.id}"] svg`)
      if (!svg) { restants--; continue }
      const img = new Image()
      img.onload = () => {
        const cv = document.createElement('canvas')
        cv.width = cv.height = T
        const ctx = cv.getContext('2d')!
        ctx.beginPath()
        ctx.arc(T / 2, T / 2, T / 2 - dpr, 0, Math.PI * 2)
        ctx.fillStyle = '#1d1813'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(T / 2, T / 2, T / 2 - 2.6 * dpr, 0, Math.PI * 2)
        ctx.fillStyle = c.couleur
        ctx.fill()
        ctx.lineWidth = 1.2 * dpr
        ctx.strokeStyle = '#f3e6c3'
        ctx.stroke()
        const s = T * 0.52
        ctx.drawImage(img, (T - s) / 2, (T - s) / 2, s, s)
        SPRITES[c.id] = cv
        if (--restants === 0) onPret()
      }
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`
    }
  }, [onPret])
  return (
    <div ref={ref} hidden>
      {CATEGORIES.map(c => <span key={c.id} data-cat={c.id}><c.icone size={32} color="#ffffff" strokeWidth={2.2} /></span>)}
    </div>
  )
}

function Pastille({ categorie, taille = 22 }: { categorie: string; taille?: number }) {
  const c = PAR_ID.get(categorie)
  if (!c) return null
  return (
    <span className="erc-pastille" style={{ background: c.couleur, width: taille, height: taille }}>
      <c.icone size={Math.round(taille * 0.56)} strokeWidth={2.3} />
    </span>
  )
}

export default function Carte({ livre: l, chemin }: { livre: Livre; chemin: string }) {
  const boite = useRef<HTMLDivElement>(null)
  const carte = useRef<L.Map | null>(null)
  const tuiles = useRef<L.TileLayer | null>(null)
  const halo = useRef<L.CircleMarker | null>(null)
  const reperes = useRef(new Map<string, { m: Marqueur; repere: InstanceType<typeof RepereCanvas> }>())
  const groupes = useRef(new Map<string, L.LayerGroup>()) // « 0:boss » → repères de la catégorie sur la couche

  const [donnees, setDonnees] = useState<Marqueur[] | null>(null)
  const [erreur, setErreur] = useState(false)
  const [spritesPrets, setSpritesPrets] = useState(false)
  const [couche, setCouche] = useState<0 | 1>(chemin.endsWith('souterrain') ? 1 : 0)
  const [actives, setActives] = useState(lireFiltres)
  const [masquer, setMasquer] = useState(false)
  const [trouves, setTrouves] = useState(lireTrouves)
  const [coches, setCoches] = useState(lireCoches)
  const [choisi, setChoisi] = useState<Marqueur | null>(null)
  const [recherche, setRecherche] = useState('')
  const [fiche, setFiche] = useState<string | null>(null)
  const [panneau, setPanneau] = useState(false) // panneau des filtres ouvert (téléphone)
  const [absent, setAbsent] = useState('') // lien vers un repère qui n'est pas (encore) sur la carte
  const onSpritesPrets = useCallback(() => setSpritesPrets(true), [])

  // Cases du guide liées aux repères : boss « Battu », donjon « Fait ».
  const cleGuide = useMemo(() => {
    const m = new Map<string, string>()
    l.boss.forEach(b => m.set(b.id, b.cleBattu))
    l.donjons.forEach(d => d.cleFait && m.set(d.id, d.cleFait))
    return m
  }, [l])
  const estTrouve = useCallback((m: Marqueur) => {
    const cle = m.f ? cleGuide.get(m.f) : undefined
    return cle ? coches.has(cle) : trouves.has(m.id)
  }, [cleGuide, coches, trouves])

  const basculerTrouve = (m: Marqueur) => {
    const cle = m.f ? cleGuide.get(m.f) : undefined
    if (cle) {
      setCoches(avant => {
        const suite = new Set(avant)
        if (suite.has(cle)) suite.delete(cle); else suite.add(cle)
        ecrireCoches(suite)
        return suite
      })
    } else {
      setTrouves(avant => {
        const suite = new Set(avant)
        if (suite.has(m.id)) suite.delete(m.id); else suite.add(m.id)
        ecrireTrouves(suite)
        return suite
      })
    }
  }

  // ----- Données -----
  useEffect(() => {
    let annule = false
    fetch(`${BASE}donnees.json`)
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<{ marqueurs: Marqueur[] }> })
      .then(d => { if (!annule) setDonnees(d.marqueurs) })
      .catch(() => { if (!annule) setErreur(true) })
    return () => { annule = true }
  }, [])

  // ----- Carte Leaflet (une seule fois) -----
  useEffect(() => {
    if (!boite.current) return
    const map = L.map(boite.current, {
      crs: L.CRS.Simple, minZoom: 1, maxZoom: 8, zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 90,
      attributionControl: false, zoomControl: false, preferCanvas: true, renderer: L.canvas({ padding: 0.4, tolerance: 4 }),
    })
    L.control.zoom({ position: 'topright', zoomInTitle: 'Zoomer', zoomOutTitle: 'Dézoomer' }).addTo(map)
    halo.current = L.circleMarker([0, 0], { renderer: L.svg(), radius: 19, className: 'erc-halo', interactive: false })
    map.on('click', () => setPanneau(false))
    carte.current = map
    return () => { map.remove(); carte.current = null }
  }, [])

  // Fond de carte de la couche choisie.
  useEffect(() => {
    const map = carte.current
    if (!map) return
    const c = COUCHES[couche]
    const bornes = L.latLngBounds(map.unproject([0, c.h], NATIF), map.unproject([c.w, 0], NATIF))
    tuiles.current?.remove()
    tuiles.current = L.tileLayer(`${BASE}${c.id}/{z}/{x}/{y}.webp`, {
      tileSize: 256, minZoom: 1, maxZoom: 8, minNativeZoom: 0, maxNativeZoom: NATIF, bounds: bornes, noWrap: true, keepBuffer: 3,
    }).addTo(map)
    map.setMaxBounds(bornes.pad(0.25))
    map.fitBounds(bornes, { animate: false })
  }, [couche])

  // Repères : créés une fois les données et les pictogrammes prêts.
  useEffect(() => {
    const map = carte.current
    if (!map || !donnees || !spritesPrets) return
    for (const m of donnees) {
      const cle = `${m.s}:${m.c}`
      let g = groupes.current.get(cle)
      if (!g) { g = L.layerGroup(); groupes.current.set(cle, g) }
      const repere = new RepereCanvas(map.unproject([m.x, m.y], NATIF), { categorie: m.c, bubblingMouseEvents: false })
      repere.bindTooltip(m.q ? `${m.n} ×${m.q}` : m.n, { direction: 'top', offset: [0, -12], className: 'erc-bulle' })
      repere.on('click', () => { setChoisi(m); setPanneau(false) })
      reperes.current.set(m.id, { m, repere })
      g.addLayer(repere)
    }
    return () => {
      groupes.current.forEach(g => g.remove())
      groupes.current.clear()
      reperes.current.clear()
    }
  }, [donnees, spritesPrets])

  // Catégories affichées (et couche).
  useEffect(() => {
    const map = carte.current
    if (!map) return
    groupes.current.forEach((g, cle) => {
      const [s, c] = cle.split(':')
      const voir = Number(s) === couche && actives.has(c)
      if (voir && !map.hasLayer(g)) g.addTo(map)
      if (!voir && map.hasLayer(g)) g.remove()
    })
    try { localStorage.setItem(CLE_FILTRES, JSON.stringify([...actives])) } catch { /* rien */ }
  }, [actives, couche, donnees, spritesPrets])

  // Repères trouvés : estompés, ou cachés si on le demande.
  useEffect(() => {
    reperes.current.forEach(({ m, repere }) => {
      const oui = estTrouve(m)
      const g = groupes.current.get(`${m.s}:${m.c}`)
      if (!g) return
      const cache = masquer && oui
      if (cache && g.hasLayer(repere)) g.removeLayer(repere)
      if (!cache && !g.hasLayer(repere)) g.addLayer(repere)
      if (repere.options.estompe !== oui) { repere.options.estompe = oui; repere.redraw() }
    })
  }, [estTrouve, masquer, donnees, spritesPrets])

  // Halo autour du repère choisi, et adresse partageable.
  useEffect(() => {
    const map = carte.current
    const h = halo.current
    if (!map || !h) return
    if (choisi && choisi.s === couche) {
      h.setLatLng(map.unproject([choisi.x, choisi.y], NATIF))
      if (!map.hasLayer(h)) h.addTo(map)
    } else h.remove()
    if (donnees) history.replaceState(null, '', `#guides/elden-ring/carte${choisi ? `/${choisi.id}` : couche ? '/souterrain' : ''}`)
  }, [choisi, couche, donnees])

  const aller = useCallback((m: Marqueur) => {
    setCouche(m.s)
    setActives(a => (a.has(m.c) ? a : new Set([...a, m.c])))
    setChoisi(m)
    setPanneau(false)
    // Attendre que la couche soit posée (fitBounds) avant de voler jusqu'au repère.
    setTimeout(() => carte.current?.flyTo(carte.current.unproject([m.x, m.y], NATIF), Math.max(carte.current.getZoom(), 5.5), { duration: 0.8 }), 60)
  }, [])

  // Lien direct : #guides/elden-ring/carte/<repère ou fiche du guide> (à l'ouverture, ou depuis une fiche).
  const lienTraite = useRef('')
  useEffect(() => {
    if (!donnees || !spritesPrets || lienTraite.current === chemin) return
    lienTraite.current = chemin
    setFiche(null)
    const id = chemin.split('/')[1]
    if (!id || id === 'souterrain') return
    // Vue précise : @couche,x,y,zoom (lien « Voir cette zone » des cartes du guide)
    const vue = id.match(/^@([01]),(\d+),(\d+),([\d.]+)$/)
    if (vue) {
      const c = Number(vue[1]) as 0 | 1
      setCouche(c)
      setChoisi(null)
      setTimeout(() => carte.current?.setView(carte.current.unproject([Number(vue[2]), Number(vue[3])], NATIF), Number(vue[4]), { animate: false }), 60)
      return
    }
    const m = donnees.find(x => x.id === id) ?? donnees.find(x => x.f === id)
    if (m) aller(m)
    else setAbsent(l.boss.find(b => b.id === id)?.nom ?? l.donjons.find(d => d.id === id)?.nom ?? id)
  }, [donnees, spritesPrets, chemin, aller, l])

  // ----- Recherche -----
  const resultats = useMemo(() => {
    const q = norme(recherche.trim())
    if (!donnees || q.length < 2) return []
    const mots = q.split(/\s+/)
    return donnees.filter(m => {
      const t = norme(`${m.n} ${m.en ?? ''} ${m.z ?? ''} ${m.plus?.join(' ') ?? ''}`)
      return mots.every(w => t.includes(w))
    }).sort((a, b) => Number(!norme(a.n).startsWith(mots[0])) - Number(!norme(b.n).startsWith(mots[0]))).slice(0, 60)
  }, [recherche, donnees])

  const compte = useMemo(() => {
    const total = new Map<string, number>(), faits = new Map<string, number>()
    donnees?.forEach(m => {
      if (m.s !== couche) return
      total.set(m.c, (total.get(m.c) ?? 0) + 1)
      if (estTrouve(m)) faits.set(m.c, (faits.get(m.c) ?? 0) + 1)
    })
    return { total, faits }
  }, [donnees, couche, estTrouve])

  const basculerCategorie = (id: string) => setActives(a => {
    const s = new Set(a)
    if (s.has(id)) s.delete(id); else s.add(id)
    return s
  })

  const copierLien = (m: Marqueur) => {
    const url = `${location.origin}${location.pathname}#guides/elden-ring/carte/${m.id}`
    navigator.clipboard?.writeText(url).catch(() => undefined)
  }

  const cat = choisi ? PAR_ID.get(choisi.c) : undefined
  const groupesCat = ['Lieux', 'Objets', 'Divers'] as const

  return (
    <div className="erc">
      <Sprites onPret={onSpritesPrets} />
      <aside className={panneau ? 'erc-panneau is-ouvert' : 'erc-panneau'} aria-label="Filtres de la carte">
        <button type="button" className="erc-panneau-fermer" onClick={() => setPanneau(false)}><X size={15} /> Fermer</button>
        <div className="erc-recherche">
          <Search size={16} />
          <input type="search" placeholder="Chercher un objet, un boss, un lieu…" value={recherche} onChange={e => setRecherche(e.target.value)} aria-label="Chercher sur la carte" />
        </div>
        {recherche.trim().length >= 2 ? (
          <ul className="erc-resultats">
            {resultats.length === 0 && <li className="erc-vide">Aucun résultat.</li>}
            {resultats.map(m => (
              <li key={m.id}>
                <button type="button" onClick={() => aller(m)}>
                  <Pastille categorie={m.c} />
                  <span><b>{m.n}{m.q ? ` ×${m.q}` : ''}</b><small>{m.z ? `Dans : ${m.z}` : m.pres ? `Près de : ${m.pres}` : PAR_ID.get(m.c)?.nom}{m.s ? ' · souterrain' : ''}</small></span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="erc-couches" role="group" aria-label="Couche de la carte">
              {COUCHES.map((c, i) => (
                <button key={c.id} type="button" aria-pressed={couche === i} onClick={() => { setCouche(i as 0 | 1); setChoisi(null) }}>
                  {i === 0 ? <Mountain size={15} /> : <span className="erc-sous" aria-hidden="true">⌄</span>} {c.nom}
                </button>
              ))}
            </div>
            <div className="erc-outils">
              <button type="button" onClick={() => setActives(new Set(CATEGORIES.map(c => c.id)))}>Tout afficher</button>
              <button type="button" onClick={() => setActives(new Set())}>Tout masquer</button>
              <button type="button" aria-pressed={masquer} onClick={() => setMasquer(v => !v)}>
                {masquer ? <EyeOff size={14} /> : <Eye size={14} />} {masquer ? 'Trouvés cachés' : 'Cacher les trouvés'}
              </button>
            </div>
            {groupesCat.map(g => (
              <section key={g} className="erc-groupe">
                <h3>{g}</h3>
                <ul>
                  {CATEGORIES.filter(c => c.groupe === g).map(c => {
                    const total = compte.total.get(c.id) ?? 0
                    return (
                      <li key={c.id}>
                        <button type="button" aria-pressed={actives.has(c.id)} onClick={() => basculerCategorie(c.id)} disabled={!total}>
                          <Pastille categorie={c.id} />
                          <span className="erc-nom">{c.nom}</span>
                          <span className="erc-nb">{compte.faits.get(c.id) ?? 0}/{total}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
            <p className="erc-note">
              Positions extraites des fichiers du jeu (version 1.16, jeu de base). Clique sur un repère pour le détail ; tes trouvailles restent enregistrées dans ce navigateur.
            </p>
          </>
        )}
      </aside>

      <div className="erc-zone">
        <div ref={boite} className="erc-leaflet" />
        <button type="button" className="erc-filtres" onClick={() => setPanneau(v => !v)} aria-expanded={panneau}>
          <SlidersHorizontal size={16} /> Filtres et recherche
        </button>
        {!donnees && !erreur && <div className="erc-etat">Chargement de la carte…</div>}
        {erreur && <div className="erc-etat">Impossible de charger les repères de la carte.</div>}
        {absent && (
          <div className="erc-absent" role="status">
            « {absent} » n'est pas encore placé sur la carte.
            <button type="button" onClick={() => setAbsent('')} aria-label="Fermer"><X size={14} /></button>
          </div>
        )}
        <span className="erc-credit">Carte et données © FromSoftware / Bandai Namco · extraites du jeu</span>

        {choisi && cat && (
          <section className="erc-carte" aria-label={choisi.n}>
            <button type="button" className="erc-fermer" onClick={() => setChoisi(null)} aria-label="Fermer"><X size={16} /></button>
            <div className="erc-tete">
              {choisi.ico
                ? <img src={`${BASE}icones/${choisi.ico}.webp`} alt="" width={52} height={52} />
                : <Pastille categorie={choisi.c} taille={44} />}
              <div>
                <span className="erc-cat" style={{ color: cat.couleur }}>{cat.nom}{choisi.d ? ` · ${choisi.d}` : ''}</span>
                <h2>{choisi.n}{choisi.q ? <small> ×{choisi.q}</small> : null}</h2>
                {choisi.en && choisi.en !== choisi.n && <span className="erc-en">{choisi.en}</span>}
              </div>
            </div>
            {(choisi.z || choisi.pres) && (
              <p className="erc-ou">
                {choisi.z && <>À l'intérieur : <b>{choisi.z}</b><br /></>}
                {choisi.pres && <>Grâce la plus proche : <b>{choisi.pres}</b></>}
              </p>
            )}
            {choisi.plus && (
              <p className="erc-plus">
                <span>{choisi.c === 'boss' ? 'Butin' : 'Au même endroit'}</span>
                {choisi.plus.join(' · ')}
              </p>
            )}
            <div className="erc-actions">
              <button type="button" className={estTrouve(choisi) ? 'is-fait' : undefined} onClick={() => basculerTrouve(choisi)}>
                <Check size={15} /> {estTrouve(choisi) ? (choisi.c === 'boss' ? 'Battu' : 'Trouvé') : (choisi.c === 'boss' ? 'Marquer battu' : 'Marquer trouvé')}
              </button>
              {choisi.f && <button type="button" onClick={() => setFiche(choisi.f!)}><BookOpen size={15} /> Fiche du guide</button>}
              <button type="button" onClick={() => copierLien(choisi)} title="Copier le lien de ce repère"><Link2 size={15} /></button>
            </div>
          </section>
        )}
      </div>

      {fiche && (
        <Fiche
          livre={l}
          id={fiche}
          coches={coches}
          onCocher={cle => setCoches(avant => {
            const suite = new Set(avant)
            if (suite.has(cle)) suite.delete(cle); else suite.add(cle)
            ecrireCoches(suite)
            return suite
          })}
          onOuvrir={setFiche}
          onFermer={() => setFiche(null)}
        />
      )}
    </div>
  )
}
