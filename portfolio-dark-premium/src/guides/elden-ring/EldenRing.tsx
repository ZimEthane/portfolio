import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Download, Gem, LayoutGrid, Map as IconeCarte, ScrollText } from 'lucide-react'
import { animateScrollTo, scrollToId } from '../../scroll'
import { lienPage, lienSection, livre } from './livre'
import type { Livre, PageLivre, SectionLivre, Titre } from './livre'
import Fiche from './Fiche'
import { ecrireCoches, lireCoches } from './coches'
import { remplacerMinimap } from './carte/apercu'
import './livre.css'
import './elden-ring.css'

const Carte = lazy(() => import('./carte/Carte'))
const Objets = lazy(() => import('./objets/Objets'))
const Quetes = lazy(() => import('./quetes/Quetes'))

const deuxChiffres = (n: number) => String(n).padStart(2, '0')

// Le guide complet en PDF (la version imprimable), pour ceux qui veulent le garder ou l'imprimer.
const PDF = `${import.meta.env.BASE_URL}guides/elden-ring/Elden-Ring-Edition-Ultime.pdf`
const NOM_PDF = 'Elden-Ring-Edition-Ultime.pdf'

// ----- Couverture (page 1 du guide) -----
function Couverture({ livre: { couverture: c } }: { livre: Livre }) {
  return (
    <header className="er-couverture">
      <div className="er-couv-cadre">
        <span className="er-couv-badge">{c.badge}</span>
        <span className="er-couv-sur">{c.surtitre}</span>
        <h1>{c.titre}</h1>
        <p className="er-couv-sous">{c.sousTitre}</p>
        <span className="er-couv-filet" aria-hidden="true"><i /></span>
        <ul className="er-couv-liste">{c.themes.map(t => <li key={t}>{t}</li>)}</ul>
        <span className="er-couv-pied">{c.pied}</span>
        <span className="er-couv-mention">{c.mention}</span>
      </div>
    </header>
  )
}

// ----- Sommaire (page 2 du guide) -----
function Sommaire({ livre: l }: { livre: Livre }) {
  return (
    <section className="er-sommaire-page" aria-labelledby="er-sommaire-titre">
      <h2 id="er-sommaire-titre" className="er-titre-orne">Sommaire</h2>
      <span className="er-orne" aria-hidden="true"><i /></span>
      <ol className="er-sommaire-liste">
        {l.sections.map(s => (
          <li key={s.slug} style={{ '--sec': s.couleur } as CSSProperties}>
            <a className="er-sommaire-bandeau" href={lienSection(s)}>
              <span className="er-sommaire-num">{s.numero}</span>
              <span className="er-sommaire-nom">{s.titre}</span>
            </a>
            <ul className={s.pages.length > 6 ? 'er-sommaire-pages is-colonnes' : 'er-sommaire-pages'}>
              {s.pages.map(p => (
                <li key={p.slug}>
                  <a href={lienPage(s, p)}><span className="er-sommaire-sur">{p.surtitre}</span><span>{p.titre}</span></a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {l.aVenir && <p className="er-a-venir">{l.aVenir}</p>}
      <p className="er-sommaire-note">Tout est cliquable : sommaire, renvois D·00 vers les donjons et B·000 vers les boss.</p>
    </section>
  )
}

// ----- Intercalaire de section (pages de couleur : 03, Section 3, Progression…) -----
function Intercalaire({ section }: { section: SectionLivre }) {
  return (
    <header className="er-intercalaire">
      <div className="er-inter-cadre">
        <span className="er-inter-numero" aria-hidden="true">{deuxChiffres(section.numero)}</span>
        <span className="er-inter-sur">Section {section.numero}</span>
        <p className="er-inter-titre">{section.titre}</p>
        <span className="er-inter-filet" aria-hidden="true" />
        <p className="er-inter-intro">{section.intro}</p>
        <ul className={section.pages.length > 6 ? 'is-colonnes' : undefined}>
          {section.pages.map(p => (
            <li key={p.slug}><a href={lienPage(section, p)}><span>{p.surtitre}</span>{p.titre}</a></li>
          ))}
        </ul>
      </div>
    </header>
  )
}

// ----- Sommaire de gauche : sections, pages de la section ouverte, parties des pages affichées -----
function Navigation({ livre: l, section, affichees, actif, onChoix }: {
  livre: Livre; section: SectionLivre; affichees: PageLivre[]; actif: string; onChoix?: () => void
}) {
  return (
    <nav className="er-nav" aria-label="Sommaire du guide">
      <a className="er-nav-guide" href="#guides/elden-ring" onClick={onChoix}><BookOpen size={15} /> Elden Ring · sommaire</a>
      <ol>
        {l.sections.map(s => {
          const ouverte = s === section
          return (
            <li key={s.slug} className={ouverte ? 'is-ouverte' : undefined} style={{ '--sec': s.couleur } as CSSProperties}>
              <a className="er-nav-section" href={lienSection(s)} aria-current={ouverte && !s.parPage ? 'page' : undefined} onClick={onChoix}>
                <span className="er-nav-num">{s.numero}</span>
                <span>{s.titre}</span>
              </a>
              {ouverte && (
                <ul className="er-nav-pages">
                  {s.pages.map(p => {
                    const visible = affichees.includes(p)
                    return (
                      <li key={p.slug}>
                        <a href={lienPage(s, p)} className={actif === p.slug || (s.parPage && visible) ? 'is-actif' : undefined} aria-current={s.parPage && visible ? 'page' : undefined} onClick={onChoix}>
                          {s.parPage && /^chapitre/i.test(p.surtitre) && <small>{p.surtitre.replace(/^Chapitre\s+/i, 'Ch. ')}</small>}{p.titre}
                        </a>
                        {visible && p.parties.length > 0 && (
                          <ul>
                            {p.parties.map(t => (
                              <li key={t.id}><a href={lienPage(s, p, t.id)} className={actif === t.id ? 'is-actif' : undefined} onClick={onChoix}>{t.titre}</a></li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ----- Onglets de couleur sur le bord droit, comme dans le PDF -----
function Onglets({ livre: l, actuelle }: { livre: Livre; actuelle?: SectionLivre }) {
  return (
    <nav className="er-onglets" aria-label="Sections du guide">
      {l.sections.map(s => (
        <a key={s.slug} href={lienSection(s)} style={{ '--sec': s.couleur } as CSSProperties} className={s === actuelle ? 'is-actuel' : undefined} aria-current={s === actuelle ? 'page' : undefined} title={s.titre}>
          {s.nom}
        </a>
      ))}
    </nav>
  )
}

// Titre (page ou partie) en cours de lecture : le dernier passé sous le haut de l'écran.
function useActif(ids: string[]) {
  const [actif, setActif] = useState('')
  const cle = ids.join('|')
  useEffect(() => {
    if (!ids.length) return
    let frame = 0
    const calcul = () => {
      frame = 0
      let courant = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < 140) courant = id
      }
      // Tout en bas de la page, les derniers titres ne peuvent plus remonter : on prend le dernier visible.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        const visible = [...ids].reverse().find(id => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) < window.innerHeight - 80)
        if (visible) courant = visible
      }
      setActif(courant)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(calcul) }
    calcul()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [cle])
  return actif
}

// Compteur « 12 / 63 » à côté du titre d'une liste (attribut lu par le CSS).
function compter(titre: Element | null | undefined, groupe: Element | null | undefined) {
  if (!(titre instanceof HTMLElement) || !groupe) return
  const cases = groupe.querySelectorAll('[data-coche]')
  if (!cases.length) return
  titre.dataset.compte = `${groupe.querySelectorAll('[data-coche][aria-checked="true"]').length} / ${cases.length}`
}

// Le contenu d'origine du guide, tel quel (voir livre.ts), avec ses cases à cocher.
function Contenu({ livre: l, section, pages }: { livre: Livre; section: SectionLivre; pages: PageLivre[] }) {
  const html = useMemo(() => pages.map(p => p.html).join(''), [pages])
  const [ouvert, setOuvert] = useState<string | null>(null) // fiche détaillée ouverte : donjon (d05) ou boss (b029)
  const fermer = useCallback(() => setOuvert(null), [])
  const racine = useRef<HTMLDivElement>(null)
  const [coches, setCoches] = useState(lireCoches)
  const [compte, setCompte] = useState({ faits: 0, total: 0 })
  const [confirmer, setConfirmer] = useState(false)

  // Reporte l'état des cases sur le contenu affiché et met les compteurs à jour.
  useEffect(() => {
    const el = racine.current
    if (!el) return
    const cases = Array.from(el.querySelectorAll<HTMLElement>('[data-coche]'))
    let faits = 0
    for (const c of cases) {
      const oui = coches.has(c.dataset.coche!)
      c.setAttribute('aria-checked', String(oui))
      c.closest('.er-cochable, .bcard')?.classList.toggle('is-coche', oui)
      if (oui) faits++
    }
    el.querySelectorAll('h3.clmap').forEach(h => compter(h, h.nextElementSibling)) // checklist 100 %, par carte
    el.querySelectorAll('.didx-g').forEach(g => compter(g.querySelector('h5'), g)) // index des donjons, par région
    setCompte({ faits, total: cases.length })
  }, [coches, html])

  // Cartes des chapitres : la même zone sur la carte du jeu, zoomable (chargée à part, avec Leaflet).
  useEffect(() => {
    const el = racine.current
    const svgs = el ? Array.from(el.querySelectorAll<SVGSVGElement>('svg.realmap')) : []
    if (!svgs.length) return
    let annule = false
    const fins: (() => void)[] = []
    import('./carte/miniCarte').then(({ remplacerSvg }) => {
      if (!annule) svgs.forEach(sv => fins.push(remplacerSvg(sv)))
    })
    return () => { annule = true; fins.forEach(f => f()) }
  }, [html])

  // « Tu es ici » : la vraie carte en miniature, zone du chapitre encadrée.
  useEffect(() => {
    const el = racine.current
    if (!el || pages.length !== 1) return
    const fins = Array.from(el.querySelectorAll<SVGSVGElement>('.minimap svg.regionmap.mini'), sv => remplacerMinimap(sv, pages[0].slug))
    return () => fins.forEach(f => f())
  }, [html, pages])

  useEffect(() => {
    if (!confirmer) return
    const t = setTimeout(() => setConfirmer(false), 4000)
    return () => clearTimeout(t)
  }, [confirmer])

  const changer = (cles: string[], cocher: boolean) => setCoches(avant => {
    const suite = new Set(avant)
    cles.forEach(k => cocher ? suite.add(k) : suite.delete(k))
    ecrireCoches(suite)
    return suite
  })
  const basculer = (c: HTMLElement) => changer([c.dataset.coche!], c.getAttribute('aria-checked') !== 'true')

  // Clic sur une case (ou sur « Battu ») : elle se coche. Clic sur une carte de donjon ou de boss : sa fiche s'ouvre.
  // Clic sur une ligne de checklist : sa case se coche. Rien ne se passe sur un lien, ou si on sélectionne du texte.
  const onClick = (e: MouseEvent) => {
    const cible = e.target as HTMLElement
    if (cible.closest('a') || window.getSelection()?.toString()) return
    const caseCliquee = cible.closest('.er-battu')?.querySelector<HTMLElement>('[data-coche]') ?? cible.closest<HTMLElement>('[data-coche]')
    if (caseCliquee) return basculer(caseCliquee)
    const carte = cible.closest<HTMLElement>('article.dcard[id], article.bcard[id]')
    if (carte) return setOuvert(carte.id)
    if (cible.closest('button')) return
    const c = cible.closest('.er-cochable')?.querySelector<HTMLElement>('[data-coche]')
    if (c) basculer(c)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>('[data-coche]')
    if (c && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault()
      basculer(c)
    }
  }
  const toutDecocher = () => {
    if (!confirmer) return setConfirmer(true)
    const cles = Array.from(racine.current?.querySelectorAll<HTMLElement>('[data-coche]') ?? [], c => c.dataset.coche!)
    changer(cles, false)
    setConfirmer(false)
  }

  return (
    <>
      {compte.total > 0 && (
        <div className="er-progression">
          <span className="er-prog-texte" aria-live="polite"><Check size={15} /><span><b>{compte.faits}</b> / {compte.total} {section.slug === 'bestiaire' ? 'boss battus' : 'cochés'}</span></span>
          <span className="er-prog-barre" aria-hidden="true"><i style={{ width: `${(compte.faits / compte.total) * 100}%` }} /></span>
          {compte.faits > 0 && (
            <button type="button" className={confirmer ? 'is-confirmer' : undefined} onClick={toutDecocher} title="Décoche toutes les cases de cette page">
              {confirmer ? 'Sûr ? Clique encore' : 'Tout décocher'}
            </button>
          )}
        </div>
      )}
      <div className="er-livre" ref={racine} onClick={onClick} onKeyDown={onKeyDown}>
        <div className={`sec ${section.cle}`} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      {ouvert && (
        <Fiche
          livre={l}
          id={ouvert}
          coches={coches}
          onCocher={cle => changer([cle], !coches.has(cle))}
          onOuvrir={setOuvert}
          onFermer={fermer}
        />
      )}
    </>
  )
}

// Ce que l'adresse demande : la section, les pages à afficher et l'ancre éventuelle.
function lireChemin(l: Livre, chemin: string) {
  const [idSection = '', a = '', b = ''] = chemin.split('/')
  const section = l.sections.find(s => s.slug === idSection)
  if (!section) return null
  if (!section.parPage) return { section, pages: section.pages, page: undefined, ancre: a }
  const page = section.pages.find(p => p.slug === a)
    // Ancre sans page (vieux lien) : on cherche la page qui la contient.
    ?? (a ? section.pages.find(p => p.parties.some(t => t.id === a) || p.html.includes(`id="${a}"`)) : undefined)
  if (!page) return { section, pages: [], page: undefined, ancre: '' }
  return { section, pages: [page], page, ancre: page.slug === a ? b : a }
}

function VueSection({ livre: l, section, pages, page }: { livre: Livre; section: SectionLivre; pages: PageLivre[]; page?: PageLivre }) {
  const ids = useMemo(() => pages.flatMap(p => [p.slug, ...p.parties.map((t: Titre) => t.id)]), [pages])
  const actif = useActif(ids)
  const [menuOuvert, setMenuOuvert] = useState(false)
  useEffect(() => setMenuOuvert(false), [section, page])

  // Bas de page : chapitre précédent / suivant dans une section page par page, sinon section précédente / suivante.
  const i = l.sections.indexOf(section)
  const j = page ? section.pages.indexOf(page) : -1
  const avant = page ? (j > 0 ? { lien: lienPage(section, section.pages[j - 1]), nom: section.pages[j - 1].titre, quoi: 'Chapitre précédent' } : { lien: lienSection(section), nom: section.titre, quoi: 'Retour à la section' })
    : l.sections[i - 1] && { lien: lienSection(l.sections[i - 1]), nom: l.sections[i - 1].titre, quoi: 'Section précédente' }
  const apres = page && j < section.pages.length - 1 ? { lien: lienPage(section, section.pages[j + 1]), nom: section.pages[j + 1].titre, quoi: 'Chapitre suivant' }
    : section.parPage && !page ? { lien: lienPage(section, section.pages[0]), nom: section.pages[0].titre, quoi: 'Commencer' }
      : l.sections[i + 1] && { lien: lienSection(l.sections[i + 1]), nom: l.sections[i + 1].titre, quoi: 'Section suivante' }

  return (
    <div className="er-mise" style={{ '--sec': section.couleur } as CSSProperties}>
      <aside className="er-cote">
        <Navigation livre={l} section={section} affichees={pages} actif={actif} />
      </aside>
      <div className="er-contenu">
        <details className="er-nav-mobile" open={menuOuvert} onToggle={e => setMenuOuvert((e.target as HTMLDetailsElement).open)}>
          <summary><BookOpen size={15} /> Sommaire du guide</summary>
          <Navigation livre={l} section={section} affichees={pages} actif={actif} onChoix={() => setMenuOuvert(false)} />
        </details>
        {!page && <Intercalaire section={section} />}
        {section.slug === 'quetes' && (
          <a className="er-pdf er-vers-quetes" href="#guides/elden-ring/quetes">
            <ScrollText size={18} />
            <span><strong>Guides de quêtes pas à pas</strong><small>Chaque quête étape par étape, avec une carte annotée à chaque étape</small></span>
          </a>
        )}
        {pages.length > 0 && <Contenu livre={l} section={section} pages={pages} />}
        <nav className="er-suite" aria-label="Pages voisines">
          {avant ? <a href={avant.lien}><ArrowLeft size={15} /><span><small>{avant.quoi}</small>{avant.nom}</span></a> : <span />}
          <a href="#guides/elden-ring" className="er-suite-sommaire"><LayoutGrid size={15} /> Sommaire</a>
          {apres ? <a href={apres.lien} className="er-suite-suivant"><span><small>{apres.quoi}</small>{apres.nom}</span><ArrowRight size={15} /></a> : <span />}
        </nav>
      </div>
    </div>
  )
}

export default function EldenRing({ chemin }: { chemin: string }) {
  const l = useMemo(livre, [])
  const surCarte = chemin === 'carte' || chemin.startsWith('carte/')
  const surObjets = /^objets(\/|\?|$)/.test(chemin)
  const surQuetes = /^quetes(\/|$)/.test(chemin)
  const vue = surCarte || surObjets || surQuetes ? null : lireChemin(l, chemin)
  const cle = surCarte ? 'carte' : surObjets || surQuetes ? chemin : vue ? `${vue.section.slug}/${vue.page?.slug ?? ''}` : ''
  const ancre = vue?.ancre ?? ''
  const precedente = useRef<string | null>(null)

  // Nouvelle page : on repart en haut (ou directement sur le titre demandé).
  // Même page : défilement doux jusqu'au titre demandé.
  useEffect(() => {
    const memePage = precedente.current === cle
    precedente.current = cle
    const cible = ancre ? document.getElementById(ancre) : null
    if (cible) {
      if (memePage) scrollToId(ancre)
      else window.scrollTo({ top: cible.getBoundingClientRect().top + window.scrollY - 100, behavior: 'instant' }) // même marge que scrollToId
    } else if (memePage) animateScrollTo(0)
    else window.scrollTo({ top: 0, behavior: 'instant' })
  }, [cle, ancre])

  if (surQuetes) {
    return (
      <main className="er er-sur-quetes">
        <div className="er-barre">
          <a className="er-retour" href="#guides/elden-ring"><ArrowLeft size={15} /> Sommaire du guide</a>
          <span className="er-fil">Elden Ring <i>/</i> <a href="#guides/elden-ring/quetes">Guides de quêtes</a></span>
        </div>
        <Suspense fallback={<div className="erc-attente">Chargement des quêtes…</div>}>
          <Quetes chemin={chemin} />
        </Suspense>
        <footer className="er-pied">
          <span>Elden Ring — Guides de quêtes · Positions extraites du jeu (jeu de base)</span>
          <span>{l.couverture.mention}</span>
        </footer>
      </main>
    )
  }

  if (surObjets) {
    return (
      <main className="er er-sur-objets">
        <div className="er-barre">
          <a className="er-retour" href="#guides/elden-ring"><ArrowLeft size={15} /> Sommaire du guide</a>
          <span className="er-fil">Elden Ring <i>/</i> <a href="#guides/elden-ring/objets">Encyclopédie des objets</a></span>
        </div>
        <Suspense fallback={<div className="erc-attente">Chargement des objets…</div>}>
          <Objets chemin={chemin} />
        </Suspense>
        <footer className="er-pied">
          <span>Elden Ring — Encyclopédie des objets · Données extraites du jeu (jeu de base)</span>
          <span>{l.couverture.mention}</span>
        </footer>
      </main>
    )
  }

  if (surCarte) {
    return (
      <main className="er er-sur-carte">
        <div className="er-barre">
          <a className="er-retour" href="#guides/elden-ring"><ArrowLeft size={15} /> Sommaire du guide</a>
          <span className="er-fil">Elden Ring <i>/</i> Carte interactive</span>
        </div>
        <Suspense fallback={<div className="erc-attente">Chargement de la carte…</div>}>
          <Carte livre={l} chemin={chemin} />
        </Suspense>
        <footer className="er-pied">
          <span>Elden Ring — Carte interactive · Positions extraites du jeu (jeu de base)</span>
          <span>{l.couverture.mention}</span>
        </footer>
      </main>
    )
  }

  return (
    <main className={vue ? 'er er-dans-section' : 'er'}>
      <div className="er-barre">
        <a className="er-retour" href={vue ? '#guides/elden-ring' : '#guides'}><ArrowLeft size={15} /> {vue ? 'Sommaire du guide' : 'Tous les guides'}</a>
        {vue && (
          <span className="er-fil">
            Elden Ring <i>/</i> {vue.page ? <a href={lienSection(vue.section)}>{vue.section.titre}</a> : vue.section.titre}
            {vue.page && <><i>/</i> {vue.page.surtitre}</>}
          </span>
        )}
      </div>
      {vue
        ? <VueSection livre={l} section={vue.section} pages={vue.pages} page={vue.page} />
        : (
          <div className="er-accueil">
            <Couverture livre={l} />
            <div className="er-acces">
              <a className="er-pdf" href="#guides/elden-ring/carte">
                <IconeCarte size={18} />
                <span><strong>Carte interactive</strong><small>Grâces, boss, donjons, objets · plus de 3 000 repères</small></span>
              </a>
              <a className="er-pdf" href="#guides/elden-ring/objets">
                <Gem size={18} />
                <span><strong>Encyclopédie des objets</strong><small>2 101 objets · statistiques, où les trouver</small></span>
              </a>
              <a className="er-pdf" href="#guides/elden-ring/quetes">
                <ScrollText size={18} />
                <span><strong>Guides de quêtes</strong><small>Pas à pas, avec une carte à chaque étape</small></span>
              </a>
              <a className="er-pdf" href={PDF} download={NOM_PDF}>
                <Download size={18} />
                <span><strong>Télécharger le guide en PDF</strong><small>Version imprimable · 118 pages · 15 Mo</small></span>
              </a>
            </div>
            <Sommaire livre={l} />
          </div>
        )}
      <Onglets livre={l} actuelle={vue?.section} />
      <footer className="er-pied">
        <span>Elden Ring — Édition ultime · Jeu de base, mise à jour 1.17 · <a href={PDF} download={NOM_PDF}>Version PDF</a></span>
        <span>{l.couverture.mention}</span>
      </footer>
    </main>
  )
}
