// Zoom fluide à la molette et au pavé tactile pour les cartes Leaflet du guide.
// Leaflet zoome par crans (0,5 niveau, animation CSS de 250 ms, puis rechargement) : la carte avance par à-coups.
// Ici, chaque cran déplace un « niveau visé » et la carte glisse vers lui image par image, centrée sur le curseur.
import L from 'leaflet'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Interne = any

export interface ZoomFluide {
  activer(): void
  desactiver(): void
  detruire(): void
}

export function zoomFluide(map: L.Map, { sensibilite = 1 } = {}): ZoomFluide {
  const m = map as Interne
  const boite = map.getContainer()
  let actif = false // la molette est-elle prise en charge (mini-cartes : seulement après un clic)
  let enCours = false // une glissade est-elle en cours
  let but = 0
  let souris = L.point(0, 0)
  let ancre = L.latLng(0, 0)
  let derniere = 0
  let image = 0
  let avant = 0

  const finir = () => {
    if (!enCours) return
    cancelAnimationFrame(image)
    enCours = false
    m._moveEnd(true)
  }

  const pas = (t: number) => {
    const z = map.getZoom()
    const ecart = but - z
    if (Math.abs(ecart) < 0.002) {
      if (t - derniere > 160) return finir()
    } else {
      // Rapprochement exponentiel, indépendant de la fréquence d'affichage (≈ 22 % de l'écart par image à 60 i/s).
      const dt = Math.min(64, t - (avant || t - 16.7))
      const k = 1 - Math.pow(0.78, dt / 16.7)
      const nz = Math.abs(ecart) < 0.004 ? but : z + ecart * k
      // Le point sous le curseur reste sous le curseur.
      let centre = map.unproject(map.project(ancre, nz).subtract(souris.subtract(map.getSize().divideBy(2))), nz)
      if (map.options.maxBounds) centre = m._limitCenter(centre, nz, map.options.maxBounds)
      m._move(centre, nz)
    }
    avant = t
    image = requestAnimationFrame(pas)
  }

  const roue = (e: WheelEvent) => {
    if (!actif) return
    e.preventDefault()
    e.stopPropagation()
    // Un cran de souris ≈ 0,45 niveau ; le pavé tactile envoie beaucoup de petits pas.
    const delta = Math.max(-60, Math.min(60, L.DomEvent.getWheelDelta(e)))
    if (!delta) return
    if (!enCours) {
      map.stop()
      enCours = true
      but = map.getZoom()
      avant = 0
      m._moveStart(true, false)
      image = requestAnimationFrame(pas)
    }
    souris = map.mouseEventToContainerPoint(e)
    ancre = map.containerPointToLatLng(souris)
    but = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), but + delta * 0.0075 * sensibilite))
    derniere = performance.now()
  }

  boite.addEventListener('wheel', roue, { passive: false })
  return {
    activer: () => { actif = true },
    desactiver: () => { actif = false; finir() },
    detruire: () => { actif = false; finir(); boite.removeEventListener('wheel', roue) },
  }
}

/** Repères dessinés sur canevas : redessinés pendant le zoom fluide (et le pincement) pour garder leur taille,
 *  au lieu d'être agrandis avec la carte puis de reprendre leur taille d'un coup à la fin. */
export function redessinerPendantZoom(map: L.Map, rendus: L.Renderer[]) {
  const m = map as Interne
  let dernier = 0
  const suivre = () => {
    if (m._animatingZoom) return // zoom animé des boutons : Leaflet s'en charge
    const t = performance.now()
    if (t - dernier < 12) return
    dernier = t
    for (const r of rendus as Interne[]) {
      if (!r._map) continue
      r._onZoomEnd() // positions et tailles des repères au nouveau zoom
      r._update() // canevas recalé sur la vue, puis tout est redessiné
    }
  }
  map.on('zoom', suivre)
  return () => { map.off('zoom', suivre) }
}
