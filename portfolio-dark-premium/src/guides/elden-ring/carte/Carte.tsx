import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ArrowLeft, BookOpen, Check, Eye, EyeOff, Link2, Map as IconeCarte, Mountain, Search, SlidersHorizontal, X } from 'lucide-react'
import type { Livre } from '../livre'
import Fiche from '../Fiche'
import { ecrireCoches, ecrireTrouves, lireCoches, lireTrouves } from '../coches'
import { aDesCibles, BASE_OBJETS, chargerObjets, ciblesDirectes, LIEN_CARTE_OBJET, LIEN_OBJETS, liensSource, texteSource } from '../objets/donnees'
import type { Donnees as DonneesObjets, Objet, Source } from '../objets/donnees'
import { CATEGORIES, PAR_ID } from './categories'
import { redessinerPendantZoom, zoomFluide } from './zoomFluide'
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
  o?: string // fiche de l'encyclopédie des objets
  pres?: string // site de grâce le plus proche
  z?: string // donjon qui le contient
  h?: number // hauteur par rapport à ce site de grâce (m, + : plus haut)
}
// Plantes, minerais, animaux : [type, couche, x, y, quantité, n° du donjon, n° de la grâce] (noms dans « noms »).
interface Ressources { types: [string, string, string, string][]; noms: string[]; points: number[][] }
type Ennemis = Record<string, { n: string; p: [number, number, number][] }>

// Ce qu'affiche la fiche en bas de la carte : un repère, une ressource ou un endroit de l'objet suivi.
interface Selection {
  s: 0 | 1
  x: number
  y: number
  titre: string
  sur: string // ligne au-dessus du titre
  couleur: string
  m?: Marqueur
  en?: string
  cat?: string // pastille quand il n'y a pas d'image
  ico?: string // icône (carte/icones)
  img?: number // illustration (objets/min)
  lignes?: string[]
  z?: string
  pres?: string
  q?: number
  h?: number
  objet?: string // fiche de l'encyclopédie
  plus?: string[]
  plusTitre?: string
}

// Mode « objet suivi » : chaque source de l'objet, avec ses endroits sur la carte.
interface PointSuivi { s: 0 | 1; x: number; y: number; sec: number; k: number; m?: Marqueur; q?: number; z?: string; pres?: string; nom?: string; img?: number }
interface Section { ks: number[]; titre: string; detail?: string; via?: { s: string; n: string; pourquoi: string }; img?: number; points: PointSuivi[] }
interface Suivi { objet: Objet; sections: Section[] }

const BASE = `${import.meta.env.BASE_URL}guides/elden-ring/carte/`
const NATIF = 6 // niveau de zoom où 1 pixel d'écran = 1 pixel de l'image
const COUCHES = [
  { id: 'surface', nom: 'Entre-terre', w: 9728, h: 9216 },
  { id: 'souterrain', nom: 'Souterrain', w: 6400, h: 6912 },
] as const
const CLE_FILTRES = 'guides:elden-ring:carte-filtres'
const OR = '#d9a93a'

const norme = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const tailleZoom = (z: number) => Math.min(30, Math.max(15, 15 + (z - 2) * 3.4)) // continu : les repères grossissent en douceur
// Vol jusqu'à un point ; sur téléphone, le point reste au-dessus de la fiche qui couvre le bas de la carte.
function voler(map: L.Map, x: number, y: number) {
  const z = Math.max(map.getZoom(), 5.5)
  let cible = map.unproject([x, y], NATIF)
  if (map.getSize().x < 700) cible = map.unproject(map.project(cible, z).add([0, map.getSize().y * 0.22]), z)
  map.flyTo(cible, z, { duration: 0.8 })
}
const pluriel = (n: number, mot: string) => `${n.toLocaleString('fr-FR')} ${mot}${n > 1 ? 's' : ''}`

// Chargements à la demande, partagés entre les visites de la carte.
let cacheRessources: Promise<Ressources> | null = null
const chargerRessources = () => (cacheRessources ??= fetch(`${BASE}ressources.json`).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<Ressources> }))
let cacheEnnemis: Promise<Ennemis> | null = null
const chargerEnnemis = () => (cacheEnnemis ??= fetch(`${BASE}ennemis.json`).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<Ennemis> }))

// Pictogrammes des catégories, dessinés une fois dans des canevas (voir Sprites), et illustrations des objets suivis.
const SPRITES: Record<string, HTMLCanvasElement> = {}
const SPRITES_OBJETS = new Map<number, HTMLCanvasElement>()

function spriteObjet(i: number | undefined): Promise<void> {
  if (i === undefined || SPRITES_OBJETS.has(i)) return Promise.resolve()
  return new Promise(fin => {
    const img = new Image()
    img.onload = () => {
      const dpr = Math.min(3, window.devicePixelRatio || 1)
      const T = 44 * dpr
      const cv = document.createElement('canvas')
      cv.width = cv.height = T
      const ctx = cv.getContext('2d')!
      ctx.beginPath()
      ctx.arc(T / 2, T / 2, T / 2 - dpr, 0, Math.PI * 2)
      ctx.fillStyle = '#1d1813'
      ctx.fill()
      const fond = ctx.createRadialGradient(T / 2, T / 2, 2, T / 2, T / 2, T / 2)
      fond.addColorStop(0, '#4a3923')
      fond.addColorStop(1, '#1d1813')
      ctx.beginPath()
      ctx.arc(T / 2, T / 2, T / 2 - 3 * dpr, 0, Math.PI * 2)
      ctx.fillStyle = fond
      ctx.fill()
      ctx.save()
      ctx.clip()
      const s = T * 0.86
      ctx.drawImage(img, (T - s) / 2, (T - s) / 2, s, s)
      ctx.restore()
      ctx.lineWidth = 2.4 * dpr
      ctx.strokeStyle = OR
      ctx.stroke()
      SPRITES_OBJETS.set(i, cv)
      fin()
    }
    img.onerror = () => fin()
    img.src = `${BASE_OBJETS}min/${i}.webp`
  })
}

// Repère dessiné sur le canevas de Leaflet : rapide même avec des milliers de points.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RepereCanvas = (L.CircleMarker as any).extend({
  _project() {
    this._radius = tailleZoom(this._map.getZoom()) / 2 * (this.options.echelle ?? 1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(L.CircleMarker.prototype as any)._project.call(this)
  },
  _updatePath() {
    const r = this._renderer
    if (!r._drawing || this._empty()) return
    const t = this._radius * 2
    const ctx: CanvasRenderingContext2D = r._ctx
    ctx.globalAlpha = this.options.estompe ? 0.3 : 1
    const sprite = this.options.img !== undefined ? SPRITES_OBJETS.get(this.options.img) : SPRITES[this.options.categorie]
    if (sprite) ctx.drawImage(sprite, this._point.x - t / 2, this._point.y - t / 2, t, t)
    else {
      // Objet sans illustration : pastille dorée
      ctx.beginPath()
      ctx.arc(this._point.x, this._point.y, t / 2 - 1, 0, Math.PI * 2)
      ctx.fillStyle = OR
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#1d1813'
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  },
}) as new (latlng: L.LatLngExpression, options: L.CircleMarkerOptions & { categorie?: string; img?: number; echelle?: number; estompe?: boolean }) => L.CircleMarker & { options: { estompe?: boolean } }

function lireFiltres(): Set<string> {
  try {
    const v = localStorage.getItem(CLE_FILTRES)
    if (v) {
      const d = JSON.parse(v) as string[] | { a: string[]; c: string[] }
      // Catégories apparues depuis la dernière visite : affichées si elles le sont par défaut.
      const connues = Array.isArray(d) ? CATEGORIES.map(c => c.id).filter(id => id !== 'envahisseurs' && id !== 'ressources') : d.c
      const s = new Set(Array.isArray(d) ? d : d.a)
      CATEGORIES.filter(c => c.visible && !connues.includes(c.id)).forEach(c => s.add(c.id))
      return s
    }
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

// ----- Chemin depuis le site de grâce le plus proche -----
const DIRECTIONS = ['est', 'nord-est', 'nord', 'nord-ouest', 'ouest', 'sud-ouest', 'sud', 'sud-est']
const auDir = (d: string) => (d === 'est' || d === 'ouest' ? `à l'${d}` : `au ${d}`)
const arrondi = (d: number) => (d < 100 ? Math.round(d / 5) * 5 : Math.round(d / 10) * 10)

function graceDe(p: { s: 0 | 1; x: number; y: number; pres?: string }, graces: Marqueur[][]) {
  const l = graces[p.s] ?? []
  const d2 = (g: Marqueur) => (g.x - p.x) ** 2 + (g.y - p.y) ** 2
  const nommees = p.pres ? l.filter(g => g.n === p.pres) : []
  const pool = nommees.length ? nommees : l
  let best: Marqueur | undefined
  for (const g of pool) if (!best || d2(g) < d2(best)) best = g
  return best
}

function Chemin({ sel, graces, regions }: { sel: Selection; graces: Marqueur[][]; regions: Record<string, string> }) {
  const g = graceDe(sel, graces)
  if (!g) return null
  const dx = sel.x - g.x, dy = sel.y - g.y
  const dist = Math.hypot(dx, dy)
  const dir = DIRECTIONS[(Math.round(Math.atan2(-dy, dx) / (Math.PI / 4)) + 8) % 8]
  const pres = dist < 15
  const region = regions[g.id]
  const hauteur = sel.h && !sel.z ? `, ${Math.abs(sel.h)} m plus ${sel.h > 0 ? 'haut' : 'bas'}` : ''
  if (sel.m?.c === 'graces') return region ? <p className="erc-ou">Région : <b>{region}</b></p> : null
  return (
    <p className="erc-ou">
      {sel.z && <>À l'intérieur de <b>{sel.z}</b><br />Entrée </>}
      {pres
        ? <>{sel.z ? 'juste à côté du' : 'Juste à côté du'} site de grâce <b>{g.n}</b></>
        : <>{sel.z ? 'à' : 'À'} <b>{arrondi(dist)} m</b> {auDir(dir)} du site de grâce <b>{g.n}</b></>}
      {hauteur}
      {region && <><br />Région : <b>{region}</b>{sel.s ? ' (souterrain)' : ''}</>}
    </p>
  )
}

function depuisMarqueur(m: Marqueur): Selection {
  const cat = PAR_ID.get(m.c)
  return {
    s: m.s, x: m.x, y: m.y, titre: m.n, sur: `${cat?.nom ?? ''}${m.d ? ` · ${m.d}` : ''}`, couleur: cat?.couleur ?? OR, m, en: m.en,
    cat: m.c, ico: m.ico, z: m.z, pres: m.pres, q: m.q, h: m.h, objet: m.o, plus: m.plus, plusTitre: m.c === 'boss' || m.c === 'envahisseurs' ? 'Butin' : 'Au même endroit',
  }
}

// Endroits d'une source : repères, ennemis posés, points de cueillette ; puis ceux des fiches liées (livre, version d'origine…).
function construireSections(o: Objet, parSlug: Map<string, Objet>, parId: Map<string, Marqueur>, ennemis: Ennemis | null, res: Ressources | null): Section[] {
  const secs: Section[] = []
  const indexTypes = new Map(res?.types.map((t, i) => [t[0], i]) ?? [])
  const pointsDe = (src: Source, sec: number, k: number, img?: number) => {
    const c = ciblesDirectes(src)
    const pts: PointSuivi[] = []
    c.ids.forEach(id => { const m = parId.get(id); if (m) pts.push({ s: m.s, x: m.x, y: m.y, sec, k, m, img }) })
    const groupe = c.e ? ennemis?.[c.e] : undefined
    groupe?.p.forEach(([s, x, y]) => pts.push({ s: s as 0 | 1, x, y, sec, k, nom: groupe.n, img }))
    if (c.r.length && res) {
      const types = new Set(c.r.map(k => indexTypes.get(k)).filter((i): i is number => i !== undefined))
      for (const p of res.points) {
        if (types.has(p[0])) pts.push({ s: p[1] as 0 | 1, x: p[2], y: p[3], q: p[4] > 1 ? p[4] : undefined, z: res.noms[p[5]] || undefined, pres: res.noms[p[6]] || undefined, nom: res.types[p[0]][1], sec, k, img })
      }
    }
    return pts
  }
  const uniques = (pts: PointSuivi[]) => {
    const vus = new Set<string>()
    return pts.filter(p => { const k = `${p.s}:${Math.round(p.x)}:${Math.round(p.y)}`; if (vus.has(k)) return false; vus.add(k); return true })
  }
  const groupesCarte = new Map<string, number>() // objets posés : une section par façon de les trouver (au sol, coffre…)
  o.ou?.forEach((src, k) => {
    const { titre, detail } = texteSource(src)
    if (src.t === 'carte') {
      let sec = groupesCarte.get(titre)
      if (sec === undefined) { sec = secs.length; groupesCarte.set(titre, sec); secs.push({ ks: [], titre, detail: titre === 'Ramassé sur place' ? 'Objet posé dans le monde : repère précis' : undefined, points: [] }) }
      secs[sec].ks.push(k)
      secs[sec].points.push(...pointsDe(src, sec, k, o.i))
      return
    }
    const liens = liensSource(src)
    const direct = uniques(pointsDe(src, secs.length, k, o.i))
    if (direct.length || !liens.length) secs.push({ ks: [k], titre, detail, points: direct })
    for (const l of liens) {
      const lo = parSlug.get(l.s)
      if (!lo) continue
      const sec = secs.length
      const pts = uniques((lo.ou ?? []).flatMap(s2 => pointsDe(s2, sec, k, lo.i)))
      secs.push({ ks: [k], titre: `${l.pourquoi} : ${l.n}`, detail: `${titre} · où le trouver`, via: l, img: lo.i, points: pts })
    }
  })
  groupesCarte.forEach(i => { secs[i].points = uniques(secs[i].points) })
  return secs
}

export default function Carte({ livre: l, chemin }: { livre: Livre; chemin: string }) {
  const boite = useRef<HTMLDivElement>(null)
  const carte = useRef<L.Map | null>(null)
  const tuiles = useRef<L.TileLayer | null>(null)
  const halo = useRef<L.CircleMarker | null>(null)
  const rendus = useRef<{ res: L.Renderer; suivi: L.Renderer } | null>(null)
  const reperes = useRef(new Map<string, { m: Marqueur; repere: InstanceType<typeof RepereCanvas> }>())
  const groupes = useRef(new Map<string, L.LayerGroup>()) // « 0:boss » → repères de la catégorie sur la couche
  const groupesRes = useRef<L.LayerGroup[]>([])
  const groupesSuivi = useRef<L.LayerGroup[]>([])
  const reperesSuivi = useRef<InstanceType<typeof RepereCanvas>[]>([])

  const [donnees, setDonnees] = useState<Marqueur[] | null>(null)
  const [regions, setRegions] = useState<Record<string, string>>({})
  const [erreur, setErreur] = useState(false)
  const [spritesPrets, setSpritesPrets] = useState(false)
  const [couche, setCouche] = useState<0 | 1>(chemin.endsWith('souterrain') ? 1 : 0)
  const [actives, setActives] = useState(lireFiltres)
  const [masquer, setMasquer] = useState(false)
  const [trouves, setTrouves] = useState(lireTrouves)
  const [coches, setCoches] = useState(lireCoches)
  const [choisi, setChoisi] = useState<Selection | null>(null)
  const [recherche, setRecherche] = useState('')
  const [fiche, setFiche] = useState<string | null>(null)
  const [panneau, setPanneau] = useState(false) // panneau des filtres ouvert (téléphone)
  const [absent, setAbsent] = useState('') // lien vers un repère qui n'est pas (encore) sur la carte
  const [ressources, setRessources] = useState<Ressources | null>(null)
  const [typeRes, setTypeRes] = useState('') // type de ressource affiché ('' : toutes)
  const [objets, setObjets] = useState<DonneesObjets | null>(null)
  const [suivi, setSuivi] = useState<Suivi | null>(null)
  const [section, setSection] = useState<number | null>(null)
  const onSpritesPrets = useCallback(() => setSpritesPrets(true), [])

  // Adresse « carte/objet/<fiche>[/<n° de source>] » : mode objet suivi.
  const demande = useMemo(() => {
    const m = chemin.match(/^carte\/objet\/([^/?]+)(?:\/(\d+))?/)
    return m ? { s: decodeURIComponent(m[1]), k: m[2] !== undefined ? Number(m[2]) : null } : null
  }, [chemin])

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

  const parId = useMemo(() => new Map((donnees ?? []).map(m => [m.id, m])), [donnees])
  const graces = useMemo(() => [0, 1].map(s => (donnees ?? []).filter(m => m.c === 'graces' && m.s === s)), [donnees])

  // ----- Données -----
  useEffect(() => {
    let annule = false
    fetch(`${BASE}donnees.json`)
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<{ marqueurs: Marqueur[]; regions?: Record<string, string> }> })
      .then(d => { if (!annule) { setDonnees(d.marqueurs); setRegions(d.regions ?? {}) } })
      .catch(() => { if (!annule) setErreur(true) })
    return () => { annule = true }
  }, [])

  // Ressources : chargées quand on les affiche ; objets : pour le mode objet suivi et la recherche.
  const besoinRessources = actives.has('ressources')
  useEffect(() => {
    if (!besoinRessources || ressources) return
    chargerRessources().then(setRessources, () => undefined)
  }, [besoinRessources, ressources])
  const besoinObjets = !!demande || recherche.trim().length >= 2
  useEffect(() => {
    if (!besoinObjets || objets) return
    chargerObjets().then(setObjets, () => undefined)
  }, [besoinObjets, objets])

  // ----- Carte Leaflet (une seule fois) -----
  useEffect(() => {
    if (!boite.current) return
    const rendu = L.canvas({ padding: 0.3, tolerance: 4 })
    const renduHalo = L.svg()
    const map = L.map(boite.current, {
      crs: L.CRS.Simple, minZoom: 1, maxZoom: 8, zoomSnap: 0.25, zoomDelta: 0.5, scrollWheelZoom: false,
      attributionControl: false, zoomControl: false, preferCanvas: true, renderer: rendu,
    })
    // Ressources sous les repères, endroits de l'objet suivi au-dessus.
    map.createPane('erc-res').style.zIndex = '390'
    map.createPane('erc-suivi').style.zIndex = '450'
    const renduRes = L.canvas({ padding: 0.3, tolerance: 3, pane: 'erc-res' })
    const renduSuivi = L.canvas({ padding: 0.3, tolerance: 4, pane: 'erc-suivi' })
    rendus.current = { res: renduRes, suivi: renduSuivi }
    L.control.zoom({ position: 'topright', zoomInTitle: 'Zoomer', zoomOutTitle: 'Dézoomer' }).addTo(map)
    halo.current = L.circleMarker([0, 0], { renderer: renduHalo, radius: 19, className: 'erc-halo', interactive: false })
    const molette = zoomFluide(map)
    molette.activer()
    const finRendu = redessinerPendantZoom(map, [rendu, renduHalo, renduRes, renduSuivi])
    map.on('click', () => setPanneau(false))
    carte.current = map
    return () => { finRendu(); molette.detruire(); map.remove(); carte.current = null; rendus.current = null }
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
      repere.on('click', () => { setChoisi(depuisMarqueur(m)); setPanneau(false) })
      reperes.current.set(m.id, { m, repere })
      g.addLayer(repere)
    }
    return () => {
      groupes.current.forEach(g => g.remove())
      groupes.current.clear()
      reperes.current.clear()
    }
  }, [donnees, spritesPrets])

  // Ressources à cueillir (du type choisi), sous les autres repères.
  useEffect(() => {
    const map = carte.current
    const r = rendus.current
    if (!map || !r || !ressources || !spritesPrets) return
    const types = ressources.types
    const grs = [L.layerGroup(), L.layerGroup()]
    for (const p of ressources.points) {
      const t = types[p[0]]
      if (typeRes && t[0] !== typeRes) continue
      const repere = new RepereCanvas(map.unproject([p[2], p[3]], NATIF), { categorie: 'ressources', echelle: 0.78, renderer: r.res, bubblingMouseEvents: false })
      repere.bindTooltip(p[4] > 1 ? `${t[1]} ×${p[4]}` : t[1], { direction: 'top', offset: [0, -10], className: 'erc-bulle' })
      repere.on('click', () => {
        setChoisi({
          s: p[1] as 0 | 1, x: p[2], y: p[3], titre: t[1], sur: 'Ressource à cueillir · réapparaît', couleur: PAR_ID.get('ressources')!.couleur,
          cat: 'ressources', ico: t[2], q: p[4] > 1 ? p[4] : undefined, z: ressources.noms[p[5]] || undefined, pres: ressources.noms[p[6]] || undefined, objet: t[3] || undefined,
        })
        setPanneau(false)
      })
      grs[p[1]].addLayer(repere)
    }
    groupesRes.current = grs
    return () => { grs.forEach(g => g.remove()); groupesRes.current = [] }
  }, [ressources, typeRes, spritesPrets])

  // Catégories affichées (et couche). En mode objet suivi, seuls les sites de grâce restent, pour se repérer.
  useEffect(() => {
    const map = carte.current
    if (!map) return
    groupes.current.forEach((g, cle) => {
      const [s, c] = cle.split(':')
      const voir = Number(s) === couche && (suivi ? c === 'graces' : actives.has(c))
      if (voir && !map.hasLayer(g)) g.addTo(map)
      if (!voir && map.hasLayer(g)) g.remove()
    })
    groupesRes.current.forEach((g, s) => {
      const voir = s === couche && !suivi && actives.has('ressources')
      if (voir && !map.hasLayer(g)) g.addTo(map)
      if (!voir && map.hasLayer(g)) g.remove()
    })
    groupesSuivi.current.forEach((g, s) => {
      const voir = s === couche && !!suivi
      if (voir && !map.hasLayer(g)) g.addTo(map)
      if (!voir && map.hasLayer(g)) g.remove()
    })
    try { localStorage.setItem(CLE_FILTRES, JSON.stringify({ a: [...actives], c: CATEGORIES.map(c => c.id) })) } catch { /* rien */ }
  }, [actives, couche, donnees, spritesPrets, ressources, typeRes, suivi])

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

  // Halo autour de ce qui est choisi, et adresse partageable.
  useEffect(() => {
    const map = carte.current
    const h = halo.current
    if (!map || !h) return
    if (choisi && choisi.s === couche) {
      h.setLatLng(map.unproject([choisi.x, choisi.y], NATIF))
      if (!map.hasLayer(h)) h.addTo(map)
    } else h.remove()
    if (!donnees) return
    const suite = suivi
      ? `/objet/${suivi.objet.s}${section !== null ? `/${suivi.sections[section]?.ks[0] ?? ''}` : ''}`
      : choisi?.m ? `/${choisi.m.id}` : couche ? '/souterrain' : ''
    history.replaceState(null, '', `#guides/elden-ring/carte${suite}`)
  }, [choisi, couche, donnees, suivi, section])

  // Cadrage sur des points : la couche qui en a le plus, puis tous les points dans la vue.
  const cadrer = useCallback((pts: { s: 0 | 1; x: number; y: number }[], coucheActuelle: 0 | 1) => {
    if (!pts.length) return
    const n1 = pts.filter(p => p.s === 1).length, n0 = pts.length - n1
    const c: 0 | 1 = n0 === n1 ? coucheActuelle : n0 > n1 ? 0 : 1
    const ici = pts.filter(p => p.s === c)
    setCouche(c)
    setTimeout(() => {
      const map = carte.current
      if (!map) return
      if (ici.length === 1) voler(map, ici[0].x, ici[0].y)
      else map.flyToBounds(L.latLngBounds(ici.map(p => map.unproject([p.x, p.y], NATIF))), { maxZoom: 5.5, padding: [60, 60], duration: 0.8 })
    }, 80)
  }, [])

  const aller = useCallback((m: Marqueur) => {
    setCouche(m.s)
    setActives(a => (a.has(m.c) ? a : new Set([...a, m.c])))
    setChoisi(depuisMarqueur(m))
    setPanneau(false)
    // Attendre que la couche soit posée (fitBounds) avant de voler jusqu'au repère.
    setTimeout(() => carte.current && voler(carte.current, m.x, m.y), 60)
  }, [])

  // ----- Mode objet suivi -----
  const cadrageFait = useRef('') // dernier cadrage fait (objet:source), pour ne pas recadrer à chaque rendu
  const viser = useRef<PointSuivi | null>(null) // endroit précis demandé par le lien
  const selectionSuivi = useCallback((p: PointSuivi, sec: Section, o: Objet): Selection => {
    const lignes: string[] = [sec.via ? `${sec.via.pourquoi} pour obtenir : ${o.n}` : sec.titre]
    if (sec.detail && !sec.via) lignes.push(sec.detail)
    if (p.m && p.m.c !== 'graces' && p.m.n !== o.n) lignes.push(`${PAR_ID.get(p.m.c)?.nom ?? 'Repère'} : ${p.m.n}${p.m.d ? ` (${p.m.d})` : ''}`)
    else if (p.m?.d && !sec.titre.includes(p.m.d)) lignes.push(p.m.d)
    if (p.nom && !sec.titre.includes(p.nom)) lignes.push(`Endroit : ${p.nom}`)
    return {
      s: p.s, x: p.x, y: p.y, titre: sec.via ? sec.via.n : o.n, sur: sec.via ? sec.via.pourquoi : 'Objet suivi', couleur: OR, m: p.m,
      img: p.img, lignes, z: p.z ?? p.m?.z, pres: p.pres ?? p.m?.pres, q: p.q ?? p.m?.q, h: p.m?.h, objet: sec.via ? sec.via.s : o.s,
    }
  }, [])

  // Sections de l'objet demandé (ennemis et ressources chargés à la demande).
  useEffect(() => {
    if (!demande) { setSuivi(null); setSection(null); return }
    if (!donnees || !objets) return
    const o = objets.objets.find(x => x.s === demande.s)
    if (!o) { setSuivi(null); setChoisi(null); setAbsent(demande.s); return }
    let annule = false
    const parSlug = new Map(objets.objets.map(x => [x.s, x]))
    const liees = [o, ...(o.ou ?? []).flatMap(s => liensSource(s).map(x => parSlug.get(x.s)))].filter((x): x is Objet => !!x)
    const veutRes = liees.some(x => x.ou?.some(s => s.t === 'cueillette'))
    const veutEnnemis = liees.some(x => x.ou?.some(s => s.e))
    Promise.all([
      veutEnnemis ? chargerEnnemis().catch(() => null) : null,
      veutRes ? chargerRessources().catch(() => null) : null,
    ]).then(async ([ennemis, res]) => {
      const sections = construireSections(o, parSlug, parId, ennemis, res)
      await Promise.all([...new Set(sections.flatMap(s => [s.img, s.points[0]?.img]).concat(o.i))].map(spriteObjet))
      if (annule) return
      setSuivi({ objet: o, sections })
      setChoisi(null)
      setRecherche('')
      setAbsent('')
      const choix = demande.k !== null ? sections.findIndex(s => s.ks.includes(demande.k!) && s.points.length) : -1
      setSection(choix >= 0 ? choix : null)
      // Lien vers un objet posé précis (depuis l'encyclopédie) : on vole jusqu'à lui.
      viser.current = o.ou?.[demande.k ?? -1]?.t === 'carte' ? sections[choix]?.points.find(p => p.k === demande.k) ?? null : null
      cadrageFait.current = ''
    })
    return () => { annule = true }
  }, [demande, donnees, objets, parId])

  // Endroits de l'objet suivi : illustration de l'objet dans un cercle doré.
  useEffect(() => {
    const map = carte.current
    const r = rendus.current
    if (!map || !r || !suivi) return
    const grs = [L.layerGroup(), L.layerGroup()]
    const tous: InstanceType<typeof RepereCanvas>[] = []
    suivi.sections.forEach(sec => sec.points.forEach(p => {
      const repere = new RepereCanvas(map.unproject([p.x, p.y], NATIF), { img: p.img, echelle: sec.via ? 1.05 : 1.3, renderer: r.suivi, bubblingMouseEvents: false })
      repere.bindTooltip(`${sec.via ? sec.via.n : suivi.objet.n} — ${sec.titre}`, { direction: 'top', offset: [0, -14], className: 'erc-bulle' })
      repere.on('click', () => { setChoisi(selectionSuivi(p, sec, suivi.objet)); setPanneau(false) })
      ;(repere as unknown as { sec: number }).sec = p.sec
      grs[p.s].addLayer(repere)
      tous.push(repere)
    }))
    groupesSuivi.current = grs
    reperesSuivi.current = tous
    grs.forEach((g, s) => { if (s === couche) g.addTo(map) })
    return () => { grs.forEach(g => g.remove()); groupesSuivi.current = []; reperesSuivi.current = [] }
    // La couche est gérée par l'effet des catégories ; ici seulement à la création.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suivi, selectionSuivi])

  // Source choisie : ses endroits en clair, les autres estompés ; cadrage.
  useEffect(() => {
    reperesSuivi.current.forEach(rp => {
      const oui = section !== null && (rp as unknown as { sec: number }).sec !== section
      if (rp.options.estompe !== oui) { rp.options.estompe = oui; rp.redraw() }
    })
  }, [section, suivi])
  useEffect(() => {
    if (!suivi) { cadrageFait.current = ''; return }
    const cle = `${suivi.objet.s}:${section}`
    if (cadrageFait.current === cle) return
    cadrageFait.current = cle
    const v = viser.current
    viser.current = null
    const pts = v ? [v] : section !== null ? suivi.sections[section]?.points ?? [] : suivi.sections.flatMap(s => s.points)
    cadrer(pts, couche)
    if (pts.length === 1) {
      const sec = suivi.sections[pts[0].sec]
      setChoisi(selectionSuivi(pts[0], sec, suivi.objet))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suivi, section, cadrer, selectionSuivi])

  // Lien direct : #guides/elden-ring/carte/<repère ou fiche du guide> (à l'ouverture, ou depuis une fiche).
  const lienTraite = useRef('')
  useEffect(() => {
    if (!donnees || !spritesPrets || lienTraite.current === chemin) return
    lienTraite.current = chemin
    setFiche(null)
    const id = chemin.split('/')[1]
    if (!id || id === 'souterrain' || id === 'objet') return
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
  // Objets de l'encyclopédie : même ceux qui n'ont pas de repère à eux (vendus, lâchés, fabriqués…).
  const resultatsObjets = useMemo(() => {
    const q = norme(recherche.trim())
    if (!objets || q.length < 2) return []
    const mots = q.split(/\s+/)
    return objets.objets.filter(o => {
      const t = norme(`${o.n} ${o.en}`)
      return mots.every(w => t.includes(w)) && o.ou?.some(aDesCibles)
    }).sort((a, b) => Number(!norme(a.n).startsWith(mots[0])) - Number(!norme(b.n).startsWith(mots[0]))).slice(0, 8)
  }, [recherche, objets])

  const compte = useMemo(() => {
    const total = new Map<string, number>(), faits = new Map<string, number>()
    donnees?.forEach(m => {
      if (m.s !== couche) return
      total.set(m.c, (total.get(m.c) ?? 0) + 1)
      if (estTrouve(m)) faits.set(m.c, (faits.get(m.c) ?? 0) + 1)
    })
    return { total, faits }
  }, [donnees, couche, estTrouve])

  const typesRes = useMemo(() => {
    if (!ressources) return []
    const nb = new Map<string, number>()
    ressources.points.forEach(p => { if (p[1] === couche) { const k = ressources.types[p[0]][0]; nb.set(k, (nb.get(k) ?? 0) + 1) } })
    return ressources.types.map(t => ({ k: t[0], n: t[1], nb: nb.get(t[0]) ?? 0 })).sort((a, b) => a.n.localeCompare(b.n, 'fr'))
  }, [ressources, couche])
  const nbRes = typeRes ? typesRes.find(t => t.k === typeRes)?.nb ?? 0 : typesRes.reduce((a, t) => a + t.nb, 0)

  const basculerCategorie = (id: string) => setActives(a => {
    const s = new Set(a)
    if (s.has(id)) s.delete(id); else s.add(id)
    return s
  })

  const copierLien = (sel: Selection) => {
    const suite = sel.m ? sel.m.id : suivi ? `objet/${suivi.objet.s}` : ''
    const url = `${location.origin}${location.pathname}#guides/elden-ring/carte/${suite}`
    navigator.clipboard?.writeText(url).catch(() => undefined)
  }

  const choisirSection = (i: number | null) => {
    setSection(i)
    cadrageFait.current = ''
  }

  const groupesCat = ['Lieux', 'Objets', 'Divers'] as const
  const ptsSuivi = suivi ? suivi.sections.reduce((a, s) => a + s.points.length, 0) : 0
  const ptsSous = suivi ? suivi.sections.reduce((a, s) => a + s.points.filter(p => p.s === 1).length, 0) : 0
  const secChoisie = suivi && section !== null ? suivi.sections[section] : null
  const chargementSuivi = !!demande && !suivi && !absent

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
            {resultatsObjets.length > 0 && <li className="erc-titre-res">Objets (tous leurs emplacements)</li>}
            {resultatsObjets.map(o => (
              <li key={`o-${o.s}`}>
                <a href={`${LIEN_CARTE_OBJET}/${o.s}`} onClick={() => setPanneau(false)}>
                  {o.i !== undefined ? <img src={`${BASE_OBJETS}min/${o.i}.webp`} alt="" width={26} height={26} /> : <Pastille categorie="objets-cles" />}
                  <span><b>{o.n}</b><small>{o.ou?.filter(aDesCibles).length} {(o.ou?.filter(aDesCibles).length ?? 0) > 1 ? 'sources' : 'source'} sur la carte</small></span>
                </a>
              </li>
            ))}
            {resultatsObjets.length > 0 && resultats.length > 0 && <li className="erc-titre-res">Repères</li>}
            {resultats.length === 0 && resultatsObjets.length === 0 && <li className="erc-vide">Aucun résultat.</li>}
            {resultats.map(m => (
              <li key={m.id}>
                <button type="button" onClick={() => { if (suivi) location.hash = `#guides/elden-ring/carte/${m.id}`; else aller(m) }}>
                  <Pastille categorie={m.c} />
                  <span><b>{m.n}{m.q ? ` ×${m.q}` : ''}</b><small>{m.z ? `Dans : ${m.z}` : m.pres ? `Près de : ${m.pres}` : PAR_ID.get(m.c)?.nom}{m.s ? ' · souterrain' : ''}</small></span>
                </button>
              </li>
            ))}
          </ul>
        ) : suivi ? (
          <div className="erc-suivi">
            <div className="erc-suivi-tete">
              {suivi.objet.i !== undefined ? <img src={`${BASE_OBJETS}min/${suivi.objet.i}.webp`} alt="" width={56} height={56} /> : <Pastille categorie="objets-cles" taille={48} />}
              <div>
                <span className="erc-cat" style={{ color: OR }}>Objet suivi</span>
                <h2>{suivi.objet.n}</h2>
                <a href={`${LIEN_OBJETS}/${suivi.objet.s}`}><BookOpen size={13} /> Fiche de l'objet</a>
              </div>
            </div>
            <p className="erc-suivi-compte">
              {ptsSuivi ? <>{pluriel(ptsSuivi, 'endroit')} sur la carte{ptsSous ? <> · dont {ptsSous} sous terre</> : null}</> : 'Rien à montrer sur la carte pour cet objet.'}
            </p>
            {ptsSous > 0 && ptsSous < ptsSuivi && (
              <div className="erc-couches" role="group" aria-label="Couche de la carte">
                {COUCHES.map((c, i) => (
                  <button key={c.id} type="button" aria-pressed={couche === i} onClick={() => { setCouche(i as 0 | 1); setChoisi(null) }}>
                    {i === 0 ? <Mountain size={15} /> : <span className="erc-sous" aria-hidden="true">⌄</span>} {c.nom} <small>{i ? ptsSous : ptsSuivi - ptsSous}</small>
                  </button>
                ))}
              </div>
            )}
            <h3 className="erc-suivi-titre">Où l'obtenir</h3>
            <ul className="erc-sections">
              {suivi.sections.map((sec, i) => (
                <li key={i}>
                  {sec.points.length ? (
                    <button type="button" aria-pressed={section === i} onClick={() => choisirSection(section === i ? null : i)}>
                      {sec.via && sec.img !== undefined ? <img src={`${BASE_OBJETS}min/${sec.img}.webp`} alt="" width={26} height={26} /> : <span className="erc-puce" />}
                      <span><b>{sec.titre}</b>{sec.detail && <small>{sec.detail}</small>}</span>
                      <span className="erc-nb">{sec.points.length}</span>
                    </button>
                  ) : (
                    <div className="erc-section-texte"><b>{sec.titre}</b>{sec.detail && <small>{sec.detail}</small>}</div>
                  )}
                  {section === i && sec.points.length > 1 && sec.points.length <= 40 && (
                    <ol className="erc-endroits">
                      {sec.points.map((p, j) => {
                        const g = graceDe({ ...p, pres: p.pres ?? p.m?.pres }, graces)
                        return (
                          <li key={j}>
                            <button type="button" onClick={() => {
                              setCouche(p.s)
                              setChoisi(selectionSuivi(p, sec, suivi.objet))
                              setPanneau(false)
                              setTimeout(() => carte.current && voler(carte.current, p.x, p.y), 80)
                            }}>
                              {p.z ? `Dans ${p.z}` : g ? `Près de ${g.n}` : 'Endroit'}{regions[g?.id ?? ''] ? <small>{regions[g!.id]}{p.s ? ' · souterrain' : ''}</small> : null}
                            </button>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </li>
              ))}
            </ul>
            {secChoisie && <button type="button" className="erc-tout" onClick={() => choisirSection(null)}>Montrer toutes les sources</button>}
            <a className="erc-quitter" href="#guides/elden-ring/carte"><ArrowLeft size={14} /> Revenir à la carte complète</a>
          </div>
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
                    const res = c.id === 'ressources'
                    const total = res ? nbRes : compte.total.get(c.id) ?? 0
                    return (
                      <li key={c.id}>
                        <button type="button" aria-pressed={actives.has(c.id)} onClick={() => basculerCategorie(c.id)} disabled={!total && !res}>
                          <Pastille categorie={c.id} />
                          <span className="erc-nom">{c.nom}</span>
                          <span className="erc-nb">{res ? (ressources ? total.toLocaleString('fr-FR') : '') : `${compte.faits.get(c.id) ?? 0}/${total}`}</span>
                        </button>
                        {res && actives.has('ressources') && (
                          <label className="erc-type-res">
                            <span>Type de ressource</span>
                            <select value={typeRes} onChange={e => setTypeRes(e.target.value)} disabled={!ressources}>
                              <option value="">{ressources ? 'Toutes' : 'Chargement…'}</option>
                              {typesRes.filter(t => t.nb).map(t => <option key={t.k} value={t.k}>{t.n} ({t.nb})</option>)}
                            </select>
                          </label>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
            <p className="erc-note">
              Positions extraites des fichiers du jeu (version 1.16, jeu de base). Clique sur un repère pour le détail ; tes trouvailles restent enregistrées dans ce navigateur.
              Pour un objet précis (même vendu, lâché ou fabriqué), cherche-le ci-dessus ou ouvre sa fiche dans l'encyclopédie.
            </p>
          </>
        )}
      </aside>

      <div className="erc-zone">
        <div ref={boite} className="erc-leaflet" />
        <button type="button" className="erc-filtres" onClick={() => setPanneau(v => !v)} aria-expanded={panneau}>
          <SlidersHorizontal size={16} /> {suivi ? 'Sources de l\'objet' : 'Filtres et recherche'}
        </button>
        {!donnees && !erreur && <div className="erc-etat">Chargement de la carte…</div>}
        {chargementSuivi && donnees && <div className="erc-etat">Recherche des emplacements de l'objet…</div>}
        {erreur && <div className="erc-etat">Impossible de charger les repères de la carte.</div>}
        {absent && (
          <div className="erc-absent" role="status">
            « {absent} » n'est pas encore placé sur la carte.
            <button type="button" onClick={() => setAbsent('')} aria-label="Fermer"><X size={14} /></button>
          </div>
        )}
        {suivi && (
          <div className="erc-bandeau" role="status">
            {suivi.objet.i !== undefined && <img src={`${BASE_OBJETS}min/${suivi.objet.i}.webp`} alt="" width={30} height={30} />}
            <span><b>{suivi.objet.n}</b><small>{secChoisie ? `${secChoisie.titre} · ${pluriel(secChoisie.points.length, 'endroit')}` : `${pluriel(ptsSuivi, 'endroit')} · ${suivi.sections.length > 1 ? `${suivi.sections.length} sources` : '1 source'}`}</small></span>
            <a href="#guides/elden-ring/carte" aria-label="Quitter le mode objet" title="Revenir à la carte complète"><X size={15} /></a>
          </div>
        )}
        <span className="erc-credit">Carte et données © FromSoftware / Bandai Namco · extraites du jeu</span>

        {choisi && (
          <section className="erc-carte" aria-label={choisi.titre}>
            <button type="button" className="erc-fermer" onClick={() => setChoisi(null)} aria-label="Fermer"><X size={16} /></button>
            <div className="erc-tete">
              {choisi.img !== undefined
                ? <img src={`${BASE_OBJETS}min/${choisi.img}.webp`} alt="" width={52} height={52} />
                : choisi.ico
                  ? <img src={`${BASE}icones/${choisi.ico}.webp`} alt="" width={52} height={52} />
                  : <Pastille categorie={choisi.cat ?? 'objets-cles'} taille={44} />}
              <div>
                <span className="erc-cat" style={{ color: choisi.couleur }}>{choisi.sur}</span>
                <h2>{choisi.titre}{choisi.q ? <small> ×{choisi.q}</small> : null}</h2>
                {choisi.en && choisi.en !== choisi.titre && <span className="erc-en">{choisi.en}</span>}
              </div>
            </div>
            {choisi.lignes && choisi.lignes.length > 0 && (
              <ul className="erc-lignes">{choisi.lignes.map((t, k) => <li key={k}>{t}</li>)}</ul>
            )}
            <Chemin sel={choisi} graces={graces} regions={regions} />
            {choisi.plus && (
              <p className="erc-plus">
                <span>{choisi.plusTitre}</span>
                {choisi.plus.join(' · ')}
              </p>
            )}
            <div className="erc-actions">
              {choisi.m && (
                <button type="button" className={estTrouve(choisi.m) ? 'is-fait' : undefined} onClick={() => basculerTrouve(choisi.m!)}>
                  <Check size={15} /> {estTrouve(choisi.m) ? (choisi.m.c === 'boss' ? 'Battu' : 'Trouvé') : (choisi.m.c === 'boss' ? 'Marquer battu' : 'Marquer trouvé')}
                </button>
              )}
              {choisi.m?.f && <button type="button" onClick={() => setFiche(choisi.m!.f!)}><BookOpen size={15} /> Fiche du guide</button>}
              {choisi.objet && <a className="erc-lien-objet" href={`${LIEN_OBJETS}/${choisi.objet}`}><BookOpen size={15} /> Fiche de l'objet</a>}
              {choisi.objet && suivi?.objet.s !== choisi.objet && (
                <a className="erc-lien-objet" href={`${LIEN_CARTE_OBJET}/${choisi.objet}`} title="Tous les emplacements de cet objet"><IconeCarte size={15} /> Tous ses emplacements</a>
              )}
              {(choisi.m || suivi) && <button type="button" onClick={() => copierLien(choisi)} title="Copier le lien"><Link2 size={15} /></button>}
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
