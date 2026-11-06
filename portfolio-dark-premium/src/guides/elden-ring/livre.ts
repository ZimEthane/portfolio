// Lit le guide d'origine (guide.html, la version web du PDF « Édition ultime ») et le découpe pour le site :
// sections (Les bases, Classes…), pages (chapitres) et titres de partie, avec leurs adresses.
// Pour mettre le guide à jour : remplacer guide.html par la nouvelle version, sans rien changer d'autre.
import brut from './guide.html?raw'
import cartesChapitres from './carte/cartes-chapitres.json'
import indexObjets from './objets/index.json'

export interface Titre { id: string; titre: string }

export interface PageLivre {
  slug: string // adresse : #guides/elden-ring/progression/chapitre-5
  surtitre: string // CHAPITRE 5, BIENVENUE…
  titre: string
  html: string // contenu de la page, prêt à afficher
  parties: Titre[] // titres de partie (h2), pour le sommaire de gauche
}

export interface SectionLivre {
  cle: string // classe d'origine : s1, s2…
  slug: string // bases, classes, progression…
  numero: number
  nom: string // texte de l'onglet : BASES, CLASSES…
  titre: string
  intro: string
  couleur: string
  pages: PageLivre[]
  parPage: boolean // beaucoup de pages (Progression) : une adresse par page plutôt que tout d'un coup
}

// Fiche détaillée d'un donjon (fenêtre qui s'ouvre au clic sur sa carte).
export interface Donjon {
  id: string // d05
  numero: string // D·05
  nom: string
  infos: string // Grotte · Nécrolimbe · ch. 1 · niv. 10–25
  carte: string // vignette de l'entrée, en grand
  repere: string // pastille posée au centre de la vignette (HTML d'origine)
  contenu: string // boss, note, objets (HTML d'origine)
  boss: string[] // fiches du bestiaire liées : b006…
  chapitre?: number
  cleFait?: string // case de l'index des donjons, pour cocher « fait » depuis la fiche
}

// Fiche détaillée d'un boss du bestiaire.
export interface Boss {
  id: string // b029
  numero: string // B·029
  nom: string
  genre: string // Boss majeur, Boss de donjon…
  etiquettes: { texte: string; genre: string }[] // Rune majeure (shard), Obligatoire (req)…
  region: string
  contenu: string // lieux, dégâts, faiblesses, conseil, butin (HTML d'origine, sans l'en-tête)
  donjons: string[] // donjons où on le combat : d06…
  chapitres: number[]
  cleBattu: string // case « Battu » de sa carte
}

export interface Couverture { badge: string; surtitre: string; titre: string; sousTitre: string; themes: string[]; pied: string; mention: string }

export interface Livre {
  couverture: Couverture
  sections: SectionLivre[]
  aVenir: string
  donjons: Donjon[]
  boss: Boss[]
  fiches: Map<string, string> // HTML d'une carte de donjon (d05) ou de boss (b006), par identifiant
}

const RACINE = '#guides/elden-ring'
const IMAGES = `${import.meta.env.BASE_URL}guides/elden-ring/` // images dans public/guides/elden-ring/img/

// Cartes des chapitres : emprise dans la grande carte du jeu (voir scripts/carte-elden-ring) et sites de grâce visibles.
interface Calage { s: number; x: number; y: number; e: number; w: number; h: number; graces: [number, number, string][] }
const CHAPITRES = cartesChapitres as unknown as Record<string, Calage>
const SVG = 'http://www.w3.org/2000/svg'
const FLAMME = 'M0,-4.6 C2.2,-2.4 3.2,-0.6 3.2,1.2 C3.2,3.2 1.7,4.6 0,4.6 C-1.7,4.6 -3.2,3.2 -3.2,1.2 C-3.2,-0.4 -2.2,-1.6 -1.2,-2.6 C-1,-1.2 -0.4,-0.4 0.4,-0.2 C0.6,-1.8 0.2,-3.2 0,-4.6Z'

// Ajoute les sites de grâce sous les repères du guide, et un lien vers la même zone de la carte interactive.
function enrichirCarte(doc: Document, image: Element, c: Calage) {
  const svg = image.closest('svg')
  if (!svg || svg.querySelector('.er-graces')) return
  const k = c.w / 900
  const g = doc.createElementNS(SVG, 'g')
  g.setAttribute('class', 'er-graces')
  for (const [x, y, nom] of c.graces) {
    const r = doc.createElementNS(SVG, 'g')
    r.setAttribute('transform', `translate(${x} ${y}) scale(${(1.25 * k).toFixed(2)})`)
    r.innerHTML = `<title>${nom.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title><circle r="6.4" fill="#1d1813" stroke="#e8c35a" stroke-width="1.3"/><path d="${FLAMME}" fill="#e8c35a"/>`
    g.appendChild(r)
  }
  image.after(g)
  const figure = svg.closest('figure')
  if (!figure || figure.querySelector('.er-carte-lien')) return
  const zoom = Math.max(2, Math.min(6, 6 - Math.log2((c.w * c.e) / 900)))
  const lien = doc.createElement('a')
  lien.className = 'er-carte-lien'
  lien.setAttribute('href', `#guides/elden-ring/carte/@${c.s},${Math.round(c.x + (c.w * c.e) / 2)},${Math.round(c.y + (c.h * c.e) / 2)},${zoom.toFixed(1)}`)
  lien.textContent = 'Voir cette zone sur la carte interactive'
  figure.appendChild(lien) // dans la figure : elle est parfois posée directement dans la page (voir noeuds)
}
const PX_PAR_MM = (15 / 9.6) * (72 / 25.4) // même agrandissement que livre.css (scripts/convertir-css-guide.mjs)
const PAGES_MAX_ENSEMBLE = 3 // au-delà, une section affiche ses pages une par une

export const slugifier = (texte: string) => texte
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const texte = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

// Empreinte courte d'un texte (djb2), pour les clés des cases à cocher.
const hacher = (t: string) => {
  let h = 5381
  for (let k = 0; k < t.length; k++) h = ((h << 5) + h + t.charCodeAt(k)) | 0
  return (h >>> 0).toString(36)
}

export function lienSection(s: SectionLivre) {
  return `${RACINE}/${s.slug}`
}

export function lienPage(s: SectionLivre, p: PageLivre, ancre?: string) {
  if (s.parPage) return `${RACINE}/${s.slug}/${p.slug}${ancre && ancre !== p.slug ? `/${ancre}` : ''}`
  return `${RACINE}/${s.slug}/${ancre ?? p.slug}`
}

function lire(): Livre {
  const doc = new DOMParser().parseFromString(brut, 'text/html')
  const pris = new Set(Array.from(doc.querySelectorAll('[id]'), e => e.id))
  const unique = (base: string, ensemble = pris) => {
    let id = base || 'partie', n = 2
    while (ensemble.has(id)) id = `${base}-${n++}`
    ensemble.add(id)
    return id
  }

  // ----- Sections : une page de couleur (section.divider) suivie de son contenu (div.sec) -----
  const brutes = Array.from(doc.querySelectorAll('section.divider')).map(div => {
    const contenu = div.nextElementSibling
    const onglet = div.querySelector('.tab')
    const nom = texte(onglet)
    const cle = Array.from(contenu?.classList ?? []).find(c => /^s\d+$/.test(c)) ?? ''
    const section = {
      cle,
      slug: slugifier(nom),
      numero: parseInt(texte(div.querySelector('.num')), 10),
      nom,
      titre: texte(div.querySelector('h2')),
      intro: texte(div.querySelector('.blurb')),
      couleur: (onglet as HTMLElement | null)?.style.color || '#96712a',
      ancien: div.id, // sec1…
      pages: [] as { slug: string; surtitre: string; titre: string; ancien: string; noeuds: Node[] }[],
    }
    // Chaque h1.chapter ouvre une page, qui va jusqu'au h1.chapter suivant.
    for (const noeud of Array.from(contenu?.childNodes ?? [])) {
      if (noeud instanceof Element && noeud.matches('h1.chapter')) {
        const surtitre = texte(noeud.querySelector('.ch-label'))
        const titre = texte(noeud.querySelector('.ch-title'))
        const chapitre = surtitre.match(/^chapitre\s+(\d+)/i)
        const slug = unique(chapitre ? `chapitre-${chapitre[1]}` : slugifier(titre))
        section.pages.push({ slug, surtitre, titre, ancien: noeud.id, noeuds: [noeud] })
        noeud.id = slug
      } else if (section.pages.length) {
        section.pages[section.pages.length - 1].noeuds.push(noeud)
      }
    }
    return section
  })

  const sections: SectionLivre[] = brutes.map(s => ({
    cle: s.cle, slug: s.slug, numero: s.numero, nom: s.nom, titre: s.titre, intro: s.intro, couleur: s.couleur,
    parPage: s.pages.length > PAGES_MAX_ENSEMBLE,
    pages: s.pages.map(p => ({ slug: p.slug, surtitre: p.surtitre, titre: p.titre, html: '', parties: [] })),
  }))

  // ----- Titres de partie : une ancre lisible pour chaque h2 -----
  // Unique dans ce qui s'affiche ensemble : la page (section page par page) ou toute la section.
  brutes.forEach((s, i) => {
    let portee = new Set(pris)
    s.pages.forEach((p, j) => {
      if (sections[i].parPage) portee = new Set(pris)
      for (const n of p.noeuds) {
        if (!(n instanceof Element)) continue
        const h2s = n.matches('h2') ? [n] : Array.from(n.querySelectorAll('h2'))
        for (const h2 of h2s) {
          const copie = h2.cloneNode(true) as Element
          copie.querySelectorAll('small').forEach(e => e.remove()) // « 11 fiches » dans les titres du bestiaire
          const titre = texte(copie)
          if (!h2.id) h2.id = unique(slugifier(titre), portee)
          sections[i].pages[j].parties.push({ id: h2.id, titre })
        }
      }
    })
  })

  // ----- Où se trouve chaque ancre (D·15, B·029, h12…), pour réécrire les liens internes -----
  const cibles = new Map<string, string>()
  brutes.forEach((s, i) => {
    cibles.set(s.ancien, lienSection(sections[i]))
    s.pages.forEach((p, j) => {
      const page = sections[i].pages[j]
      if (p.ancien) cibles.set(p.ancien, lienPage(sections[i], page))
      cibles.set(page.slug, lienPage(sections[i], page))
      for (const n of p.noeuds) {
        if (!(n instanceof Element)) continue
        const avecId = [n, ...Array.from(n.querySelectorAll('[id]'))].filter(e => e.id && e !== p.noeuds[0])
        for (const e of avecId) cibles.set(e.id, lienPage(sections[i], page, e.id))
      }
    })
  })
  cibles.set('top', RACINE)

  // ----- Adaptations pour le site -----
  const contenu = brutes.flatMap(s => s.pages.flatMap(p => p.noeuds)).filter((n): n is Element => n instanceof Element)
  const tous = (sel: string) => contenu.flatMap(n => [...(n.matches(sel) ? [n] : []), ...Array.from(n.querySelectorAll(sel))])
  for (const a of tous('a[href^="#"]')) {
    const cible = cibles.get(a.getAttribute('href')!.slice(1))
    if (cible) a.setAttribute('href', cible)
  }
  for (const a of tous('a[href^="http"]')) {
    a.setAttribute('target', '_blank')
    a.setAttribute('rel', 'noreferrer')
  }
  for (const img of tous('img[src^="img/"]')) {
    img.setAttribute('src', IMAGES + img.getAttribute('src')!.replace(/\.jpg$/, '.webp'))
    img.setAttribute('loading', 'lazy')
    img.setAttribute('decoding', 'async')
  }
  for (const image of tous('image')) {
    const lien = image.getAttribute('href') ?? image.getAttribute('xlink:href') ?? ''
    if (lien.startsWith('img/')) image.setAttribute('href', IMAGES + lien.replace(/\.jpg$/, '.webp'))
    const calage = CHAPITRES[lien.match(/carte-\d+/)?.[0] ?? '']
    if (calage) enrichirCarte(doc, image, calage)
  }
  // Noms d'objets en gras : ils mènent à leur fiche dans l'encyclopédie des objets.
  const objets = indexObjets as Record<string, string>
  for (const fort of tous('strong, b')) {
    if (fort.closest('a, h1, h2, h3, h4, h5, .label, .tag, svg')) continue
    const nom = (fort.textContent ?? '').replace(/[’‘]/g, "'").replace(/\s*[×x]\s*\d+$/, '').trim().toLowerCase()
    const cible = objets[nom] ?? objets[nom.replace(/\s*\(.*\)$/, '')]
    if (!cible) continue
    const lien = doc.createElement('a')
    lien.className = 'er-objet'
    lien.setAttribute('href', `#guides/elden-ring/objets/${cible}`)
    fort.replaceWith(lien)
    lien.appendChild(fort)
  }
  for (const el of tous('[style*="mm"]')) {
    el.setAttribute('style', el.getAttribute('style')!.replace(/(\d*\.?\d+)mm/g, (_, n) => `${Math.round(parseFloat(n) * PX_PAR_MM)}px`))
  }
  // Les tableaux défilent sur le côté s'ils ne tiennent pas sur un petit écran.
  for (const table of tous('table')) {
    const cadre = doc.createElement('div')
    cadre.className = 'er-tableau-defile'
    table.replaceWith(cadre)
    cadre.appendChild(table)
    // Si le tableau était directement dans la page, la page garde désormais le cadre à sa place.
    for (const s of brutes) for (const p of s.pages) {
      const i = p.noeuds.indexOf(table)
      if (i !== -1) p.noeuds[i] = cadre
    }
  }

  // ----- Cases à cocher (checklists, index des donjons, objets légendaires) -----
  // Dans le guide imprimable, ce sont de simples carrés. Ici chacune devient une vraie case, avec une clé
  // tirée de son texte et de sa liste : la progression enregistrée survit à une mise à jour du guide.
  const titreSeul = (el: Element) => {
    const copie = el.cloneNode(true) as Element
    copie.querySelectorAll('span, small').forEach(e => e.remove()) // « carte au chapitre 1 · 63 objets »
    return texte(copie)
  }
  brutes.forEach((s, i) => {
    const vues = new Map<string, number>()
    let titre = ''
    for (const p of s.pages) for (const racine of p.noeuds) {
      if (!(racine instanceof Element)) continue
      const parcours = doc.createTreeWalker(racine, NodeFilter.SHOW_ELEMENT)
      for (let n: Node | null = racine; n; n = parcours.nextNode()) {
        const el = n as Element
        if (/^H[1-3]$/.test(el.tagName)) titre = titreSeul(el)
        if (!el.matches('span.box')) continue
        const ligne = el.closest('li, tr')
        if (!ligne) continue
        const base = [sections[i].slug, titre, texte(el.closest('.clb')?.querySelector('.clh')), texte(ligne)].join('|')
        const fois = (vues.get(base) ?? 0) + 1
        vues.set(base, fois)
        el.setAttribute('data-coche', hacher(`${base}|${fois}`))
        el.setAttribute('role', 'checkbox')
        el.setAttribute('aria-checked', 'false')
        el.setAttribute('tabindex', '0')
        el.setAttribute('aria-label', texte(ligne).slice(0, 120))
        ligne.classList.add('er-cochable')
      }
    }
  })

  // ----- Fiches des donjons et des boss, pour la fenêtre de détail (cartes encore sans boutons) -----
  const fiches = new Map<string, string>()
  for (const el of tous('article.dcard[id], article.bcard[id]')) fiches.set(el.id, el.outerHTML)
  const cleDe = new Map<string, string>() // d05 → clé de sa case dans l'index des donjons
  for (const li of tous('.didx li')) {
    const id = li.querySelector('a')?.getAttribute('href')?.split('/').pop()
    const cle = li.querySelector<HTMLElement>('[data-coche]')?.dataset.coche
    if (id && cle) cleDe.set(id, cle)
  }
  const donjons: Donjon[] = tous('article.dcard[id]').map(carte => {
    const infos = texte(carte.querySelector('.dmeta'))
    const chapitre = infos.match(/ch\.\s*(\d+)/)
    const morceaux = ['.dboss', '.dnote', '.ditems', '.dmore'].flatMap(sel => Array.from(carte.querySelectorAll(`:scope > ${sel}`), e => e.outerHTML))
    return {
      id: carte.id,
      numero: texte(carte.querySelector('.dnum')),
      nom: texte(carte.querySelector('h3')),
      infos,
      carte: carte.querySelector('.dmap img')?.getAttribute('src')?.replace('/donjons/', '/donjons/grand/') ?? '',
      repere: carte.querySelector('.dpin')?.outerHTML ?? '',
      contenu: morceaux.join(''),
      boss: Array.from(carte.querySelectorAll('.dboss a[href]'), a => a.getAttribute('href')!.split('/').pop()!).filter(id => fiches.has(id)),
      chapitre: chapitre ? parseInt(chapitre[1], 10) : undefined,
      cleFait: cleDe.get(carte.id),
    }
  })

  const GENRES: Record<string, string> = { 'k-main': 'Boss majeur', 'k-dungeon': 'Boss de donjon', 'k-field': 'Boss de terrain', 'k-gaol': 'Prison éternelle' }
  const regions = new Map<string, string>() // b029 → région (titre de groupe du bestiaire)
  let region = ''
  for (const el of tous('h2.grp, article.bcard[id]')) {
    if (el.matches('h2.grp')) region = texte(el.querySelector('span') ?? el) // « Château de Voilorage », sans « 1 fiche »
    else regions.set(el.id, region)
  }
  const boss: Boss[] = tous('article.bcard[id]').map(carte => {
    const nom = texte(carte.querySelector('h3'))
    const corps = Array.from(carte.children).filter(e => e.tagName !== 'HEADER')
    return {
      id: carte.id,
      numero: texte(carte.querySelector('.bnum')),
      nom,
      genre: GENRES[Array.from(carte.classList).find(c => c in GENRES) ?? ''] ?? 'Boss',
      etiquettes: Array.from(carte.querySelectorAll('header .btag'), e => ({ texte: texte(e), genre: Array.from(e.classList).find(c => c !== 'btag') ?? '' })),
      region: regions.get(carte.id) ?? '',
      contenu: corps.map(e => e.outerHTML).join(''),
      donjons: [...new Set(Array.from(carte.querySelectorAll('a[href]'), a => a.getAttribute('href')!.split('/').pop()!).filter(id => /^d\d+$/.test(id) && fiches.has(id)))],
      chapitres: [...new Set(Array.from(corps.map(texte).join(' ').matchAll(/ch\.\s*(\d+)/g), m => parseInt(m[1], 10)))].sort((a, b) => a - b),
      cleBattu: hacher(`bestiaire|battu|${nom}`),
    }
  })

  // ----- Les cartes de donjon et de boss ouvrent leur fiche ; les boss ont une case « Battu » -----
  const boutonDetail = (carte: Element) => {
    const bouton = doc.createElement('button')
    bouton.type = 'button'
    bouton.className = 'er-dcard-plus'
    bouton.textContent = 'Voir le détail ›'
    carte.appendChild(bouton)
  }
  tous('article.dcard[id]').forEach(boutonDetail)
  for (const b of boss) {
    const carte = doc.getElementById(b.id)
    if (!carte) continue
    const battu = doc.createElement('span')
    battu.className = 'er-battu'
    battu.innerHTML = '<span class="box"></span>Battu'
    const box = battu.firstElementChild!
    box.setAttribute('data-coche', b.cleBattu)
    box.setAttribute('role', 'checkbox')
    box.setAttribute('aria-checked', 'false')
    box.setAttribute('tabindex', '0')
    box.setAttribute('aria-label', `${b.nom} battu`)
    carte.querySelector('header')?.appendChild(battu)
    boutonDetail(carte)
  }

  brutes.forEach((s, i) => s.pages.forEach((p, j) => {
    sections[i].pages[j].html = p.noeuds.map(n => n instanceof Element ? n.outerHTML : n.textContent ?? '').join('')
  }))

  // ----- Couverture et sommaire -----
  const couv = doc.querySelector('section.cover')
  const pied = couv?.querySelector('.foot')
  const mention = texte(pied?.querySelector('b'))
  const couverture: Couverture = {
    badge: texte(couv?.querySelector('.badge')),
    surtitre: texte(couv?.querySelector('.kicker')),
    titre: texte(couv?.querySelector('h1')),
    sousTitre: texte(couv?.querySelector('.sub')),
    themes: (couv?.querySelector('.topics')?.innerHTML ?? '').split(/<br\s*\/?>/i).map(t => t.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean),
    pied: texte(pied).replace(mention, '').trim(),
    mention,
  }

  return { couverture, sections, aVenir: texte(doc.querySelector('.toc2 .soon')), donjons, boss, fiches }
}

let cache: Livre | null = null
export function livre(): Livre {
  if (!cache) cache = lire()
  return cache
}
