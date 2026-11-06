import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, ExternalLink, MapPin, X } from 'lucide-react'
import CarteJeu from './carte/CarteJeu'
import { lienPage } from './livre'
import type { Boss, Donjon, Livre } from './livre'

// Liens vers les wikis cités par le guide : soluce, ennemis, objets et captures.
const fextralife = (nom: string) => `https://eldenring.wiki.fextralife.com/${nom.split(/ \/ | & /)[0].replace(/\s*\(.*?\)/g, '').replace(/,/g, '').replace(/ /g, '+')}`
const wikiGg = (nom: string) => `https://eldenring.wiki.gg/index.php?search=${encodeURIComponent(nom.split(/ \/ | & /)[0].replace(/\s*\(.*?\)/g, ''))}`

interface Props {
  livre: Livre
  id: string // d05 (donjon) ou b029 (boss)
  coches: Set<string>
  onCocher: (cle: string) => void
  onOuvrir: (id: string) => void // autre fiche (donjon ↔ boss, précédent / suivant)
  onFermer: () => void
}

// Fenêtre de détail d'un donjon ou d'un boss.
export default function Fiche({ livre: l, id, coches, onCocher, onOuvrir, onFermer }: Props) {
  const fenetre = useRef<HTMLDialogElement>(null)
  const donjon = l.donjons.find(d => d.id === id)
  const boss = l.boss.find(b => b.id === id)
  const liste: (Donjon | Boss)[] = donjon ? l.donjons : l.boss
  const actuel = donjon ?? boss
  const i = actuel ? liste.indexOf(actuel) : -1
  const prec = liste[i - 1]
  const suiv = liste[i + 1]
  const section = l.sections.find(s => s.slug === (donjon ? 'donjons' : 'bestiaire'))

  // Ouverture en fenêtre modale (Échap ferme, le reste de la page n'est plus cliquable).
  useEffect(() => {
    const d = fenetre.current
    if (d && !d.open) d.showModal()
  }, [])

  // Nouvelle fiche affichée : on remonte en haut de la fenêtre.
  useEffect(() => { fenetre.current?.scrollTo({ top: 0 }) }, [id])

  // Un lien suivi depuis la fiche (chapitre, renvoi…) ferme la fenêtre.
  useEffect(() => {
    window.addEventListener('hashchange', onFermer)
    return () => window.removeEventListener('hashchange', onFermer)
  }, [onFermer])

  // Flèches du clavier : fiche précédente / suivante.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && prec) onOuvrir(prec.id)
      if (e.key === 'ArrowRight' && suiv) onOuvrir(suiv.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prec, suiv, onOuvrir])

  if (!actuel || !section) return null

  return (
    <dialog
      ref={fenetre}
      className="er-fiche"
      aria-labelledby="er-fiche-titre"
      style={{ '--sc': section.couleur } as CSSProperties}
      onClose={onFermer}
      onClick={e => { if (e.target === e.currentTarget) onFermer() }} // clic sur le fond sombre
    >
      <div className="er-fiche-feuille">
        <header className="er-fiche-tete">
          <span className="er-fiche-num">{actuel.numero}</span>
          <div>
            <h2 id="er-fiche-titre">{actuel.nom}</h2>
            <p>
              {donjon ? donjon.infos : [boss!.genre, boss!.region].filter(Boolean).join(' · ')}
              {boss?.etiquettes.map(t => <span key={t.texte} className={`er-fiche-etiquette is-${t.genre}`}>{t.texte}</span>)}
            </p>
          </div>
          <button type="button" className="er-fiche-fermer" onClick={onFermer} aria-label="Fermer la fiche"><X size={20} /></button>
        </header>

        {donjon
          ? <CorpsDonjon livre={l} donjon={donjon} coches={coches} onCocher={onCocher} onOuvrir={onOuvrir} />
          : <CorpsBoss livre={l} boss={boss!} coches={coches} onCocher={onCocher} onOuvrir={onOuvrir} />}

        <nav className="er-fiche-suite" aria-label={donjon ? 'Autres donjons' : 'Autres boss'}>
          {prec ? <button type="button" onClick={() => onOuvrir(prec.id)}><ArrowLeft size={15} /><span><small>{prec.numero}</small>{prec.nom}</span></button> : <span />}
          {suiv ? <button type="button" className="er-fiche-suivant" onClick={() => onOuvrir(suiv.id)}><span><small>{suiv.numero}</small>{suiv.nom}</span><ArrowRight size={15} /></button> : <span />}
        </nav>
      </div>
    </dialog>
  )
}

type Corps<T> = { livre: Livre; coches: Set<string>; onCocher: (cle: string) => void; onOuvrir: (id: string) => void } & T

function BoutonCoche({ cle, coches, onCocher, oui, non }: { cle?: string; coches: Set<string>; onCocher: (cle: string) => void; oui: string; non: string }) {
  if (!cle) return null
  const fait = coches.has(cle)
  return (
    <button type="button" className={fait ? 'er-fiche-fait is-fait' : 'er-fiche-fait'} aria-pressed={fait} onClick={() => onCocher(cle)}>
      <Check size={16} /> {fait ? oui : non}
    </button>
  )
}

// HTML d'origine, avec les styles de sa section (couleur, puces, fiches…).
function Html({ cle, html }: { cle: string; html: string }) {
  return <div className="er-livre"><div className={`sec ${cle}`} dangerouslySetInnerHTML={{ __html: html }} /></div>
}

function Liens({ livre: l, id, chapitres, nom, children }: { livre: Livre; id: string; chapitres: number[]; nom: string; children?: ReactNode }) {
  const progression = l.sections.find(s => s.slug === 'progression')
  const pages = chapitres.map(n => progression?.pages.find(p => p.slug === `chapitre-${n}`)).filter(p => p !== undefined)
  return (
    <ul className="er-fiche-liens">
      {children}
      <li><a href={`#guides/elden-ring/carte/${id}`}><MapPin size={15} /> Voir sur la carte interactive</a></li>
      {progression && pages.map(p => (
        <li key={p.slug}><a href={lienPage(progression, p)}><BookOpen size={15} /> Dans la progression : {p.surtitre.toLowerCase()}, {p.titre}</a></li>
      ))}
      <li><a href={fextralife(nom)} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Soluce détaillée sur Fextralife</a></li>
      <li><a href={wikiGg(nom)} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Fiche sur wiki.gg</a></li>
    </ul>
  )
}

function CorpsDonjon({ livre: l, donjon, coches, onCocher, onOuvrir }: Corps<{ donjon: Donjon }>) {
  const sectionDonjons = l.sections.find(s => s.slug === 'donjons')!
  const bestiaire = l.sections.find(s => s.slug === 'bestiaire')
  return (
    <>
      <div className="er-fiche-corps">
        <figure className="er-fiche-carte">
          <CarteJeu
            fiche={donjon.id}
            nom={donjon.nom}
            repli={(
              <span className="er-fiche-vignette">
                <img src={donjon.carte} alt={`Carte autour de l'entrée de ${donjon.nom}`} />
                <span dangerouslySetInnerHTML={{ __html: donjon.repere }} />
              </span>
            )}
          />
          <figcaption>L'entrée du donjon sur la carte du jeu (zoomable). Il n'y a pas de carte de l'intérieur dans le jeu.</figcaption>
        </figure>
        <div className="er-fiche-infos">
          <BoutonCoche cle={donjon.cleFait} coches={coches} onCocher={onCocher} oui="Donjon fait" non="Marquer comme fait" />
          <Html cle={sectionDonjons.cle} html={donjon.contenu} />
          <Liens livre={l} id={donjon.id} chapitres={donjon.chapitre === undefined ? [] : [donjon.chapitre]} nom={donjon.nom} />
        </div>
      </div>
      {donjon.boss.length > 0 && bestiaire && (
        <section className="er-fiche-boss" aria-label={donjon.boss.length > 1 ? 'Fiches des boss' : 'Fiche du boss'}>
          <h3>{donjon.boss.length > 1 ? 'Fiches des boss' : 'Fiche du boss'}</h3>
          {donjon.boss.map(b => (
            <div key={b} className="er-fiche-boss-carte">
              <Html cle={bestiaire.cle} html={l.fiches.get(b) ?? ''} />
              <button type="button" className="er-fiche-ouvrir" onClick={() => onOuvrir(b)}>Fiche détaillée du boss ›</button>
            </div>
          ))}
        </section>
      )}
    </>
  )
}

function CorpsBoss({ livre: l, boss, coches, onCocher, onOuvrir }: Corps<{ boss: Boss }>) {
  const bestiaire = l.sections.find(s => s.slug === 'bestiaire')!
  const donjons = boss.donjons.map(d => l.donjons.find(x => x.id === d)).filter(d => d !== undefined)
  return (
    <div className="er-fiche-corps">
      {donjons.length === 0 && (
        <figure className="er-fiche-carte">
          <CarteJeu fiche={boss.id} nom={boss.nom} repli={<p className="er-fiche-sans-carte">Pas encore de repère sur la carte pour ce boss.</p>} />
          <figcaption>Où le trouver, sur la carte du jeu (zoomable).</figcaption>
        </figure>
      )}
      {donjons.length > 0 && (
        <div className="er-fiche-lieux">
          <h3>{donjons.length > 1 ? 'Les donjons où le combattre' : 'Le donjon où le combattre'}</h3>
          <ul>
            {donjons.map(d => (
              <li key={d.id}>
                <button type="button" onClick={() => onOuvrir(d.id)}>
                  <span className="er-fiche-mini">
                    <img src={d.carte.replace('/donjons/grand/', '/donjons/')} alt="" loading="lazy" />
                    <span dangerouslySetInnerHTML={{ __html: d.repere }} />
                  </span>
                  <span><small>{d.numero}</small>{d.nom}<em>Voir la fiche du donjon ›</em></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="er-fiche-infos">
        <BoutonCoche cle={boss.cleBattu} coches={coches} onCocher={onCocher} oui="Boss battu" non="Marquer comme battu" />
        <div className="er-fiche-bcard"><Html cle={bestiaire.cle} html={boss.contenu} /></div>
        <Liens livre={l} id={boss.id} chapitres={boss.chapitres} nom={boss.nom} />
      </div>
    </div>
  )
}
