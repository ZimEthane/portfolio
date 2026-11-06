// « Tu es ici » : la vraie carte du jeu en miniature, avec la zone du chapitre encadrée
// (remplace le petit schéma des régions en tête de chaque chapitre de la progression).
import zones from './apercu.json'

const IMG = `${import.meta.env.BASE_URL}guides/elden-ring/img/`
const TAILLES = [{ id: 'surface', w: 9728, h: 9216 }, { id: 'souterrain', w: 6400, h: 6912 }]
type Zone = { c: 0 | 1; x0: number; y0: number; x1: number; y1: number }

export function remplacerMinimap(svg: SVGSVGElement, chapitre: string): () => void {
  const liste = (zones as Record<string, Zone[]>)[chapitre]
  if (!liste?.length) return () => undefined
  const couche = liste[0].c
  const t = TAILLES[couche]
  const div = document.createElement('div')
  div.className = 'er-apercu'
  div.style.aspectRatio = `${t.w} / ${t.h}`
  const img = document.createElement('img')
  img.src = `${IMG}apercu-${t.id}.webp`
  img.alt = couche ? 'Carte souterraine du jeu, zone du chapitre encadrée' : 'Carte du jeu, zone du chapitre encadrée'
  img.loading = 'lazy'
  div.appendChild(img)
  for (const z of liste.filter(z => z.c === couche)) {
    const r = document.createElement('i')
    r.style.left = `${(z.x0 / t.w) * 100}%`
    r.style.top = `${(z.y0 / t.h) * 100}%`
    r.style.width = `${((z.x1 - z.x0) / t.w) * 100}%`
    r.style.height = `${((z.y1 - z.y0) / t.h) * 100}%`
    div.appendChild(r)
  }
  svg.before(div)
  svg.classList.add('er-mc-remplace')
  return () => { div.remove(); svg.classList.remove('er-mc-remplace') }
}
