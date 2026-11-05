// Lit le guide d'origine (guide.html, la version web du PDF « Édition ultime ») et le découpe pour le site :
// sections (Les bases, Classes…), pages (chapitres) et titres de partie, avec leurs adresses.
// Pour mettre le guide à jour : remplacer guide.html par la nouvelle version, sans rien changer d'autre.
import brut from './guide.html?raw'

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

export interface Couverture { badge: string; surtitre: string; titre: string; sousTitre: string; themes: string[]; pied: string; mention: string }

export interface Livre {
  couverture: Couverture
  sections: SectionLivre[]
  aVenir: string
}

const RACINE = '#guides/elden-ring'
const IMAGES = `${import.meta.env.BASE_URL}guides/elden-ring/` // images dans public/guides/elden-ring/img/
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

  return { couverture, sections, aVenir: texte(doc.querySelector('.toc2 .soon')) }
}

let cache: Livre | null = null
export function livre(): Livre {
  if (!cache) cache = lire()
  return cache
}
