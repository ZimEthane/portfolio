// Petites cartes zoomables (Leaflet + tuiles de la carte du jeu) pour le guide :
// elles remplacent les cartes figées des chapitres et des fiches de donjon.
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import calage from './calage.json'
import './miniCarte.css'
import { zoomFluide } from './zoomFluide'

const BASE = `${import.meta.env.BASE_URL}guides/elden-ring/carte/`
const NATIF = 6 // zoom où 1 pixel d'écran = 1 pixel de la grande carte (1 m)
const COUCHES = [{ id: 'surface', w: 9728, h: 9216 }, { id: 'souterrain', w: 6400, h: 6912 }]
const FLAMME = 'M0,-4.6 C2.2,-2.4 3.2,-0.6 3.2,1.2 C3.2,3.2 1.7,4.6 0,4.6 C-1.7,4.6 -3.2,3.2 -3.2,1.2 C-3.2,-0.4 -2.2,-1.6 -1.2,-2.6 C-1,-1.2 -0.4,-0.4 0.4,-0.2 C0.6,-1.8 0.2,-3.2 0,-4.6Z'

interface Repere { id: string; c: string; n: string; s: 0 | 1; x: number; y: number; f?: string }
let donnees: Promise<Repere[]> | null = null
const chargerDonnees = () => (donnees ??= fetch(`${BASE}donnees.json`).then(r => r.json()).then((d: { marqueurs: Repere[] }) => d.marqueurs).catch(() => []))

/** Position sur la grande carte d'une fiche du guide (donjon d05, boss b029). */
export async function positionFiche(id: string) {
  const d = await chargerDonnees()
  return d.find(m => m.f === id && m.c === 'lieux') ?? d.find(m => m.f === id) ?? null
}

export interface Pin { x: number; y: number; texte: string; couleur?: string; encre?: string; bord?: string; forme?: 'rond' | 'losange' | 'carre'; titre?: string }
export interface Etiquette { x: number; y: number; texte: string }
interface Options {
  couche: 0 | 1
  bornes?: [[number, number], [number, number]] // pixels de la grande carte : [[x0, y0], [x1, y1]]
  centre?: [number, number]
  zoom?: number
  pins?: Pin[]
  etiquettes?: Etiquette[]
  lien?: string // « Ouvrir sur la carte interactive »
}

const tactile = () => window.matchMedia('(pointer: coarse)').matches

export function creerMiniCarte(boite: HTMLElement, o: Options): () => void {
  const couche = COUCHES[o.couche]
  const div = document.createElement('div')
  div.className = 'er-mc-carte'
  boite.appendChild(div)
  const doigt = tactile()
  const map = L.map(div, {
    crs: L.CRS.Simple, minZoom: 1, maxZoom: 7.5, zoomSnap: 0.25, zoomDelta: 0.5, attributionControl: false,
    scrollWheelZoom: false, dragging: !doigt, zoomControl: false,
  })
  L.control.zoom({ position: 'topright', zoomInTitle: 'Zoomer', zoomOutTitle: 'Dézoomer' }).addTo(map)
  const P = (x: number, y: number) => map.unproject([x, y], NATIF)
  const toute = L.latLngBounds(P(0, couche.h), P(couche.w, 0))
  L.tileLayer(`${BASE}${couche.id}/{z}/{x}/{y}.webp`, {
    tileSize: 256, minZoom: 1, maxZoom: 7.5, minNativeZoom: 0, maxNativeZoom: NATIF, bounds: toute, noWrap: true, keepBuffer: 2,
  }).addTo(map)
  map.setMaxBounds(toute.pad(0.1))
  if (o.bornes) {
    // Carte d'un chapitre : elle s'ouvre cadrée sur la zone, comme une image ; on peut zoomer pour voir les repères
    // de près, mais pas dézoomer au-delà de la zone ni s'en éloigner.
    const b = L.latLngBounds(P(o.bornes[0][0], o.bornes[1][1]), P(o.bornes[1][0], o.bornes[0][1]))
    const cadrer = () => {
      const z = map.getBoundsZoom(b, false, L.point(12, 12))
      map.setMinZoom(z)
      if (map.getZoom() < z) map.setZoom(z, { animate: false })
    }
    map.fitBounds(b, { animate: false, padding: [6, 6] })
    map.setMaxBounds(b.pad(0.08))
    cadrer()
    map.on('resize', cadrer)
  } else if (o.centre) map.setView(P(o.centre[0], o.centre[1]), o.zoom ?? 5, { animate: false })

  // Sites de grâce du jeu dans la zone (sous les repères).
  chargerDonnees().then(d => {
    if (!map.getContainer().isConnected) return
    const vue = map.getBounds().pad(0.6)
    for (const g of d) {
      if (g.c !== 'graces' || g.s !== o.couche) continue
      const ll = P(g.x, g.y)
      if (!vue.contains(ll)) continue
      L.marker(ll, {
        icon: L.divIcon({ className: 'er-mc-grace', iconSize: [13, 13], html: `<svg viewBox="-7 -7 14 14" width="13" height="13"><circle r="6.4" fill="#1d1813" stroke="#e8c35a" stroke-width="1.3"/><path d="${FLAMME}" fill="#e8c35a"/></svg>` }),
        keyboard: false, zIndexOffset: -100,
      }).bindTooltip(g.n, { direction: 'top', offset: [0, -8], className: 'er-mc-bulle' }).addTo(map)
    }
  })
  for (const e of o.etiquettes ?? []) {
    L.marker(P(e.x, e.y), { icon: L.divIcon({ className: 'er-mc-etiquette', iconSize: [0, 0], html: `<span>${e.texte}</span>` }), interactive: false, keyboard: false }).addTo(map)
  }
  for (const p of o.pins ?? []) {
    const m = L.marker(P(p.x, p.y), {
      icon: L.divIcon({
        className: 'er-mc-pin', iconSize: [28, 28],
        html: `<span class="f-${p.forme ?? 'rond'}" style="--fond:${p.couleur ?? '#a07a2c'};--bord:${p.bord ?? '#f4ede0'};color:${p.encre ?? '#fff'}">${p.texte}</span>`,
      }),
      zIndexOffset: 500, title: p.titre ? `${p.texte}. ${p.titre}` : p.texte,
    }).addTo(map)
    if (p.titre) m.bindTooltip(`<b>${p.texte}</b> ${p.titre}`, { direction: 'top', offset: [0, -14], className: 'er-mc-bulle' })
  }

  // Molette : seulement après un clic sur la carte (sinon la page ne défile plus). Au doigt : bouton pour explorer.
  const molette = zoomFluide(map)
  const activer = () => { molette.activer(); map.dragging.enable(); div.classList.add('is-active') }
  map.on('click focus', activer)
  map.on('mouseout', () => { if (!doigt) { molette.desactiver(); div.classList.remove('is-active') } })
  if (doigt) {
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'er-mc-explorer'; b.textContent = 'Toucher pour explorer la carte'
    b.addEventListener('click', () => { activer(); b.remove() })
    div.appendChild(b)
  }
  if (o.lien) {
    const a = document.createElement('a')
    a.className = 'er-mc-lien'; a.href = o.lien; a.textContent = 'Carte interactive'
    div.appendChild(a)
  }
  return () => { molette.detruire(); map.remove(); div.remove() }
}

/** Remplace une carte figée du guide (svg.realmap) par la même zone de la carte du jeu, zoomable, avec ses repères. */
export function remplacerSvg(svg: SVGSVGElement): () => void {
  const href = svg.querySelector('image')?.getAttribute('href') ?? ''
  const nom = href.match(/carte-\d+/)?.[0]
  const cal = nom ? (calage as unknown as Record<string, { c: string; M: number[][]; t: [number, number] }>)[`${nom}.webp`] : undefined
  if (!cal) return () => undefined
  const [[a, b, tx], [c, d, ty]] = cal.M
  const vers = (x: number, y: number): [number, number] => [a * x + b * y + tx, c * x + d * y + ty]
  const [w, h] = cal.t
  const legende = new Map<string, string>()
  svg.parentElement?.querySelectorAll('.pinlist .pi').forEach(pi => {
    const n = pi.querySelector('i')?.textContent?.trim()
    const t = pi.querySelector('span')?.textContent?.trim()
    if (n && t) legende.set(n, t)
  })
  // Repères numérotés : un nombre posé sur une forme (rond, losange ou carré), avec ses couleurs d'origine.
  const pins: Pin[] = []
  const FORMES: Record<string, Pin['forme']> = { circle: 'rond', path: 'losange', rect: 'carre' }
  svg.querySelectorAll('text').forEach(t => {
    const n = t.textContent?.trim() ?? ''
    const forme = t.previousElementSibling
    const f = forme ? FORMES[forme.tagName.toLowerCase()] : undefined
    if (!/^\d+$/.test(n) || !f || !forme) return
    const taille = Number(t.getAttribute('font-size')) || 16
    const [x, y] = vers(Number(t.getAttribute('x')), Number(t.getAttribute('y')) - taille * 0.36)
    pins.push({ x, y, texte: n, forme: f, couleur: forme.getAttribute('fill') ?? undefined, bord: forme.getAttribute('stroke') ?? undefined, encre: t.getAttribute('fill') ?? undefined, titre: legende.get(n) })
  })
  const etiquettes: Etiquette[] = []
  svg.querySelectorAll('rect + text').forEach(t => {
    if (/^\d+$/.test(t.textContent?.trim() ?? '')) return
    const [x, y] = vers(Number(t.getAttribute('x')), Number(t.getAttribute('y')))
    if (t.textContent) etiquettes.push({ x, y, texte: t.textContent })
  })
  const [x0, y0] = vers(0, 0), [x1, y1] = vers(w, h)
  const boite = document.createElement('div')
  boite.className = 'er-mc'
  boite.style.setProperty('--ratio', String(Math.min(1.45, Math.max(0.6, h / w))))
  svg.before(boite)
  svg.classList.add('er-mc-remplace')
  const centre = [Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2)]
  const fin = creerMiniCarte(boite, {
    couche: cal.c === 'surface' ? 0 : 1, bornes: [[x0, y0], [x1, y1]], pins, etiquettes,
    lien: `#guides/elden-ring/carte`,
  })
  boite.dataset.centre = centre.join(',')
  return () => { fin(); boite.remove(); svg.classList.remove('er-mc-remplace') }
}
