import type { ReactNode } from 'react'
import type { PageGuide } from './plan'

// Briques de mise en page du guide, reprises du PDF.

// "Les 8 règles d'or des quêtes" → "les-8-regles-d-or-des-quetes" (sert d'ancre dans l'adresse)
export const ancre = (texte: string) => texte
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Une page du PDF : surtitre en couleur de la section, titre, losange doré, puis le contenu.
export function Page({ page, children }: { page: PageGuide; children: ReactNode }) {
  return (
    <article className="er-page" id={page.id} data-titre={page.titre}>
      <header className="er-page-tete">
        <span className="er-surtitre">{page.surtitre}</span>
        <h2>{page.titre}</h2>
        <span className="er-losange" aria-hidden="true" />
      </header>
      {children}
    </article>
  )
}

// Titre de partie (Cinzel souligné d'un filet doré). Son ancre apparaît dans le sommaire de gauche.
export function Partie({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="er-partie">
      <h3 id={ancre(titre)}>{titre}</h3>
      {children}
    </section>
  )
}

export function Puces({ children }: { children: ReactNode }) {
  return <ul className="er-puces">{children}</ul>
}

// Liste numérotée avec les pastilles dorées du PDF.
export function Numeros({ children }: { children: ReactNode }) {
  return <ol className="er-numeros">{children}</ol>
}

type Ton = 'astuce' | 'alerte' | 'choix' | 'parallele'
const ETIQUETTES: Record<Ton, string> = { astuce: 'Astuce', alerte: 'Alerte', choix: 'Choix', parallele: 'En parallèle' }

export function Encadre({ ton = 'astuce', children }: { ton?: Ton; children: ReactNode }) {
  return (
    <aside className={`er-encadre er-encadre-${ton}`}>
      <p><span className="er-etiquette">{ETIQUETTES[ton]}</span> {children}</p>
    </aside>
  )
}

// Étiquettes des étapes : BOSS, MINI, QUÊTE, OPT.
type TypeTag = 'boss' | 'mini' | 'quete' | 'opt'
const TAGS: Record<TypeTag, string> = { boss: 'Boss', mini: 'Mini', quete: 'Quête', opt: 'Opt' }
export function Tag({ type }: { type: TypeTag }) {
  return <span className={`er-tag er-tag-${type}`}>{TAGS[type]}</span>
}

// Repères de carte : rond doré (carte du chapitre), carré vert (carte des objets).
export function Repere({ n, ch, boss, objet }: { n: number; ch?: number; boss?: boolean; objet?: boolean }) {
  const classe = `er-repere${objet ? ' er-repere-objet' : ''}${boss ? ' er-repere-boss' : ''}${ch !== undefined ? ' er-repere-ch' : ''}`
  return <span className={classe}>{ch !== undefined ? <>ch.{ch} · {n}</> : n}</span>
}

export interface Colonne {
  titre: string
  largeur?: string // largeur CSS de la colonne (ex. "34%")
  fort?: boolean // texte en gras (première colonne des tableaux de classes)
}

export function Tableau({ colonnes, lignes, legende }: { colonnes: Colonne[]; lignes: ReactNode[][]; legende?: string }) {
  return (
    <div className="er-tableau-cadre">
      <table className={colonnes.length > 2 ? 'er-tableau is-large' : 'er-tableau'}>
        {legende && <caption className="er-invisible">{legende}</caption>}
        <colgroup>{colonnes.map(c => <col key={c.titre} style={c.largeur ? { width: c.largeur } : undefined} />)}</colgroup>
        <thead><tr>{colonnes.map(c => <th key={c.titre} scope="col">{c.titre}</th>)}</tr></thead>
        <tbody>
          {lignes.map((l, i) => (
            <tr key={i}>{l.map((cellule, j) => colonnes[j]?.fort ? <th key={j} scope="row">{cellule}</th> : <td key={j}>{cellule}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
