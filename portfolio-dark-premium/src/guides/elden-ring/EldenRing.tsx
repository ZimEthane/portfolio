import { useEffect, useRef, useState } from 'react'
import type { ComponentType, CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, LayoutGrid } from 'lucide-react'
import Chantier from '../../Chantier'
import { animateScrollTo, scrollToId } from '../../scroll'
import { A_VENIR, SECTIONS, lienPage, lienSection } from './plan'
import type { SectionGuide } from './plan'
import Bases from './sections/Bases'
import Classes from './sections/Classes'
import './elden-ring.css'

// Contenu converti de chaque section. Les autres affichent l'écran « en chantier ».
const CONTENU: Record<string, ComponentType<{ section: SectionGuide }>> = {
  bases: Bases,
  classes: Classes,
}

const MENTION = 'Guide de fan, non officiel — Elden Ring est une marque de FromSoftware / Bandai Namco'
const deuxChiffres = (n: number) => String(n).padStart(2, '0')

// ----- Couverture (page 1 du PDF) -----
function Couverture() {
  return (
    <header className="er-couverture">
      <div className="er-couv-cadre">
        <span className="er-couv-badge">Édition ultime</span>
        <span className="er-couv-sur">Guide complet · Gratuit</span>
        <h1>Elden Ring</h1>
        <p className="er-couv-sous">Le guide de A à Z</p>
        <span className="er-couv-filet" aria-hidden="true"><i /></span>
        <ul className="er-couv-liste">
          <li>Les bases · Classes et tier lists · La progression zone par zone</li>
          <li>Toutes les quêtes, dans le bon ordre, sans rien rater</li>
          <li>67 donjons et 166 combats de boss en fiches</li>
          <li>Le 100 % : trophées, objets légendaires, cartes des objets</li>
        </ul>
        <span className="er-couv-pied">Jeu de base · Novembre 2026</span>
        <span className="er-couv-mention">{MENTION}</span>
      </div>
    </header>
  )
}

// ----- Sommaire (page 2 du PDF) -----
function Sommaire() {
  return (
    <section className="er-sommaire-page" aria-labelledby="er-sommaire-titre">
      <h2 id="er-sommaire-titre" className="er-titre-orne">Sommaire</h2>
      <span className="er-orne" aria-hidden="true"><i /></span>
      <ol className="er-sommaire-liste">
        {SECTIONS.map(s => (
          <li key={s.id} style={{ '--sec': s.couleur } as CSSProperties}>
            <a className="er-sommaire-bandeau" href={lienSection(s)}>
              <span className="er-sommaire-num">{s.numero}</span>
              <span className="er-sommaire-nom">{s.titre}</span>
              {!s.prete && <span className="er-bientot">Bientôt</span>}
            </a>
            <ul className={s.pages.length > 6 ? 'er-sommaire-pages is-colonnes' : 'er-sommaire-pages'}>
              {s.pages.map(p => (
                <li key={p.id}>
                  <a href={lienPage(s, p)}><span className="er-sommaire-sur">{p.surtitre}</span><span>{p.titre}</span></a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="er-a-venir">À venir dans les prochaines parties : {A_VENIR}</p>
      <p className="er-sommaire-note">Tout est cliquable. Les sections marquées « Bientôt » arrivent dans les prochaines mises à jour du site.</p>
    </section>
  )
}

// ----- Intercalaire de section (pages de couleur du PDF : 01, Section 1, Les bases…) -----
function Intercalaire({ section }: { section: SectionGuide }) {
  return (
    <header className="er-intercalaire">
      <div className="er-inter-cadre">
        <span className="er-inter-numero" aria-hidden="true">{deuxChiffres(section.numero)}</span>
        <span className="er-inter-sur">Section {section.numero}</span>
        <h1>{section.titre}</h1>
        <span className="er-inter-filet" aria-hidden="true" />
        <p>{section.intro}</p>
        <ul>
          {section.pages.map(p => (
            <li key={p.id}><a href={lienPage(section, p)}><span>{p.surtitre}</span>{p.titre}</a></li>
          ))}
        </ul>
      </div>
    </header>
  )
}

// ----- Sommaire de gauche : sections, et pour la section ouverte ses pages et leurs parties -----
interface Titre { id: string; titre: string }
interface PageLue extends Titre { parties: Titre[] }

function Navigation({ section, pages, actif, onChoix }: { section: SectionGuide | null; pages: PageLue[]; actif: string; onChoix?: () => void }) {
  return (
    <nav className="er-nav" aria-label="Sommaire du guide">
      <a className="er-nav-guide" href="#guides/elden-ring" onClick={onChoix}><BookOpen size={15} /> Elden Ring · sommaire</a>
      <ol>
        {SECTIONS.map(s => {
          const ouverte = s.id === section?.id
          return (
            <li key={s.id} className={ouverte ? 'is-ouverte' : undefined} style={{ '--sec': s.couleur } as CSSProperties}>
              <a className="er-nav-section" href={lienSection(s)} aria-current={ouverte ? 'page' : undefined} onClick={onChoix}>
                <span className="er-nav-num">{s.numero}</span>
                <span>{s.titre}</span>
                {!s.prete && <span className="er-bientot">Bientôt</span>}
              </a>
              {ouverte && pages.length > 0 && (
                <ul className="er-nav-pages">
                  {pages.map(p => (
                    <li key={p.id}>
                      <a href={`${lienSection(s)}/${p.id}`} className={actif === p.id ? 'is-actif' : undefined} onClick={onChoix}>{p.titre}</a>
                      {p.parties.length > 0 && (
                        <ul>
                          {p.parties.map(t => (
                            <li key={t.id}><a href={`${lienSection(s)}/${t.id}`} className={actif === t.id ? 'is-actif' : undefined} onClick={onChoix}>{t.titre}</a></li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
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
function Onglets({ actuelle }: { actuelle?: string }) {
  return (
    <nav className="er-onglets" aria-label="Sections du guide">
      {SECTIONS.map(s => (
        <a key={s.id} href={lienSection(s)} style={{ '--sec': s.couleur } as CSSProperties} className={s.id === actuelle ? 'is-actuel' : undefined} aria-current={s.id === actuelle ? 'page' : undefined} title={s.titre}>
          {s.nom}
        </a>
      ))}
    </nav>
  )
}

// Lit les pages et leurs titres de partie dans le contenu affiché, pour le sommaire de gauche.
function useTitres(cle: string) {
  const [pages, setPages] = useState<PageLue[]>([])
  useEffect(() => {
    const articles = Array.from(document.querySelectorAll<HTMLElement>('.er-contenu .er-page'))
    setPages(articles.map(a => ({
      id: a.id,
      titre: a.dataset.titre ?? '',
      parties: Array.from(a.querySelectorAll<HTMLElement>('h3[id]')).map(h => ({ id: h.id, titre: h.textContent ?? '' })),
    })))
  }, [cle])
  return pages
}

// Titre (page ou partie) en cours de lecture : le dernier passé sous le haut de l'écran.
function useActif(pages: PageLue[]) {
  const [actif, setActif] = useState('')
  useEffect(() => {
    const ids = pages.flatMap(p => [p.id, ...p.parties.map(t => t.id)])
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
  }, [pages])
  return actif
}

function VueSection({ section, ancre }: { section: SectionGuide; ancre: string }) {
  const Contenu = CONTENU[section.id]
  const pages = useTitres(section.id)
  const actif = useActif(pages)
  const [menuOuvert, setMenuOuvert] = useState(false)
  const i = SECTIONS.indexOf(section)
  const prec = SECTIONS[i - 1]
  const suiv = SECTIONS[i + 1]
  useEffect(() => setMenuOuvert(false), [section.id, ancre])

  return (
    <div className="er-mise" style={{ '--sec': section.couleur } as CSSProperties}>
      <aside className="er-cote">
        <Navigation section={section} pages={pages} actif={actif} />
      </aside>
      <div className="er-contenu">
        <details className="er-nav-mobile" open={menuOuvert} onToggle={e => setMenuOuvert((e.target as HTMLDetailsElement).open)}>
          <summary><BookOpen size={15} /> Sommaire du guide</summary>
          <Navigation section={section} pages={pages} actif={actif} onChoix={() => setMenuOuvert(false)} />
        </details>
        <Intercalaire section={section} />
        {Contenu
          ? <Contenu section={section} />
          : <div className="er-chantier">
              <Chantier titre={`${section.titre} : bientôt en ligne`} texte="Cette partie du guide est en cours de mise en page à partir du PDF. Elle arrive dans une prochaine mise à jour du site." />
            </div>}
        <nav className="er-suite" aria-label="Sections voisines">
          {prec ? <a href={lienSection(prec)}><ArrowLeft size={15} /><span><small>Section précédente</small>{prec.titre}</span></a> : <span />}
          <a href="#guides/elden-ring" className="er-suite-sommaire"><LayoutGrid size={15} /> Sommaire</a>
          {suiv ? <a href={lienSection(suiv)} className="er-suite-suivant"><span><small>Section suivante</small>{suiv.titre}</span><ArrowRight size={15} /></a> : <span />}
        </nav>
      </div>
    </div>
  )
}

export default function EldenRing({ chemin }: { chemin: string }) {
  const [idSection = '', ancre = ''] = chemin.split('/')
  const section = SECTIONS.find(s => s.id === idSection) ?? null
  const precedente = useRef<string | null>(null)

  // Changement de section : on repart en haut (ou directement sur le titre demandé).
  // Même section : défilement doux jusqu'au titre demandé.
  useEffect(() => {
    const cle = section?.id ?? ''
    const memeSection = precedente.current === cle
    precedente.current = cle
    const cible = ancre ? document.getElementById(ancre) : null
    if (cible) {
      if (memeSection) scrollToId(ancre)
      else window.scrollTo({ top: cible.getBoundingClientRect().top + window.scrollY - 100, behavior: 'instant' }) // même marge que scrollToId
    } else if (memeSection) animateScrollTo(0)
    else window.scrollTo({ top: 0, behavior: 'instant' })
  }, [section, ancre])

  return (
    <main className={section ? 'er er-dans-section' : 'er'}>
      <div className="er-barre">
        <a className="er-retour" href={section ? '#guides/elden-ring' : '#guides'}><ArrowLeft size={15} /> {section ? 'Sommaire du guide' : 'Tous les guides'}</a>
        {section && <span className="er-fil">Elden Ring <i>/</i> {section.titre}</span>}
      </div>
      {section
        ? <VueSection section={section} ancre={ancre} />
        : <div className="er-accueil"><Couverture /><Sommaire /></div>}
      <Onglets actuelle={section?.id} />
      <footer className="er-pied">
        <span>Elden Ring — Édition ultime · Jeu de base, mise à jour 1.17</span>
        <span>{MENTION}</span>
      </footer>
    </main>
  )
}
