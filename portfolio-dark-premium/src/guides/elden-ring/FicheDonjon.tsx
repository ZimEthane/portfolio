import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, ExternalLink, X } from 'lucide-react'
import { lienPage } from './livre'
import type { Donjon, Livre } from './livre'

// Liens vers les wikis cités par le guide : soluce complète, ennemis, objets et captures de chaque donjon.
const fextralife = (nom: string) => `https://eldenring.wiki.fextralife.com/${nom.replace(/ /g, '+')}`
const wikiGg = (nom: string) => `https://eldenring.wiki.gg/index.php?search=${encodeURIComponent(nom)}`

// Fenêtre de détail d'un donjon : vignette de l'entrée en grand, contenu, fiches des boss, liens.
export default function FicheDonjon({ livre, donjon, fait, onFait, onChanger, onFermer }: {
  livre: Livre
  donjon: Donjon
  fait: boolean
  onFait: () => void
  onChanger: (id: string) => void
  onFermer: () => void
}) {
  const fenetre = useRef<HTMLDialogElement>(null)
  const i = livre.donjons.indexOf(donjon)
  const prec = livre.donjons[i - 1]
  const suiv = livre.donjons[i + 1]
  const sectionDonjons = livre.sections.find(s => s.slug === 'donjons')
  const bestiaire = livre.sections.find(s => s.slug === 'bestiaire')
  const progression = livre.sections.find(s => s.slug === 'progression')
  const chapitre = progression?.pages.find(p => p.slug === `chapitre-${donjon.chapitre}`)

  // Ouverture en fenêtre modale (Échap ferme, le reste de la page n'est plus cliquable).
  useEffect(() => {
    const d = fenetre.current
    if (d && !d.open) d.showModal()
  }, [])

  // Un lien suivi depuis la fiche (autre donjon, chapitre…) ferme la fenêtre.
  useEffect(() => {
    window.addEventListener('hashchange', onFermer)
    return () => window.removeEventListener('hashchange', onFermer)
  }, [onFermer])

  // Flèches du clavier : donjon précédent / suivant.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && prec) onChanger(prec.id)
      if (e.key === 'ArrowRight' && suiv) onChanger(suiv.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prec, suiv, onChanger])

  return (
    <dialog
      ref={fenetre}
      className="er-fiche"
      aria-labelledby="er-fiche-titre"
      style={{ '--sc': sectionDonjons?.couleur } as CSSProperties}
      onClose={onFermer}
      onClick={e => { if (e.target === e.currentTarget) onFermer() }} // clic sur le fond sombre
    >
      <div className="er-fiche-feuille">
        <header className="er-fiche-tete">
          <span className="er-fiche-num">{donjon.numero}</span>
          <div>
            <h2 id="er-fiche-titre">{donjon.nom}</h2>
            <p>{donjon.infos}</p>
          </div>
          <button type="button" className="er-fiche-fermer" onClick={onFermer} aria-label="Fermer la fiche"><X size={20} /></button>
        </header>

        <div className="er-fiche-corps">
          <figure className="er-fiche-carte">
            <span className="er-fiche-vignette">
              <img src={donjon.carte} alt={`Carte autour de l'entrée de ${donjon.nom}`} />
              <span dangerouslySetInnerHTML={{ __html: donjon.repere }} />
            </span>
            <figcaption>L'entrée du donjon sur la carte du monde. Il n'y a pas de carte de l'intérieur dans le jeu.</figcaption>
          </figure>

          <div className="er-fiche-infos">
            {donjon.cleFait && (
              <button type="button" className={fait ? 'er-fiche-fait is-fait' : 'er-fiche-fait'} aria-pressed={fait} onClick={onFait}>
                <Check size={16} /> {fait ? 'Donjon fait' : 'Marquer comme fait'}
              </button>
            )}
            <div className="er-livre">
              <div className={`sec ${sectionDonjons?.cle ?? ''}`} dangerouslySetInnerHTML={{ __html: donjon.contenu }} />
            </div>
            <ul className="er-fiche-liens">
              {chapitre && progression && (
                <li><a href={lienPage(progression, chapitre)}><BookOpen size={15} /> Dans la progression : {chapitre.surtitre.toLowerCase()}, {chapitre.titre}</a></li>
              )}
              <li><a href={fextralife(donjon.nom)} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Soluce détaillée sur Fextralife</a></li>
              <li><a href={wikiGg(donjon.nom)} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Fiche sur wiki.gg</a></li>
            </ul>
          </div>
        </div>

        {donjon.boss.length > 0 && bestiaire && (
          <section className="er-fiche-boss" aria-label="Fiche du boss">
            <h3>{donjon.boss.length > 1 ? 'Fiches des boss' : 'Fiche du boss'}</h3>
            <div className="er-livre">
              <div className={`sec ${bestiaire.cle}`} dangerouslySetInnerHTML={{ __html: donjon.boss.map(id => livre.fiches.get(id)).join('') }} />
            </div>
          </section>
        )}

        <nav className="er-fiche-suite" aria-label="Autres donjons">
          {prec ? <button type="button" onClick={() => onChanger(prec.id)}><ArrowLeft size={15} /><span><small>{prec.numero}</small>{prec.nom}</span></button> : <span />}
          {suiv ? <button type="button" className="er-fiche-suivant" onClick={() => onChanger(suiv.id)}><span><small>{suiv.numero}</small>{suiv.nom}</span><ArrowRight size={15} /></button> : <span />}
        </nav>
      </div>
    </dialog>
  )
}
